import { expect as expectCDK, haveResource } from '@aws-cdk/assert';
import { App, Stack } from '@aws-cdk/core';
import { SecurityGroup, SubnetType, Vpc } from '@aws-cdk/aws-ec2';
import { FargateTwitterReader } from '../fargate-twitter-reader';

test('default setup', () => {
  // GIVEN
  const app = new App();
  
  const stack = new Stack(app, 'TestStack');
  
  const vpc = new Vpc(app, "FargateVPC", {
    maxAzs: 3,
    subnetConfiguration: [
      {
        cidrMask: 24,
        name: "FargatePublicSubnet",
        subnetType: SubnetType.PUBLIC,
      },
    ],
    natGateways: 0,
  });

  const sg = new SecurityGroup(app, 'TwitterReaderSecurityGroup', {
    vpc: vpc,    
  })

  // WHEN
  new FargateTwitterReader(stack, 'FargateTwitterReader', {
    kinesisFirehoseName: 'twitterFirehose',
    languages: ['en', 'es', 'fr'],
    topics: ['aws', 'cloud', 'fargate'],
    twitterConfig: {
      consumerKey: 'njksdbkjwefk',
      consumerSecret: 'bdjsffgb',
      accessToken: 'ndfkk',
      accessTokenSecret: 'nfdkjhkwjfk'
    },
    serviceSecurityGroup: sg,
    vpc: vpc
  });
  
  // THEN
  expectCDK(stack).to(haveResource('AWS::ECS::Cluster'));
});