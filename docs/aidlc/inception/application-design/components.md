# 컴포넌트 정의

## 시스템 개요

강사 매칭 플랫폼은 4개의 주요 계층으로 구성됩니다:
- **Presentation Layer** (React/TS 프론트엔드)
- **API Layer** (FastAPI)
- **Business Logic Layer** (매칭 엔진, 파서, 서비스)
- **Data Layer** (데이터베이스, 파일 저장소)

---

## 컴포넌트 목록

### C-01: Frontend (React/TypeScript)
- **목적**: 사용자 인터페이스 제공
- **책임**:
  - 로그인/로그아웃 화면
  - 강사 데이터 관리 UI (목록, 상세, 업로드)
  - 과업지시서 업로드 UI
  - 파싱 결과 미리보기/수정 UI
  - 매칭 결과 표시 (점수 목록 + 카드)
  - 대시보드 (이력, 통계)
- **기술**: React, TypeScript, Vite, Axios/Fetch

### C-02: Auth Module
- **목적**: 사용자 인증 및 세션 관리
- **책임**:
  - 회원가입 (계정 생성)
  - 로그인 (토큰 발급)
  - 로그아웃 (세션 무효화)
  - 세션/토큰 검증 미들웨어
- **기술**: FastAPI, JWT, bcrypt

### C-03: Instructor Service
- **목적**: 강사 이력서 데이터 CRUD 관리
- **책임**:
  - Excel/CSV 파일 파싱 및 강사 데이터 저장
  - 강사 목록 조회 (검색, 필터)
  - 강사 상세 조회
  - 강사 정보 수정/삭제
- **기술**: FastAPI, pandas (Excel/CSV 파싱), SQLAlchemy

### C-04: Document Parser
- **목적**: 과업지시서 파일 파싱 및 핵심 정보 추출
- **책임**:
  - PDF 파일 텍스트 추출
  - HWP 파일 텍스트 추출
  - Word 파일 텍스트 추출
  - 평가기준 섹션 식별 및 추출
  - 참여자격/신청자격 섹션 식별 및 추출
- **기술**: PyPDF2/pdfplumber, python-hwp (또는 hwp5), python-docx

### C-05: Matching Engine
- **목적**: 강사-과업지시서 매칭 수행
- **책임**:
  - 1단계: 키워드 기반 매칭 + 규칙 기반 가중치 점수 계산
  - 2단계: AI 임베딩 유사도 계산 (향후)
  - 3단계: Knowledge Graph 기반 매칭 + AI Agent 검증 (향후)
  - 매칭 점수 산출 및 정렬
  - 매칭 근거 생성
- **기술**: 1단계 — 순수 Python (키워드 추출, TF-IDF 등)

### C-06: Task Order Service
- **목적**: 과업지시서 업로드 및 이력 관리
- **책임**:
  - 과업지시서 파일 업로드 처리
  - Document Parser 호출 및 파싱 결과 저장
  - 파싱 결과 수정 반영
  - 과업지시서 이력 관리
- **기술**: FastAPI, 파일 시스템 저장

### C-07: Matching Service
- **목적**: 매칭 요청 오케스트레이션
- **책임**:
  - 매칭 실행 요청 처리
  - Matching Engine 호출
  - 매칭 결과 저장 및 조회
  - 매칭 이력 관리
- **기술**: FastAPI, SQLAlchemy

### C-08: Database
- **목적**: 영구 데이터 저장
- **책임**:
  - 사용자 계정 저장
  - 강사 데이터 저장
  - 과업지시서 메타데이터 및 파싱 결과 저장
  - 매칭 결과 저장
- **기술**: SQLite (개발) / PostgreSQL (향후 운영)
