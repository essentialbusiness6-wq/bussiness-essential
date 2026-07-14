import os

from openai import (
    OpenAI,
    RateLimitError,
    AuthenticationError,
    APIConnectionError,
    APITimeoutError,
    BadRequestError,
    OpenAIError
)

client = OpenAI(
    api_key=os.getenv("OPENAI_API_KEY")
)

MODEL = "gpt-5.5"



import json

from .prompts import SYSTEM_PROMPT

from .tools import TOOLS



client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))


def ask_ai(prompt, history=None, tools=None):

    messages = history or []

    messages.append({
        "role": "user",
        "content": prompt
    })

    try:

        response = client.chat.completions.create(
            model="gpt-5-mini",
            messages=messages,
            tools=tools if tools else None,
            tool_choice="auto"
        )

        return {
            "success": True,
            "response": response
        }

    except RateLimitError:
        return {
            "success": False,
            "error": "quota_exceeded",
            "message": (
                "The AI service is temporarily unavailable because the "
                "OpenAI API quota has been exceeded."
            )
        }

    except AuthenticationError:
        return {
            "success": False,
            "error": "authentication_failed",
            "message": "The OpenAI API key is invalid."
        }

    except APIConnectionError:
        return {
            "success": False,
            "error": "connection_error",
            "message": "Unable to connect to the OpenAI servers."
        }

    except APITimeoutError:
        return {
            "success": False,
            "error": "timeout",
            "message": "The AI request timed out."
        }

    except BadRequestError as e:
        return {
            "success": False,
            "error": "bad_request",
            "message": str(e)
        }

    except OpenAIError as e:
        return {
            "success": False,
            "error": "openai_error",
            "message": str(e)
        }

    except Exception as e:
        return {
            "success": False,
            "error": "internal_error",
            "message": str(e)
        }
