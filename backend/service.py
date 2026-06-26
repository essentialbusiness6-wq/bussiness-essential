import logging
import os
import requests
from typing import Dict


logger = logging.getLogger(__name__)


class PaystackService:

    BASE_URL = (
        "https://api.paystack.co"
    )

    def __init__(self):

        self.session = (
            requests.Session()
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

            r = (
                self.session.request(

                    method,

                    self.BASE_URL +
                    endpoint,

                    params=params,

                    json=json,

                    timeout=20
                )
            )

            r.raise_for_status()

            return r.json()

        except Exception as e:

            logger.exception(e)

            return {

                "success":
                False,

                "message":
                str(e),

                "data":
                None
            }


    def get_banks(
        self,
        country="nigeria"
    ):

        return self._request(

            "GET",

            "/bank",

            params={

                "country":
                country,

                "perPage":
                500
            }
        )


    def resolve_account(
        self,
        account_number,
        bank_code
    ):

        return self._request(

            "GET",

            "/bank/resolve",

            params={

                "account_number":
                account_number,

                "bank_code":
                bank_code
            }
        )
