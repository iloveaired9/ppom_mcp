---
name: php-query
description: |
  PHP 파일에서 SQL 쿼리를 함수별로 추출합니다.
  php-index를 사용하여 함수 목록을 가져온 후, 각 함수에서 모든 SQL 쿼리를 추출하여 마크다운 테이블로 표시합니다.

  사용 시점: PHP 파일의 데이터베이스 쿼리를 분석하고, 쿼리 패턴을 파악하거나, SQL 최적화 대상을 찾을 때 사용합니다.

  지원 포맷: 마크다운 테이블로 함수명, 라인번호, 추출된 SQL 쿼리를 정렬하여 표시합니다.
compatibility: |
  - php-index 스킬 필요
  - Node.js 및 PHP 파일 접근 권한 필요
---

# PHP 쿼리 추출 스킬 (php-query)

PHP 소스 파일에서 SQL 쿼리를 자동으로 추출하는 스킬입니다.

## 기능

- **함수 목록 조회**: php-index 스킬을 사용하여 PHP 파일의 함수 목록 조회 (최대 10개)
- **SQL 쿼리 추출**: 각 함수에서 SELECT, INSERT, UPDATE, DELETE 등 모든 SQL 쿼리 추출
- **마크다운 테이블 출력**: 함수별 SQL 쿼리를 구조화된 테이블로 표시

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

## 작동 방식

1. **php-index 스킬** 호출하여 파일의 함수 목록 조회 (limit 10)
2. **소스 파일** 읽기 및 각 함수의 코드 범위 파악
3. **SQL 패턴** 매칭으로 모든 SQL 쿼리 추출:
   - `SELECT` 쿼리
   - `INSERT` 쿼리
   - `UPDATE` 쿼리
   - `DELETE` 쿼리
   - `UNION`, `JOIN` 등 복합 쿼리
4. **마크다운 테이블** 형식으로 정렬하여 표시

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

- **최대 10개 함수**: php-index의 limit 10 설정에 따라 최대 10개 함수 분석
- **정적 분석만**: 동적으로 생성되는 쿼리는 감지하지 못할 수 있음
- **PHP 5.6+ 지원**: 레거시 PHP 코드 기준으로 작성됨

## 팁

- 큰 파일은 함수 몇 개만 분석되므로, 필요하면 `php-index search` 스킬로 특정 함수를 검색한 후 분석하세요
- 추출된 쿼리는 바인딩 파라미터 (`:param`, `?`) 를 포함한 원본 형태입니다
- 여러 줄에 걸친 쿼리도 정확히 추출됩니다
