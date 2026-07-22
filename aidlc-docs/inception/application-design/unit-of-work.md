# 유닛 정의 (Unit of Work)

## 분해 전략
- **방식**: 계층별 분리 (3개 유닛)
- **구조**: 완전 분리 프로젝트 (각 유닛이 독립 프로젝트)
- **개발 순서**: 동시 개발 (병렬 진행)

---

## Unit 1: Frontend (프론트엔드)

| 항목 | 내용 |
|---|---|
| **유닛 ID** | unit-frontend |
| **유형** | 독립 프로젝트 |
| **기술** | React, TypeScript, Vite |
| **프로젝트 루트** | `instructor-matching-frontend/` |
| **책임** | 사용자 인터페이스 전체 |

### 포함 컴포넌트
- C-01: Frontend (전체)

### 주요 모듈
- `pages/` — 페이지 컴포넌트 (Login, Dashboard, Instructors, TaskOrders, Matching)
- `components/` — 재사용 UI 컴포넌트
- `api/` — 백엔드 API 호출 레이어 (Axios/Fetch)
- `hooks/` — 커스텀 훅
- `store/` — 상태 관리 (Zustand)
- `types/` — TypeScript 타입 정의

### 산출물
- React SPA 애플리케이션
- 로그인/회원가입 UI
- 강사 관리 UI (목록, 상세, 업로드)
- 과업지시서 업로드 및 파싱 결과 UI
- 매칭 결과 (점수 목록 + 카드)
- 대시보드

---

## Unit 2: Backend (백엔드 API/서비스)

| 항목 | 내용 |
|---|---|
| **유닛 ID** | unit-backend |
| **유형** | 독립 프로젝트 |
| **기술** | Python, FastAPI, SQLAlchemy, SQLite |
| **프로젝트 루트** | `instructor-matching-backend/` |
| **책임** | REST API, 인증, CRUD 서비스, DB 관리 |

### 포함 컴포넌트
- C-02: Auth Module
- C-03: Instructor Service
- C-06: Task Order Service
- C-07: Matching Service
- C-08: Database

### 주요 모듈
- `app/api/` — FastAPI 라우터 (엔드포인트 정의)
- `app/services/` — 비즈니스 서비스 레이어
- `app/models/` — SQLAlchemy 모델
- `app/schemas/` — Pydantic 스키마 (요청/응답 DTO)
- `app/core/` — 설정, 보안, 미들웨어
- `app/db/` — 데이터베이스 설정 및 마이그레이션

### 산출물
- FastAPI REST API 서버
- JWT 인증 시스템
- 강사 CRUD API
- 과업지시서 업로드/관리 API
- 매칭 실행/결과 API
- DB 스키마 및 마이그레이션

---

## Unit 3: Matching Core (매칭 엔진/파서)

| 항목 | 내용 |
|---|---|
| **유닛 ID** | unit-matching-core |
| **유형** | 독립 프로젝트 (Python 패키지) |
| **기술** | Python, pdfplumber, python-docx, hwp5 |
| **프로젝트 루트** | `instructor-matching-core/` |
| **책임** | 문서 파싱, 매칭 알고리즘, 점수 계산 |

### 포함 컴포넌트
- C-04: Document Parser
- C-05: Matching Engine

### 주요 모듈
- `matching_core/parser/` — 문서 파서 (PDF, HWP, Word)
- `matching_core/engine/` — 매칭 엔진 (전략 패턴)
- `matching_core/models/` — 내부 데이터 모델
- `matching_core/utils/` — 유틸리티 (키워드 추출, 텍스트 처리)

### 산출물
- 문서 파싱 라이브러리 (PDF/HWP/Word → 텍스트 → 구조화 데이터)
- 1단계 매칭 엔진 (키워드 + 규칙 기반)
- 매칭 점수 계산 및 근거 생성
- (향후) 2단계: AI 임베딩 매칭 모듈
- (향후) 3단계: Knowledge Graph + Agent 모듈

---

## 코드 구조 전략

```
c:\Users\jhh88\Desktop\721aws\
├── instructor-matching-frontend/    # Unit 1: React/TS 프론트엔드
│   ├── src/
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
├── instructor-matching-backend/     # Unit 2: FastAPI 백엔드
│   ├── app/
│   ├── requirements.txt
│   └── pyproject.toml
├── instructor-matching-core/        # Unit 3: 매칭 엔진/파서
│   ├── matching_core/
│   ├── requirements.txt
│   └── pyproject.toml
└── aidlc-docs/                      # 문서 (변경 없음)
```

### 유닛 간 연결 방식
- **Frontend → Backend**: HTTP REST API (JSON)
- **Backend → Matching Core**: Python 패키지 import (pip install -e 로컬 의존)
