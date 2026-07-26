# 🚀 i-Core 구글 클라우드(GCP Cloud Run) 배포 실전 가이드

> **본 문서는 pyenv + Poetry(Python 3.14) 환경으로 구축된 i-Core 강사 매칭 플랫폼의 백엔드(FastAPI)와 프론트엔드(React)를 Docker 컨테이너로 빌드하고, Google Cloud Run에 배포하며, GitHub Actions를 통해 자동 배포(CI/CD) 환경을 구축한 전체 과정을 알아보기 쉽게 정리한 가이드입니다.**

---

## 📌 목차 (Table of Contents)

1. [개발 환경 구성 (pyenv + Poetry + Python 3.14)](#1-개발-환경-구성-pyenv--poetry--python-314)
2. [왜 Google Cloud Run을 선택했나요?](#2-왜-google-cloud-run을-선택했나요)
3. [1단계: 백엔드(FastAPI) 도커화 및 Cloud Run 배포](#3-1단계-백엔드fastapi-도커화-및-cloud-run-배포)
4. [2단계: 프론트엔드(React) 도커화 및 Cloud Run 배포](#4-2단계-프론트엔드react-도커화-및-cloud-run-배포)
5. [3단계: 구글 로그인(Google OAuth) 및 CORS 접속 허용 설정](#5-3단계-구글-로그인google-oauth-및-cors-접속-허용-설정)
6. [4단계: GitHub Actions 깃 푸시 시 자동 배포(CI/CD) 구축](#6-4단계-github-actions-깃-푸시-시-자동-배포cicd-구축)
7. [5단계: 로컬 테스트 vs 클라우드 운영 환경 사용법](#7-5단계-로컬-테스트-vs-클라우드-운영-환경-사용법)

---

## 1. 개발 환경 구성 (pyenv + Poetry + Python 3.14)

i-Core 백엔드는 파이썬 최신 버전인 **Python 3.14** 환경과 **Poetry** 의존성 관리 도구를 기반으로 구축되었습니다.

### 🛠️ 개발 환경 스택
- **파이썬 버전 관리**: `pyenv` (Python 3.14 환경 전용 격리 및 세팅)
- **패키지 및 의존성 관리**: `Poetry` (`pyproject.toml` 기반 프로젝트 관리)
- **웹 서버 실행**: FastAPI + Uvicorn Async Server

```bash
# 1) pyenv를 통한 파이썬 3.14 설치 및 로컬 적용
pyenv install 3.14.0
pyenv local 3.14.0

# 2) Poetry 패키지 의존성 설치 및 가상환경 실행
poetry config virtualenvs.in-project true
poetry install
```

---

## 2. 왜 Google Cloud Run을 선택했나요?

웹 서비스를 인터넷에 공개하려면 24시간 켜져 있는 서버가 필요합니다. 하지만 24시간 내내 켜두는 기존 서버는 사용자가 접속하지 않는 시간에도 똑같이 비용이 발생합니다.

### 💡 Cloud Run의 3가지 핵심 특징
- 💰 **접속 없을 땐 비용 0원 (Scale-to-Zero)**: 사용자의 접속 요청(Request)이 없을 때는 서버 인스턴스가 0개로 자동으로 줄어들어 **비용이 전혀 청구되지 않습니다.**
- ⚡ **접속 시 자동 구동 (서버리스)**: 사용자가 웹사이트 주소로 들어오는 순간 1~2초 만에 순식간에 서버가 켜져서 응답합니다.
- 🔒 **무상 보안 접속 (HTTPS)**: 보안 접속에 필요한 SSL/TLS 인증서가 구글에 의해 무료로 자동 부여됩니다.

---

## 3. 1단계: 백엔드(FastAPI) 도커화 및 Cloud Run 배포

### 1) 백엔드 Dockerfile 작성 (`backend/Dockerfile`)
pyenv + Poetry 기반으로 개발된 파이썬 3.14 백엔드 앱을 구글 클라우드에서 독립된 포장 상자(컨테이너)로 실행하기 위해 `Dockerfile`을 작성했습니다.

```dockerfile
# 파이썬 3.14 슬림 베이스 이미지 선택
FROM python:3.14-slim
ENV PYTHONUNBUFFERED=1
WORKDIR /app

# 시스템 빌드 의존성 설치
RUN apt-get update && apt-get install -y --no-install-recommends build-essential && rm -rf /var/lib/apt-get/lists/*

# 의존성 패키지 설치 (Poetry / requirements)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 소스코드 전체 복사 및 포트 설정
COPY . .
ENV PORT=8080

# Cloud Run PORT 주입 환경 지원 Uvicorn 실행
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8080}"]
```

### 2) 배포 실행 및 트러블슈팅 (IAM 권한 해결)
최초 배포 시 구글 클라우드의 저장소(Artifact Registry)에서 이미지를 불러오는 권한이 없어 `Container import failed` 오류가 발생했었습니다.

- **원인**: Cloud Run 서비스 계정이 이미지 저장소를 읽을 권한이 없음
- **해결 조치**: 서비스 계정에 `roles/artifactregistry.reader` 권한을 부여하여 해결했습니다.

```powershell
gcloud projects add-iam-policy-binding iceu-bangjeongho833 `
  --member="serviceAccount:761086712825-compute@developer.gserviceaccount.com" `
  --role="roles/artifactregistry.reader"
```

### 3) 백엔드 배포 완료
- **생성된 백엔드 API URL**: `https://i-core-backend-761086712825.asia-northeast3.run.app`
- **Swagger API 문서 주소**: `https://i-core-backend-761086712825.asia-northeast3.run.app/docs`

---

## 4. 2단계: 프론트엔드(React) 도커화 및 Cloud Run 배포

### 1) 환경변수 분리 (`.env.development` & `.env.production`)
로컬에서 개발할 때와 클라우드에 배포했을 때 바라보는 백엔드 주소가 달라야 하므로 환경별로 파일을 분리했습니다.

- **`frontend/.env.development`** (로컬 개발 테스트용):
  `VITE_API_BASE_URL=http://127.0.0.1:8700`
- **`frontend/.env.production`** (클라우드 운영 배포용):
  `VITE_API_BASE_URL=https://i-core-backend-761086712825.asia-northeast3.run.app`

### 2) Nginx 멀티 스테이지 Dockerfile (`frontend/Dockerfile`)
리액트 프론트엔드를 가볍고 빠른 Nginx 웹서버로 호스팅하기 위해 2단계 멀티 스테이지 빌드를 적용했습니다.

```dockerfile
# 1단계: Node.js에서 빌드
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# 2단계: Nginx 웹서버로 호스팅
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
```

### 3) 프론트엔드 배포 완료
- **생성된 프론트엔드 웹사이트 URL**: `https://i-core-frontend-761086712825.asia-northeast3.run.app`

---

## 5. 3단계: 구글 로그인(Google OAuth) 및 CORS 접속 허용 설정

### 1) `400 origin_mismatch` 구글 로그인 오류 해결
구글 로그인 보안 정책상 승인되지 않은 웹사이트 주소에서는 로그인 팝업이 차단됩니다.

- **해결 방법**: [Google Cloud Console 사용자 인증 정보](https://console.cloud.google.com/apis/credentials?project=iceu-bangjeongho833) ➔ OAuth 2.0 클라이언트 선택 ➔ **승인된 자바스크립트 출처**에 아래 배포 주소를 추가 등록했습니다:
  `https://i-core-frontend-761086712825.asia-northeast3.run.app`

### 2) CORS(교차 출처) 접속 차단 해결
프론트엔드 웹사이트 주소에서 백엔드 API 주소로 요청을 보낼 때 브라우저 차원에서 차단되는 현상을 해결했습니다.

- **해결 방법**: `backend/app/core/config.py` 파일의 `CORS_ORIGINS` 허용 목록에 `https://i-core-frontend-761086712825.asia-northeast3.run.app` 주소를 추가 등록하여 백엔드를 재배포했습니다.

---

## 6. 4단계: GitHub Actions 깃 푸시 시 자동 배포(CI/CD) 구축

개발자가 `git push origin main` 을 실행하면 별도의 조치 없이 알아서 구글 클라우드로 백엔드와 프론트엔드가 무중단 자동 배포되도록 설정했습니다.

### 1) 워크플로우 파일 (`.github/workflows/deploy.yml`)
```yaml
name: Deploy i-Core to Google Cloud Run

on:
  push:
    branches:
      - main

jobs:
  deploy-backend:
    name: Deploy Backend
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: google-github-actions/auth@v2
        with:
          credentials_json: ${{ secrets.GCP_SA_KEY }}
      - uses: google-github-actions/setup-gcloud@v2
      - run: |
          gcloud run deploy i-core-backend \
            --source ./backend \
            --region asia-northeast3 \
            --allow-unauthenticated

  deploy-frontend:
    name: Deploy Frontend
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: google-github-actions/auth@v2
        with:
          credentials_json: ${{ secrets.GCP_SA_KEY }}
      - uses: google-github-actions/setup-gcloud@v2
      - run: |
          gcloud run deploy i-core-frontend \
            --source ./frontend \
            --region asia-northeast3 \
            --allow-unauthenticated
```

### 2) GitHub Secrets 등록
GitHub 저장소 ➔ **Settings** ➔ **Secrets and variables** ➔ **Actions** ➔ `GCP_SA_KEY` 이름으로 GCP 서비스 계정 인증키(JSON)를 안전하게 등록해 두었습니다.

---

## 7. 5단계: 로컬 테스트 vs 클라우드 운영 환경 사용법

| 구 분 | 🌐 클라우드 운영 환경 | 💻 로컬 개발/테스트 환경 |
| :--- | :--- | :--- |
| **접속 주소** | `https://i-core-frontend-761086712825.asia-northeast3.run.app` | `http://localhost:8900` |
| **실행 방법** | 24시간 언제나 웹 브라우저로 접속 | VS Code 터미널에서 `.\start.bat` 실행 |
| **백엔드 연동** | GCP Cloud Run 백엔드 (`...run.app`) | 내 컴퓨터 백엔드 (`http://127.0.0.1:8700`) |
| **코드 반영** | `git push origin main` 푸시 시 자동 배포 | 코드 저장(`Ctrl+S`) 시 실시간 반영 |

---

🎉 **이제 pyenv + Poetry(Python 3.14) 환경 기반의 i-Core 플랫폼 배포 가이드가 완성되었습니다.**
