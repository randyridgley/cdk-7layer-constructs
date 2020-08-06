import { Construct, Stack, StackProps, RemovalPolicy } from '@aws-cdk/core';
import * as ft from '@cdk-7layer-constructs/fargate-twitter-reader';
import * as kft from '@cdk-7layer-constructs/kinesis-firehose-transformer';
import * as s3 from '@aws-cdk/aws-s3';
import * as glue from '@aws-cdk/aws-glue';
import * as ec2 from '@aws-cdk/aws-ec2';

export class FargateTwitterReaderAppStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const db = new glue.Database(this, 'TwitterDatabase', {
      databaseName: 'twitter'
    });

    const bucket = new s3.Bucket(this, 'TwitterBucket', {
      removalPolicy: RemovalPolicy.DESTROY      
    });

    const tweetColumns = [
      {
        name: "created_at",
        type: glue.Schema.STRING
      },
      {
        name: "id",
        type: glue.Schema.BIG_INT
      },
      {
        name: "text",
        type: glue.Schema.STRING
      },
      {
        name: "source",
        type: glue.Schema.SMALL_INT
      },
      {
        name: "truncated",
        type: glue.Schema.BOOLEAN
      }
    ]

    const vpc = new ec2.Vpc(this, "FargateVPC", {
      maxAzs: 3,
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: "FargatePublicSubnet",
          subnetType: ec2.SubnetType.PUBLIC,
        },
      ],
      natGateways: 0,
    });

    const twitter = new kft.KinesisFirehoseTransformer(this, 'TwitterFirehose', {
      createEncryptionKey: true,
      deliveryStreamName: 'twitter-firehose',
      enableCloudwatchLogging: true,
      targetTableConfig: {
        columns: tweetColumns,
        databaseArn: db.databaseArn,
        tableName: 'r_twitter',
        s3BucketArn: bucket.bucketArn,
        s3prefix: 'twitter/raw/'
      },
      useLakeformation: true
    });

    const sg = new ec2.SecurityGroup(this, 'SecurityGroup', {
      vpc: vpc,
      securityGroupName: 'TwitterReaderSG',
      allowAllOutbound: true,
    })

    sg.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(80));
    sg.addIngressRule(sg, ec2.Port.tcp(80));

    new ft.FargateTwitterReader(this, 'FargateTwitterReader', {
      kinesisFirehoseName: twitter.streamName,
      languages: ['en', 'es', 'fr'],
      topics: ['aws', 'cdk', 'devops'],
      twitterConfig: {
        consumerKey: this.node.tryGetContext('consumer_key'),
        consumerSecret: this.node.tryGetContext('consumer_secret'),
        accessToken: this.node.tryGetContext('access_token'),
        accessTokenSecret: this.node.tryGetContext('access_token_secret')   
      },
      serviceSecurityGroup: sg,
      vpc: vpc
    });    
  }
}
