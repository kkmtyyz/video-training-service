import { Construct } from "constructs";
import { RemovalPolicy } from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import { VtConfig } from "./config";
import { VtVpc } from "./vpc";

interface VtVpcEndpointProps {
  config: VtConfig;
  vtVpc: VtVpc;
}

export class VtVpcEndpoint extends Construct {
  // Endpoint
  s3Gateway: ec2.GatewayVpcEndpoint;
  s3Interface: ec2.InterfaceVpcEndpoint;
  dynamodbGateway: ec2.GatewayVpcEndpoint;
  logs: ec2.InterfaceVpcEndpoint;
  sfn: ec2.InterfaceVpcEndpoint;

  // Security Group
  s3Sg: ec2.SecurityGroup;
  logsSg: ec2.SecurityGroup;
  sfnSg: ec2.SecurityGroup;

  constructor(scope: Construct, id: string, props: VtVpcEndpointProps) {
    super(scope, id);
    const config = props.config;
    const vtVpc = props.vtVpc;

    // S3 Gateway Endpoint
    this.s3Gateway = vtVpc.vpc.addGatewayEndpoint("S3Gateway", {
      service: ec2.GatewayVpcEndpointAwsService.S3,
      subnets: [{ subnets: vtVpc.privateSubnets }],
    });
    this.s3Gateway.applyRemovalPolicy(RemovalPolicy.DESTROY);

    // S3 Interface Endpoint
    this.s3Sg = new ec2.SecurityGroup(this, "S3SG", {
      vpc: vtVpc.vpc,
    });

    /*
     * デフォルトで以下2設定が有効
     *   - プライベートDNS名
     *   - インバウンドエンドポイントに対してのみのプライベートDNS
     */
    this.s3Interface = vtVpc.vpc.addInterfaceEndpoint("S3", {
      service: ec2.InterfaceVpcEndpointAwsService.S3,
      securityGroups: [this.s3Sg],
      subnets: { subnets: vtVpc.privateSubnets },
    });

    // DynamoDB Gateway Endpoint
    this.dynamodbGateway = vtVpc.vpc.addGatewayEndpoint("DynamoDbGateway", {
      service: ec2.GatewayVpcEndpointAwsService.DYNAMODB,
      subnets: [{ subnets: vtVpc.privateSubnets }],
    });
    this.dynamodbGateway.applyRemovalPolicy(RemovalPolicy.DESTROY);

    // Cloudwatch Logs Endpoint
    this.logsSg = new ec2.SecurityGroup(this, "LogsSG", {
      vpc: vtVpc.vpc,
    });
    this.logsSg.addEgressRule(ec2.Peer.anyIpv4(), ec2.Port.allTraffic());

    this.logs = vtVpc.vpc.addInterfaceEndpoint("Logs", {
      service: ec2.InterfaceVpcEndpointAwsService.CLOUDWATCH_LOGS,
      securityGroups: [this.logsSg],
      subnets: { subnets: vtVpc.privateSubnets },
    });

    // Step Functions Endpoint
    this.sfnSg = new ec2.SecurityGroup(this, "StepFunctionsSG", {
      vpc: vtVpc.vpc,
    });
    this.sfnSg.addEgressRule(ec2.Peer.anyIpv4(), ec2.Port.allTraffic());

    this.sfn = vtVpc.vpc.addInterfaceEndpoint("StepFunctions", {
      service: ec2.InterfaceVpcEndpointAwsService.STEP_FUNCTIONS,
      securityGroups: [this.sfnSg],
      subnets: { subnets: vtVpc.privateSubnets },
    });
  }
}
