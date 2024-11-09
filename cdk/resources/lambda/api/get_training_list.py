import json
import boto3
import logging
import os
from botocore.exceptions import ClientError
from typing import List
import vt_const

logger = logging.getLogger(vt_const.PROJECT_NAME).getChild(__name__)


def get_training_list() -> List:
    table_name = os.environ.get("TRAININGS_TABLE_NAME")
    if table_name is None:
        logger.error("Environment variable TRAININGS_TABLE_NAME not found")
        raise

    dynamodb = boto3.resource("dynamodb")
    table = dynamodb.Table(table_name)
    try:
        # 今回はとりあえず動画が登録されているものを100件とってフィルタする。多い場合はpaginatorか。
        res = table.scan(
            ProjectionExpression="TrainingId, Title, Description",
            Limit=100,
            FilterExpression="attribute_exists(VideoKey)",
        )
        logger.info("scan_response", extra=res)
        return res["Items"]
    except ClientError as e:
        logger.error(e)
        raise e


def do(event):
    training_list = get_training_list()
    res = {"trainings": training_list}

    return {"statusCode": 200, "body": json.dumps(res)}
