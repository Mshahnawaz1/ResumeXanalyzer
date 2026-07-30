"""Test OpenRouter LLM connection using credentials from .env."""

import os
from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "").strip().rstrip(",")
OPENROUTER_BASE_URL = os.getenv("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1").strip().rstrip(",")
OPENROUTER_MODEL = os.getenv("OPENROUTER_MODEL", "").strip().rstrip(",")

print("=" * 55)
print("  OpenRouter LLM Connection Test")
print("=" * 55)
print(f"  Base URL : {OPENROUTER_BASE_URL}")
print(f"  Model    : {OPENROUTER_MODEL}")
print(f"  API Key  : {OPENROUTER_API_KEY[:12]}...{OPENROUTER_API_KEY[-6:]}")
print("=" * 55)

client = OpenAI(
    api_key=OPENROUTER_API_KEY,
    base_url=OPENROUTER_BASE_URL,
)

try:
    response = client.chat.completions.create(
        model=OPENROUTER_MODEL,
        messages=[
            {
                "role": "user",
                "content": "Explain the AI agents.",
            }
        ],
        max_tokens=1000,
    )

    choice = response.choices[0]
    reply = choice.message.content

    print(f"\n✅ SUCCESS — API responded!")
    print(f"   Finish reason : {choice.finish_reason}")
    if reply:
        print(f"   Model replied : {reply.strip()}")
    else:
        print(f"   Content       : (empty / None — model may not have generated text)")
    if response.usage:
        print(f"   Tokens used   → prompt: {response.usage.prompt_tokens}, "
              f"completion: {response.usage.completion_tokens}, "
              f"total: {response.usage.total_tokens}")
    print(f"\n   Raw response  : {response.model_dump_json(indent=2)}\n")

except Exception as e:
    print(f"\n❌ FAILED — {type(e).__name__}: {e}\n")
    raise
