import { Construct } from "constructs";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import { VtConfig } from "../config";
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

    if (config.useSite2SiteVpn) {
      // site-to-site vpn
      // addVpnConnection()を使用するのが楽だが、ルート伝播の設定に必要なVGWのIDが取得できないためL1を使う

      // Customer Gateway
      const customerGateway = new ec2.CfnCustomerGateway(
        this,
        "CustomerGateway",
        {
          ipAddress: config.customerGatewayIp,
          type: "ipsec.1",
          bgpAsn: config.customerGatewayASN,
        },
      );

      // VPN Gateway
      const vpnGateway = new ec2.CfnVPNGateway(this, "VpnGateway", {
        type: "ipsec.1",
      });

      // VPCにVPNゲートウェイをアタッチ
      const vpcGatewayAttachment = new ec2.CfnVPCGatewayAttachment(this, "VpcGatewayAttachment", {
        vpcId: vtVpc.vpc.vpcId,
        vpnGatewayId: vpnGateway.attrVpnGatewayId,
      });

      // VPN Connection
      const vpnConnection = new ec2.CfnVPNConnection(this, "VpnConnection", {
        customerGatewayId: customerGateway.attrCustomerGatewayId,
        type: "ipsec.1",
        vpnGatewayId: vpnGateway.attrVpnGatewayId,
      });

      // サブネットのルートテーブルでVPNゲートウェイからのルート伝播を有効化
      const routePropagation = new ec2.CfnVPNGatewayRoutePropagation(this, "VpnRoutePropagation", {
        routeTableIds: [
          vtVpc.privateSubnets[0].routeTable.routeTableId,
          vtVpc.privateSubnets[1].routeTable.routeTableId,
        ],
        vpnGatewayId: vpnGateway.attrVpnGatewayId,
      });

      // VPCへのアタッチ前にルート伝播を有効化しようとしてエラーになる場合があるため依存関係を明示的に設定
      routePropagation.node.addDependency(vpcGatewayAttachment);
      return;
    }

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
