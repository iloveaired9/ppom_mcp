@echo off
REM PHP Index Dashboard 서버 중지 스크립트 (포트 3012)
REM Windows CMD 환경

setlocal enabledelayedexpansion

echo ========================================
echo   PHP Index Dashboard 서버 중지
echo ========================================
echo.

REM 포트 3012 사용 중인 프로세스 찾기 및 종료
echo 포트 3012의 프로세스를 종료합니다...
netstat -ano | findstr :3012 > nul

if %errorlevel% equ 0 (
    REM 포트 3012를 사용 중인 모든 PID 종료
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3012') do (
        echo ✓ PID %%a 종료 중...
        taskkill /PID %%a /F > nul 2>&1
        if !errorlevel! equ 0 (
            echo ✓ PID %%a 종료 완료
        )
    )
    timeout /t 1 > nul
    echo.
    echo ✅ 서버가 중지되었습니다.
) else (
    echo ⓘ 포트 3012에서 실행 중인 프로세스가 없습니다.
)

echo.
pause
