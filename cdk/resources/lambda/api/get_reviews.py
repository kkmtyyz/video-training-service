import json
import boto3
import logging
import os
from botocore.exceptions import ClientError
from typing import List
import vt_const

logger = logging.getLogger(vt_const.PROJECT_NAME).getChild(__name__)

def get_reviews(training_id: str) -> List:
    table_name = os.environ.get("REVIEWS_TABLE_NAME")
    if table_name is None:
        logger.error("Environment variable REVIEWS_TABLE_NAME not found")
        raise

    dynamodb = boto3.resource("dynamodb")
    table = dynamodb.Table(table_name)
    try:
        res = table.query(
            KeyConditionExpression="TrainingId = :trainingId",
            ExpressionAttributeValues={":trainingId": training_id}
        )
        logger.info("query_response", extra=res)
        return res["Items"]
    except ClientError as e:
        logger.error(e)
        raise e

def do(event):
    training_id = event["queryStringParameters"]["trainingId"]
    
    reviews = get_reviews(training_id)
    res = {"reviews": reviews}
    
    return {
        "statusCode": 200,
        "body": json.dumps(res),
    }
