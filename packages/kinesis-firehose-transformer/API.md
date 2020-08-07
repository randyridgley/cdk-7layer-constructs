# API Reference

**Classes**

Name|Description
----|-----------
[CustomGlueClassificationResource](#cdk-7layer-constructs-kinesis-firehose-transformer-customglueclassificationresource)|*No description*
[KinesisFirehoseTransformer](#cdk-7layer-constructs-kinesis-firehose-transformer-kinesisfirehosetransformer)|*No description*


**Structs**

Name|Description
----|-----------
[CustomGlueClassificationResourceProps](#cdk-7layer-constructs-kinesis-firehose-transformer-customglueclassificationresourceprops)|*No description*
[KinesisFirehoseTransformerProps](#cdk-7layer-constructs-kinesis-firehose-transformer-kinesisfirehosetransformerprops)|*No description*
[LogsConfig](#cdk-7layer-constructs-kinesis-firehose-transformer-logsconfig)|*No description*
[SourceBackupConfig](#cdk-7layer-constructs-kinesis-firehose-transformer-sourcebackupconfig)|*No description*
[TargetTableConfig](#cdk-7layer-constructs-kinesis-firehose-transformer-targettableconfig)|*No description*



## class CustomGlueClassificationResource  <a id="cdk-7layer-constructs-kinesis-firehose-transformer-customglueclassificationresource"></a>



__Implements__: [IConstruct](#constructs-iconstruct), [IConstruct](#aws-cdk-core-iconstruct), [IConstruct](#constructs-iconstruct), [IDependable](#aws-cdk-core-idependable)
__Extends__: [Construct](#aws-cdk-core-construct)

### Initializer




```ts
new CustomGlueClassificationResource(scope: Construct, id: string, props: CustomGlueClassificationResourceProps)
```

* **scope** (<code>[Construct](#aws-cdk-core-construct)</code>)  *No description*
* **id** (<code>string</code>)  *No description*
* **props** (<code>[CustomGlueClassificationResourceProps](#cdk-7layer-constructs-kinesis-firehose-transformer-customglueclassificationresourceprops)</code>)  *No description*
  * **databaseName** (<code>string</code>)  *No description* 
  * **dataFormat** (<code>string</code>)  *No description* 
  * **roleArn** (<code>string</code>)  *No description* 
  * **tableName** (<code>string</code>)  *No description* 




## class KinesisFirehoseTransformer  <a id="cdk-7layer-constructs-kinesis-firehose-transformer-kinesisfirehosetransformer"></a>



__Implements__: [IConstruct](#constructs-iconstruct), [IConstruct](#aws-cdk-core-iconstruct), [IConstruct](#constructs-iconstruct), [IDependable](#aws-cdk-core-idependable)
__Extends__: [Construct](#aws-cdk-core-construct)

### Initializer




```ts
new KinesisFirehoseTransformer(scope: Construct, id: string, props: KinesisFirehoseTransformerProps)
```

* **scope** (<code>[Construct](#aws-cdk-core-construct)</code>)  *No description*
* **id** (<code>string</code>)  *No description*
* **props** (<code>[KinesisFirehoseTransformerProps](#cdk-7layer-constructs-kinesis-firehose-transformer-kinesisfirehosetransformerprops)</code>)  *No description*
  * **createEncryptionKey** (<code>boolean</code>)  *No description* 
  * **deliveryStreamName** (<code>string</code>)  *No description* 
  * **enableCloudwatchLogging** (<code>boolean</code>)  *No description* 
  * **targetTableConfig** (<code>[TargetTableConfig](#cdk-7layer-constructs-kinesis-firehose-transformer-targettableconfig)</code>)  *No description* 
  * **logsConfig** (<code>[LogsConfig](#cdk-7layer-constructs-kinesis-firehose-transformer-logsconfig)</code>)  *No description* __*Optional*__
  * **processingConfig** (<code>[ProcessingConfigurationProperty](#aws-cdk-aws-kinesisfirehose-cfndeliverystream-processingconfigurationproperty)</code>)  *No description* __*Optional*__
  * **sourceBackupConfig** (<code>[SourceBackupConfig](#cdk-7layer-constructs-kinesis-firehose-transformer-sourcebackupconfig)</code>)  *No description* __*Optional*__
  * **useLakeformation** (<code>boolean</code>)  *No description* __*Optional*__



### Properties


Name | Type | Description 
-----|------|-------------
**kinesisFirehoseArn** | <code>string</code> | <span></span>
**streamName** | <code>string</code> | <span></span>
**kmsKeyId**? | <code>string</code> | __*Optional*__



## struct CustomGlueClassificationResourceProps  <a id="cdk-7layer-constructs-kinesis-firehose-transformer-customglueclassificationresourceprops"></a>






Name | Type | Description 
-----|------|-------------
**dataFormat** | <code>string</code> | <span></span>
**databaseName** | <code>string</code> | <span></span>
**roleArn** | <code>string</code> | <span></span>
**tableName** | <code>string</code> | <span></span>



## struct KinesisFirehoseTransformerProps  <a id="cdk-7layer-constructs-kinesis-firehose-transformer-kinesisfirehosetransformerprops"></a>






Name | Type | Description 
-----|------|-------------
**createEncryptionKey** | <code>boolean</code> | <span></span>
**deliveryStreamName** | <code>string</code> | <span></span>
**enableCloudwatchLogging** | <code>boolean</code> | <span></span>
**targetTableConfig** | <code>[TargetTableConfig](#cdk-7layer-constructs-kinesis-firehose-transformer-targettableconfig)</code> | <span></span>
**logsConfig**? | <code>[LogsConfig](#cdk-7layer-constructs-kinesis-firehose-transformer-logsconfig)</code> | __*Optional*__
**processingConfig**? | <code>[ProcessingConfigurationProperty](#aws-cdk-aws-kinesisfirehose-cfndeliverystream-processingconfigurationproperty)</code> | __*Optional*__
**sourceBackupConfig**? | <code>[SourceBackupConfig](#cdk-7layer-constructs-kinesis-firehose-transformer-sourcebackupconfig)</code> | __*Optional*__
**useLakeformation**? | <code>boolean</code> | __*Optional*__



## struct LogsConfig  <a id="cdk-7layer-constructs-kinesis-firehose-transformer-logsconfig"></a>






Name | Type | Description 
-----|------|-------------
**logsGroupName** | <code>string</code> | <span></span>
**logsRemovalPolicy**? | <code>[RemovalPolicy](#aws-cdk-core-removalpolicy)</code> | __*Optional*__
**logsRetentionDays**? | <code>[RetentionDays](#aws-cdk-aws-logs-retentiondays)</code> | __*Optional*__



## struct SourceBackupConfig  <a id="cdk-7layer-constructs-kinesis-firehose-transformer-sourcebackupconfig"></a>






Name | Type | Description 
-----|------|-------------
**columns** | <code>Array<[Column](#aws-cdk-aws-glue-column)></code> | <span></span>
**dataFormat** | <code>[DataFormat](#aws-cdk-aws-glue-dataformat)</code> | <span></span>
**databaseArn** | <code>string</code> | <span></span>
**tableName** | <code>string</code> | <span></span>
**s3BucketArn**? | <code>string</code> | __*Optional*__
**s3prefix**? | <code>string</code> | __*Optional*__



## struct TargetTableConfig  <a id="cdk-7layer-constructs-kinesis-firehose-transformer-targettableconfig"></a>






Name | Type | Description 
-----|------|-------------
**columns** | <code>Array<[Column](#aws-cdk-aws-glue-column)></code> | <span></span>
**databaseArn** | <code>string</code> | <span></span>
**tableName** | <code>string</code> | <span></span>
**s3BucketArn**? | <code>string</code> | __*Optional*__
**s3prefix**? | <code>string</code> | __*Optional*__



