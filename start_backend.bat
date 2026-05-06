@echo off
cd /d "%~dp0backend"
call venv\Scripts\activate
echo Starting ImagePress backend on http://localhost:8000
uvicorn main:app --reload --host 0.0.0.0 --port 8000
