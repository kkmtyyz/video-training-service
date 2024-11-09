import json
import uuid
import logging
import os
import boto3
from botocore.exceptions import ClientError
from botocore.client import Config
import vt_const

logger = logging.getLogger(vt_const.PROJECT_NAME).getChild(__name__)


def gen_presigned_url(upload_bucket_name: str, upload_s3key: str) -> str:
    region_name = os.environ.get("S3_REGION_NAME")
    if region_name is None:
        logger.error("Environment variable S3_REGION_NAME not found")
        raise

    s3 = boto3.client(
        "s3", region_name=region_name, config=Config(signature_version="s3v4")
    )
    try:
        logger.info(
            "call generate_presigned_url",
            extra={"bucket": upload_bucket_name, "key": upload_s3key},
        )
        presigned_url = s3.generate_presigned_url(
            ClientMethod="put_object",
            Params={"Bucket": upload_bucket_name, "Key": upload_s3key},
            ExpiresIn=3600,
        )

        logger.debug("presigned_url: " + presigned_url)
        return presigned_url
    except ClientError as e:
        logger.error(e)
        raise e


def do(event):
    video_upload_bucket_name = os.environ.get("VIDEO_UPLOAD_BUCKET_NAME")
    if video_upload_bucket_name is None:
        logger.error("Environment variable VIDEO_UPLOAD_BUCKET_NAME not found")
        raise

    video_upload_s3key = str(uuid.uuid4())

    upload_url = gen_presigned_url(video_upload_bucket_name, video_upload_s3key)
    res = {
        "presignedUrlInfo": {
            "bucket": video_upload_bucket_name,
            "key": video_upload_s3key,
            "url": upload_url,
        }
    }
    logger.info("res", extra=res)

    return {"statusCode": 200, "body": json.dumps(res)}
