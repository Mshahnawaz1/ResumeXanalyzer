uv run pytest tests/test_full.py -v
uv run pytest -v 

docker build -t my-fastapi-app .
docker tag my-fastapi-app resumexanalyzer:v1.0





### Errors while using pytest
- Module not found error when directly runnig the test file: This error is caused because sys path is on test/ (cause thats where the file is not the current dir). 
Its can be resolved by specifying where the system path is either in the file or in cmd
`PYTHONPATH=. uv run tests/test_llm.py -s`
or use the pytest directly

- "OPTIONS /api/analyze HTTP/1.1" 400 Bad Request
