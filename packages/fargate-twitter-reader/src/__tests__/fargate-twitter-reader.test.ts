import { expect as expectCDK, haveResource } from '@aws-cdk/assert';
import { App, Stack } from '@aws-cdk/core';
import { FargateTwitterReader } from '../fargate-twitter-reader';

test('default setup', () => {
  // GIVEN
  const app = new App();
  
  const stack = new Stack(app, 'TestStack');
  
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
    }
  });
  
  // THEN
  expectCDK(stack).to(haveResource('AWS::ECS::Cluster'));
});