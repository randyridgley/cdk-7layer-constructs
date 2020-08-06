import * as cdk from '@aws-cdk/core';
import * as kdf from '@aws-cdk/aws-kinesisfirehose';
import { Column, Database, DataFormat, Table, Schema } from '@aws-cdk/aws-glue';
import { PolicyStatement, PolicyDocument, Role, ServicePrincipal } from '@aws-cdk/aws-iam';
import { Key } from '@aws-cdk/aws-kms';
import { CfnPermissions, CfnResource } from '@aws-cdk/aws-lakeformation';
import { LogGroup, LogStream, RetentionDays } from '@aws-cdk/aws-logs';
import { Bucket } from '@aws-cdk/aws-s3';

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
}

export interface LogsConfig {
  readonly logsRetentionDays?: RetentionDays;
  readonly logsRemovalPolicy?: cdk.RemovalPolicy;
  readonly logsGroupName: string;
}

export interface KinesisFirehoseTransformerProps {
  readonly targetTableConfig: TargetTableConfig;
  readonly sourceBackupConfig?: SourceBackupConfig;
  readonly processingConfig?: kdf.CfnDeliveryStream.ProcessingConfigurationProperty;
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

    const firehoseLogGroup = new LogGroup(this, 'KinesisFirehoseLogGroup', {
      logGroupName: props.logsConfig ? props.logsConfig.logsGroupName : `/aws/kinesis-firehose/${props.deliveryStreamName}`,
      retention: props.logsConfig ? props.logsConfig.logsRetentionDays : RetentionDays.ONE_WEEK,
      removalPolicy: props.logsConfig ? props.logsConfig.logsRemovalPolicy : cdk.RemovalPolicy.RETAIN
    });

    const firehoseLogStream = new LogStream(this, 'KinesisFirehoseLogStream', {
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

    const kdfTransformerRole = new Role(this, 'FirehoseRole', {
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

    let encryptionConfig: kdf.CfnDeliveryStream.EncryptionConfigurationProperty | undefined

    if(props.createEncryptionKey) {
      const encryptionKey = new Key(this, 'TransformerKmsKey', {
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

    let backupConfig: kdf.CfnDeliveryStream.S3DestinationConfigurationProperty | undefined;

    if(props.sourceBackupConfig) {
      const sourceDatabase = Database.fromDatabaseArn(this, 'GlueSourceDatabase', props.sourceBackupConfig.databaseArn);

      let sourceBucket:Bucket;

      if(props.sourceBackupConfig.s3BucketArn) {
        sourceBucket = Bucket.fromBucketArn(this, 'SourceS3Bucket', props.sourceBackupConfig.s3BucketArn) as Bucket
      } else {
        sourceBucket = new Bucket(this, 'SourceS3Bucket', {});
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
        makeLakeFormationResource(this, 'SourceDataLakeBucketResource', sourceBucket.bucketArn, kdfTransformerRole.roleArn);
      }

      const sourceTable = new Table(this, 'SourceGlueTable', {
        columns: props.sourceBackupConfig.columns,
        dataFormat: DataFormat.JSON,
        database: sourceDatabase,
        tableName: props.sourceBackupConfig.tableName,
        bucket: sourceBucket,
        compressed: false,
        description: `Backup original data table for ${props.sourceBackupConfig.tableName}`,
        s3Prefix: props.sourceBackupConfig.s3prefix ?? `${props.sourceBackupConfig.tableName}/processed/`,
        storedAsSubDirectories: false,     
        partitionKeys: partitionKeys 
      });

      if(props.useLakeformation) {
        allowLakeFormationTableAccess(this, 'SourceTable', sourceDatabase.databaseName, sourceTable, kdfTransformerRole.roleArn)
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

    let targetDatabase = Database.fromDatabaseArn(this, 'GlueTargetDatabase', props.targetTableConfig.databaseArn);            
    let targetBucket:Bucket;

    if(props.targetTableConfig.s3BucketArn) {
      targetBucket = Bucket.fromBucketArn(this, 'TargetS3Bucket', props.targetTableConfig.s3BucketArn) as Bucket
    } else {
      targetBucket = new Bucket(this, 'TargetS3Bucket', {});
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
      makeLakeFormationResource(this, 'TargetDataLakeBucketResource', targetBucket.bucketArn, kdfTransformerRole.roleArn);
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

    if(props.useLakeformation) {
      allowLakeFormationTableAccess(this, 'SourceTable', targetDatabase.databaseName, targetTable, kdfTransformerRole.roleArn)
    }

    const transformerDS = new kdf.CfnDeliveryStream(this, 'TransformerDeliveryStream', {
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

export function makeLakeFormationResource(construct: cdk.Construct, id: string, bucketArn: string, roleArn:string) {
  const dlResource = new CfnResource(construct, `${id}Resource`, {
    resourceArn: bucketArn,
    roleArn: roleArn,
    useServiceLinkedRole: false
  });

  const dlPermission = new CfnPermissions(construct, `${id}Permission`, {
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
}

export function allowLakeFormationTableAccess(construct: cdk.Construct, id: string, databaseName:string, table:Table, roleArn:string) {
      // Job LakeFormation permission to allow access to create table under secure_db
      new CfnPermissions(construct, `${id}DBPermission`, {
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

      // do I need these lakeformation permissions for the kinesis role?
      const tablePermission = new CfnPermissions(construct, `${id}TablePermissions`, {
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
