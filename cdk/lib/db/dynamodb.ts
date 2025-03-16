import { Construct } from "constructs";
import { RemovalPolicy } from "aws-cdk-lib";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import { VtConfig } from "../config";

interface VtDynamoDbProps {
  config: VtConfig;
}

export class VtDynamoDb extends Construct {
  trainingTable: dynamodb.TableV2;
  userTrainingStatusTable: dynamodb.TableV2;

  constructor(scope: Construct, id: string, props: VtDynamoDbProps) {
    super(scope, id);
    const config = props.config;

    this.trainingTable = new dynamodb.TableV2(this, "TrainingTable", {
      partitionKey: { name: "TrainingId", type: dynamodb.AttributeType.STRING },
      billing: dynamodb.Billing.onDemand(),
      removalPolicy: RemovalPolicy.DESTROY,
      tableName: config.appName + "Trainings",
    });

    this.userTrainingStatusTable = new dynamodb.TableV2(
      this,
      "UserTrainingStatusTable",
      {
        partitionKey: { name: "Email", type: dynamodb.AttributeType.STRING },
        sortKey: { name: "TrainingId", type: dynamodb.AttributeType.STRING },
        billing: dynamodb.Billing.onDemand(),
        removalPolicy: RemovalPolicy.DESTROY,
        tableName: config.appName + "UserTrainingStatus",
      },
    );
  }
}
