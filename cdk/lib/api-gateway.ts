import { Construct } from "constructs";
import * as apigw from "aws-cdk-lib/aws-apigateway";
import * as iam from "aws-cdk-lib/aws-iam";
import { VtConfig } from "./config";
import { VtLambda } from "./lambda";
import { VtVpcEndpoint } from "./vpc-endpoint";

interface VtApiGwProps {
  config: VtConfig;
  vtLambda: VtLambda;
  vtVpcEndpoint: VtVpcEndpoint;
}

export class VtApiGw extends Construct {
  api: apigw.LambdaRestApi;

  constructor(scope: Construct, id: string, props: VtApiGwProps) {
    super(scope, id);
    const config = props.config;
    const vtLambda = props.vtLambda;
    const vtVpcEndpoint = props.vtVpcEndpoint;

    // ALBからパスで転送するためCORSは不要
    this.api = new apigw.LambdaRestApi(this, "LambdaRestApi", {
      handler: vtLambda.apiFunction,
      endpointTypes: [apigw.EndpointType.PRIVATE],
      deployOptions: {
        stageName: config.apiStageName,
      },
      policy: new iam.PolicyDocument({
        statements: [
          new iam.PolicyStatement({
            // 全て許可
            effect: iam.Effect.ALLOW,
            principals: [new iam.AnyPrincipal()],
            actions: ["execute-api:Invoke"],
            resources: ["execute-api:/*"],
          }),
          new iam.PolicyStatement({
            // VPC Endpoint以外からのアクセスを拒否
            effect: iam.Effect.DENY,
            principals: [new iam.AnyPrincipal()],
            actions: ["execute-api:Invoke"],
            resources: ["execute-api:/*"],
            conditions: {
              StringNotEquals: {
                "aws:SourceVpce": vtVpcEndpoint.apiGw.vpcEndpointId,
              },
            },
          }),
        ],
      }),
    });
  }
}
