import json
import boto3
import logging
import vt_util
import os
from botocore.exceptions import ClientError
from datetime import datetime
import vt_const

logger = logging.getLogger(vt_const.PROJECT_NAME).getChild(__name__)

def create_review(email: str, training_id: str, rating: int, comment: str):
    table_name = os.environ.get("REVIEWS_TABLE_NAME")
    if table_name is None:
        logger.error("Environment variable REVIEWS_TABLE_NAME not found")
        raise

    dynamodb = boto3.resource("dynamodb")
    table = dynamodb.Table(table_name)
    try:
        timestamp = datetime.now().isoformat()
        res = table.put_item(
            Item={
                "TrainingId": training_id,
                "Email": email,
                "Rating": rating,
                "Comment": comment,
                "Timestamp": timestamp
            }
        )
        logger.info("put_item_response", extra=res)
    except ClientError as e:
        logger.error(e)
        raise e

def do(event):
    # リクエストからデータを取得
    body = json.loads(event["body"])
    training_id = body["trainingId"]
    rating = int(body["rating"])
    comment = body["comment"]
    
    # ユーザーのemailを取得
    user_claim = vt_util.get_user_claim_from_event(event)
    email = user_claim["email"]
    logger.info("email: " + email)
    
    # レビューを作成
    create_review(email, training_id, rating, comment)
    
    return {"statusCode": 200}
