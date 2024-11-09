import { Construct } from "constructs";
import { RemovalPolicy } from "aws-cdk-lib";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as iam from "aws-cdk-lib/aws-iam";
import * as ssm from "aws-cdk-lib/aws-ssm";
import { VtConfig } from "./config";
import { VtVpcEndpoint } from "./vpc-endpoint";

interface VtS3Props {
  config: VtConfig;
  vtVpcEndpoint: VtVpcEndpoint;
}

export class VtS3 extends Construct {
  webBucket: s3.Bucket;
  uploadBucket: s3.Bucket;

  constructor(scope: Construct, id: string, props: VtS3Props) {
    super(scope, id);
    const config = props.config;
    const vtVpcEndpoint = props.vtVpcEndpoint;

    this.webBucket = new s3.Bucket(this, "WebBucket", {
      // 静的サイトホスティングに使うのでwebサイトのドメインと合わせる
      // バケット名は長さの制限があるのでconfigでロードして持ってこれない
      bucketName: ssm.StringParameter.valueForStringParameter(
        this,
        "/VideoTraining/AppDomain",
      ),
      removalPolicy: RemovalPolicy.DESTROY,
    });
    this.webBucket.addToResourcePolicy(
      new iam.PolicyStatement({
        actions: ["s3:*"],
        conditions: {
          StringEquals: {
            "aws:sourceVpce": vtVpcEndpoint.s3Interface.vpcEndpointId,
          },
        },
        effect: iam.Effect.ALLOW,
        principals: [new iam.ArnPrincipal("*")],
        resources: [this.webBucket.bucketArn, this.webBucket.bucketArn + "/*"],
      }),
    );

    this.uploadBucket = new s3.Bucket(this, "UploadBucket", {
      // 署名済みURLからアップロードするバケット
      // 名前は何でもいい
      bucketName: config.uploadBucketNamePrefix + config.appDomain,
      removalPolicy: RemovalPolicy.DESTROY,
    });
    this.uploadBucket.addToResourcePolicy(
      new iam.PolicyStatement({
        actions: ["s3:*"],
        conditions: {
          StringEquals: {
            "aws:sourceVpce": vtVpcEndpoint.s3Interface.vpcEndpointId,
          },
        },
        effect: iam.Effect.ALLOW,
        principals: [new iam.StarPrincipal()],
        resources: [
          this.uploadBucket.bucketArn,
          this.uploadBucket.bucketArn + "/*",
        ],
      }),
    );
    this.uploadBucket.addCorsRule({
      allowedMethods: [s3.HttpMethods.PUT],
      allowedOrigins: ["https://" + config.appDomain],
      allowedHeaders: ["*"],
      maxAge: 3600,
    });
  }
}
