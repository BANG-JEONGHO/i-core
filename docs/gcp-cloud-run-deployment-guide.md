# 🚀 i-Core GCP Cloud Run & Docker 서버리스 배포 가이드

> **본 문서는 i-Core 강사 매칭 플랫폼의 백엔드(FastAPI) 및 프론트엔드(React)를 Docker 컨테이너로 빌드하고, Google Cloud Run에 서버리스로 배포하며, GitHub Actions CI/CD 자동 배포 환경을 구축하기까지의 전 과정을 비전공자도 쉽게 이해할 수 있도록 정리한 실전 완소 가이드입니다.**

---

## 📌 목차 (Table of Contents)

1. [왜 Google Cloud Run을 선택했나요?](#1-왜-google-cloud-run을-선택했나요)
2. [1단계: 백엔드(FastAPI) 도커화 및 Cloud Run 배포](#2-1단계-백엔드fastapi-도커화-및-cloud-run-배포)
3. [2단계: 프론트엔드(React) 도커화 및 배포](#3-2단계-프론트엔드react-도커화-및-배포)
4. [3단계: 구글 로그인(Google OAuth) 400 오류 트러블슈팅](#4-3단계-구글-로그인google-oauth-400-오류-트러블슈팅)
5. [4단계: GitHub Actions 자동 배포(CI/CD) 구축](#5-4단계-github-actions-자동-배포cicd-구축)
6. [5단계: 로컬 테스트 vs 클라우드 운영 사용법](#6-5단계-로컬-테스트-vs-클라우드-운영-사용법)

---

## 1. 왜 Google Cloud Run을 선택했나요?

웹 서비스를 인터넷에 공개하려면 24시간 켜져 있는 서버가 필요합니다. 하지만 24시간 내내 켜두는 기존 가상 서버(VM)는 사용하지 않는 새벽이나 주말에도 비용이 발생합니다.

### 💡 Cloud Run의 3가지 핵심 장점
- 💰 **Scale to Zero (비용 0원 가능)**: 접속 요청(Request)이 없을 때는 서버 인스턴스가 0개로 자동으로 줄어들어 **비용이 0원**입니다.
- ⚡ **요청 시 자동 구동 (서버리스)**: 사용자가 웹사이트 주소로 들어올 때만 1~2초 만에 순식간에 서버가 켜져서 응답합니다.
- 🔒 **자동 HTTPS 지원**: 보안 접속에 필요한 SSL/TLS 인증서가 구글에 의해 무료로 자동 부여됩니다.

---

## 2. 1단계: 백엔드(FastAPI) 도커화 및 Cloud Run 배포

### 1) 백엔드 Dockerfile 작성 (`backend/Dockerfile`)
파이썬 백엔드 앱을 구글 클라우드에서 독립된 상자로 실행하기 위해 `Dockerfile`을 작성했습니다.

```dockerfile
FROM python:3.11-slim
ENV PYTHONUNBUFFERED=1
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends build-essential && rm -rf /var/lib/apt-get/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .
ENV PORT=8080

CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8080}"]
```

### 2) 배포 실행 및 트러블슈팅 (IAM 권한 해결)
최초 배포 시 구글 클라우드의 저장소(Artifact Registry)에서 이미지를 불러오는 권한이 없어 `Container import failed` 오류가 발생했었습니다.

- **원인**: Cloud Run 서비스 계정이 이미지 저장소를 읽을 권한이 없음
- **해결 조치**: 서비스 계정에 `roles/artifactregistry.reader` 및 `roles/artifactregistry.admin` IAM 권한 부여

```powershell
gcloud projects add-iam-policy-binding iceu-bangjeongho833 `
  --member="serviceAccount:761086712825-compute@developer.gserviceaccount.com" `
  --role="roles/artifactregistry.reader"
```

### 3) 최종 백엔드 배포 명령어
```powershell
gcloud run deploy i-core-backend `
  --image asia-northeast3-docker.pkg.dev/iceu-bangjeongho833/cloud-run-source-deploy/i-core-backend:cors-fix `
  --region asia-northeast3 `
  --allow-unauthenticated `
  --set-env-vars "APP_NAME=i-Core API,SECRET_KEY=secure_key,GOOGLE_CLIENT_ID=761086712825-..."
```
- **생성된 백엔드 URL**: `https://i-core-backend-761086712825.asia-northeast3.run.app`

---

## 3. 2단계: 프론트엔드(React) 도커화 및 배포

### 1) 환경변수 분리 (`.env.development` & `.env.production`)
로컬 테스트할 때와 클라우드에 올렸을 때 바라보는 백엔드 주소가 달라야 하므로 파일로 분리했습니다.

- **`frontend/.env.development`** (로컬 개발용):
  `VITE_API_BASE_URL=http://127.0.0.1:8700`
- **`frontend/.env.production`** (클라우드 배포용):
  `VITE_API_BASE_URL=https://i-core-backend-761086712825.asia-northeast3.run.app`

### 2) Nginx 멀티 스테이지 Dockerfile (`frontend/Dockerfile`)
리액트 앱을 가볍고 빠른 Nginx 웹서버로 호스팅하기 위해 2단계 멀티 스테이지 빌드를 적용했습니다.

```dockerfile
# 1단계: Node.js에서 빌드
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# 2단계: Nginx로 웹 서비스
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
```

### 3) 프론트엔드 배포 완료
```powershell
gcloud run deploy i-core-frontend `
  --image asia-northeast3-docker.pkg.dev/iceu-bangjeongho833/cloud-run-source-deploy/i-core-frontend:latest `
  --region asia-northeast3 `
  --allow-unauthenticated
```
- **생성된 프론트엔드 웹사이트 URL**: `https://i-core-frontend-761086712825.asia-northeast3.run.app`

---

## 4. 3단계: 구글 로그인(Google OAuth) 400 오류 트러블슈팅

### 🚨 발생했던 문제 1: `400 origin_mismatch`
구글 보안 정책상 승인되지 않은 웹사이트 주소에서는 로그인 팝업이 차단됩니다.

- **해결**: [Google Cloud Console 사용자 인증 정보](https://console.cloud.google.com/apis/credentials?project=iceu-bangjeongho833) ➔ OAuth 클라이언트 선택 ➔ **승인된 자바스크립트 출처**에 아래 주소 추가:
  `https://i-core-frontend-761086712825.asia-northeast3.run.app`

### 🚨 발생했던 문제 2: CORS(교차 출처) 차단
프론트엔드 웹사이트 주소에서 백엔드 API 주소로 요청을 보낼 때 브라우저 차원에서 차단되는 현상이 발생했습니다.

- **해결**: `backend/app/core/config.py` 파일의 `CORS_ORIGINS` 허용 목록에 `https://i-core-frontend-761086712825.asia-northeast3.run.app` 주소를 등록하여 재배포 완료!

---

## 5. 4단계: GitHub Actions 자동 배포(CI/CD) 구축

개발자가 `git push origin main` 을 실행하면 알아서 구글 클라우드로 배포되도록 워크플로우를 구축했습니다.

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
GitHub 저장소 ➔ **Settings** ➔ **Secrets and variables** ➔ **Actions** ➔ `GCP_SA_KEY` 이름으로 GCP 서비스 계정 키 JSON 내용을 등록해 두었습니다.

---

## 6. 5단계: 로컬 테스트 vs 클라우드 운영 사용법

| 구 분 | 운영/클라우드 환경 | 로컬 개발/테스트 환경 |
| :--- | :--- | :--- |
| **접속 주소** | `https://i-core-frontend-761086712825.asia-northeast3.run.app` | `http://localhost:8900` |
| **실행 방법** | 24시간 언제나 웹 브라우저 접속 | VS Code 터미널에서 `.\start.bat` 실행 |
| **백엔드 연동** | GCP Cloud Run (`...run.app`) | 내 컴퓨터 백엔드 (`http://127.0.0.1:8700`) |
| **코드 반영** | `git push origin main` 시 자동 반영 | 코드 저장(`Ctrl+S`) 시 실시간 반영 |

---

🎉 **축하합니다! 이제 i-Core 플랫폼의 전체 배포 과정과 자동화 시스템이 완벽하게 준비되었습니다.**
