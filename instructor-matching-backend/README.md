# Instructor Matching Backend (강사 매칭 백엔드)

FastAPI 기반 강사 매칭 플랫폼 REST API 서버입니다.

## 설치

```bash
pip install -r requirements.txt
```

matching-core 로컬 설치:
```bash
pip install -e ../instructor-matching-core
```

## 실행

```bash
uvicorn app.main:app --reload --port 8000
```

## API 문서

서버 실행 후:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## API 엔드포인트

| Method | Path | Description |
|---|---|---|
| POST | /api/auth/register | 회원가입 |
| POST | /api/auth/login | 로그인 |
| POST | /api/instructors/upload | 강사 일괄 업로드 |
| GET | /api/instructors/ | 강사 목록 |
| GET | /api/instructors/{id} | 강사 상세 |
| PUT | /api/instructors/{id} | 강사 수정 |
| DELETE | /api/instructors/{id} | 강사 삭제 |
| GET | /api/instructors/statistics | 통계 |
| POST | /api/task-orders/upload | 과업지시서 업로드 |
| GET | /api/task-orders/ | 과업지시서 목록 |
| GET | /api/task-orders/{id} | 과업지시서 상세 |
| PUT | /api/task-orders/{id}/parsed | 파싱 결과 수정 |
| POST | /api/matching/execute/{task_order_id} | 매칭 실행 |
| GET | /api/matching/{id} | 매칭 결과 |
| GET | /api/matching/history | 매칭 이력 |

## 테스트

```bash
pytest
pytest --cov=app
```

## 프로젝트 구조

```
app/
├── main.py          # 엔트리포인트
├── api/             # 라우터
├── services/        # 비즈니스 로직
├── models/          # DB 모델
├── schemas/         # Pydantic DTO
├── core/            # 설정, 보안, 미들웨어
└── db/              # 데이터베이스
```
