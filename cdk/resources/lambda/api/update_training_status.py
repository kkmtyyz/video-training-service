import boto3
import json
import logging
import vt_util
import os
from botocore.exceptions import ClientError
import vt_const

logger = logging.getLogger(vt_const.PROJECT_NAME).getChild(__name__)


def update_training_status(email: str, training_id: str):
    table_name = os.environ.get("USER_TRAINING_STATUS_TABLE_NAME")
    if table_name is None:
        logger.error("Environment variable USER_TRAINING_STATUS_TABLE_NAME not found")
        raise

    dynamodb = boto3.resource("dynamodb")
    table = dynamodb.Table(table_name)
    try:
        res = table.update_item(
            Key={"Email": email, "TrainingId": training_id},
            UpdateExpression="set IsCompleted = :isCompleted",
            ExpressionAttributeValues={":isCompleted": True},
        )
        logger.info("update_item_response", extra=res)
    except ClientError as e:
        logger.error(e)
        raise e


def do(event):
    # リクエストから研修IDを取得
    training_id = json.loads(event["body"])["trainingId"]
    logger.info("training_id: " + training_id)

    # ユーザーのemailを取得
    user_claim = vt_util.get_user_claim_from_event(event)
    email = user_claim["email"]
    logger.info("email: " + email)

    update_training_status(email, training_id)

    return {"statusCode": 200}
