# 1단계: Node.js환경에서 React 프론트엔드 빌드 (Multi-stage Build)
FROM node:20-alpine AS builder

WORKDIR /app

# 패키지 명세 복사 및 의존성 설치
COPY package*.json ./
RUN npm ci

# 소스코드 전체 복사 및 프로덕션 빌드
COPY . .
RUN npm run build

# 2단계: 경량 Nginx 웹서버로 정적 파일 호스팅
FROM nginx:alpine

# 1단계에서 생성된 dist 폴더를 Nginx 문서 루트로 복사
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Cloud Run 기본 포트 (8080)
EXPOSE 8080

# Nginx 실행
CMD ["nginx", "-g", "daemon off;"]
