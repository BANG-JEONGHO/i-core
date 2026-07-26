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
<p>
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

## 📌 서비스 개요 (Service Overview)

**i-Core**는 나라장터(G2B) 등 공공/기업 사업 공고의 수백 페이지에 달하는 과업지시서를 **AI 파서가 수초 만에 정밀 파싱**하고, 보유 강사 데이터베이스(DB)와 **하이브리드 AI 매칭 알고리즘(규칙 기반 스코어링 + Gemini LLM 심층 평가)**을 수행하여 **최적의 전문 강사를 즉시 추천**하는 스마트 강사 매칭 플랫폼입니다.

<!-- 🖼️ [이미지 슬롯 1] 메인 대시보드 화면 -->
<p align="center">
  <img src="./docs/images/dashboard-preview.png" width="100%" alt="i-Core 메인 대시보드 화면" />
  <br>
  <em>▲ i-Core 통합 플랫폼 메인 대시보드 화면</em>
</p>

---

## ✨ 핵심 기능 상세 (Key Features)

### 1. 🔒 구글 계정 & 사내 인증 (Google OAuth 2.0 & JWT)
- **원클릭 GIS 로그인**: Google Workspace 계정을 활용한 원클릭 소셜 로그인 지원.
- **안전한 세션 관리**: JWT(JSON Web Token) 기반 클라이언트 인증 및 세션 자동 갱신.
- **데모 백도어 지원**: 테스트 및 발표 환경을 위한 간이 데모 로그인 모드 지원.

<!-- 🖼️ [이미지 슬롯 2] 로그인 화면 -->
<p align="center">
  <img src="./docs/images/login-screen.png" width="85%" alt="로그인 화면" />
  <br>
  <em>▲ 구글 계정 기반 사내 원클릭 로그인 화면</em>
</p>

---

### 2. 📄 과업지시서 자동 파싱 엔진 (HWP / PDF / DOCX)
- **다양한 문서 포맷 지원**: 국문 HWX/HWP, PDF, DOCX 등 공공 공고 첨부파일을 완전 자동 파싱.
- **AI 요건 추출**: 필수 자격증, 필요 경력 연수, 교육 과목, 일정을 구조화된 JSON 데이터로 자동 추출.

| 지원 문서 포맷 | 추출 항목 | 비고 |
| :--- | :--- | :--- |
| **HWP / HWX** (한글) | 교육 과목, 자격 요건, 인원 | 공공 기관 사업지시서 완벽 지원 |
| **PDF / DOCX** (문서) | 필수 경력, 일정, 평가 기준 | 표 및 항목별 텍스트 정밀 추출 |

<!-- 🖼️ [이미지 슬롯 3] 과업지시서 업로드 및 파싱 화면 -->
<p align="center">
  <img src="./docs/images/task-order-parsing.png" width="100%" alt="과업지시서 자동 분석 화면" />
  <br>
  <em>▲ 과업지시서 파일 업로드 및 AI 자격요건 추출 분석 화면</em>
</p>

---

### 3. 🎯 하이브리드 AI 강사 매칭 (Rule Scorer + Gemini Agent)
- **1차 결정론적 규칙 매칭 (`matching_core`)**:
  - 키워드, 자격증, 강의 경력 연수 기반 결정론적 가중치 스코어 산출.
- **2차 Gemini LLM 심층 매칭 (`agent_core`)**:
  - Google Gemini 3.5 LLM 에이전트가 1차 추천 후보군을 대상으로 정성적 심층 검증 수행.
  - 추천 사유, 강점/약점 분석, 매칭 적합도 종합 리포트 생성.

<!-- 🖼️ [이미지 슬롯 4] 매칭 결과 및 리포트 화면 -->
<p align="center">
  <img src="./docs/images/matching-result.png" width="100%" alt="매칭 결과 및 AI 추천 리포트 화면" />
  <br>
  <em>▲ 강사 매칭 스코어카드 및 Gemini AI 심층 추천 리포트 화면</em>
</p>

---

### 4. 📊 강사 DB 및 일정 관리 (Instructor Portal)
- **강사 이력 검색 및 상세 조회**: 전문 분야, 강의 이력, 보유 자격증 통합 검색.
- **스마트 일정 충돌 검지**: 요청된 교육 일정과 강사의 기존 강의 스케줄 간 충돌을 사전에 자동 경고.

<!-- 🖼️ [이미지 슬롯 5] 강사 프로필 및 일정 관리 화면 -->
<p align="center">
  <img src="./docs/images/instructor-management.png" width="100%" alt="강사 프로필 및 일정 관리 화면" />
  <br>
  <em>▲ 강사 프로필 조회 및 일정 충돌 검지 화면</em>
</p>

---

## 🏗️ 통합 시스템 구조 (Unified Architecture)

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
├── docs/                          # 이미지 자원 및 AIDLC 문서
│   └── images/                    # README 캡처 이미지 저장 폴더
│
├── start.bat                      # 원클릭 로컬 서버 동시 실행 스크립트
└── README.md                      # 프로젝트 가이드 문서
```

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
- **클라우드 API 문서**: [https://i-core-backend-761086712825.asia-northeast3.run.app/docs](https://i-core-backend-761086712825.asia-northeast3.run.app/docs)
