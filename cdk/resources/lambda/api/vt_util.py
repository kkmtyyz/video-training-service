import json
import base64
import logging
from typing import Dict
import vt_const

logger = logging.getLogger(vt_const.PROJECT_NAME).getChild(__name__)


def get_user_claim_from_event(event) -> Dict:
    logger.debug(event)
    try:
        oidc_data = event["headers"]["x-amzn-oidc-data"]
        logger.debug(oidc_data)
        user_claim = json.loads(base64.b64decode(oidc_data.split(".")[1]).decode())
        logger.debug("user_claim", extra=user_claim)
        return user_claim
    except Exception as e:
        logger.error("get user_claims failure")
        logger.error(e)
        raise e
