
from services.gemini_client import call_gemini


prompt = "Explain about AI in 20 words."

print(call_gemini(prompt=prompt))