"""
Modular LLM client supporting multiple providers (Gemini, OpenRouter).
"""

from __future__ import annotations

import json
import re

from config import settings

_gemini_client = None
_openrouter_client = None


def _get_gemini_client():
    global _gemini_client
    if _gemini_client is None:
        from google import genai
        _gemini_client = genai.Client(api_key=settings.gemini_api_key)
    return _gemini_client


def _get_openrouter_client():
    global _openrouter_client
    if _openrouter_client is None:
        from openai import OpenAI
        _openrouter_client = OpenAI(
            api_key=settings.openrouter_api_key,
            base_url=settings.openrouter_base_url,
            default_headers={
                "HTTP-Referer": "https://github.com/Mshahnawaz1/ResumeXanalyzer",
                "X-Title": "ResumeX Analyzer",
            },
        )
    return _openrouter_client


def _call_gemini(prompt: str) -> str:
    from google.genai import types
    client = _get_gemini_client()
    config = types.GenerateContentConfig(
        response_mime_type="application/json",
        temperature=0.2,
    )
    response = client.models.generate_content(
        model=settings.gemini_model,
        contents=prompt,
        config=config,
    )
    return response.text or ""


def _call_openrouter(prompt: str) -> str:
    client = _get_openrouter_client()
    # We do NOT pass response_format={"type": "json_object"} because some free models on OpenRouter
    # (like inclusionai/ling-3.0-flash:free) do not support structured outputs / JSON mode.
    # Instead, we rely on prompt engineering and our robust regex extraction/retry logic.
    response = client.chat.completions.create(
        model=settings.openrouter_model,
        messages=[{"role": "user", "content": prompt}],
        temperature=0.2,
    )
    return response.choices[0].message.content or ""


def _extract_json(text: str) -> dict:
    """Strip markdown fences if present, then parse JSON."""
    cleaned = re.sub(r"^```(?:json)?\s*|\s*```$", "", text.strip(), flags=re.MULTILINE)
    return json.loads(cleaned)


def call_llm(prompt: str) -> dict:
    """
    Send *prompt* to the configured LLM provider and return a parsed dict.

    Retries once if the first response cannot be parsed as JSON,
    sending back the raw text with an error correction instruction.
    Raises ValueError on a second failure — never returns garbage silently.
    """
    provider, model = settings.provider, settings.active_model

    def _execute(p: str) -> str:
        if provider == "gemini":
            return _call_gemini(p)
        elif provider == "openrouter":
            return _call_openrouter(p)
        else:
            raise ValueError(f"Unsupported LLM provider: {provider} (model: {model})")

    # 1. Try first execution
    try:
        raw = _execute(prompt)
    except Exception as exc:
        raise RuntimeError(f"API call failed using model '{model}' ({provider}): {exc}") from exc

    # 2. Try parsing JSON, retry on failure
    try:
        return _extract_json(raw)
    except ValueError:  # includes json.JSONDecodeError
        # --- one retry with correction hint ---
        correction_prompt = (
            f"{prompt}\n\n"
            "Your previous response could not be parsed as JSON. "
            "Return ONLY valid JSON with no markdown fences or extra text.\n"
            f"Bad response was:\n{raw}"
        )
        try:
            retry_raw = _execute(correction_prompt)
        except Exception as retry_exc:
            raise RuntimeError(
                f"API call failed during retry using model '{model}' ({provider}): {retry_exc}"
            ) from retry_exc

        try:
            return _extract_json(retry_raw)
        except ValueError as retry_exc:
            raise ValueError(
                f"LLM provider '{provider}' (model: {model}) returned unparseable JSON "
                "after retry.\n"
                f"Last raw response: {retry_raw}"
            ) from retry_exc
