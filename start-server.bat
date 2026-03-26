@echo off
REM PHP Index Dashboard 서버 시작 스크립트 (포트 3012)
REM Windows CMD 환경

setlocal enabledelayedexpansion

echo ========================================
echo   PHP Index Dashboard 서버 시작
echo ========================================
echo.

REM 포트 3012가 이미 사용 중인지 확인
echo [1/3] 포트 3012 확인 중...
netstat -ano | findstr :3012 > nul
if %errorlevel% equ 0 (
    echo ⚠️  포트 3012가 이미 사용 중입니다. 프로세스를 종료합니다...
    REM 포트 3012를 사용 중인 PID 찾기
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3012') do (
        echo PID %%a 종료 중...
        taskkill /PID %%a /F > nul 2>&1
    )
    timeout /t 2 > nul
)

REM Node.js 설치 확인
echo [2/3] Node.js 확인 중...
node --version > nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js가 설치되지 않았습니다.
    echo Node.js를 설치해주세요: https://nodejs.org/
    pause
    exit /b 1
)

REM 서버 시작
echo [3/3] 서버 시작 중 (포트 3012)...
echo.

cd /d "%~dp0"
node mcp-servers\php-index-dashboard.js

pause
