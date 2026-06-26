import logging
from typing import Dict, List, Optional
import os 
import requests
from flask import current_app
from dotenv import load_dotenv
from requests.adapters import HTTPAdapter
from urllib3.poolmanager import PoolManager
import ssl


load_dotenv()

logger = logging.getLogger(__name__)

class TLSAdapter(HTTPAdapter):

    def init_poolmanager(
        self,
        connections,
        maxsize,
        block=False,
        **pool_kwargs
    ):

        ctx = ssl.create_default_context()

        ctx.minimum_version = ssl.TLSVersion.TLSv1_2

        self.poolmanager = PoolManager(
            num_pools=connections,
            maxsize=maxsize,
            block=block,
            ssl_context=ctx
        )



class PaystackService:
    BASE_URL = "https://api.paystack.co"

    def __init__(self):
    
        self.session = requests.Session()
        self.session.mount(
                    "https://",
                    TLSAdapter()
        )
        self.session.headers.update({
            "Authorization": f"Bearer {os.getenv("PAYSTACK_SECRET_KEY")}",
            "Content-Type": "application/json"
        })

    def _request(
        self,
        method: str,
        endpoint: str,
        params: Optional[Dict] = None,
        json: Optional[Dict] = None
    ) -> Dict:

        url = f"{self.BASE_URL}{endpoint}"

        try:
            response = self.session.request(
                method=method,
                url=url,
                params=params,
                json=json,
                timeout=20
            )

            response.raise_for_status()

            payload = response.json()

            if not payload.get("status"):
                return {
                    "success": False,
                    "message": payload.get("message"),
                    "data": None
                }

            return {
                "success": True,
                "message": payload.get("message"),
                "data": payload.get("data")
            }

        except requests.Timeout:
            logger.exception("Paystack timeout")

            return {
                "success": False,
                "message": "Paystack request timed out.",
                "data": None
            }

        except requests.RequestException as e:
            logger.exception(e)

            return {
                "success": False,
                "message": str(e),
                "data": None
            }

        except Exception as e:
            logger.exception(e)

            return {
                "success": False,
                "message": "Unexpected Paystack error.",
                "data": None
            }

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
