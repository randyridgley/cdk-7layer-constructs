import * as cdk from '@aws-cdk/core';
import { CfnDeliveryStream } from '@aws-cdk/aws-kinesisfirehose';
import { Column, Database, DataFormat, Table, Schema } from '@aws-cdk/aws-glue';
import { PolicyStatement, PolicyDocument, Role, ServicePrincipal } from '@aws-cdk/aws-iam';
import { Key } from '@aws-cdk/aws-kms';
import { CfnPermissions, CfnResource } from '@aws-cdk/aws-lakeformation';
import { LogGroup, LogStream, RetentionDays } from '@aws-cdk/aws-logs';
import { Bucket } from '@aws-cdk/aws-s3';
import { CustomGlueClassificationResource } from './custom-glue-classification-resource'

export interface TargetTableConfig {
  readonly columns: Column[],
  readonly databaseArn: string,
  readonly s3BucketArn?: string
  readonly s3prefix?: string
  readonly tableName: string
}

export interface SourceBackupConfig {
  readonly columns: Column[],
  readonly databaseArn: string,
  readonly s3BucketArn?: string
  readonly s3prefix?: string
  readonly tableName: string
  readonly dataFormat: DataFormat
}

export interface LogsConfig {
  readonly logsRetentionDays?: RetentionDays;
  readonly logsRemovalPolicy?: cdk.RemovalPolicy;
  readonly logsGroupName: string;
}

export interface KinesisFirehoseTransformerProps {
  readonly targetTableConfig: TargetTableConfig;
  readonly sourceBackupConfig?: SourceBackupConfig;
  readonly processingConfig?: CfnDeliveryStream.ProcessingConfigurationProperty;
  readonly logsConfig?: LogsConfig;
  readonly deliveryStreamName: string;
  readonly enableCloudwatchLogging: boolean;
  readonly createEncryptionKey: boolean;
  readonly useLakeformation?: boolean;
}

export class KinesisFirehoseTransformer extends cdk.Construct {
  public readonly kinesisFirehoseArn: string;
  public readonly streamName: string
  public readonly kmsKeyId: string | undefined;

  constructor(scope: cdk.Construct, id: string, props: KinesisFirehoseTransformerProps) {
    super(scope, id);

    const firehoseLogGroup = new LogGroup(this, 'LogGroup', {
      logGroupName: props.logsConfig ? props.logsConfig.logsGroupName : `/aws/kinesis-firehose/${props.deliveryStreamName}`,
      retention: props.logsConfig ? props.logsConfig.logsRetentionDays : RetentionDays.ONE_WEEK,
      removalPolicy: props.logsConfig ? props.logsConfig.logsRemovalPolicy : cdk.RemovalPolicy.RETAIN
    });

    const firehoseLogStream = new LogStream(this, 'LogStream', {
      logGroup: firehoseLogGroup,
      removalPolicy: props.logsConfig ? props.logsConfig.logsRemovalPolicy : cdk.RemovalPolicy.RETAIN
    });

    const firehoseLogStreamArn = `arn:${cdk.Aws.PARTITION}:logs:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:log-group:${firehoseLogGroup.logGroupName}:log-stream:${firehoseLogStream.logStreamName}`;

    const partitionKeys = [
      {
        name: 'year',
        type: Schema.SMALL_INT
      },
      {
        name: 'month',
        type: Schema.SMALL_INT
      },
      {
        name: 'day',
        type: Schema.SMALL_INT
      },
      {
        name: 'hour',
        type: Schema.SMALL_INT
      }
    ];

    const kdfTransformerRole = new Role(this, 'Role', {
      assumedBy: new ServicePrincipal('firehose.amazonaws.com'),
      inlinePolicies: {
        'GluePermissions' : new PolicyDocument({
          statements : [
              new PolicyStatement({
                  actions : [
                    "glue:GetTableVersions"
                  ],
                  resources : ["*"]
              })
          ]
        }),
        'CloudWatchPermissions': new PolicyDocument({
          statements: [
            new PolicyStatement({
              actions: ['cloudwatch:PutMetricData'],
              resources: ['*']
            })
          ]
        }),
        'LogsPermissions': new PolicyDocument({
          statements: [
            new PolicyStatement({
              actions: ['logs:DescribeLogStreams', 'logs:DescribeLogGroups'],
              resources: [
                firehoseLogGroup.logGroupArn,
                `arn:${cdk.Aws.PARTITION}:logs:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:log-group:*`
              ]        
            })
          ]
        }),
        'LogsPutPermissions': new PolicyDocument({
          statements: [
            new PolicyStatement({
              actions: ['logs:PutLogEvents'],
              resources: [firehoseLogStreamArn]
            })
          ]
        })
      }
    });

    let encryptionConfig: CfnDeliveryStream.EncryptionConfigurationProperty | undefined

    if(props.createEncryptionKey) {
      const encryptionKey = new Key(this, 'KmsKey', {
        alias: `${props.deliveryStreamName}TransformerKey`,
        description: `Encryption key for all data using ${props.deliveryStreamName}`,
        enabled: true,
        enableKeyRotation: true,
        removalPolicy: cdk.RemovalPolicy.RETAIN // how to handle this?
      });
      this.kmsKeyId = encryptionKey.keyId;
      encryptionKey.grantEncryptDecrypt(kdfTransformerRole);

      encryptionConfig = {
        kmsEncryptionConfig: {
          awskmsKeyArn: encryptionKey.keyArn              
        }
      }
    }

    const customResourceLambdaRole = new Role(this, "CustomResourceLambdaRole", {
      assumedBy: new ServicePrincipal("lambda.amazonaws.com")
    });

    customResourceLambdaRole.addToPolicy(
      new PolicyStatement({
        resources: ["*"],
        actions: [
          "glue:GetTable",
          "glue:UpdateTable"
        ]
      })
    );

    customResourceLambdaRole.addToPolicy(
      new PolicyStatement({
        resources: ["*"],
        actions: ["lambda:InvokeFunction"]
      })
    );

    customResourceLambdaRole.addToPolicy(
      new PolicyStatement({
        resources: ["arn:aws:logs:*:*:*"],
        actions: [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
      })
    );

    let backupConfig: CfnDeliveryStream.S3DestinationConfigurationProperty | undefined;

    if(props.sourceBackupConfig) {
      const sourceDatabase = Database.fromDatabaseArn(this, 'SourceDB', props.sourceBackupConfig.databaseArn);

      let sourceBucket:Bucket;

      if(props.sourceBackupConfig.s3BucketArn) {
        sourceBucket = Bucket.fromBucketArn(this, 'SourceBucket', props.sourceBackupConfig.s3BucketArn) as Bucket
      } else {
        sourceBucket = new Bucket(this, 'SourceBucket', {});
      }

      sourceBucket.grantReadWrite(kdfTransformerRole);

      kdfTransformerRole.addToPolicy(new PolicyStatement({
        actions : [
          's3:AbortMultipartUpload',
          's3:GetBucketLocation',
          's3:GetObject',
          's3:ListBucket',
          's3:ListBucketMultipartUploads',
          's3:PutObject',
        ],
        resources : [
          sourceBucket.bucketArn,
          sourceBucket.bucketArn + '/*'
        ]
      }));

      if(props.useLakeformation) {
        // double check this policy access?
        kdfTransformerRole.addToPolicy(new PolicyStatement({
          actions: [
            'lakeformation:GetDataAccess'
          ],
          resources: ['*']
        }));
        makeLakeFormationResource(this, 'SourceBucketResource', 'SourceResourcePermission', 'CCSourceResourcePermission', sourceBucket.bucketArn, kdfTransformerRole.roleArn, customResourceLambdaRole.roleArn);
      }

      const sourceTable = new Table(this, 'SourceTable', {
        columns: props.sourceBackupConfig.columns,
        dataFormat: props.sourceBackupConfig.dataFormat,
        database: sourceDatabase,
        tableName: props.sourceBackupConfig.tableName,
        bucket: sourceBucket,
        compressed: false,
        description: `Backup original data table for ${props.sourceBackupConfig.tableName}`,
        s3Prefix: props.sourceBackupConfig.s3prefix ?? `${props.sourceBackupConfig.tableName}/processed/`,
        storedAsSubDirectories: false,     
        partitionKeys: partitionKeys 
      });

      const sourceCC = new CustomGlueClassificationResource(this, "SourceGlueClassification", {
          dataFormat: getDataFormatString(props.sourceBackupConfig.dataFormat),
          databaseName: sourceDatabase.databaseName,
          tableName: props.sourceBackupConfig.tableName,
          roleArn: customResourceLambdaRole.roleArn
        }
      );

      sourceCC.node.addDependency(sourceTable);

      if(props.useLakeformation) {
        allowLakeFormationTableAccess(this, 'SourceDBPermission', 'SourceTablePermission', sourceDatabase.databaseName, sourceTable, kdfTransformerRole.roleArn, sourceCC)
        allowLakeFormationTableAccess(this, 'SourceCustomResourceDBPermission', 'SourceCustomResourcePermission', sourceDatabase.databaseName, sourceTable, customResourceLambdaRole.roleArn, sourceCC)
      }

      backupConfig = {
        bucketArn: sourceBucket.bucketArn,
        roleArn: kdfTransformerRole.roleArn,
        bufferingHints: {
          intervalInSeconds: 60,
          sizeInMBs: 128
        },
        cloudWatchLoggingOptions: {
          logGroupName: firehoseLogGroup.logGroupName,
          logStreamName: 'raw'
        },
        compressionFormat: 'UNCOMPRESSED',
        encryptionConfiguration: encryptionConfig,
        errorOutputPrefix: 'failed/!{firehose:error-output-type}/year=!{timestamp:yyyy}/month=!{timestamp:MM}/day=!{timestamp:dd}/hour=!{timestamp:HH}/',
        prefix: 'raw/year=!{timestamp:yyyy}/month=!{timestamp:MM}/day=!{timestamp:dd}/hour=!{timestamp:HH}/'          
      }
    }

    let targetDatabase = Database.fromDatabaseArn(this, 'TargetDB', props.targetTableConfig.databaseArn);            
    let targetBucket:Bucket;

    if(props.targetTableConfig.s3BucketArn) {
      targetBucket = Bucket.fromBucketArn(this, 'TargetBucket', props.targetTableConfig.s3BucketArn) as Bucket
    } else {
      targetBucket = new Bucket(this, 'TargetBucket', {});
    }

    targetBucket.grantReadWrite(kdfTransformerRole);

    kdfTransformerRole.addToPolicy(new PolicyStatement({
      actions : [
        's3:AbortMultipartUpload',
        's3:GetBucketLocation',
        's3:GetObject',
        's3:ListBucket',
        's3:ListBucketMultipartUploads',
        's3:PutObject',
      ],
      resources : [
        targetBucket.bucketArn,
        targetBucket.bucketArn + '/*'
      ]
    }));

    if(props.useLakeformation) {
      makeLakeFormationResource(this, 'TargetBucketResource', 'TargetBucketPermission', 'CCTargetResourcePermission', targetBucket.bucketArn, kdfTransformerRole.roleArn, customResourceLambdaRole.roleArn);
    }

    const targetTable = new Table(this, 'TargetParquetTable', {
      columns: props.targetTableConfig.columns,
      dataFormat: DataFormat.PARQUET,
      database: targetDatabase,
      tableName: props.targetTableConfig.tableName,
      bucket: targetBucket,
      compressed: false,
      description: `Target Parquet Table for ${props.targetTableConfig.tableName}`,
      s3Prefix: props.targetTableConfig.s3prefix ?? `${props.targetTableConfig.tableName}/processed/`,
      storedAsSubDirectories: false,      
      partitionKeys: partitionKeys
    });

    const targetCC = new CustomGlueClassificationResource(this, "TargetGlueClassification", {
      dataFormat: 'parquet',
      databaseName: targetDatabase.databaseName,
      tableName: props.targetTableConfig.tableName,
      roleArn: customResourceLambdaRole.roleArn
    });

    targetCC.node.addDependency(targetTable);

    if(props.useLakeformation) {
      allowLakeFormationTableAccess(this, 'TargetDBPermission', 'TargetTablePermission', targetDatabase.databaseName, targetTable, kdfTransformerRole.roleArn, targetCC)
      allowLakeFormationTableAccess(this, 'TargetCustomResourceDBPermission', 'TargetCustomResourcePermission', targetDatabase.databaseName, targetTable, customResourceLambdaRole.roleArn, targetCC)
    }

    const transformerDS = new CfnDeliveryStream(this, 'KDS', {
      deliveryStreamName: props.deliveryStreamName,
      deliveryStreamType: 'DirectPut',
      extendedS3DestinationConfiguration: {
        bucketArn: targetBucket.bucketArn,
        roleArn: kdfTransformerRole.roleArn,
        bufferingHints: {
          intervalInSeconds: 60,
          sizeInMBs: 128
        },
        cloudWatchLoggingOptions: {
          enabled: props.enableCloudwatchLogging,
          logGroupName: firehoseLogGroup.logGroupName,
          logStreamName: firehoseLogStream.logStreamName
        },
        compressionFormat: 'UNCOMPRESSED',
        dataFormatConversionConfiguration: {
          enabled: true,
          inputFormatConfiguration: {
            deserializer: {
              openXJsonSerDe: {}
            }
          },
          outputFormatConfiguration: {
            serializer: {
              parquetSerDe: {}
            }
          },
          schemaConfiguration: {
            roleArn: kdfTransformerRole.roleArn,
            catalogId: cdk.Aws.ACCOUNT_ID,
            databaseName: targetDatabase.databaseName,
            tableName: props.targetTableConfig.tableName,
            region: cdk.Aws.REGION,
            versionId: 'LATEST'
          }         
        },
        encryptionConfiguration: encryptionConfig,
        errorOutputPrefix: 'failed/!{firehose:error-output-type}/year=!{timestamp:yyyy}/month=!{timestamp:MM}/day=!{timestamp:dd}/hour=!{timestamp:HH}/',
        prefix: 'processed/year=!{timestamp:yyyy}/month=!{timestamp:MM}/day=!{timestamp:dd}/hour=!{timestamp:HH}/',
        processingConfiguration: props.processingConfig,
        s3BackupConfiguration: backupConfig,
        s3BackupMode: props.sourceBackupConfig ? 'Enabled' : 'Disabled'
      }
    });

    this.kinesisFirehoseArn = transformerDS.attrArn;
    this.streamName = transformerDS.deliveryStreamName as string
  }
}

export function makeLakeFormationResource(construct: cdk.Construct, resourceId: string, permissionId:string, ccPermissionId:string, bucketArn: string, roleArn:string, ccRoleArn:string) {
  const dlResource = new CfnResource(construct, resourceId, {
    resourceArn: bucketArn,
    roleArn: roleArn,
    useServiceLinkedRole: false
  });

  const dlPermission = new CfnPermissions(construct, permissionId, {
    dataLakePrincipal: {
      dataLakePrincipalIdentifier: roleArn,
    },
    resource: {
      dataLocationResource: {
        s3Resource: bucketArn
      }
    },
    permissions: [
      'DATA_LOCATION_ACCESS'
    ]
  });
  dlPermission.node.addDependency(dlResource)

  const dlCCPermission = new CfnPermissions(construct, ccPermissionId, {
    dataLakePrincipal: {
      dataLakePrincipalIdentifier: ccRoleArn,
    },
    resource: {
      dataLocationResource: {
        s3Resource: bucketArn
      }
    },
    permissions: [
      'DATA_LOCATION_ACCESS'
    ]
  });
  dlCCPermission.node.addDependency(dlResource)
}

export function allowLakeFormationTableAccess(construct: cdk.Construct, dbPermissionId: string, tablePermissionId: string, databaseName:string, table:Table, roleArn:string, cc:CustomGlueClassificationResource) {
  // Job LakeFormation permission to allow access to create table under secure_db
  const lfp = new CfnPermissions(construct, dbPermissionId, {
    dataLakePrincipal: {
      dataLakePrincipalIdentifier: roleArn,
    },
    resource: {
      databaseResource: {
        name: databaseName
      }
    },
    permissions: [
      'ALTER',
      'CREATE_TABLE',
      'DROP'
    ]
  });

  lfp.node.addDependency(table);
  cc.node.addDependency(lfp)

  // do I need these lakeformation permissions for the kinesis role?
  const tablePermission = new CfnPermissions(construct, tablePermissionId, {
    dataLakePrincipal: {
      dataLakePrincipalIdentifier: roleArn
    },
    resource: {
      tableResource: {
          databaseName: databaseName,
          name: table.tableName,
      }
    },
    permissions: [
      'ALTER',
      'DROP',
      'DELETE',
      'INSERT',
      'SELECT'
    ]
  });

  tablePermission.node.addDependency(table)
}

export function getDataFormatString(format:DataFormat): string {
    // Big Ole giant hack fix later
    switch(format){
      case DataFormat.APACHE_LOGS:
        return 'apache_logs'
      case DataFormat.AVRO:
        return 'avro'
      case DataFormat.CLOUDTRAIL_LOGS:
        return 'cloudtrail_logs'
      case DataFormat.CSV:
        return 'csv'
      case DataFormat.JSON:
        return 'json'
      case DataFormat.LOGSTASH:
        return 'logstash'
      case DataFormat.ORC:
        return 'orc'
      case DataFormat.PARQUET:
        return 'parquet'
      default:
        return 'json'
    }
}