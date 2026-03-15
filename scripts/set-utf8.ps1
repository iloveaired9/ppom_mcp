# Windows PowerShell UTF-8 인코딩 설정
# 실행: powershell -ExecutionPolicy Bypass -File scripts/set-utf8.ps1

# 콘솔 출력 인코딩을 UTF-8로 설정
[System.Console]::OutputEncoding = [System.Text.Encoding]::UTF8

# 현재 PowerShell의 문자 인코딩 설정
$env:PYTHONIOENCODING = "utf-8"

Write-Host "✅ UTF-8 인코딩이 설정되었습니다" -ForegroundColor Green
Write-Host "이제 curl 명령어를 사용해주세요:"
Write-Host ""
Write-Host "npm run ppom:help"
Write-Host "npm run ppom:tools"
