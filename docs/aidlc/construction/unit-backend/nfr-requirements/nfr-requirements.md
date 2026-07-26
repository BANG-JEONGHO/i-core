# NFR 요구사항 — unit-backend

## 성능 (Performance)

| 요구사항 | 기준 | 비고 |
|---|---|---|
| API 응답 시간 (CRUD) | < 200ms | 일반 조회/수정 |
| 파일 업로드 + 파싱 | < 5초 (50MB) | matching_core 포함 |
| 매칭 실행 | < 5초 (108명) | matching_core 호출 포함 |
| 동시 접속 | 수십 명 (회사 전체) | 사내 도구 수준 |
| 파일 업로드 크기 | 최대 50MB | FastAPI 설정 |

## 보안 (Security) — Security Baseline 전체 적용

| 규칙 | 적용 내용 |
|---|---|
| SECURITY-01 | DB 암호화: SQLite WAL모드, 향후 PostgreSQL TLS 연결 |
| SECURITY-03 | structlog 구조화 로깅, 요청ID 포함, PII 미포함 |
| SECURITY-04 | HTTP 보안 헤더 (CSP, HSTS, X-Content-Type-Options 등) |
| SECURITY-05 | Pydantic 스키마 검증 모든 API, 파일 크기/형식 검증 |
| SECURITY-08 | JWT 인증 미들웨어, 모든 보호 엔드포인트에 적용 |
| SECURITY-09 | 글로벌 에러 핸들러, 스택 트레이스 미노출 |
| SECURITY-10 | requirements.txt 버전 고정 |
| SECURITY-11 | 인증 모듈 분리, Rate Limiting, 남용 방지 |
| SECURITY-12 | bcrypt 해싱, JWT 세션, 브루트포스 방지(Rate Limit) |
| SECURITY-13 | JSON 역직렬화(Pydantic), 안전한 파일 처리 |
| SECURITY-14 | 인증 실패 로깅, 로그 보존 |
| SECURITY-15 | try/except 전체, fail-closed, 리소스 정리 |

## 확장성 (Scalability)

| 요구사항 | 기준 |
|---|---|
| 강사 수 | 현재 108명 → 500명까지 |
| 과업지시서 | 누적 저장 (삭제 없음) |
| DB | SQLite 개발 → PostgreSQL 운영 전환 가능 |

## 유지보수성 (Maintainability)

| 요구사항 | 기준 |
|---|---|
| API 문서 | FastAPI 자동 생성 (Swagger/OpenAPI) |
| 계층 분리 | Router → Service → Repository 3계층 |
| DB 마이그레이션 | Alembic 지원 구조 |
| 타입 안전 | Pydantic v2 모델 전체 사용 |

## 테스트 (PBT Partial)

| 대상 | PBT 적용 |
|---|---|
| DB ↔ matching_core 변환 함수 | 적용 — 라운드트립 불변식 |
| 점수 변환/직렬화 | 적용 — 데이터 무결성 |
| API 핸들러 | 미적용 — 통합 테스트로 커버 |
