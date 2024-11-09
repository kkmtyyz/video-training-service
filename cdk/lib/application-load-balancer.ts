import { Construct } from "constructs";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import { VtConfig } from "./config";
import { VtVpc } from "./vpc";
import { VtVpn } from "./vpn";
import { VtVpcEndpoint } from "./vpc-endpoint";
import { VtCognito } from "./cognito";
import * as elbv2 from "aws-cdk-lib/aws-elasticloadbalancingv2";
import * as elbv2_targets from "aws-cdk-lib/aws-elasticloadbalancingv2-targets";
import * as elbv2_actions from "aws-cdk-lib/aws-elasticloadbalancingv2-actions";
import * as custom_resources from "aws-cdk-lib/custom-resources";
import * as iam from "aws-cdk-lib/aws-iam";

interface VtAlbProps {
  config: VtConfig;
  vtVpc: VtVpc;
  vtVpcEndpoint: VtVpcEndpoint;
  vtVpn: VtVpn;
  vtCognito: VtCognito;
}

export class VtAlb extends Construct {
  alb: elbv2.ApplicationLoadBalancer;
  albSg: ec2.SecurityGroup;

  /*
   * ALBのターゲットに各VPCエンドポイントのIPとAZが必要なのでカスタムリソースで取得
   */
  getVpcEndpointIps(
    scope: Construct,
    id: string,
    vpcEndpoint: ec2.InterfaceVpcEndpoint,
  ): string[] {
    // ref: https://repost.aws/questions/QUjISNyk6aTA6jZgZQwKWf4Q/how-to-connect-a-load-balancer-and-an-interface-vpc-endpoint-together-using-cdk
    // CustomResource
    const eni = new custom_resources.AwsCustomResource(
      this,
      "DescribeNetworkInterfaces" + id,
      {
        onCreate: {
          service: "EC2",
          action: "describeNetworkInterfaces",
          parameters: {
            NetworkInterfaceIds: vpcEndpoint.vpcEndpointNetworkInterfaceIds,
          },
          physicalResourceId: custom_resources.PhysicalResourceId.of(
            Date.now().toString(),
          ),
        },
        onUpdate: {
          service: "EC2",
          action: "describeNetworkInterfaces",
          parameters: {
            NetworkInterfaceIds: vpcEndpoint.vpcEndpointNetworkInterfaceIds,
          },
          physicalResourceId: custom_resources.PhysicalResourceId.of(
            Date.now().toString(),
          ),
        },
        policy: {
          statements: [
            new iam.PolicyStatement({
              actions: ["ec2:DescribeNetworkInterfaces"],
              resources: ["*"],
            }),
          ],
        },
      },
    );

    // az2つあるので2個
    const ip1 = eni.getResponseField("NetworkInterfaces.0.PrivateIpAddress");
    const ip2 = eni.getResponseField("NetworkInterfaces.1.PrivateIpAddress");
    return [ip1, ip2];
  }

  constructor(scope: Construct, id: string, props: VtAlbProps) {
    super(scope, id);
    const config = props.config;
    const vtVpc = props.vtVpc;
    const vtVpcEndpoint = props.vtVpcEndpoint;
    const vtVpn = props.vtVpn;
    const vtCognito = props.vtCognito;

    // Target
    // S3 Interface Endpoint
    const s3InterfaceEndpointIps = this.getVpcEndpointIps(
      this,
      "S3IEndpointIps",
      vtVpcEndpoint.s3Interface,
    );
    const s3ITarget1 = new elbv2_targets.IpTarget(s3InterfaceEndpointIps[0]);
    const s3ITarget2 = new elbv2_targets.IpTarget(s3InterfaceEndpointIps[1]);
    // API Gateway Interface Endpoint
    const ApiGwEndpointIps = this.getVpcEndpointIps(
      this,
      "ApiEndpointIps",
      vtVpcEndpoint.apiGw,
    );
    const ApiGwTarget1 = new elbv2_targets.IpTarget(ApiGwEndpointIps[0]);
    const ApiGwTarget2 = new elbv2_targets.IpTarget(ApiGwEndpointIps[1]);

    // Target Group
    const s3InterfaceTg = new elbv2.ApplicationTargetGroup(
      this,
      "S3ITargetGroup",
      {
        healthCheck: {
          // health check ref: https://aws.amazon.com/jp/blogs/news/hosting-internal-https-static-websites-with-alb-s3-and-privatelink/
          healthyHttpCodes: "200,307,405",
          port: "80",
          protocol: elbv2.Protocol.HTTP,
        },
        port: 443,
        protocol: elbv2.ApplicationProtocol.HTTPS,
        targetGroupName: config.appName + "-s3Interface",
        targets: [s3ITarget1, s3ITarget2],
        vpc: vtVpc.vpc,
      },
    );

    const ApiGwTg = new elbv2.ApplicationTargetGroup(this, "ApiGwTargetGroup", {
      healthCheck: {
        // health check ref: https://docs.aws.amazon.com/ja_jp/prescriptive-guidance/latest/patterns/deploy-an-amazon-api-gateway-api-on-an-internal-website-using-private-endpoints-and-an-application-load-balancer.html#deploy-an-amazon-api-gateway-api-on-an-internal-website-using-private-endpoints-and-an-application-load-balancer-epics
        // API Gateway Endpointはヘルスチェックに403返すため
        healthyHttpCodes: "200,403",
      },
      port: 443,
      protocol: elbv2.ApplicationProtocol.HTTPS,
      targetGroupName: config.appName + "-api-gw",
      targets: [ApiGwTarget1, ApiGwTarget2],
      vpc: vtVpc.vpc,
    });

    // Application Load Balancer
    this.albSg = new ec2.SecurityGroup(this, "SecurityGroup", {
      vpc: vtVpc.vpc,
    });
    this.albSg.addIngressRule(
      ec2.Peer.securityGroupId(vtVpn.vpnSg.securityGroupId), // VPN Endpointからのみ許可
      ec2.Port.allTraffic(),
    );
    this.albSg.addEgressRule(ec2.Peer.anyIpv4(), ec2.Port.allTraffic());

    this.alb = new elbv2.ApplicationLoadBalancer(this, "ALB", {
      vpc: vtVpc.vpc,
      loadBalancerName: config.appName,
      securityGroup: this.albSg,
      vpcSubnets: { subnets: vtVpc.privateSubnets },
      internetFacing: false,
    });

    // Listener
    const httpsListener = this.alb.addListener("HttpsListener", {
      port: 443,
      protocol: elbv2.ApplicationProtocol.HTTPS,
      certificates: [{ certificateArn: config.serverCertificateArn }],
      // デフォルトアクションはCognito認証してS3InterfaceEndpointへ転送
      defaultAction: new elbv2_actions.AuthenticateCognitoAction({
        next: elbv2.ListenerAction.forward([s3InterfaceTg]),
        userPool: vtCognito.userPool,
        userPoolClient: vtCognito.userPoolClient,
        userPoolDomain: vtCognito.userPoolDomain,
      }),
    });

    // `*/`は`/index.html`へリダイレクト
    httpsListener.addAction("RedirectRule", {
      action: elbv2.ListenerAction.redirect({
        host: "#{host}",
        path: "/index.html",
        permanent: true,
        port: "443",
        protocol: "HTTPS",
        query: "#{query}",
      }),
      conditions: [elbv2.ListenerCondition.pathPatterns(["*/"])],
      priority: 200,
    });

    // API呼び出しは`/<API GWステージ>/*`へ転送
    httpsListener.addAction("ApiRule", {
      action: new elbv2_actions.AuthenticateCognitoAction({
        next: elbv2.ListenerAction.forward([ApiGwTg]),
        userPool: vtCognito.userPool,
        userPoolClient: vtCognito.userPoolClient,
        userPoolDomain: vtCognito.userPoolDomain,
      }),
      conditions: [
        elbv2.ListenerCondition.pathPatterns([
          "/" + config.apiStageName + "/*",
        ]),
      ],
      priority: 100,
    });

    // ヘルスチェック用にルール追加
    vtVpcEndpoint.s3Sg.addIngressRule(this.albSg, ec2.Port.HTTP);
  }
}
