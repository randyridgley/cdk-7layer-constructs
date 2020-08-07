import * as cfn from '@aws-cdk/aws-cloudformation'
import * as lambda from '@aws-cdk/aws-lambda'
import * as cdk from '@aws-cdk/core'
import * as iam  from '@aws-cdk/aws-iam'
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
        provider: cfn.CustomResourceProvider.lambda(
          new lambda.SingletonFunction(
            this,
            "CustomGlueClassificationResourceFunction",
            {
              uuid: uuid(),
              code: lambda.Code.fromAsset(
                path.join(__dirname, "lambdas/custom-glue-classification-resource")
              ),
              handler: "index.handler",
              timeout: cdk.Duration.seconds(30),
              runtime: lambda.Runtime.NODEJS_12_X,
              role: iam.Role.fromRoleArn(this, 'CustomRole', props.roleArn)
            }
          )
        ),
        properties: props
      }
    );
  }
}

// hack uuid not installing correctly just need unique string for lambda custom resources
export function uuid() :string {
  return `${randomString(8)}-${randomString(4)}-${randomString(4)}-${randomString(4)}-${randomString(12)}`
}

export function randomString(length: number = 10, alphabet: string = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'): string {
  let text = '';

  for (let i = 0; i < length; i++) {
    text =
      text + alphabet.charAt(Math.floor(Math.random() * alphabet.length));
  }

  return text;
}
