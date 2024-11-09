import { Construct } from "constructs";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import { VtConfig } from "./config";
import { VtVpc } from "./vpc";

interface VtVpnProps {
  config: VtConfig;
  vtVpc: VtVpc;
}

export class VtVpn extends Construct {
  vpnSg: ec2.SecurityGroup;

  constructor(scope: Construct, id: string, props: VtVpnProps) {
    super(scope, id);
    const config = props.config;
    const vtVpc = props.vtVpc;

    this.vpnSg = new ec2.SecurityGroup(this, "SecurityGroup", {
      vpc: vtVpc.vpc,
    });
    this.vpnSg.addIngressRule(
      ec2.Peer.ipv4(config.vpnSgInboundCidr), //  接続元を制限
      ec2.Port.allTraffic(),
    );
    this.vpnSg.addEgressRule(ec2.Peer.anyIpv4(), ec2.Port.allTraffic());

    const endpoint = vtVpc.vpc.addClientVpnEndpoint("Endpoint", {
      cidr: config.vpnClientCidr,
      serverCertificateArn: config.serverCertificateArn,
      clientCertificateArn: config.clientCertificateArn,
      dnsServers: [config.vpnDnsServer],
      securityGroups: [this.vpnSg],
      vpcSubnets: { subnets: vtVpc.privateSubnets },
    });

    // Cognitoエンドポイントへアクセスするために0.0.0.0/0への経路が必要
    // 制限はAWS Network FirewallとNATゲートウェイで行う
    endpoint.addAuthorizationRule("Rule", {
      cidr: "0.0.0.0/0",
    });
    // 接続されているプライベートサブネットに向ける
    for (let i = 0; i < vtVpc.privateSubnets.length; i++) {
      endpoint.addRoute("Route" + i, {
        cidr: "0.0.0.0/0",
        target: { subnetId: vtVpc.privateSubnets[i].subnetId },
      });
    }
  }
}
