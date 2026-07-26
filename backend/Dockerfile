# 1. Base Image 선택 (Python 3.11 Slim)
FROM python:3.11-slim

# 파이썬 출력 버퍼링 해제 (로그 즉시 출력)
ENV PYTHONUNBUFFERED=1

# 작업 디렉토리 설정
WORKDIR /app

# 시스템 빌드 의존성 및 C 컴파일러 설치
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt-get/lists/*

# 의존성 설치
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 백엔드 소스코드 및 데이터 디렉토리 복사
COPY . .

# Cloud Run 기본 포트 (8080)
ENV PORT=8080

# Uvicorn 서버 실행 (sh -c로 PORT 환경변수를 안전하게 수용)
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8080}"]
