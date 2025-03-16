import { Construct } from "constructs";
import { Duration } from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as iam from "aws-cdk-lib/aws-iam";
import { VtConfig } from "../config";
import { VtVpc } from "../network/vpc";
import { VtVpcEndpoint } from "../network/vpc-endpoint";
import { VtDynamoDb } from "../db/dynamodb";
import { VtS3 } from "../storage/s3";
import { VtStepFunctions } from "./step-functions";

interface VtLambdaProps {
  config: VtConfig;
  vtVpc: VtVpc;
  vtVpcEndpoint: VtVpcEndpoint;
  vtDynamoDb: VtDynamoDb;
  vtS3: VtS3;
  vtStepFunctions: VtStepFunctions;
}

export class VtLambda extends Construct {
  lambdaRole: iam.Role;
  lambdaSg: ec2.SecurityGroup;
  apiFunction: lambda.Function;

  constructor(scope: Construct, id: string, props: VtLambdaProps) {
    super(scope, id);
    const config = props.config;
    const vtVpc = props.vtVpc;
    const vtVpcEndpoint = props.vtVpcEndpoint;
    const vtDynamoDb = props.vtDynamoDb;
    const vtS3 = props.vtS3;
    const vtStepFunctions = props.vtStepFunctions;

    // IAM Role
    this.lambdaRole = new iam.Role(this, "LambdaRole", {
      assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
    });
    this.lambdaRole.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName(
        "service-role/AWSLambdaVPCAccessExecutionRole",
      ),
    );
    new iam.Policy(this, "LambdaRolePolicy", {
      statements: [
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: ["dynamodb:*"],
          resources: [
            vtDynamoDb.trainingTable.tableArn,
            vtDynamoDb.userTrainingStatusTable.tableArn,
          ],
        }),
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: ["s3:*"],
          resources: [
            vtS3.webBucket.bucketArn,
            vtS3.webBucket.bucketArn + "/*",
            vtS3.uploadBucket.bucketArn,
            vtS3.uploadBucket.bucketArn + "/*",
          ],
        }),
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: ["states:*"],
          resources: [vtStepFunctions.mediaConvertStateMachine.stateMachineArn],
        }),
      ],
    }).attachToRole(this.lambdaRole);

    // Security Group
    this.lambdaSg = new ec2.SecurityGroup(this, "SecurityGroup", {
      vpc: vtVpc.vpc,
    });
    this.lambdaSg.addIngressRule(
      ec2.Peer.ipv4(vtVpc.vpc.vpcCidrBlock),
      ec2.Port.HTTPS,
    );
    this.lambdaSg.addEgressRule(
      ec2.Peer.securityGroupId(vtVpcEndpoint.s3Sg.securityGroupId),
      ec2.Port.allTraffic(),
    );
    this.lambdaSg.addEgressRule(
      ec2.Peer.securityGroupId(vtVpcEndpoint.sfnSg.securityGroupId),
      ec2.Port.allTraffic(),
    );
    this.lambdaSg.addEgressRule(
      ec2.Peer.securityGroupId(vtVpcEndpoint.logsSg.securityGroupId),
      ec2.Port.allTraffic(),
    );

    // Function
    this.apiFunction = new lambda.Function(this, "ApiFunction", {
      handler: "lambda_function.lambda_handler",
      runtime: lambda.Runtime.PYTHON_3_12,
      timeout: Duration.seconds(120),
      memorySize: 1024,
      role: this.lambdaRole,
      securityGroups: [this.lambdaSg],
      vpc: vtVpc.vpc,
      vpcSubnets: { subnets: vtVpc.privateSubnets },
      applicationLogLevelV2: lambda.ApplicationLogLevel.DEBUG,
      loggingFormat: lambda.LoggingFormat.JSON,
      code: lambda.Code.fromAsset("resources/lambda/api/"),
      environment: {
        TRAININGS_TABLE_NAME: vtDynamoDb.trainingTable.tableName,
        USER_TRAINING_STATUS_TABLE_NAME:
          vtDynamoDb.userTrainingStatusTable.tableName,
        STATE_MACHINE_ARN:
          vtStepFunctions.mediaConvertStateMachine.stateMachineArn,
        S3_REGION_NAME: "ap-northeast-1",
        VIDEO_UPLOAD_BUCKET_NAME: vtS3.uploadBucket.bucketName,
      },
    });
  }
}
