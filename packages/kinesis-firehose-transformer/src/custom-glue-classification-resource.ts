import * as lambda from '@aws-cdk/aws-lambda'
import * as cdk from '@aws-cdk/core'
import * as cfn from '@aws-cdk/aws-cloudformation';
import * as iam  from '@aws-cdk/aws-iam'
import * as customResource from '@aws-cdk/custom-resources'
import path = require("path");

export interface CustomGlueClassificationResourceProps {
  readonly dataFormat: string;
  readonly tableName: string;
  readonly databaseName: string;
  readonly roleArn: string
}

export class CustomGlueClassificationResource extends cdk.Construct {
  constructor(scope: cdk.Construct, id: string, props: CustomGlueClassificationResourceProps) {
    super(scope, id);

    new cfn.CustomResource(this, "GlueClassification", {
      provider: new customResource.Provider(this, 'GlueClassificationUpdate', {
        onEventHandler: new lambda.SingletonFunction(this, "CustomGlueClassificationResourceFunction", {
          uuid: 'd8d85062-7bd5-41bc-a1f7-4c00e4fbeac7',
          code: lambda.Code.fromAsset(
            path.join(__dirname, "lambdas/custom-glue-classification-resource")
          ),
          handler: "index.handler",
          timeout: cdk.Duration.seconds(30),
          runtime: lambda.Runtime.NODEJS_12_X,
          role: iam.Role.fromRoleArn(this, 'CustomRole', props.roleArn)
        })      
      }),
      properties: props
    });
  }
}