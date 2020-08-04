import { Construct, Stack, StackProps, RemovalPolicy } from '@aws-cdk/core';
import { KinesisFirehoseTransformer } from '@cdk-7layer-constructs/kinesis-firehose-transformer';
import { RetentionDays } from '@aws-cdk/aws-logs'

export class KinesisFirehoseTransformerAppStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    new KinesisFirehoseTransformer(this, 'KinesisConverter', {
      createEncryptionKey: true,
      deliveryStreamName: 'test-delivery',
      enableCloudwatchLogging: true,
      targetTableConfig: {
        columns: [],
        glueDatabaseArn: "aws:::glue:database",
        tableName: 'testTable',
        targetS3BucketArn: 'arn:::s3:bucket',
        targetS3prefix: 'processed/'
      },
      logsConfig: {
        logsGroupName: '/aws/kinesisfirehose/test-delivery',
        logsRemovalPolicy: RemovalPolicy.DESTROY,
        logsRetentionDays: RetentionDays.ONE_WEEK
      },
      sourceBackupConfig: {
        columns: [],
        glueDatabaseArn: "aws:::glue:database",
        tableName: 'testTable',
        targetS3BucketArn: 'arn:::s3:bucket',
        targetS3prefix: 'raw/'
      }
    })
  }
}
