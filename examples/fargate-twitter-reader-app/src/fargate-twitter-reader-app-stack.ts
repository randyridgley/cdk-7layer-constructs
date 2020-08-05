import { Construct, Stack, StackProps, RemovalPolicy } from '@aws-cdk/core';
import * as ft from '@cdk-7layer-constructs/fargate-twitter-reader';
import * as kft from '@cdk-7layer-constructs/kinesis-firehose-transformer';
import * as s3 from '@aws-cdk/aws-s3';

export class FargateTwitterReaderAppStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const bucket = new s3.Bucket(this, 'TwitterBucket', {
      removalPolicy: RemovalPolicy.DESTROY      
    });

    const twitter = new kft.KinesisFirehoseTransformer(this, 'TwitterFirehose', {
      createEncryptionKey: true,
      deliveryStreamName: 'twitter-firehose',
      enableCloudwatchLogging: true,
      targetTableConfig: {
        columns: [],
        glueDatabaseArn: 'arn',
        tableName: 'r_twitter',
        targetS3BucketArn: bucket.bucketArn,
        targetS3prefix: 'twitter/raw/'
      }      
    });

    new ft.FargateTwitterReader(this, 'FargateTwitterReader', {
      kinesisFirehoseName: twitter.deliveryStreamName,
      languages: ['en', 'es', 'fr'],
      topics: ['aws', 'cdk', 'devops'],
      twitterConfig: {
        consumerKey: 'ndnkjrng',
        accessToken: 'bjkefnkwfn',
        accessTokenSecret: 'njkefwkjfk',
        consumerSecret: 'nfkjsnfkjengk'
      }
    });    
  }
}
