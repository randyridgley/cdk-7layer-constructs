import { expect as expectCDK, matchTemplate, MatchStyle } from '@aws-cdk/assert';
import { App } from '@aws-cdk/core';
import { FargateTwitterReaderAppStack } from '../fargate-twitter-reader-app-stack';

test('Empty Stack', () => {
  // GIVEN
  const app = new App();
  
  // WHEN
  const stack = new FargateTwitterReaderAppStack(app, 'FargateTwitterReaderAppStack');
  
  // THEN
  expectCDK(stack).to(matchTemplate({ 'Resources': {} }, MatchStyle.EXACT))
});