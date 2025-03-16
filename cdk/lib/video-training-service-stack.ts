import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import { VtConfig } from "./config";
import { VtVpc } from "./network/vpc";
import { VtVpn } from "./network/vpn";
import { VtCognito } from "./authentication/cognito";
import { VtVpcEndpoint } from "./network/vpc-endpoint";
import { VtNetworkFirewall } from "./network/network-firewall";
import { VtAlb } from "./application/alb";
import { VtHostedZone } from "./application/hosted-zone";
import { VtLambda } from "./application/lambda";
import { VtS3 } from "./storage/s3";
import { VtDynamoDb } from "./db/dynamodb";
import { VtStepFunctions } from "./application/step-functions";
import { VtResolverEndpoint } from "./network/resolver-endpoint";

export class VideoTrainingServiceStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    /*
     * Application Configuration
     */
    const config = new VtConfig(this, "VtConfig");

    /*
     * Network
     * - VPC
     * - Firewall
     * - Endpoint
     * - VPN
     * - Resolver Endpoint
     */
    const vtVpc = new VtVpc(this, "VtVpc", { config });

    const vtNetworkFirewall = new VtNetworkFirewall(this, "VtFirewall", {
      config,
      vtVpc,
    });

    const vtVpcEndpoint = new VtVpcEndpoint(this, "VtVpcEndpoint", {
      config,
      vtVpc,
    });

    const vtVpn = new VtVpn(this, "VtVpn", { config, vtVpc });

    if (config.useSite2SiteVpn) {
      new VtResolverEndpoint(this, "VtResolverEndpoint", { config, vtVpc });
    }

    /*
     * Authentication
     * - Cognito
     */
    const vtCognito = new VtCognito(this, "VtCognito", { config });

    /*
     * Storage
     * - S3
     */
    const vtS3 = new VtS3(this, "VtS3", {
      config,
      vtVpcEndpoint,
    });

    /*
     * DB
     * - DynamoDB
     */
    const vtDynamoDb = new VtDynamoDb(this, "VtDynamoDb", { config });

    /*
     * Application
     * - StepFunctions
     * - Lambda
     * - ALB
     * - Route53 HostedZone
     */
    const vtStepFunctions = new VtStepFunctions(this, "VtStepfunctions", {
      config,
      vtDynamoDb,
      vtS3,
    });

    const vtLambda = new VtLambda(this, "VtLambda", {
      config,
      vtVpc,
      vtVpcEndpoint,
      vtDynamoDb,
      vtS3,
      vtStepFunctions,
    });

    const vtAlb = new VtAlb(this, "VtAlb", {
      config,
      vtVpc,
      vtVpcEndpoint,
      vtVpn,
      vtCognito,
      vtLambda,
    });

    const vtHostedZone = new VtHostedZone(this, "VtHostedZone", {
      config,
      vtVpc,
      vtAlb,
    });

    /*
     * Cloudformation Output
     */
    /*
    new cdk.CfnOutput(this, "LetterBucketName", {
      value: vt,
    });
*/
  }
}
