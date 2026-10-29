"""Check that the LLM providers are reachable and the API keys are valid.
Run (-s to print):
    uv run pytest tests/test_llm.py -m live -s
"""

import pytest

from services.llm_client import _call_gemini, _call_openrouter

pytestmark = pytest.mark.live

PROMPT = "Explain about AI in 20 words."


@pytest.mark.parametrize("call", [_call_gemini, _call_openrouter], ids=["gemini", "openrouter"])
def test_provider_responds(call):
    result = call(PROMPT)

    print(f"\n{call.__name__}: {result}")
    assert isinstance(result, str) and result
