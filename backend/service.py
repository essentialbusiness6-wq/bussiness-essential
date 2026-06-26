import os
import logging
import requests
from typing import Dict

logger = logging.getLogger(__name__)


class PaystackService:

    BASE_URL = "https://api.paystack.co"

    def __init__(self):

        self.session = requests.Session()

        self.session.headers.update({
            "Authorization": f"Bearer {os.getenv('PAYSTACK_SECRET_KEY')}",
            "Content-Type": "application/json"
        })

    def _request(
        self,
        method,
        endpoint,
        params=None,
        json=None
    ):

        try:

            response = self.session.request(
                method=method,
                url=f"{self.BASE_URL}{endpoint}",
                params=params,
                json=json,
                timeout=(10, 30)
            )

            response.raise_for_status()

            return response.json()

        except requests.Timeout:

            logger.exception("Paystack timeout")

            return {
                "success": False,
                "message": "Request timed out"
            }

        except requests.RequestException as e:

            logger.exception(e)

            return {
                "success": False,
                "message": str(e)
            }

    def get_banks(self):

        result = self._request(
            "GET",
            "/bank",
            params={
                "country": "nigeria",
                "perPage": 500
            }
        )

        if not result.get("status"):
            return result

        return {
            "success": True,
            "data": sorted(
                result["data"],
                key=lambda x: x["name"]
            )
        }

    def resolve_account(
        self,
        account_number,
        bank_code
    ):

        return self._request(
            "GET",
            "/bank/resolve",
            params={
                "account_number": account_number,
                "bank_code": bank_code
            }
        )
