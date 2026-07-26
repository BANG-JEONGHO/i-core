# 유닛 의존성 매트릭스

## 의존성 관계

| 유닛 | 의존 대상 | 관계 유형 | 설명 |
|---|---|---|---|
| unit-frontend | unit-backend | HTTP REST | API 호출 (비동기) |
| unit-backend | unit-matching-core | Python import | 패키지 의존 (pip install -e) |
| unit-matching-core | - (독립) | 없음 | 외부 의존 없음 |

---

## 의존성 다이어그램

```
+-------------------+       HTTP/REST       +-------------------+
| unit-frontend     | --------------------> | unit-backend      |
| (React/TS)        |                       | (FastAPI)         |
+-------------------+                       +-------------------+
                                                     |
                                                     | Python import
                                                     v
                                            +-------------------+
                                            | unit-matching-core|
                                            | (Python 패키지)    |
                                            +-------------------+
```

---

## 개발 순서 전략

**동시 개발 (병렬)**:
- 3개 유닛을 동시에 개발 가능
- unit-matching-core는 독립적이므로 가장 먼저 완성 가능
- unit-frontend는 Mock API로 독립 개발 가능
- unit-backend는 unit-matching-core 완성 후 통합

### 권장 통합 순서
1. unit-matching-core 단독 테스트 (파서 + 매칭 로직)
2. unit-backend + unit-matching-core 통합 (API 동작 확인)
3. unit-frontend + unit-backend 통합 (E2E 흐름 확인)

---

## 인터페이스 계약

### Frontend ↔ Backend (REST API)
- 통신: JSON over HTTP
- 인증: JWT Bearer Token (Authorization 헤더)
- API 문서: FastAPI 자동 생성 (Swagger/OpenAPI)
- 개발 시: Frontend에서 Mock API 사용 가능

### Backend ↔ Matching Core (Python)
- 통신: 직접 함수 호출 (같은 Python 환경)
- 설치: `pip install -e ../instructor-matching-core`
- 인터페이스: matching_core 패키지의 public API

---

## 버전 호환성

| 관계 | 호환 전략 |
|---|---|
| Frontend ↔ Backend | API 버전 관리 (/api/v1/) |
| Backend ↔ Core | 로컬 editable install (항상 최신) |
