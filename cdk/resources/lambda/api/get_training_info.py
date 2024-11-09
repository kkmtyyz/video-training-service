import json
import logging
import vt_util
import os
import boto3
from botocore.exceptions import ClientError
from typing import Optional, Dict
import vt_const

logger = logging.getLogger(vt_const.PROJECT_NAME).getChild(__name__)


def get_training_status(email: str, training_id: str) -> Optional[Dict]:
    table_name = os.environ.get("USER_TRAINING_STATUS_TABLE_NAME")
    if table_name is None:
        logger.error("Environment variable USER_TRAINING_STATUS_TABLE_NAME not found")
        raise

    dynamodb = boto3.resource("dynamodb")
    table = dynamodb.Table(table_name)
    try:
        res = table.get_item(Key={"Email": email, "TrainingId": training_id})
        logger.info("scan_response", extra=res)
        return res.get("Item")
    except ClientError as e:
        logger.error(e)
        raise e


def get_training_info(training_id: str) -> Dict:
    table_name = os.environ.get("TRAININGS_TABLE_NAME")
    if table_name is None:
        logger.error("Environment variable TRAININGS_TABLE_NAME not found")
        raise

    dynamodb = boto3.resource("dynamodb")
    table = dynamodb.Table(table_name)
    try:
        res = table.get_item(Key={"TrainingId": training_id})
        logger.info("scan_response", extra=res)
        return res["Item"]
    except ClientError as e:
        logger.error(e)
        raise e


def do(event):
    training_id = event["queryStringParameters"]["trainingId"]

    # ユーザーのemailを取得
    user_claim = vt_util.get_user_claim_from_event(event)
    email = user_claim["email"]
    logger.info("email: " + email)

    # ユーザーの研修ステータスを取得
    training_status = get_training_status(email, training_id)

    # 研修情報を取得
    training_info = get_training_info(training_id)
    training_info["IsCompleted"] = False
    if training_status is not None:
        training_info["IsCompleted"] = training_status["IsCompleted"]

    res = {"trainingInfo": training_info}
    return {"statusCode": 200, "body": json.dumps(res)}
