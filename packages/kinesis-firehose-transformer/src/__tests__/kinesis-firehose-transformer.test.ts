import { expect as expectCDK, haveResource } from '@aws-cdk/assert';
import { App, Stack } from '@aws-cdk/core';
import { KinesisFirehoseTransformer } from '../kinesis-firehose-transformer';

test('default setup', () => {
  // GIVEN
  const app = new App();
  
  const stack = new Stack(app, 'TestStack');
  
  // WHEN
  new KinesisFirehoseTransformer(stack, 'KinesisFirehoseTransformer', {
    createEncryptionKey: false,
    deliveryStreamName: 'test-stream',
    enableCloudwatchLogging: false,
    targetTableConfig: {
      columns: [],
      glueDatabaseArn: "aws:::glue:database",
      tableName: 'testTable',
      targetS3BucketArn: 'arn:::s3:bucket',
      targetS3prefix: 'processed/'
    },
    logsConfig: {
      logsGroupName: '/aws/test/firehose/'
    },    
  });
  
  // THEN
  expectCDK(stack).to(haveResource('AWS::Lambda::Function'));
});