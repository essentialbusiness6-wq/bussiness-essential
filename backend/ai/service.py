import os

from openai import OpenAI

client = OpenAI(
    api_key=os.getenv(
        "OPENAI_API_KEY"
    )
)

MODEL = os.getenv(
    "OPENAI_MODEL",
    "gpt-5.5"
)


import json

from .prompts import SYSTEM_PROMPT

from .tools import TOOLS


def ask_ai(
    message,
    conversation,
    context
):

    messages = [

        {
            "role":"system",
            "content":SYSTEM_PROMPT
        }

    ]

    messages.extend(
        conversation
    )

    messages.append({

        "role":"user",

        "content":message

    })

    response = client.chat.completions.create(

        model=MODEL,

        messages=messages,

        tools=TOOLS,

        tool_choice="auto"

    )

    return response
