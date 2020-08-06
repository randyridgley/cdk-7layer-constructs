import { Construct, Stack, StackProps, RemovalPolicy } from '@aws-cdk/core';
import { KinesisFirehoseTransformer } from '@cdk-7layer-constructs/kinesis-firehose-transformer';
import { RetentionDays } from '@aws-cdk/aws-logs'
import { Database, Schema } from '@aws-cdk/aws-glue'
import { Bucket } from '@Aws-cdk/aws-s3'

export class KinesisFirehoseTransformerAppStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const sourceDatabase = new Database(this, 'SourceDatabase', {
      databaseName: 'source_database'
    })

    const targetDatabase = new Database(this, 'TargetDatabase', {
      databaseName: 'target_database'
    })

    const sourceBucket = new Bucket(this, 'SourceBucket')
    const targetBukcet = new Bucket(this, 'TargetBucket')

    const cols = [
      {
        name: "created_at",
        type: Schema.STRING
      },
      {
        name: "id",
        type: Schema.BIG_INT
      }
    ]

    new KinesisFirehoseTransformer(this, 'KinesisConverter', {
      createEncryptionKey: true,
      deliveryStreamName: 'test-delivery',
      enableCloudwatchLogging: true,
      targetTableConfig: {
        columns: cols,
        databaseArn: targetDatabase.databaseArn,
        tableName: 'targe_table',
        s3BucketArn: targetBukcet.bucketArn,
        s3prefix: 'processed/'
      },
      logsConfig: {
        logsGroupName: '/aws/kinesisfirehose/test-delivery',
        logsRemovalPolicy: RemovalPolicy.DESTROY,
        logsRetentionDays: RetentionDays.ONE_WEEK
      },
      sourceBackupConfig: {
        columns: cols,
        databaseArn: sourceDatabase.databaseArn,
        tableName: 'source_table',
        s3BucketArn: sourceBucket.bucketArn,
        s3prefix: 'raw/'
      },
      useLakeformation: true
    })
  }
}
