import { Construct } from "constructs";
import { RemovalPolicy } from "aws-cdk-lib";
import * as route53 from "aws-cdk-lib/aws-route53";
import * as route53_targets from "aws-cdk-lib/aws-route53-targets";
import { VtConfig } from "../config";
import { VtVpc } from "../network/vpc";
import { VtAlb } from "./alb";

interface VtHostedZoneProps {
  config: VtConfig;
  vtVpc: VtVpc;
  vtAlb: VtAlb;
}

export class VtHostedZone extends Construct {
  hostedZone: route53.PrivateHostedZone;

  constructor(scope: Construct, id: string, props: VtHostedZoneProps) {
    super(scope, id);
    const config = props.config;
    const vtVpc = props.vtVpc;
    const vtAlb = props.vtAlb;

    this.hostedZone = new route53.PrivateHostedZone(this, "HostedZone", {
      vpc: vtVpc.vpc,
      // S3静的サイトホスティングを使用するためS3バケットと同じ名前である必要がある
      zoneName: config.appDomain,
    });
    this.hostedZone.applyRemovalPolicy(RemovalPolicy.DESTROY);

    new route53.ARecord(this, "AlbRecord", {
      target: route53.RecordTarget.fromAlias(
        new route53_targets.LoadBalancerTarget(vtAlb.alb),
      ),
      zone: this.hostedZone,
    });
  }
}
