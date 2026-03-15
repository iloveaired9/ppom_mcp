---
name: myawsdb-export
description: myawsdb 데이터를 CSV/JSON으로 내보내기
author: Claude Code
arguments: |
  명령어 형식:
  - export <tableName> csv [limit=N]
  - export <tableName> json [limit=N]
  - export <tableName> tsv [limit=N]

  예제:
  - /myawsdb-export posts csv
  - /myawsdb-export posts csv limit=100
  - /myawsdb-export posts json limit=50

prompt: |
  사용자가 /myawsdb-export 명령을 입력했습니다.

  당신의 작업:

  1. 명령 파싱:
     - 테이블명 추출 (예: posts, comments, users)
     - 포맷 추출 (csv, json, tsv 중 선택)
     - limit 파라미터 추출 (없으면 기본값: 100)

  2. myawsdb API 호출:
     curl -X POST http://localhost:3010/query \
       -H "Content-Type: application/json" \
       -d '{"tableName":"<TABLE>","limit":<LIMIT>}'

  3. JSON 결과를 지정된 포맷으로 변환:
     - CSV: 헤더 + 데이터행 (UTF-8 with BOM)
     - JSON: Pretty-printed JSON with metadata
     - TSV: 탭 구분자 사용

  4. 파일 생성:
     - 파일명: <tableName>_<TIMESTAMP>.csv|json|tsv
     - 저장위치: 현재 디렉토리
     - TIMESTAMP 형식: YYYYMMdd_HHmmss (예: 20260315_152739)

  5. 결과 표시:
     - ✅ 파일명 표시
     - 📊 행 수 표시
     - 💾 파일 크기 표시
     - 📁 저장 경로 표시

  중요: 자동으로 실행하고 결과를 보여줍니다.
---

# myawsdb 데이터 내보내기

myawsdb의 테이블 데이터를 다양한 형식으로 내보냅니다.

---

## 지원 포맷

| 포맷 | 설명 | 확장자 | 용도 |
|------|------|--------|------|
| **CSV** | 쉼표로 구분된 값 | .csv | Excel, 스프레드시트 |
| **JSON** | JSON 형식 | .json | API, 프로그래밍 |
| **TSV** | 탭으로 구분된 값 | .tsv | 텍스트 분석 |

---

## 명령어

### CSV 내보내기
```bash
/myawsdb-export posts csv
/myawsdb-export posts csv limit=100
```

**결과:**
- 파일명: `posts_<timestamp>.csv`
- 인코딩: UTF-8 with BOM
- 헤더: 자동 포함

### JSON 내보내기
```bash
/myawsdb-export posts json
/myawsdb-export posts json limit=50
```

**결과:**
- 파일명: `posts_<timestamp>.json`
- 형식: Pretty-printed JSON
- 메타데이터: 자동 포함

### TSV 내보내기
```bash
/myawsdb-export posts tsv limit=200
```

**결과:**
- 파일명: `posts_<timestamp>.tsv`
- 구분자: 탭 문자
- 줄바꿈: 자동 처리

---

## 옵션

| 옵션 | 기본값 | 설명 |
|------|--------|------|
| `limit` | 100 | 내보낼 행 수 |
| `offset` | 0 | 시작 위치 |
| `columns` | 모든 컬럼 | 특정 컬럼만 내보내기 |

---

## 동작 방식

1. **데이터 조회**: myawsdb API에서 테이블 데이터 조회
2. **포맷 변환**: 선택된 형식으로 데이터 변환
3. **파일 생성**: 현재 디렉토리에 파일 생성
4. **결과 표시**: 저장 위치 및 통계 정보 표시

---

## 예제

### 1. posts 테이블 CSV 내보내기
```bash
/myawsdb-export posts csv limit=10
```

**생성되는 파일:** `posts_20260315_152400.csv`
```csv
no,subject,name,hit,vote,total_comment
9856791,한국도 우려 입장 내야 하나?,초류항,577,0,1
9856793,전쟁이 빨리끝날수도 있을거 같은 상황,김아기,1645,0,12
```

### 2. 대량 데이터 JSON 내보내기
```bash
/myawsdb-export posts json limit=500
```

**생성되는 파일:** `posts_20260315_152400.json`
```json
{
  "table": "posts",
  "count": 500,
  "exported_at": "2026-03-15T15:24:00Z",
  "records": [
    {
      "no": 9856791,
      "subject": "한국도 우려 입장 내야 하나?",
      ...
    }
  ]
}
```

---

## 실행 흐름

```
사용자: /myawsdb-export posts csv limit=100
   ↓
파싱: 테이블=posts, 포맷=csv, limit=100
   ↓
API 호출: GET http://localhost:3010/query
   ↓
데이터 변환: JSON → CSV
   ↓
파일 생성: posts_20260315_152400.csv
   ↓
결과 표시: ✅ 파일 생성 완료
```

---

## 지원하는 테이블

- **posts** - 게시물 데이터
- 다른 모든 aired 데이터베이스 테이블 지원

