import * as glue from '@aws-cdk/aws-glue';
import * as iam from '@aws-cdk/aws-iam';
import * as kdf from '@aws-cdk/aws-kinesisfirehose';
import * as kms from '@aws-cdk/aws-kms';
import * as logs from '@aws-cdk/aws-logs';
import * as s3 from '@aws-cdk/aws-s3';
import * as cdk from '@aws-cdk/core';

export interface TargetGlueTableConfig {
  readonly columns: glue.Column[],
  readonly glueDatabaseArn: string,
  readonly targetS3BucketArn?: string
  readonly targetS3prefix?: string
  readonly tableName: string
}

export interface SourceBackupConfig {
  readonly columns: glue.Column[],
  readonly glueDatabaseArn: string,
  readonly targetS3BucketArn?: string
  readonly targetS3prefix?: string
  readonly tableName: string
}

export interface LogsConfig {
  readonly logsRetentionDays?: logs.RetentionDays;
  readonly logsRemovalPolicy?: cdk.RemovalPolicy;
  readonly logsGroupName: string;
}

export interface KinesisFirehoseTransformerProps {
  readonly targetTableConfig: TargetGlueTableConfig;
  readonly sourceBackupConfig?: SourceBackupConfig;
  readonly processingConfig?: kdf.CfnDeliveryStream.ProcessingConfigurationProperty;
  readonly logsConfig?: LogsConfig;
  readonly deliveryStreamName: string;
  readonly enableCloudwatchLogging: boolean;
  readonly createEncryptionKey: boolean;
}

export class KinesisFirehoseTransformer extends cdk.Construct {
  public readonly kinesisFirehoseArn: string;

  constructor(scope: cdk.Construct, id: string, props: KinesisFirehoseTransformerProps) {
    super(scope, id);

    const firehoseLogGroup = new logs.LogGroup(this, 'KinesisFirehoseLogGroup', {
      logGroupName: props.logsConfig ? props.logsConfig.logsGroupName : `/aws/kinesis-firehose/${props.deliveryStreamName}`,
      retention: props.logsConfig ? props.logsConfig.logsRetentionDays : logs.RetentionDays.ONE_WEEK,
      removalPolicy: props.logsConfig ? props.logsConfig.logsRemovalPolicy : cdk.RemovalPolicy.RETAIN
    });

    const firehoseLogStream = new logs.LogStream(this, 'KinesisFirehoseLogStream', {
      logGroup: firehoseLogGroup,
      removalPolicy: props.logsConfig ? props.logsConfig.logsRemovalPolicy : cdk.RemovalPolicy.RETAIN
    });

    const firehoseLogStreamArn = `arn:${cdk.Aws.PARTITION}:logs:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:log-group:${firehoseLogGroup.logGroupName}:log-stream:${firehoseLogStream.logStreamName}`;

    const kdfTransformerRole = new iam.Role(this, 'FirehoseRole', {
      assumedBy: new iam.ServicePrincipal('firehose.amazonaws.com'),
      inlinePolicies: {
        'GluePermissions' : new iam.PolicyDocument({
          statements : [
              new iam.PolicyStatement({
                  actions : [
                    "glue:GetTableVersions"
                  ],
                  resources : ["*"]
              })
          ]
        }),
        'CloudWatchPermissions': new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              actions: ['cloudwatch:PutMetricData'],
              resources: ['*']
            })
          ]
        }),
        'LogsPermissions': new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              actions: ['logs:DescribeLogStreams', 'logs:DescribeLogGroups'],
              resources: [
                firehoseLogGroup.logGroupArn,
                `arn:${cdk.Aws.PARTITION}:logs:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:log-group:*`
              ]        
            })
          ]
        }),
        'LogsPutPermissions': new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              actions: ['logs:PutLogEvents'],
              resources: [firehoseLogStreamArn]
            })
          ]
        })
      }
    });

    let encryptionConfig: kdf.CfnDeliveryStream.EncryptionConfigurationProperty | undefined

    if(props.createEncryptionKey) {
      const encryptionKey = new kms.Key(this, 'TransformerKmsKey', {
        alias: `${props.deliveryStreamName}TransformerKey`,
        description: `Encryption key for all data using ${props.deliveryStreamName}`,
        enabled: true,
        enableKeyRotation: true,
        removalPolicy: cdk.RemovalPolicy.RETAIN // how to handle this?
      });
  
      encryptionKey.grantEncryptDecrypt(kdfTransformerRole);

      encryptionConfig = {
        kmsEncryptionConfig: {
          awskmsKeyArn: encryptionKey.keyArn              
        }
      }
    }

    let backupConfig: kdf.CfnDeliveryStream.S3DestinationConfigurationProperty | undefined;

    if(props.sourceBackupConfig) {
      const sourceDatabase = glue.Database.fromDatabaseArn(this, 'GlueSourceDatabase', props.sourceBackupConfig.glueDatabaseArn);

      let sourceBucket:s3.IBucket;

      if(props.sourceBackupConfig.targetS3BucketArn) {
        sourceBucket = s3.Bucket.fromBucketArn(this, 'SourceS3Bucket', props.sourceBackupConfig.targetS3BucketArn)
      } else {
        sourceBucket = new s3.Bucket(this, 'SourceS3Bucket', {});
      }

      sourceBucket.grantReadWrite(kdfTransformerRole);

      kdfTransformerRole.addToPolicy(new iam.PolicyStatement({
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

      new glue.Table(this, 'SourceGlueTable', {
        columns: props.sourceBackupConfig.columns,
        dataFormat: glue.DataFormat.JSON,
        database: sourceDatabase,
        tableName: props.sourceBackupConfig.tableName,
        bucket: sourceBucket,
        compressed: false,
        description: `Backup original data table for ${props.sourceBackupConfig.tableName}`,
        s3Prefix: props.sourceBackupConfig.targetS3prefix ?? `${props.sourceBackupConfig.tableName}/processed/`,
        storedAsSubDirectories: false,      
      });

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

    let targetDatabase = glue.Database.fromDatabaseArn(this, 'GlueTargetDatabase', props.targetTableConfig.glueDatabaseArn);            
    let targetBucket:s3.IBucket;

    if(props.targetTableConfig.targetS3BucketArn) {
      targetBucket = s3.Bucket.fromBucketArn(this, 'TargetS3Bucket', props.targetTableConfig.targetS3BucketArn)
    } else {
      targetBucket = new s3.Bucket(this, 'TargetS3Bucket', {});
    }

    targetBucket.grantReadWrite(kdfTransformerRole);

    kdfTransformerRole.addToPolicy(new iam.PolicyStatement({
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

    // append the YYYY/MM/DD/HH columns to the list of columns
    new glue.Table(this, 'TargetParquetTable', {
      columns: props.targetTableConfig.columns,
      dataFormat: glue.DataFormat.PARQUET,
      database: targetDatabase,
      tableName: props.targetTableConfig.tableName,
      bucket: targetBucket,
      compressed: false,
      description: `Target Parquet Table for ${props.targetTableConfig.tableName}`,
      s3Prefix: props.targetTableConfig.targetS3prefix ?? `${props.targetTableConfig.tableName}/processed/`,
      storedAsSubDirectories: false,      
    });

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
  }
}
