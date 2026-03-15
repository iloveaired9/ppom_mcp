#!/bin/bash

# 뽐뿌 게시판 자동 수집 + 분석 스크립트
# 사용: ./scripts/fetch-and-summarize.sh [board] [page]
# 예시: ./scripts/fetch-and-summarize.sh freeboard 1
#       ./scripts/fetch-and-summarize.sh ppomppu 1
#       ./scripts/fetch-and-summarize.sh baseball 2

set -e

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 기본값
BOARD=${1:-freeboard}
PAGE=${2:-1}
TIMESTAMP=$(date +%Y-%m-%d)
CSV_FILE="${BOARD}-${TIMESTAMP}-page${PAGE}.csv"
JSON_FILE="/tmp/${BOARD}-page${PAGE}.json"

# 보드 정보 매핑
declare -A BOARD_NAMES=(
    [freeboard]="자유게시판"
    [ppomppu]="뽐뿌 게시판"
    [baseball]="야구 게시판"
    [stock]="주식 게시판"
)

BOARD_DISPLAY_NAME="${BOARD_NAMES[$BOARD]:-$BOARD}"

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  🚀 뽐뿌 $BOARD_DISPLAY_NAME 자동 분석${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

# Step 1: MCP 서버 확인
echo -e "${YELLOW}[1/4]${NC} MCP 서버 상태 확인 중..."
if ! curl -s http://localhost:3008/health > /dev/null 2>&1; then
  echo -e "${RED}❌ ppomppu-crawler MCP 서버가 실행 중이지 않습니다.${NC}"
  echo -e "${RED}   포트: 3008${NC}"
  exit 1
fi
echo -e "${GREEN}✅ MCP 서버 정상 (포트 3008)${NC}\n"

# Step 2: 데이터 수집
echo -e "${YELLOW}[2/4]${NC} $BOARD_DISPLAY_NAME 페이지 $PAGE 데이터 수집 중..."
if curl -s "http://localhost:3008/${BOARD}?page=${PAGE}" > "$JSON_FILE"; then
  POSTS_COUNT=$(grep -o '"no":' "$JSON_FILE" | wc -l)
  echo -e "${GREEN}✅ 데이터 수집 완료 (${POSTS_COUNT}개 게시물)${NC}\n"
else
  echo -e "${RED}❌ 데이터 수집 실패${NC}"
  exit 1
fi

# Step 3: CSV 변환 및 분석
echo -e "${YELLOW}[3/4]${NC} 데이터 분석 중..."
node scripts/analyze-json.js "$JSON_FILE" "$CSV_FILE" "$PAGE"
echo -e "\n${GREEN}✅ CSV 저장 완료${NC}"
echo -e "   파일: ${BLUE}$CSV_FILE${NC}\n"

# Step 4: 완료
echo -e "${YELLOW}[4/4]${NC} 분석 완료\n"

# 완료 메시지
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ 모든 작업 완료!${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "\n📁 생성된 파일:"
echo -e "   - ${BLUE}$CSV_FILE${NC}\n"
