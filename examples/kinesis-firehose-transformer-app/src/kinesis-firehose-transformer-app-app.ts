#!/usr/bin/env node
import 'source-map-support/register';

import { App } from '@aws-cdk/core';
import { KinesisFirehoseTransformerAppStack } from './kinesis-firehose-transformer-app-stack';

const app = new App();
new KinesisFirehoseTransformerAppStack(app, 'KinesisFirehoseTransformerAppStack');
