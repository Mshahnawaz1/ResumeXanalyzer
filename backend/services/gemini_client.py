"""
Gemini client wrapper.
Delegates to the modular LLM client to support multiple providers (Gemini, OpenRouter)
while preserving the original call_gemini import used throughout the agents.
"""

from services.llm_client import call_llm


def call_gemini(prompt: str) -> dict:
    """
    Call the configured LLM provider and return a parsed JSON dictionary.
    """
    return call_llm(prompt)
