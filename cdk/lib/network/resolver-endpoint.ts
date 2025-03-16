import { Construct } from "constructs";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import { VtConfig } from "../config";
import { VtVpc } from "./vpc";
import * as route53resolver from "aws-cdk-lib/aws-route53resolver";

interface VtResolverEndpointProps {
  config: VtConfig;
  vtVpc: VtVpc;
}

export class VtResolverEndpoint extends Construct {
  vpnSg: ec2.SecurityGroup;

  constructor(scope: Construct, id: string, props: VtResolverEndpointProps) {
    super(scope, id);
    const config = props.config;
    const vtVpc = props.vtVpc;

    // Security Group
    const sg = new ec2.SecurityGroup(this, "SecurityGroup", {
      vpc: vtVpc.vpc,
    });
    sg.addIngressRule(
      ec2.Peer.ipv4(config.customerNetworkCidr),
      ec2.Port.allTraffic(),
    );

    // route53 resolver endpoint
    const cfnResolverEndpoint = new route53resolver.CfnResolverEndpoint(
      this,
      "CfnResolverEndpoint",
      {
        direction: "INBOUND",
        ipAddresses: [
          {
            subnetId: vtVpc.privateSubnets[0].subnetId,
          },
          {
            subnetId: vtVpc.privateSubnets[1].subnetId,
          },
        ],
        securityGroupIds: [sg.securityGroupId],
      },
    );
  }
}
