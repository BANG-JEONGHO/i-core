# 🎓 i-Core AI 강사 매칭 & 과업 분석 통합 플랫폼

> **나라장터 사업 공고 기반 AI 자동 문서 파싱, 결정론적 규칙 스코어링 및 Gemini AI 에이전트 통합 강사 매칭 웹 서비스**

---

## 🏗️ 통합 시스템 구조 (Unified Architecture)

i-Core 프로젝트는 `main`, `mk2`, `marge/ing` 브랜치에 분산되어 있던 Google OAuth 로그인 세션, FastAPI 기반 백엔드 API, Gemini AI 에이전트, 결정론적 문서 파싱/매칭 엔진, React/TypeScript 프론트엔드 UI를 **단일 통합 웹 서비스 모듈**로 정돈 및 리팩토링한 프로젝트입니다.

```
i-core/
├── backend/                       # FastAPI 백엔드 및 AI 에이전트 / 매칭 엔진 통합
│   ├── app/                       # FastAPI 웹 서버 및 REST API Router (auth, instructors, matching, task_orders 등)
│   ├── agent_core/                # AI 에이전트 & LLM 추론 엔진 (Candidate ranker, Vector Store, Prompt Builder)
│   ├── matching_core/             # 결정론적 규칙 매칭 엔진 & 문서 파서 (PDF, DOCX, HWP 파서, Rule Scorer)
│   ├── data/                      # 데이터베이스 및 시드 데이터 저장소
│   ├── tests/                     # 백엔드 및 엔진 통합 단위 테스트
│   ├── requirements.txt           # 백엔드 통합 의존성
│   └── .env.example               # 백엔드 환경변수 설정 가이드
│
├── frontend/                      # React + TypeScript + Vite + Tailwind CSS 웹 프론트엔드
│   ├── src/
│   │   ├── api/                   # Axios API 클라이언트 모듈 (auth, matching, instructors, taskOrders)
│   │   ├── components/            # 헤더, 사이드바, ProtectedRoute, 상세 드로어 컴포넌트
│   │   ├── pages/                 # LoginPage, DashboardPage, TaskOrderUploadPage, MatchingResultPage 등
│   │   ├── store/                 # Zustand 기반 글로벌 인증/세션 스토어
│   │   └── types/                 # TypeScript 인터페이스 및 타입 정의
│   ├── package.json               # 프론트엔드 패키지 설정
│   └── vite.config.ts             # Vite 빌드 & 프록시 설정 (포트 8900 ➔ 백엔드 8700)
│
├── docs/                          # 시스템 문서 & AIDLC 아키텍처 설계서
└── README.md                      # 전체 서비스 개발 및 실행 가이드
```

---

## ⚡ 빠른 시작 가이드 (Quick Start)

### 1. 백엔드(Backend) 실행

```bash
# 1-1. 백엔드 디렉토리 이동
cd backend

# 1-2. Python 가상환경 생성 및 의존성 설치
python -m venv .venv
source .venv/bin/activate      # Linux/macOS
# .venv\Scripts\activate       # Windows PowerShell

pip install -r requirements.txt

# 1-3. 환경변수 설정
cp .env.example .env
# .env 파일 내 GEMINI_API_KEY 설정 (필요시)

# 1-4. FastAPI 서버 실행 (기본 포트: 8700)
uvicorn app.main:app --host 127.0.0.1 --port 8700 --reload
```

- **Swagger API 문서**: `http://127.0.0.1:8700/docs`
- **Health Check**: `http://127.0.0.1:8700/health`

---

### 2. 프론트엔드(Frontend) 실행

```bash
# 2-1. 프론트엔드 디렉토리 이동
cd frontend

# 2-2. 패키지 설치
npm install

# 2-3. 개발 서버 실행 (기본 포트: 8900)
npm run dev
```

- 브라우저 접속: `http://localhost:8900`
- **Google Client ID 미설정 시**: 로그인 화면 하단의 **"테스트 계정으로 로그인"** 버튼을 클릭하여 즉시 시연 가능.

---

## ✨ 주요 기능 (Key Features)

1. 🔒 **구글 계정 & 사내 인증 (Google OAuth & JWT)**:
   - Google Workspace 계정을 통한 원클릭 GIS 로그인 지원 및 JWT 토큰 기반 클라이언트 세션 관리.
   - 로컬 테스트 환경을 위한 데모 인증 백도어 지원.

2. 📄 **나라장터 과업지시서 자동 파싱 (HWP / PDF / DOCX)**:
   - 과업지시서 첨부문서를 업로드하면 AI 및 문서 파서가 강사 자격 요건, 필수 경력, 교육 주제를 자동 정제.

3. 🎯 **하이브리드 AI 강사 매칭 & 심층 검증 (Agent & Rule Scoring)**:
   - `matching_core`: 규칙 기반 키워드/자격증/경력 결정론적 스코어링.
   - `agent_core`: Gemini LLM 기반 2단계 A/B AI 에이전트 검증 및 Grounding 평가.
   - 대치 및 스코어 카드 브레이크다운을 한눈에 파악할 수 있는 매칭 결과 리포트 제공.

4. 📊 **강사 DB 및 과업 이력 관리**:
   - 강사 검색 및 상세 이력 조회, 일정 충돌 감지, 매칭 이력 영구 보존.

---

## 🛠️ 기술 스택 (Tech Stack)

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, Lucide React, Zustand, TanStack Query (React Query), Axios
- **Backend**: Python 3.10+, FastAPI, SQLAlchemy (Async), SQLite (aiosqlite), Pydantic v2, Structlog
- **AI & Parsers**: Google GenAI (Gemini 3.5/1.5), pdfplumber, python-docx, olefile
