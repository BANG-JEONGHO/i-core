# 🎓 i-Core AI 강사 매칭 & 과업 분석 통합 플랫폼

> **나라장터 사업 공고 기반 AI 자동 문서 파싱, 결정론적 규칙 스코어링 및 Gemini AI 에이전트 통합 강사 매칭 웹 서비스**

<p align="left">
  <a href="https://i-core-frontend-761086712825.asia-northeast3.run.app">
    <img src="https://img.shields.io/badge/🚀_Live_App-Web_Service-4285F4?style=for-the-badge&logo=google-cloud&logoColor=white" alt="Live App" />
  </a>
  <a href="https://i-core-backend-761086712825.asia-northeast3.run.app/docs">
    <img src="https://img.shields.io/badge/📖_Swagger_API-Docs-009688?style=for-the-badge&logo=fastapi&logoColor=white" alt="Swagger Docs" />
  </a>
  <a href="https://github.com/BANG-JEONGHO/i-core/actions">
    <img src="https://img.shields.io/badge/⚡_CI%2FCD-GitHub_Actions-2088FF?style=for-the-badge&logo=githubactions&logoColor=white" alt="GitHub Actions" />
  </a>
</p>

---

## 🛠️ 기술 스택 (Tech Stack)

### 🎨 Frontend
p
  <img src="https://img.shields.io/badge/React_19-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React" />
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Vite_v8-646CFF?style=for-the-badge&logo=vite&logoColor=white" alt="Vite" />
  <img src="https://img.shields.io/badge/Tailwind_CSS_v4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white" alt="Tailwind CSS" />
  <img src="https://img.shields.io/badge/Zustand-443e38?style=for-the-badge&logo=react&logoColor=white" alt="Zustand" />
  <img src="https://img.shields.io/badge/React_Query-FF4154?style=for-the-badge&logo=reactquery&logoColor=white" alt="React Query" />
  <img src="https://img.shields.io/badge/Axios-5A29E4?style=for-the-badge&logo=axios&logoColor=white" alt="Axios" />
</p>

### ⚙️ Backend & AI Core
<p>
  <img src="https://img.shields.io/badge/Python_3.11-3776AB?style=for-the-badge&logo=python&logoColor=white" alt="Python" />
  <img src="https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white" alt="FastAPI" />
  <img src="https://img.shields.io/badge/Google_Gemini_AI-8E75B2?style=for-the-badge&logo=googlegemini&logoColor=white" alt="Google Gemini" />
  <img src="https://img.shields.io/badge/SQLAlchemy_v2-D71F00?style=for-the-badge&logo=python&logoColor=white" alt="SQLAlchemy" />
  <img src="https://img.shields.io/badge/SQLite_(aiosqlite)-003B57?style=for-the-badge&logo=sqlite&logoColor=white" alt="SQLite" />
  <img src="https://img.shields.io/badge/Pydantic_v2-E92063?style=for-the-badge&logo=pydantic&logoColor=white" alt="Pydantic" />
  <img src="https://img.shields.io/badge/Uvicorn-4053D6?style=for-the-badge&logo=gunicorn&logoColor=white" alt="Uvicorn" />
</p>

### ☁️ Cloud Infrastructure & DevOps
<p>
  <img src="https://img.shields.io/badge/Google_Cloud_Run-4285F4?style=for-the-badge&logo=googlecloud&logoColor=white" alt="Cloud Run" />
  <img src="https://img.shields.io/badge/Artifact_Registry-4285F4?style=for-the-badge&logo=googlecloud&logoColor=white" alt="Artifact Registry" />
  <img src="https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white" alt="Docker" />
  <img src="https://img.shields.io/badge/Nginx_Alpine-009639?style=for-the-badge&logo=nginx&logoColor=white" alt="Nginx" />
  <img src="https://img.shields.io/badge/GitHub_Actions-2088FF?style=for-the-badge&logo=githubactions&logoColor=white" alt="GitHub Actions" />
</p>

---

## 🏗️ 통합 시스템 구조 (Unified Architecture)

`i-Core` 프로젝트는 분산되어 있던 Google OAuth 세션 인증, FastAPI REST API, Gemini AI 에이전트, 규칙 스코어링 엔진, React 19 프론트엔드를 **단일 통합 모듈 및 구글 클라우드 런(Cloud Run) 서버리스 구조**로 정돈 및 리팩토링한 웹 애플리케이션입니다.

```text
i-core/
├── .github/workflows/             # GitHub Actions 자동 배포 (CI/CD)
│   └── deploy.yml                 # main 브랜치 push 시 Cloud Run 자동 배포
│
├── backend/                       # FastAPI 백엔드 & AI 에이전트 / 매칭 엔진
│   ├── app/                       # FastAPI Web Router (auth, instructors, matching, task_orders 등)
│   ├── agent_core/                # Gemini LLM 추론 엔진 & Candidate Ranker
│   ├── matching_core/             # 결정론적 규칙 매칭 엔진 & 문서 파서 (PDF, DOCX, HWP)
│   ├── data/                      # SQLite DB 및 시드 데이터 저장소
│   ├── Dockerfile                 # 백엔드 Cloud Run 컨테이너 빌드 파일
│   └── requirements.txt           # 백엔드 통합 의존성
│
├── frontend/                      # React 19 + TypeScript + Vite 프론트엔드
│   ├── src/
│   │   ├── api/                   # Axios API 클라이언트 (OAuth, Matching, Instructors)
│   │   ├── components/            # 레이아웃, 헤더, 사이드바, 상세 드로어 컴포넌트
│   │   ├── pages/                 # 로그인, 대시보드, 과업 업로드, 매칭 결과 페이지
│   │   └── store/                 # Zustand 글로벌 세션 스토어
│   ├── Dockerfile                 # Nginx 기반 프론트엔드 멀티 스테이지 빌드 파일
│   ├── nginx.conf                 # SPA 라우팅 지원 Nginx 설정
│   └── vite.config.ts             # Vite 빌드 & 개발 서버 프록시 설정
│
├── start.bat                      # 원클릭 로컬 서버 동시 실행 스크립트
└── README.md                      # 프로젝트 가이드 문서
```

---

## ✨ 주요 기능 (Key Features)

1. 🔒 **구글 계정 & 사내 인증 (Google OAuth 2.0 & JWT)**
   - Google Workspace 계정을 통한 원클릭 GIS 로그인 지원 및 JWT 토큰 기반 세션 관리.
   - 로컬 테스트 환경을 위한 데모 인증 백도어 지원.

2. 📄 **나라장터 과업지시서 자동 파싱 (HWP / PDF / DOCX)**
   - 과업지시서 첨부문서를 업로드하면 문서 파서가 강사 자격 요건, 필수 경력, 교육 주제를 자동 정제.

3. 🎯 **하이브리드 AI 강사 매칭 & 심층 검증 (Agent & Rule Scoring)**
   - `matching_core`: 규칙 기반 키워드/자격증/경력 결정론적 스코어링.
   - `agent_core`: Gemini LLM 기반 2단계 A/B AI 에이전트 검증 및 Grounding 평가.
   - 스코어 카드 브레이크다운을 한눈에 파악할 수 있는 매칭 결과 리포트 제공.

4. 📊 **강사 DB 및 과업 이력 관리**
   - 강사 검색 및 상세 이력 조회, 일정 충돌 감지, 매칭 이력 영구 보존.

---

## ⚡ 빠른 시작 가이드 (Quick Start)

### 1. 로컬 통합 서버 동시 실행 (원클릭)
프로젝트 루트 디렉토리에서 아래 명령어를 실행하면 백엔드(8700)와 프론트엔드(8900) 개발 서버가 동시에 켜집니다:
```powershell
.\start.bat
```
- **프론트엔드**: `http://localhost:8900`
- **백엔드 Swagger API**: `http://127.0.0.1:8700/docs`

---

### 2. 구글 클라우드 런(Cloud Run) 배포 및 CI/CD
GitHub 저장소 `main` 브랜치에 `push` 시 GitHub Actions에 의해 백엔드와 프론트엔드가 자동으로 클라우드로 무중단 배포됩니다.

- **웹 서비스 접속 URL**: [https://i-core-frontend-761086712825.asia-northeast3.run.app](https://i-core-frontend-761086712825.asia-northeast3.run.app)
- **클라우드 API 문 서**: [https://i-core-backend-761086712825.asia-northeast3.run.app/docs](https://i-core-backend-761086712825.asia-northeast3.run.app/docs)
