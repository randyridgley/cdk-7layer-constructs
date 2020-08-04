import { expect as expectCDK, matchTemplate, MatchStyle } from '@aws-cdk/assert';
import { App } from '@aws-cdk/core';
import { KinesisFirehoseTransformerAppStack } from '../kinesis-firehose-transformer-app-stack';

test('Empty Stack', () => {
  // GIVEN
  const app = new App();
  
  // WHEN
  const stack = new KinesisFirehoseTransformerAppStack(app, 'KinesisFirehoseTransformerAppStack');
  
  // THEN
  expectCDK(stack).to(matchTemplate({ 'Resources': {} }, MatchStyle.EXACT))
});