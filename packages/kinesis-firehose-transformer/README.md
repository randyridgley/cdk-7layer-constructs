# @cdk-7layer-constructs/kinesis-firehose-transformer

[![cdkdx](https://img.shields.io/badge/buildtool-cdkdx-blue.svg)](https://github.com/hupe1980/cdkdx)
[![typescript](https://img.shields.io/badge/jsii-typescript-blueviolet.svg)](https://www.npmjs.com/package/@cdk-7layer-constructs/kinesis-firehose-transformer)
[![python](https://img.shields.io/badge/jsii-python-blueviolet.svg)](https://pypi.org/project/cdk-7layer-constructs.kinesis-firehose-transformer/)

> Kinesis Firehose Transformer

## Install
TypeScript/JavaScript:

```bash
npm i @cdk-7layer-constructs/kinesis-firehose-transformer
```

Python:

```bash
pip install cdk-7layer-constructs/kinesis-firehose-transformer
```

## How to use

```typescript
import { Construct, Stack, StackProps, RemovalPolicy } from '@aws-cdk/core';
import { KinesisFirehoseTransformer } from '@cdk-7layer-constructs/kinesis-firehose-transformer';
import { RetentionDays } from '@aws-cdk/aws-logs'
import { Database, Schema, DataFormat } from '@aws-cdk/aws-glue'
import { Bucket } from '@Aws-cdk/aws-s3'

export class KinesisFirehoseTransformerAppStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const sourceDatabase = new Database(this, 'SourceDatabase', {
      databaseName: 'source_database'
    })

    const targetDatabase = new Database(this, 'TargetDatabase', {
      databaseName: 'target_database'
    })

    const sourceBucket = new Bucket(this, 'SourceBucket')
    const targetBukcet = new Bucket(this, 'TargetBucket')

    const cols = [
      {
        name: "created_at",
        type: Schema.STRING
      },
      {
        name: "id",
        type: Schema.BIG_INT
      }
    ]

    new KinesisFirehoseTransformer(this, 'KinesisConverter', {
      createEncryptionKey: true,
      deliveryStreamName: 'test-delivery',
      enableCloudwatchLogging: true,
      targetTableConfig: {
        columns: cols,
        databaseArn: targetDatabase.databaseArn,
        tableName: 'targe_table',
        s3BucketArn: targetBukcet.bucketArn,
        s3prefix: 'processed/'
      },
      logsConfig: {
        logsGroupName: '/aws/kinesisfirehose/test-delivery',
        logsRemovalPolicy: RemovalPolicy.DESTROY,
        logsRetentionDays: RetentionDays.ONE_WEEK
      },
      sourceBackupConfig: {
        columns: cols,
        databaseArn: sourceDatabase.databaseArn,
        tableName: 'source_table',
        s3BucketArn: sourceBucket.bucketArn,
        s3prefix: 'raw/',
        dataFormat: DataFormat.JSON
      },
      useLakeformation: true
    })
  }
}
```

## API Reference

See [API.md](https://github.com/randyridgley/cdk-7layer-constructs/tree/master/packages/kinesis-firehose-transformer/API.md).

## Example

See more complete [examples](https://github.com/randyridgley/cdk-7layer-constructs/tree/master/examples).

## License

[Apache 2.0](https://github.com/randyridgley/cdk-7layer-constructs/tree/master/packages/cdk-blue-green-container-deployment//LICENSE)