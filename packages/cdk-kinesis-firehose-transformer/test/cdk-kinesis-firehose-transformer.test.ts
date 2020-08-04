import { expect as expectCDK, haveResource } from '@aws-cdk/assert';
import * as cdk from '@aws-cdk/core';
import * as kft from '../lib/index';

test('Transformer Created', () => {
    const app = new cdk.App();
    const stack = new cdk.Stack(app, "TestStack");
    // WHEN
    new kft.KinesisFirehoseTransformer(stack, 'MyTestConstruct', {
      createEncryptionKey: false,
      deliveryStreamName: 'testStream',
      enableCloudwatchLogging: true,
      targetTableConfig : {
        columns: [],
        glueDatabaseArn: 'testArn',
        tableName: 'testTable',
        targetS3BucketArn: 'arn:::s3:blah',
        targetS3prefix: 'processed'        
      },
      logsConfig: {
        logsGroupName: '/test/log/group/'
      }, 
      processingConfig: {
        enabled: false,
        processors: []
      },
      sourceBackupConfig: {
        columns: [],
        glueDatabaseArn: 'testArn',
        tableName: 'testBackupTable',
        targetS3BucketArn: 'arn:::s3:blah',
        targetS3prefix: 'raw'
      }
    });
    // THEN
    expectCDK(stack).to(haveResource("AWS::Kinesis::DeliveryStream"));
});