# 🏗️ i-Core 플랫폼 전체 시스템 아키텍처 명세서 (System Architecture Specification)

> **본 문서는 i-Core AI 강사 매칭 & 과업 분석 플랫폼의 전반적인 구조(프론트엔드, 백엔드, 문서 파서, AI 에이전트 RAG, GCP 서버리스 인프라)와 데이터 흐름을 상세하고 구조적으로 설명한 가이드입니다.**

---

## 📌 목차 (Table of Contents)

1. [전체 시스템 아키텍처 다이어그램](#1-전체-시스템-아키텍처-다이어그램)
2. [계층별 상세 구조 및 역할](#2-계층별-상세-구조-및-역할)
   - [2.1 프론트엔드 계층 (Frontend UI)](#21-프론트엔드-계층-frontend-ui)
   - [2.2 백엔드 API 계층 (Backend Service)](#22-백엔드-api-계층-backend-service)
   - [2.3 문서 파싱 및 결정론적 매칭 엔진 (`matching_core`)](#23-문서-파싱-및-결정론적-매칭-엔진-matching_core)
   - [2.4 AI 에이전트 & RAG 검증 엔진 (`agent_core`)](#24-ai-에이전트--rag-검증-엔진-agent_core)
   - [2.5 GCP 서버리스 & CI/CD 인프라 계층](#25-gcp-서버리스--cicd-인프라-계층)
3. [전체 데이터 흐름 시퀀스 (Data Flow Sequence)](#3-전체-데이터-흐름-시퀀스-data-flow-sequence)
4. [보안 및 세션 인증 관리 (Security & Auth)](#4-보안-및-세션-인증-관리-security--auth)

---

## 1. 전체 시스템 아키텍처 다이어그램

```mermaid
graph TB
    subgraph Client_Layer ["🌐 클라이언트 계층 (Client)"]
        UserBrowser["💻 웹 브라우저 (User Browser)\nhttps://i-core-frontend-...run.app"]
    end

    subgraph Frontend_Container ["🎨 프론트엔드 컨테이너 (Cloud Run: i-core-frontend)"]
        NginxServer["⚡ Nginx Alpine Web Server (Port 8080)"]
        ReactApp["⚛️ React 19 + TypeScript SPA\n(Zustand / TanStack Query / Axios)"]
        NginxServer --> ReactApp
    end

    subgraph Backend_Container ["⚙️ 백엔드 컨테이너 (Cloud Run: i-core-backend)"]
        UvicornApp["🐍 FastAPI App (Uvicorn Async / Port 8080)"]
        
        subgraph Routers ["API Routers (/api)"]
            AuthRouter["🔒 /api/auth (OAuth/JWT)"]
            TaskRouter["📄 /api/task-orders (문서 파싱)"]
            MatchingRouter["🎯 /api/matching (AI 매칭)"]
            InstructorRouter["📊 /api/instructors (강사 DB)"]
        end

        subgraph Engines ["핵심 엔진 (Core Engines)"]
            MatchingCore["⚙️ matching_core\n(HWP/PDF/DOCX 파서 + Rule Scorer)"]
            AgentCore["🤖 agent_core\n(Gemini LLM + Vector DB RAG)"]
        end

        subgraph Database ["데이터베이스 (Database)"]
            AppDB[("💾 app.db\n(SQLite + SQLAlchemy Async)")]
            InstructorDB[("💾 내부_강사_정보.db\n(강사 프로필 DB)")]
            VectorDB[("💾 rag.sqlite3\n(Vector Store / Gemini Embeddings)")]
        end

        UvicornApp --> Routers
        Routers --> Engines
        Engines --> Database
    end

    subgraph External_Services ["☁️ 외부 클라우드 서비스 (External APIs)"]
        GoogleOAuth["🔑 Google OAuth 2.0 (GIS)"]
        GeminiAPI["🧠 Google Gemini 3.5 LLM API"]
    end

    UserBrowser -->|HTTPS 접속| NginxServer
    ReactApp -->|REST API (JSON / JWT)| UvicornApp
    ReactApp -->|1초 GIS 로그인| GoogleOAuth
    AuthRouter -->|ID Token 검증| GoogleOAuth
    AgentCore -->|RAG 추론 & 2-Step 검증| GeminiAPI
```

---

## 2. 계층별 상세 구조 및 역할

### 2.1 프론트엔드 계층 (Frontend UI)
- **기술 스택**: `React 19`, `TypeScript`, `Vite`, `Tailwind CSS v4`, `Zustand`, `TanStack Query`
- **구조적 핵심**:
  1. **Zustand 스토어 (`authStore.ts`)**: 구글 로그인 시 받은 JWT 토큰과 유저 세션을 브라우저 `localStorage`에 영구 보존하고 전역 상태로 관리.
  2. **Axios 인터셉터 (`client.ts`)**: 백엔드로 나가는 모든 REST API 요청에 `Authorization: Bearer <JWT>` 헤더를 자동으로 부착하고, 401(미인가) 응답 수신 시 자동으로 로그인 페이지로 리다이렉트.
  3. **Nginx 컨테이너**: Docker 멀티 스테이지 빌드로 작성되었으며, SPA(Single Page Application) 라우팅을 위해 모든 경로 요청을 `/index.html`로 폴백(Fallback) 처리.

---

### 2.2 백엔드 API 계층 (Backend Service)
- **기술 스택**: `Python 3.11/3.14`, `FastAPI`, `Uvicorn`, `SQLAlchemy v2 (Async)`, `Pydantic v2`
- **구조적 핵심**:
  1. **비동기 생명주기 관리 (`lifespan`)**: 서버 구동 시 SQLite DB 테이블 자동 생성 및 마이그레이션 스키마 변경사항 브리지.
  2. **보안 미들웨어 계층**: CORS 허용 목록 검증, Security Headers 주입, API 수행 시간 및 파라미터 로깅 미들웨어 가동.

---

### 2.3 문서 파싱 및 결정론적 매칭 엔진 (`matching_core`)
나라장터 사업 공고문 첨부파일에서 정제된 데이터를 추출하고 1차 스코어링을 수행합니다.

- **문서 파서 (Parsers)**:
  - `pdf_parser.py`: `pdfplumber` 기반 표/텍스트 영역 추출
  - `docx_parser.py`: `python-docx` 기반 항목별 요구사항 추출
  - `hwp_parser.py`: `olefile` 바이너리 스트림 해독 기반 국문 HWP/HWX 문서 텍스트 복원
- **규칙 스코어링 엔진 (`rule_scorer.py`)**:
  - 키워드 유사도 + 불용어(Stopwords) 제거 + 동의어(Synonyms) 매핑
  - 자격증 가중치 및 강의 경력 연수 기반 **결정론적(Deterministic) 점수 계산**.

---

### 2.4 AI 에이전트 & RAG 검증 엔진 (`agent_core`)
LLM 특유의 지어내기(할루시네이션) 문제를 방지하고 근거 기반 추천 리포트를 생성합니다.

- **Vector Store (`vector_store.py`)**: `gemini-embedding-001`을 사용하여 강사의 실제 프로필 및 강의 이력을 의미 벡터로 저장.
- **Evidence Retriever (`evidence_retriever.py`)**: 검색된 100% 실제 검증 문장(Fact Chunk)만을 선별하여 LLM 프롬프트에 주입.
- **2-Step 에이전트 파이프라인**:
  1. **Match Analyst (분석가 에이전트)**: 오직 제공된 사실 증거문서만 바탕으로 추천 이유 작성.
  2. **Match Verifier (검증가 에이전트)**: 분석가 에이전트의 추천사유 중 지어낸 표현이나 과장이 있는지 독립 2차 감시.

---

### 2.5 GCP 서버리스 & CI/CD 인프라 계층
- **GCP Cloud Run**:
  - 프론트엔드(`i-core-frontend`)와 백엔드(`i-core-backend`)가 독립된 컨테이너로 구동.
  - 요청 수 0일 때 인스턴스 0개로 자동 스케일 다운 (비용 0원).
- **GitHub Actions (`.github/workflows/deploy.yml`)**:
  - `main` 브랜치 `push` 감지 ➔ GCP Auth ➔ Cloud Run 원클릭 무중단 재배포 자동화.

---

## 3. 전체 데이터 흐름 시퀀스 (Data Flow Sequence)

```text
[사용자]                 [프론트엔드]               [백엔드 API]              [matching_core]             [agent_core / LLM]
   │                         │                          │                           │                            │
   │ ──1. 과업지시서 업로드 ──>│                          │                           │                            │
   │                         │ ──2. POST /task-orders ──>│                           │                            │
   │                         │                          │ ──3. 문서 파일 전달 ────>│                            │
   │                         │                          │                           │ ──4. HWP/PDF 파싱 ──────>│
   │                         │                          │                           │ <── 5. 자격요건/과목 추출 ─│
   │                         │ <── 6. 파싱 결과 반환 ─────│                           │                            │
   │                         │                          │                           │                            │
   │ ──7. 강사 매칭 요청 ────>│                          │                           │                            │
   │                         │ ──8. POST /matching ────>│                           │                            │
   │                         │                          │ ──9. 1차 규칙 스코어링 ─>│                            │
   │                         │                          │ <── 10. 상위 후보군 반환 ─│                            │
   │                         │                          │                           │                            │
   │                         │                          │ ──11. 2차 RAG & AI 검증 ─────────────────────────────>│
   │                         │                          │                                                        │ ──12. Vector DB 팩트 추출
   │                         │                          │                                                        │ ──13. Gemini A/B 교차 검증
   │                         │ <── 14. 최종 리포트 반환 ─│ <── 15. 심층 평가 리포트 반환 ────────────────────────│
   │                         │                          │                           │                            │
```

---

## 4. 보안 및 세션 인증 관리 (Security & Auth)

1. **Google OAuth 2.0 식별**: 클라이언트에서 받은 ID Token을 백엔드에서 `google-auth` 라이브러리로 구글 서버에 직접 검증.
2. **CORS 차단 방지**: 허용된 오리진(`https://i-core-frontend-761086712825.asia-northeast3.run.app` 및 `localhost`)만 백엔드 접근 허용.
3. **환경변수 격리**: `GOOGLE_CLIENT_ID`, `SECRET_KEY`, `GEMINI_API_KEY` 등 핵심 비밀값은 코드에 노출되지 않고 GCP Cloud Run 및 GitHub Secrets에 암호화되어 관리.
