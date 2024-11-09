import { Construct } from "constructs";
import { RemovalPolicy } from "aws-cdk-lib";
import * as cognito from "aws-cdk-lib/aws-cognito";
import { VtConfig } from "./config";
import * as fs from "fs";

interface VtCognitoProps {
  config: VtConfig;
}

export class VtCognito extends Construct {
  userPoolDomain: cognito.UserPoolDomain;
  userPoolClient: cognito.UserPoolClient;
  userPool: cognito.UserPool;

  constructor(scope: Construct, id: string, props: VtCognitoProps) {
    super(scope, id);
    const config = props.config;

    this.userPool = new cognito.UserPool(this, "UserPool", {
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      signInAliases: { email: true },
      standardAttributes: {
        email: { required: true },
      },
      userPoolName: config.appName,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    this.userPoolDomain = this.userPool.addDomain("CognitoDomain", {
      cognitoDomain: {
        domainPrefix: config.cognitoDomainPrefix,
      },
    });

    const samlMetadata = fs.readFileSync(config.samlIdpMetaDataPath, "utf-8");
    const identityProviderSaml = new cognito.UserPoolIdentityProviderSaml(
      this,
      "IdentityProviderSaml",
      {
        metadata:
          cognito.UserPoolIdentityProviderSamlMetadata.file(samlMetadata),
        userPool: this.userPool,
        attributeMapping: {
          email: cognito.ProviderAttribute.other("email"),
        },
        name: "keycloak",
      },
    );

    this.userPoolClient = this.userPool.addClient("Client", {
      enableTokenRevocation: true,
      generateSecret: true,
      authFlows: {
        userPassword: true,
        userSrp: true,
      },
      oAuth: {
        callbackUrls: ["https://" + config.appDomain + "/oauth2/idpresponse"],
        flows: {
          authorizationCodeGrant: true,
        },
        scopes: [cognito.OAuthScope.EMAIL, cognito.OAuthScope.OPENID],
      },
      supportedIdentityProviders: [
        cognito.UserPoolClientIdentityProvider.custom(
          identityProviderSaml.providerName,
        ),
      ],
      userPoolClientName: config.appName,
    });
  }
}
