# 🎓 아이코어이엔씨 AI 강사 매칭 & 적합도 분석 서비스
> **나라장터 사업 공고 기반 AI 자동 문서 파싱 및 1:1 RAG 강사 최적 매칭 플랫폼**

<br>

## 🛠 Tech Stack & Infrastructure

### Cloud Platform & Infrastructure
![GCP](https://img.shields.io/badge/Google%20Cloud-4285F4?style=for-the-badge&logo=google-cloud&logoColor=white)
![Cloud Run](https://img.shields.io/badge/Cloud%20Run-4285F4?style=for-the-badge&logo=googlecloud&logoColor=white)
![Cloud Storage](https://img.shields.io/badge/Cloud%20Storage-4285F4?style=for-the-badge&logo=googlecloud&logoColor=white)
![Cloud SQL](https://img.shields.io/badge/Cloud%20SQL-4285F4?style=for-the-badge&logo=googlecloud&logoColor=white)
![Cloud DNS](https://img.shields.io/badge/Cloud%20DNS-4285F4?style=for-the-badge&logo=googlecloud&logoColor=white)

### AI & Machine Learning
![Vertex AI](https://img.shields.io/badge/Vertex%20AI-4285F4?style=for-the-badge&logo=googlecloud&logoColor=white)
![Gemini 1.5 Pro](https://img.shields.io/badge/Gemini%201.5%20Pro-8E75B2?style=for-the-badge&logo=googlegemini&logoColor=white)
![Gemini 1.5 Flash](https://img.shields.io/badge/Gemini%201.5%20Flash-8E75B2?style=for-the-badge&logo=googlegemini&logoColor=white)
![Text Embeddings](https://img.shields.io/badge/Text%20Embeddings-8E75B2?style=for-the-badge&logo=googlegemini&logoColor=white)

### Frontend & UI

![React](https://img.shields.io/badge/React-61DAFB?style=for-the-badge&logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)
![React Router](https://img.shields.io/badge/React_Router-CA4245?style=for-the-badge&logo=reactrouter&logoColor=white)
![React Query](https://img.shields.io/badge/React_Query-FF4154?style=for-the-badge&logo=reactquery&logoColor=white)



### Backend & Database
![Python](https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)
![pgvector](https://img.shields.io/badge/pgvector-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)

---

## 💡 프로젝트 개요 (Overview)

본 서비스는 **아이코어이엔씨 내부 관계자 전용 AI 강사 모집 보조 플랫폼**입니다. 
나라장터(G2B) 사업 공고문 및 과업지시서와 보유 중인 강사 이력서 DB를 AI로 분석하여, 해당 사업에 **가장 적합한 강사님들의 우선순위 스코어링과 3줄 요약 리포트**를 제공합니다.

이를 통해 강사 모집에 소비되는 불필요한 인적·시간적 비용을 혁신적으로 절감합니다.

---

## ✨ 핵심 기능 (Key Features)

* 🔒 **사내 보안 인증 시스템**: Google Workspace 계정 연동 기반 사내 관계자(`@icoreenc.com`) 전용 로그인
* 📄 **자동 문서 파싱 (HWP/PDF)**: HWP 파일 전처리 및 Gemini 1.5 Flash 기반의 공고문 핵심 요건 정제
* 🎯 **2단계 하이브리드 RAG 매칭**:
  1. `pgvector`를 활용한 1초 만의 1차 적합 강사 추출 (Top 10~20명)
  2. Gemini 1.5 Pro를 이용한 **1:1 팩트 기반 심층 비교 분석 (할루시네이션 완벽 차단)**
* 📊 **우선순위 스코어링 & AI 3줄 요약**: 적합도 점수(0~100점) 정렬 및 직관적인 근거 요약 제공
* 📁 **프로젝트별 이력서 추가 분석**: 개별 사업 페이지 내에서 신규 강사 이력서 즉시 비교 분석 가능

---

## 🏗️ 시스템 아키텍처 (System Architecture)

> 사내 직원 30명 규모에 최적화된 **비용 절감형 실속 서비리스(Serverless) 아키텍처**입니다.


```

[아이코어이엔씨 직원]
│
▼ (Google Workspace 계정 로그인)
[Cloud DNS] (사내 도메인 연결)
│
▼
[Cloud Run] ─── (파일 원본 저장) ───► [Cloud Storage]
(FastAPI Backend)                           │
│                                (PDF/HWP 파일)
├───── (1차 벡터 유사도 검색) ────────► [Cloud SQL (pgvector)]
│                                (강사 DB & 벡터 데이터)
│
└───── (AI 처리 요청) ──────────────► [Vertex AI Engine]
├─ Gemini 1.5 Flash (문서 파싱)
├─ Text Embeddings (벡터화)
└─ Gemini 1.5 Pro (1:1 RAG 분석)

```

---

## ⚙️ 2단계 하이브리드 매칭 알고리즘 (RAG Workflow)

AI의 정보 섞임 및 환각(Hallucination) 현상을 방지하기 위해 **2단계 분리 매칭 알고리즘**을 적용했습니다.


```

[사업 공고문 업로드]
│
▼
[1단계: Vector Search (pgvector)]
└─ 공고 요건 벡터와 유사도가 높은 강사 Top 10~20명 1초 만에 추출 (비용 최소화)
│
▼
[2단계: 1:1 RAG 심층 분석 (Gemini 1.5 Pro)]
└─ 백엔드가 루프를 돌며 [공고문 + 강사 A 이력서] 1:1 개별 분석 병렬 실행
└─ 정보 섞임 및 환각 원천 차단 ➔ 객관적 적합도 점수 & AI 3줄 요약 반환
│
▼
[3단계: 시스템 자동 정렬]
└─ AI 점수를 기준으로 백엔드에서 1등부터 20등까지 우선순위 정렬 후 화면 표시

```

---

## 🛠️ 구글 클라우드 서비스 도입 이유 (GCP Components)

| 서비스명 | 역할 | 도입 이유 |
| :--- | :--- | :--- |
| **Cloud Run** | 백엔드 API & UI 호스팅 | 사용량이 없을 땐 인스턴스가 0으로 내려가 **운영 비용 0원 유지**. 트래픽에 맞춰 자동 스케일링 |
| **Cloud SQL (PostgreSQL)** | RDB & Vector DB 통합 | `pgvector` 플러그인을 활용하여 **비싼 별도 Vector DB 없이** DB 하나에서 유사도 검색 처리 |
| **Cloud Storage** | 비정형 파일 저장소 | 나라장터 공고문(PDF/HWP) 및 강사 이력서를 안전하게 원본 보관 |
| **Gemini 1.5 Flash** | 문서 파싱 및 구조화 | 속도가 매우 빠르고 저렴하여 비정형 공고문/이력서의 텍스트 파싱에 최적화 |
| **Gemini 1.5 Pro** | 1:1 심층 RAG 분석 | 최고의 추론 능력으로 과업지시서와 강사 경력 간의 객관적 적합도 점수 및 3줄 요약 생성 |
| **Cloud DNS** | 사내 도메인 연결 | 복잡한 Cloud Run 기본 주소를 사내 전용 커스텀 도메인으로 매핑 |

---

## 🎯 기대 효과 (Benefits)

* ⏱️ **채용 검토 시간 90% 단축**: 백장 넘는 과업지시서와 이력서를 일일이 대조할 필요 없이 **AI 3줄 요약과 점수**로 즉시 판단
* 💰 **모집 비용 극대화 절감**: 강사 우선순위를 사전 제공하여 불필요한 섭외 피로도 및 인건비 감소
* 🔒 **데이터 보안 및 안전성**: 외부 유출 위험 없는 GCP 사내망 보안 및 사내 구글 계정 전용 접근 제어
