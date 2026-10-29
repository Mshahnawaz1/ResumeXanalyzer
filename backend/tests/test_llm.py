"""Test if the providers are working properly, and the APIs are correct.
Run (-s to print):
    uv run pytest tests/test_llm.py -m live -s
"""

import pytest

from services.llm_client import _call_gemini, _call_openrouter

pytestmark = pytest.mark.live

PROMPT = "Explain about AI in 20 words."


def test_gemini():
    result_gemini = _call_gemini(PROMPT)

    print(f"Result of gemini is: {result_gemini}")
    assert result_gemini is not None


def test_openrouter():
    try:
        result = _call_openrouter(PROMPT)
    except Exception as e:
        pytest.fail(f"OpenRouter call raised an exception: {e}")

    print(f"Openrouter result: {result}")
    assert result is not None
    assert isinstance(result, str)
