---
name: php-query
description: |
  PHP 파일에서 SQL 쿼리를 자동으로 추출합니다.
  함수 기반 추출(구조화된 코드) 또는 프로시저럴 추출(레거시 코드)을 자동으로 선택합니다.

  사용 시점: PHP 파일의 데이터베이스 쿼리를 분석하고, 쿼리 패턴을 파악하거나, SQL 최적화 대상을 찾을 때 사용합니다.

  지원 포맷: 마크다운 테이블로 함수명/라인번호, 추출된 SQL 쿼리를 정렬하여 표시합니다.
  - 함수 있음: 함수별 쿼리 표시
  - 함수 없음: 라인 범위별 쿼리 표시
compatibility: |
  - php-index 스킬 필요
  - Node.js 및 PHP 파일 접근 권한 필요
---

# PHP 쿼리 추출 스킬 (php-query)

PHP 소스 파일에서 SQL 쿼리를 자동으로 추출하는 스킬입니다.

## 기능

- **함수 기반 추출**: php-index 스킬을 사용하여 각 함수에서 SQL 쿼리 추출
- **프로시저럴 코드 지원**: 함수 없는 레거시 PHP 파일도 직접 SQL 추출 (zboard.php)
- **SQL 쿼리 추출**: SELECT, INSERT, UPDATE, DELETE 등 모든 SQL 쿼리 자동 추출
- **마크다운 테이블 출력**: 함수별/라인별 SQL 쿼리를 구조화된 테이블로 표시

## 사용 방법

```
/php-query <파일명>
```

### 입력

- **파일명** (필수): PHP 파일 경로 또는 파일명
  - 예: `notice_ad.class.php`
  - 예: `include/libraries/notice_ad.class.php`

### 출력

마크다운 테이블 형식으로 다음 정보를 표시합니다:

| # | 함수명 | 라인번호 | SQL 쿼리 |
|---|--------|---------|---------|
| 1 | getNotice() | 57-88 | SELECT ... FROM ... |
| 2 | setNotice() | 112-143 | SELECT ... FROM ... |

## 🔥 주의: php-index 스킬 필수!

**php-query를 사용하기 전에 반드시 php-index 색인을 생성해야 합니다:**

```bash
# 1단계: php-index로 색인 생성 (필수!)
/php-index build --source work/mobile --force

# 2단계: php-query로 쿼리 추출
/php-query zboard.php
```

색인이 없으면 php-query가 작동하지 않습니다!

## 작동 방식

### 함수 기반 추출 (구조화된 PHP 파일)
1. **php-index 스킬** 호출하여 파일의 함수 목록을 조회
2. **소스 파일** 읽기 및 각 함수의 코드 범위 파악
3. **SQL 패턴** 매칭으로 함수별 SQL 쿼리 추출
4. **마크다운 테이블** 형식으로 결과 표시

### 프로시저럴 추출 (함수 없는 레거시 코드)
1. 함수가 없으면 전체 파일을 스캔
2. **SQL 패턴** 매칭으로 라인별 쿼리 추출
3. 라인 범위와 함께 **마크다운 테이블**로 표시

**지원 SQL 패턴:**
- `SELECT` 쿼리
- `INSERT` 쿼리
- `UPDATE` 쿼리
- `DELETE` 쿼리
- `UNION`, `JOIN` 등 복합 쿼리

## 예제

### 예제 1: notice_ad.class.php 분석

```
/php-query notice_ad.class.php
```

**결과:**
```
📄 notice_ad.class.php - SQL 쿼리 추출 (함수 최대 10개)

| # | 함수명 | 라인번호 | SQL 쿼리 |
|---|--------|---------|---------|
| 1 | getNotice() | 57-88 | SELECT b.no, b.ismember ... FROM ppom_bbs_notice a JOIN zetyx_board_... WHERE a.bbs_id=:bbs_id |
| 2 | setNotice() | 112-143 | SELECT b.no, b.ismember ... FROM ppom_bbs_notice a JOIN zetyx_board_... WHERE a.bbs_id=:bbs_id |
| 3 | getInform() | 177 | SELECT * FROM ppom_bbs_ad WHERE use_yn='Y' AND end_date > UNIX_TIMESTAMP() |
| 4 | getInform() | 229 | SELECT ismember, name, subject FROM zetyx_board_sponsor WHERE no=? |
```

### 예제 2: 특정 파일에서 모든 쿼리 추출

```
/php-query api/member.php
```

결과는 해당 파일의 모든 SQL 쿼리를 함수별로 정렬하여 표시합니다.

## 활용 시나리오

### 1. 데이터베이스 성능 분석
특정 PHP 파일의 모든 쿼리를 한눈에 보고, 최적화가 필요한 쿼리를 식별할 수 있습니다.

### 2. 의존성 분석
SQL 쿼리가 어떤 테이블을 사용하는지 파악하여, 데이터베이스 변경의 영향 범위를 분석합니다.

### 3. 보안 감사
SQL 인젝션 취약점이 있을 수 있는 동적 쿼리를 찾아 개선합니다.

### 4. 마이그레이션 계획
레거시 PHP 코드의 쿼리 패턴을 파악하여 마이그레이션 전략을 수립합니다.

## 제약사항

- **정적 분석만**: 동적으로 생성되는 쿼리는 감지하지 못할 수 있음
- **PHP 5.6+ 지원**: 레거시 PHP 코드 기준으로 작성됨
- **색인 선택사항**: 프로시저럴 코드는 색인 없이도 자동 추출 (함수명은 표시 안 됨)

## 팁

- 💡 **색인 생성** (선택사항): `/php-index build --source work/mobile --force`
  - 함수 있는 파일 추천 (정확한 함수명 표시)
  - 프로시저럴 코드는 색인 없이도 자동 추출
- 추출된 쿼리는 바인딩 파라미터 (`:param`, `?`) 를 포함한 원본 형태입니다
- 여러 줄에 걸친 쿼리도 정확히 추출됩니다
- 함수 있으면 함수별, 없으면 라인별로 쿼리 표시
- 모든 함수/쿼리가 표시됩니다 (제한 없음)
