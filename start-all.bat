@echo off
start cmd /k "cd /d %~dp0backend && npm run dev"
start cmd /k "cd /d %~dp0frontend && npm run dev"
start cmd /k "cd /d %~dp0python-service && python -m uvicorn main:app --port 8001"