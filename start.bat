@echo off
chcp 65001 > nul
echo ========================================================
echo   i-Core 강사 매칭 플랫폼 서버를 시작합니다.
echo ========================================================
echo.
echo 1. 백엔드 서버(FastAPI: 8700포트) 실행 중...
start "i-Core 백엔드 서버" cmd /k "cd /d %~dp0backend && ..\.venv\Scripts\uvicorn app.main:app --host 127.0.0.1 --port 8700 --reload"

echo 2. 프론트엔드 서버(Vite: 8900포트) 실행 중...
start "i-Core 프론트엔드 서버" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo ========================================================
echo   모든 서버 실행 명령이 전달되었습니다!
echo   잠시 후 브라우저에서 http://localhost:8900 에 접속하세요.
echo ========================================================
