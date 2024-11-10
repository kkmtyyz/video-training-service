import { Construct } from "constructs";
import * as ssm from "aws-cdk-lib/aws-ssm";

export class VtConfig extends Construct {
  /*
   * general
   */
  appName = "vt";
  appDomain: string; // e.g.: "<domain-name>.com"
  serverCertificateArn: string;
  clientCertificateArn: string;

  /*
   * vpc
   */
  vpcCidr = "10.0.0.0/16";

  /*
   * vpn endpoint
   */
  vpnClientCidr = "10.10.0.0/16";
  vpnDnsServer = "10.0.0.2"; // クライアントからVPCのDNSで名前解決する
  vpnSgInboundCidr: string; // アクセスを許可するクライアントのIP範囲

  /*
   * cognito
   */
  cognitoDomainPrefix: string;
  samlIdpMetaDataPath = "resources/saml/saml_idp_metadata.xml"; // SAML IdPのメタデータファイルへのパス

  /*
   * s3
   */
  uploadBucketNamePrefix = "upload."; // 動画アップロード用バケット名: <uploadBucketNamePrefix><appDomain>
  // HLSファイルを格納するパス
  // e.g. s3:<domain-name>.com/<staticContentsVideoPath>/<training id>/
  staticContentsVideoPath = "/video";

  constructor(scope: Construct, id: string) {
    super(scope, id);

    this.appDomain = ssm.StringParameter.valueForStringParameter(
      this,
      "/VideoTraining/AppDomain",
    );

    this.serverCertificateArn = ssm.StringParameter.valueForStringParameter(
      this,
      "/VideoTraining/ServerCertificateArn",
    );

    this.clientCertificateArn = ssm.StringParameter.valueForStringParameter(
      this,
      "/VideoTraining/ClientCertificateArn",
    );

    this.vpnSgInboundCidr = ssm.StringParameter.valueForStringParameter(
      this,
      "/VideoTraining/VpnSgInboundCidr",
    );

    this.cognitoDomainPrefix = ssm.StringParameter.valueForStringParameter(
      this,
      "/VideoTraining/CognitoDomainPrefix",
    );
  }
}
