#!/usr/bin/env node
import 'source-map-support/register';

import { App } from '@aws-cdk/core';
import { FargateTwitterReaderAppStack } from './fargate-twitter-reader-app-stack';

const app = new App();
new FargateTwitterReaderAppStack(app, 'FargateTwitterReaderAppStack');
