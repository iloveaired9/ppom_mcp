#!/bin/bash
# ⚡ ppomppu-crawler 빠른 접근 스크립트
# 사용: bash scripts/ppom-fast.sh freeboard 1

BOARD=${1:-freeboard}
PAGE=${2:-1}
API_URL="http://localhost:3008"

case "$BOARD" in
  help|--help|-h)
    echo "📍 ppomppu-crawler 빠른 조회"
    echo ""
    echo "사용법: bash scripts/ppom-fast.sh <board> [page]"
    echo ""
    echo "게시판:"
    echo "  - freeboard  : 자유게시판"
    echo "  - baseball   : 야구 게시판"
    echo "  - ppomppu    : 뽐뿌 일반"
    echo "  - stock      : 주식 게시판"
    echo "  - analyze    : 분석 (형식: analyze freeboard 1)"
    echo ""
    echo "예시:"
    echo "  bash scripts/ppom-fast.sh freeboard 1"
    echo "  bash scripts/ppom-fast.sh analyze baseball 1"
    exit 0
    ;;
  analyze)
    BOARD=$2
    PAGE=$3
    echo "🔍 분석 중: $BOARD 페이지 $PAGE..."
    curl -s "$API_URL/analyze?board=$BOARD&page=$PAGE" | head -100
    ;;
  *)
    echo "📰 조회 중: $BOARD 페이지 $PAGE..."
    curl -s "$API_URL/$BOARD?page=$PAGE" | head -100
    ;;
esac
