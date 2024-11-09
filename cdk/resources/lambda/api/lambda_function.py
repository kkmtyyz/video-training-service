import boto3
import logging
import get_training_info
import create_training
import get_training_list
import update_training_status
import get_presigned_url
import vt_const

logger = logging.getLogger(vt_const.PROJECT_NAME)
logger.setLevel(logging.DEBUG)
boto3.set_stream_logger("", logging.WARN)

logger = logging.getLogger(vt_const.PROJECT_NAME).getChild(__name__)


def lambda_handler(event, context):
    logger.debug(event)
    logger.debug(context)

    request_path = event["path"]
    request_method = event["httpMethod"]
    logger.debug("path method", extra={"path": request_path, "method": request_method})

    # /tarining
    if request_path == "/training":
        if request_method == "GET":
            return get_training_info.do(event)
        if request_method == "POST":
            return create_training.do(event)

    # /tarining/list
    if request_path == "/training/list":
        if request_method == "GET":
            return get_training_list.do(event)

    # /tarining/status
    if request_path == "/training/status":
        if request_method == "PUT":
            return update_training_status.do(event)

    # /video/presigned-url
    if request_path == "/video/presigned-url":
        if request_method == "GET":
            return get_presigned_url.do(event)

    raise Exception("Invalid request", {"path": request_path, "method": request_method})
