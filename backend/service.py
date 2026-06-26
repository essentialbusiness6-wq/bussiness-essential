import logging
import os
import requests
from requests.adapters import HTTPAdapter
from urllib3.poolmanager import PoolManager
import ssl


logger = logging.getLogger(__name__)


class TLSAdapter(HTTPAdapter):

    def init_poolmanager(
        self,
        connections,
        maxsize,
        block=False,
        **kwargs
    ):

        ctx = ssl.create_default_context()

        ctx.check_hostname = True

        ctx.minimum_version = (
            ssl.TLSVersion.TLSv1_2
        )

        self.poolmanager = PoolManager(
            num_pools=connections,
            maxsize=maxsize,
            block=block,
            ssl_context=ctx
        )


class PaystackService:

    BASE_URL = (
        "https://api.paystack.co"
    )

    def __init__(self):

        self.session = (
            requests.Session()
        )

        self.session.mount(
            "https://",
            TLSAdapter()
        )

        self.session.headers.update({

            "Authorization":
            f"Bearer {os.getenv('PAYSTACK_SECRET_KEY')}",

            "Content-Type":
            "application/json"
        })


    def _request(
        self,
        method,
        endpoint,
        params=None,
        json=None
    ):

        try:

            response = (
                self.session.request(

                    method,

                    self.BASE_URL +
                    endpoint,

                    params=params,

                    json=json,

                    timeout=(
                        10,
                        30
                    )
                )
            )

            response.raise_for_status()

            return response.json()

        except Exception:

            logger.exception(
                "Paystack failed"
            )

            raise

    # ---------------------------------------

    def get_banks(self, country: str = "nigeria") -> Dict:

        result = self._request(
            "GET",
            "/bank",
            params={
                "country": country,
                "use_cursor": False,
                "perPage": 500
            }
        )

        if not result["success"]:
            return result

        banks = sorted(
            result["data"],
            key=lambda x: x["name"]
        )

        return {
            "success": True,
            "message": "Banks fetched successfully.",
            "data": banks
        }

    # ---------------------------------------

    def resolve_account(
        self,
        account_number: str,
        bank_code: str
    ) -> Dict:

        if len(account_number) != 10:
            return {
                "success": False,
                "message": "Invalid account number.",
                "data": None
            }

        return self._request(
            "GET",
            "/bank/resolve",
            params={
                "account_number": account_number,
                "bank_code": bank_code
            }
        )
