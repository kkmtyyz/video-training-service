import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import { VtConfig } from "./config";
import { VtVpc } from "./vpc";
import { VtVpn } from "./vpn";
import { VtCognito } from "./cognito";
import { VtVpcEndpoint } from "./vpc-endpoint";
import { VtNetworkFirewall } from "./network-firewall";
import { VtAlb } from "./application-load-balancer";
import { VtHostedZone } from "./hosted-zone";
import { VtLambda } from "./lambda";
import { VtS3 } from "./s3";
import { VtDynamoDb } from "./dynamodb";
import { VtStepFunctions } from "./step-functions";

export class VideoTrainingServiceStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const config = new VtConfig(this, "VtConfig");

    const vtVpc = new VtVpc(this, "VtVpc", { config });

    const vtNetworkFirewall = new VtNetworkFirewall(this, "vtFirewall", {
      config,
      vtVpc,
    });

    const vtVpcEndpoint = new VtVpcEndpoint(this, "vtVpcEndpoint", {
      config,
      vtVpc,
    });

    const vtVpn = new VtVpn(this, "vtVpn", { config, vtVpc });

    const vtCognito = new VtCognito(this, "VtCognito", { config });

    const vtS3 = new VtS3(this, "VtS3", {
      config,
      vtVpcEndpoint,
    });

    const vtDynamoDb = new VtDynamoDb(this, "VtDynamoDb", { config });

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
  }
}
