import { expect as expectCDK, haveResource } from '@aws-cdk/assert';
import { App, Stack } from '@aws-cdk/core';
import { KinesisFirehoseTransformer } from '../kinesis-firehose-transformer';
import { Schema } from '@aws-cdk/aws-glue'

test('default setup', () => {
  // GIVEN
  const app = new App();
  
  const stack = new Stack(app, 'TestStack');
  
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
  // WHEN
  new KinesisFirehoseTransformer(stack, 'KinesisFirehoseTransformer', {
    createEncryptionKey: false,
    deliveryStreamName: 'test-stream',
    enableCloudwatchLogging: false,
    targetTableConfig: {
      columns: cols,
      databaseArn: "arn:aws:glue:region:account-id:database/databaseName",
      tableName: 'testTable',
      s3BucketArn: 'arn:aws:s3:::bucket_name',
      s3prefix: 'processed/'
    },
    logsConfig: {
      logsGroupName: '/aws/test/firehose/'
    },
  });
  
  // THEN
  expectCDK(stack).to(haveResource('AWS::KinesisFirehose::DeliveryStream'));
});