import { Construct } from "constructs";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import { VtConfig } from "./config";

interface VtVpcProps {
  config: VtConfig;
}

export class VtVpc extends Construct {
  vpc: ec2.Vpc;
  privateSubnets: ec2.ISubnet[];
  firewallSubnets: ec2.ISubnet[];
  publicSubnets: ec2.ISubnet[];

  constructor(scope: Construct, id: string, props: VtVpcProps) {
    super(scope, id);
    const config = props.config;

    this.vpc = new ec2.Vpc(this, "Vpc", {
      ipAddresses: ec2.IpAddresses.cidr(config.vpcCidr),
      subnetConfiguration: [
        {
          cidrMask: 20,
          name: config.appName + "private",
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
        },
        {
          cidrMask: 28,
          name: config.appName + "firewall",
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
        },
        {
          cidrMask: 20,
          name: config.appName + "public",
          subnetType: ec2.SubnetType.PUBLIC,
        },
      ],
      vpcName: config.appName + "-vpc",
    });

    this.privateSubnets = this.vpc.selectSubnets({
      subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
    }).subnets;
    this.firewallSubnets = this.vpc.selectSubnets({
      subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
    }).subnets;
    this.publicSubnets = this.vpc.selectSubnets({
      subnetType: ec2.SubnetType.PUBLIC,
    }).subnets;
  }
}
