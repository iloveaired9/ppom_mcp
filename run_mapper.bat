@echo off
REM PHP Dependency Mapper Batch Script
REM This script runs the PHP dependency mapper and generates the HTML report

setlocal enabledelayedexpansion

set "SCRIPT_DIR=%~dp0"
set "BASE_PATH=%SCRIPT_DIR%work\mobile"
set "OUTPUT_DIR=C:\Users\aired\AppData\Roaming\Claude\local-agent-mode-sessions\skills-plugin\03887657-ce9f-4a37-a469-3b10e0effb35\2e999d38-475d-40e8-8a21-5bfea2929df8\php-dependency-mapper-workspace\iteration-1\eval-full-codebase\with_skill\outputs"

echo.
echo ===================================
echo PHP Dependency Mapper
echo ===================================
echo.

if not exist "!BASE_PATH!" (
    echo ERROR: Base path does not exist: !BASE_PATH!
    exit /b 1
)

echo Creating output directory...
if not exist "!OUTPUT_DIR!" (
    mkdir "!OUTPUT_DIR!"
)

echo Running analysis...
php.exe "!SCRIPT_DIR!generate_report.php" "!BASE_PATH!" "!OUTPUT_DIR!"

if %ERRORLEVEL% equ 0 (
    echo.
    echo SUCCESS! Report generated at:
    echo !OUTPUT_DIR!\dependency_map.html
    echo.
) else (
    echo ERROR: Analysis failed with exit code %ERRORLEVEL%
    exit /b 1
)

endlocal
