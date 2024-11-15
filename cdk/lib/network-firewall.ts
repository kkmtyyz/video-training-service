import { Construct } from "constructs";
import * as cdk from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as networkfirewall from "aws-cdk-lib/aws-networkfirewall";
import { VtConfig } from "./config";
import { VtVpc } from "./vpc";

interface VtNetworkFirewallProps {
  config: VtConfig;
  vtVpc: VtVpc;
}

export class VtNetworkFirewall extends Construct {
  networkFirewall: networkfirewall.CfnFirewall;

  constructor(scope: Construct, id: string, props: VtNetworkFirewallProps) {
    super(scope, id);
    const config = props.config;
    const vtVpc = props.vtVpc;

    // Firewall Statefull Rule Gruop
    const firewallRuleGroup = new networkfirewall.CfnRuleGroup(
      this,
      "FirewallRuleGroup",
      {
        capacity: 10,
        ruleGroupName: config.appName + "-domain-filter",
        type: "STATEFUL",
        ruleGroup: {
          // RuleGroupProperty
          rulesSource: {
            // RulesSourceProperty
            rulesSourceList: {
              generatedRulesType: "ALLOWLIST",
              targetTypes: ["TLS_SNI", "HTTP_HOST"],
              targets: [
                // cognitoドメインは'<prefix>.auth.ap-northeast-1.amazoncognito.com`になる
                config.cognitoDomainPrefix +
                  ".auth.ap-northeast-1.amazoncognito.com",
              ],
            },
          },
          statefulRuleOptions: {
            ruleOrder: "STRICT_ORDER",
          },
        },
      },
    );

    // Firewall Policy
    const firewallPolicy = new networkfirewall.CfnFirewallPolicy(
      this,
      "FirwallPolicy",
      {
        firewallPolicy: {
          // FirewallPolicyProperty
          statelessDefaultActions: ["aws:forward_to_sfe"],
          statelessFragmentDefaultActions: ["aws:pass"],
          statefulDefaultActions: ["aws:drop_established"],
          statefulEngineOptions: {
            ruleOrder: "STRICT_ORDER",
            streamExceptionPolicy: "DROP",
          },
          statefulRuleGroupReferences: [
            // StatefulRuleGroupReferenceProperty
            {
              resourceArn: firewallRuleGroup.attrRuleGroupArn,
              priority: 100,
            },
          ],
        },
        firewallPolicyName: config.appName + "-policy",
      },
    );

    // Networll Firewall
    const subnetMappings: networkfirewall.CfnFirewall.SubnetMappingProperty[] =
      [];
    for (const subnet of vtVpc.firewallSubnets) {
      subnetMappings.push({ subnetId: subnet.subnetId });
    }

    this.networkFirewall = new networkfirewall.CfnFirewall(
      this,
      "NetworkFirewall",
      {
        firewallName: config.appName + "-firewall",
        firewallPolicyArn: firewallPolicy.attrFirewallPolicyArn,
        subnetMappings: subnetMappings,
        vpcId: vtVpc.vpc.vpcId,
      },
    );

    // ルーティング設定
    // 各privateサブネットに0.0.0.0/0 -> Firewall Endpointを追加
    // サブネットとFirewall EndpointでAZを揃えてあげる
    if (
      cdk.Fn.conditionEquals(
        vtVpc.privateSubnets[0].availabilityZone,
        cdk.Fn.select(
          0,
          cdk.Fn.split(
            ":",
            cdk.Fn.select(0, this.networkFirewall.attrEndpointIds),
          ),
        ),
      )
    ) {
      // PrivateSubnets[0]とattrEndpointIds[0]が同じAZの場合
      new ec2.CfnRoute(this, "route1", {
        routeTableId: vtVpc.privateSubnets[0].routeTable.routeTableId,
        vpcEndpointId: cdk.Fn.select(
          1,
          cdk.Fn.split(
            ":",
            cdk.Fn.select(0, this.networkFirewall.attrEndpointIds),
          ),
        ),
        destinationCidrBlock: "0.0.0.0/0",
      });
      new ec2.CfnRoute(this, "route2", {
        routeTableId: vtVpc.privateSubnets[1].routeTable.routeTableId,
        vpcEndpointId: cdk.Fn.select(
          1,
          cdk.Fn.split(
            ":",
            cdk.Fn.select(1, this.networkFirewall.attrEndpointIds),
          ),
        ),
        destinationCidrBlock: "0.0.0.0/0",
      });
    } else {
      // PrivateSubnets[0]とattrEndpointIds[1]が同じAZの場合
      new ec2.CfnRoute(this, "route1", {
        routeTableId: vtVpc.privateSubnets[0].routeTable.routeTableId,
        vpcEndpointId: cdk.Fn.select(
          1,
          cdk.Fn.split(
            ":",
            cdk.Fn.select(1, this.networkFirewall.attrEndpointIds),
          ),
        ),
        destinationCidrBlock: "0.0.0.0/0",
      });
      new ec2.CfnRoute(this, "route2", {
        routeTableId: vtVpc.privateSubnets[1].routeTable.routeTableId,
        vpcEndpointId: cdk.Fn.select(
          1,
          cdk.Fn.split(
            ":",
            cdk.Fn.select(0, this.networkFirewall.attrEndpointIds),
          ),
        ),
        destinationCidrBlock: "0.0.0.0/0",
      });
    }

    // 各publicサブネットにprivateサブネットcidr -> Firewall Endpointを追加
    // サブネットとFirewall EndpointでAZを揃えてあげる
    if (
      cdk.Fn.conditionEquals(
        vtVpc.publicSubnets[0].availabilityZone,
        cdk.Fn.select(
          0,
          cdk.Fn.split(
            ":",
            cdk.Fn.select(0, this.networkFirewall.attrEndpointIds),
          ),
        ),
      )
    ) {
      // publicSubnets[0]とattrEndpointIds[0]が同じAZの場合
      if (
        cdk.Fn.conditionEquals(
          vtVpc.privateSubnets[0].availabilityZone,
          cdk.Fn.select(
            0,
            cdk.Fn.split(
              ":",
              cdk.Fn.select(0, this.networkFirewall.attrEndpointIds),
            ),
          ),
        )
      ) {
        // publicSubnets[0]とprivateSubnets[0]が同じAZの場合
        new ec2.CfnRoute(this, "route3", {
          routeTableId: vtVpc.publicSubnets[0].routeTable.routeTableId,
          vpcEndpointId: cdk.Fn.select(
            1,
            cdk.Fn.split(
              ":",
              cdk.Fn.select(0, this.networkFirewall.attrEndpointIds),
            ),
          ),
          destinationCidrBlock: vtVpc.privateSubnets[0].ipv4CidrBlock,
        });
        new ec2.CfnRoute(this, "route4", {
          routeTableId: vtVpc.publicSubnets[1].routeTable.routeTableId,
          vpcEndpointId: cdk.Fn.select(
            1,
            cdk.Fn.split(
              ":",
              cdk.Fn.select(1, this.networkFirewall.attrEndpointIds),
            ),
          ),
          destinationCidrBlock: vtVpc.privateSubnets[1].ipv4CidrBlock,
        });
      } else {
        // publicSubnets[0]とprivateSubnets[1]が同じAZの場合
        new ec2.CfnRoute(this, "route3", {
          routeTableId: vtVpc.publicSubnets[0].routeTable.routeTableId,
          vpcEndpointId: cdk.Fn.select(
            1,
            cdk.Fn.split(
              ":",
              cdk.Fn.select(0, this.networkFirewall.attrEndpointIds),
            ),
          ),
          destinationCidrBlock: vtVpc.privateSubnets[1].ipv4CidrBlock,
        });
        new ec2.CfnRoute(this, "route4", {
          routeTableId: vtVpc.publicSubnets[1].routeTable.routeTableId,
          vpcEndpointId: cdk.Fn.select(
            1,
            cdk.Fn.split(
              ":",
              cdk.Fn.select(1, this.networkFirewall.attrEndpointIds),
            ),
          ),
          destinationCidrBlock: vtVpc.privateSubnets[0].ipv4CidrBlock,
        });
      }
    } else {
      // publicSubnets[0]とattrEndpointIds[1]が同じAZの場合
      if (
        cdk.Fn.conditionEquals(
          vtVpc.privateSubnets[0].availabilityZone,
          cdk.Fn.select(
            0,
            cdk.Fn.split(
              ":",
              cdk.Fn.select(0, this.networkFirewall.attrEndpointIds),
            ),
          ),
        )
      ) {
        // publicSubnets[0]とprivateSubnets[0]が同じAZの場合
        new ec2.CfnRoute(this, "route3", {
          routeTableId: vtVpc.publicSubnets[0].routeTable.routeTableId,
          vpcEndpointId: cdk.Fn.select(
            1,
            cdk.Fn.split(
              ":",
              cdk.Fn.select(1, this.networkFirewall.attrEndpointIds),
            ),
          ),
          destinationCidrBlock: vtVpc.privateSubnets[0].ipv4CidrBlock,
        });
        new ec2.CfnRoute(this, "route4", {
          routeTableId: vtVpc.publicSubnets[1].routeTable.routeTableId,
          vpcEndpointId: cdk.Fn.select(
            1,
            cdk.Fn.split(
              ":",
              cdk.Fn.select(0, this.networkFirewall.attrEndpointIds),
            ),
          ),
          destinationCidrBlock: vtVpc.privateSubnets[1].ipv4CidrBlock,
        });
      } else {
        // publicSubnets[0]とprivateSubnets[1]が同じAZの場合
        new ec2.CfnRoute(this, "route3", {
          routeTableId: vtVpc.publicSubnets[0].routeTable.routeTableId,
          vpcEndpointId: cdk.Fn.select(
            1,
            cdk.Fn.split(
              ":",
              cdk.Fn.select(1, this.networkFirewall.attrEndpointIds),
            ),
          ),
          destinationCidrBlock: vtVpc.privateSubnets[1].ipv4CidrBlock,
        });
        new ec2.CfnRoute(this, "route4", {
          routeTableId: vtVpc.publicSubnets[1].routeTable.routeTableId,
          vpcEndpointId: cdk.Fn.select(
            1,
            cdk.Fn.split(
              ":",
              cdk.Fn.select(0, this.networkFirewall.attrEndpointIds),
            ),
          ),
          destinationCidrBlock: vtVpc.privateSubnets[0].ipv4CidrBlock,
        });
      }
    }
  }
}
