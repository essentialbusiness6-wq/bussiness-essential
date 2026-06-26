import logging
import os
import requests

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
            Print("HIT RESPONSE")
            response = (
                self.session.request(

                    method=method,

                    url=
                    self.BASE_URL +
                    endpoint,

                    params=params,

                    json=json,

                    timeout=20
                )
            )

            response.raise_for_status()
            print("FINISHED RESPONSE")
            return response.json()

        except requests.Timeout:

            logger.exception(
                "Paystack timeout"
            )

            return {
                "success": False,
                "message":
                "Request timed out"
            }


        except requests.RequestException as e:

            logger.exception(
                e
            )

            return {
                "success": False,
                "message":
                str(e)
            }


    def get_banks(
        self,
        country="nigeria"
    ):
        print("HIT GET BANK")
        return self._request(
            "GET",
            "/bank",
            params={
                "country":
                country
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
