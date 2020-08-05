import { Construct, Aws, RemovalPolicy } from '@aws-cdk/core';
import { Role, ServicePrincipal, ManagedPolicy, PolicyStatement } from '@aws-cdk/aws-iam';
import { RetentionDays, LogGroup } from '@aws-cdk/aws-logs';
import { DockerImageAsset } from '@aws-cdk/aws-ecr-assets';
import { Vpc, SubnetType, SecurityGroup } from '@aws-cdk/aws-ec2';
import { AwsLogDriver, Cluster, ContainerImage, FargateTaskDefinition, FargateService } from '@aws-cdk/aws-ecs';
import * as sm from '@aws-cdk/aws-secretsmanager';

export interface TwitterConfig {
  readonly consumerKey:string,
  readonly consumerSecret:string,
  readonly accessToken:string,
  readonly accessTokenSecret:string,
}

export interface FargateTwitterReaderProps {
  readonly twitterConfig:TwitterConfig,
  readonly topics: string[],
  readonly languages: string[],
  readonly kinesisFirehoseName: string
}

export class FargateTwitterReader extends Construct {
  constructor(scope: Construct, id: string, props: FargateTwitterReaderProps) {
    super(scope, id);

    const config = {
      "twitter": {
          "consumer_key": props.twitterConfig.consumerKey,
          "consumer_secret": props.twitterConfig.consumerSecret,
          "access_token": props.twitterConfig.accessToken,
          "access_token_secret": props.twitterConfig.accessTokenSecret
      },
      "topics": props.topics,
      "languages": props.languages,
      "kinesis_delivery": props.kinesisFirehoseName
    }

    new sm.CfnSecret(this, 'TwitterConfig', {
      secretString: JSON.stringify(config),
      name: '/cdk-7layer-constructs/twitter-config',
      description: 'Twitter Configuration for Fargate Twitter Reader'      
    });
    
    const ecsRole = new Role(this, 'ECSRole', {
      roleName: 'ECSTwitterReaderRole', 
      assumedBy: new ServicePrincipal('ecs-tasks.amazonaws.com'),
      managedPolicies: [
        ManagedPolicy.fromAwsManagedPolicyName('service-role/AmazonECSTaskExecutionRolePolicy'),
      ]
    });

    ecsRole.addToPolicy(new PolicyStatement({
      actions: [
        "kinesis:PutRecords",
        "secretsmanager:GetSecretValue"
      ],
      resources: [
        `arn:aws:firehose:${Aws.REGION}:${Aws.ACCOUNT_ID}:firehose/${props.kinesisFirehoseName}`,
        `arn:aws:secretsmanager:${Aws.REGION}:${Aws.ACCOUNT_ID}:endpoint/*`
      ]
    }));

    ecsRole.addToPolicy(new PolicyStatement({
      actions: [
        "tag:GetResources",
        "cloudwatch:PutMetricData"
      ],
      resources: ['*']
    }));

    const vpc = new Vpc(this, "FargateVPC", {
      maxAzs: 3,
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: "FargatePublicSubnet",
          subnetType: SubnetType.PUBLIC,
        },
      ],
      natGateways: 0,
    });

    const cluster = new Cluster(this, "FargateCluster", {
      vpc: vpc,
      clusterName: "FargateCluster",
    });

    const twitterTaskDef = new FargateTaskDefinition(this, 'TwitterDriverTaskDefinition', {
        cpu: 1024,
        memoryLimitMiB: 2048,
        taskRole: ecsRole,
        executionRole: ecsRole
    })

    const twitterImage = new DockerImageAsset(this, "TwitterWorkerDockerImage", {
      repositoryName: 'cdk-7layer-constructs/twitter',
      directory: 'container/twitter/'
    });

    const twitterLogGroup = new LogGroup(this, 'TwitterLogGroup', {
      logGroupName: `/cdk-7layer-constucts/tweet-reader/${props.kinesisFirehoseName}`,
      retention: RetentionDays.ONE_WEEK,
      removalPolicy: RemovalPolicy.DESTROY
    });

    twitterTaskDef.addContainer('TwtterDriver', {
      image: ContainerImage.fromDockerImageAsset(twitterImage),
      cpu: 1024,
      memoryLimitMiB: 2048,
      logging: new AwsLogDriver({
          streamPrefix: `${props.kinesisFirehoseName}-TweetDriver`,
          logGroup: twitterLogGroup,
      }),
      dockerLabels: { Name: "TwitterReader", Firehose: `${props.kinesisFirehoseName}` },
      essential: true  
    })

    new FargateService(this, 'TwitterDriverService', {
      cluster: cluster,
      desiredCount: 1,
      taskDefinition: twitterTaskDef,
      securityGroup: SecurityGroup.fromSecurityGroupId(this, 'SGTwitterService', vpc.vpcDefaultSecurityGroup),
      assignPublicIp: true,
      serviceName: `${props.kinesisFirehoseName}-TwitterDriverService`,
      vpcSubnets: {subnetType: SubnetType.PUBLIC}
    });
  }
}
