

- Test open router

```
  curl https://openrouter.ai/api/v1/chat/completions \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $e11e05a4cfe8111265a21ccaf234eae0d4cbe26fa416b74d41fa95f17a5947fe" \
    -d '{
    "model": "inclusionai/ling-3.0-flash:free",
    "messages": [
      {
        "role": "user",
        "content": "How many r`s are in the word `strawberry?`"
      }
    ],
    "reasoning": {
      "enabled": true
    }
}'
```