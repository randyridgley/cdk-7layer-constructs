#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { CdkKinesisFirehoseTransformerStack } from '../lib/cdk-kinesis-firehose-transformer-stack';

const app = new cdk.App();
new CdkKinesisFirehoseTransformerStack(app, 'CdkKinesisFirehoseTransformerStack');
