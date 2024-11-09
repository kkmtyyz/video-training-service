import boto3
import uuid
import json
import logging
import os
from botocore.exceptions import ClientError
from typing import Dict
import vt_const

logger = logging.getLogger(vt_const.PROJECT_NAME).getChild(__name__)


class TrainingInfo:
    def __init__(self, post_body: Dict):
        self.training_id: str = str(uuid.uuid4())
        self.training_title: str = post_body["trainingTitle"]
        self.training_description: str = post_body["trainingDescription"]
        self.training_video_bucket_name: str = post_body["trainingVideoS3Bucket"]
        self.training_video_s3key: str = post_body["trainingVideoS3Key"]


def put_training_item(training_info: TrainingInfo):
    table_name = os.environ.get("TRAININGS_TABLE_NAME")
    if table_name is None:
        logger.error("Environment variable TRAININGS_TABLE_NAME not found")
        raise

    dynamodb = boto3.resource("dynamodb")
    table = dynamodb.Table(table_name)
    try:
        item = {
            "TrainingId": training_info.training_id,
            "Description": training_info.training_description,
            "Title": training_info.training_title,
            # VideoKeyは動画変換完了後にアップデートする
        }
        res = table.put_item(Item=item)
        logger.info("put_item response", extra=res)
    except ClientError as e:
        logger.error(e)
        raise e


def execute_state_machine(training_info: TrainingInfo):
    state_machine_arn = os.environ.get("STATE_MACHINE_ARN")
    if state_machine_arn is None:
        logger.error("Environment variable STATE_MACHINE_ARN not found")
        raise

    sfn = boto3.client("stepfunctions")
    try:
        input = {
            "training_title": training_info.training_title,
            "training_id": training_info.training_id,
            "bucket_name": training_info.training_video_bucket_name,
            "s3key": training_info.training_video_s3key,
        }
        res = sfn.start_execution(
            stateMachineArn=state_machine_arn, input=json.dumps(input)
        )
        logger.info(
            "start_execution response", extra=json.loads(json.dumps(res, default=str))
        )
    except ClientError as e:
        logger.error(e)
        raise e


def do(event):
    # リクエストから研修情報を取得
    training_info = TrainingInfo(json.loads(event["body"]))
    logger.info("training info", extra=vars(training_info))

    # Trainingsテーブルへitem作成
    put_training_item(training_info)

    # 動画変換用ステートマシンを非同期で起動
    execute_state_machine(training_info)

    return {"statusCode": 200}
