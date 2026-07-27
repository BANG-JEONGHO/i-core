# Cloud SQL PostgreSQL 전환 안내

## 구성

Cloud SQL 인스턴스 `icore-postgres` 안에 아래 두 데이터베이스를 사용합니다.

- `icore_app`: 사용자, 과업지시서, 매칭 결과, 일정
- `icore_instructor`: 강사 이력서 원본 테이블

Cloud Run 서비스 계정에는 `Cloud SQL Client` 역할이 필요하고, 서비스에는
`iceu-bangjeongho833:asia-northeast3:icore-postgres` Cloud SQL 연결이 추가되어야 합니다.
동일 서비스 계정에는 위 Secret 네 개에 대한 `Secret Manager Secret Accessor` 역할도 필요합니다.

## Cloud Run 환경변수

Secret Manager에 다음 URL 전체를 각각 저장하고 Cloud Run 환경변수로 연결합니다.
비밀번호를 소스 코드나 GitHub Actions에 직접 저장하지 않습니다.

```text
DATABASE_URL=postgresql+asyncpg://icore_service:<url-encoded-password>@/icore_app?host=/cloudsql/iceu-bangjeongho833:asia-northeast3:icore-postgres
INSTRUCTOR_DATABASE_URL=postgresql+asyncpg://icore_service:<url-encoded-password>@/icore_instructor?host=/cloudsql/iceu-bangjeongho833:asia-northeast3:icore-postgres
```

`DATABASE_URL`과 `INSTRUCTOR_DATABASE_URL`은 서로 다른 Secret으로 관리합니다.
DB 비밀번호에 `@`, `&`, `:` 같은 문자가 있으면 URL 인코딩해야 합니다. 예를 들어
`@`는 `%40`, `&`는 `%26`으로 바꿉니다. URL-safe 문자만 사용한 DB 비밀번호를 새로
만드는 편이 가장 단순합니다.

현재 GitHub Actions 배포 설정은 아래 Secret 이름을 사용합니다. `main`을 푸시하기 전
Cloud Console의 Secret Manager에서 각각 최신 버전을 만들어 두어야 합니다.

| Secret 이름 | 값 |
| --- | --- |
| `icore-secret-key` | JWT 서명용 긴 랜덤 문자열 |
| `gemini-api-key` | Gemini API 키 |
| `icore-app-database-url` | `DATABASE_URL` 값 전체 |
| `icore-instructor-database-url` | `INSTRUCTOR_DATABASE_URL` 값 전체 |

앱 데이터도 기존 SQLite에서 가져와야 한다면 동기 URL을 추가로 사용합니다.

```text
APP_DATABASE_SYNC_URL=postgresql+psycopg://icore_service:<url-encoded-password>@/icore_app?host=/cloudsql/iceu-bangjeongho833:asia-northeast3:icore-postgres
```

## 강사 SQLite 데이터 이전

로컬 PC에서 Cloud SQL Auth Proxy를 통해 PostgreSQL에 연결할 수 있는 상태에서 실행합니다.
원본 SQLite 파일은 Git에 올리지 않습니다.

```powershell
cloud-sql-proxy iceu-bangjeongho833:asia-northeast3:icore-postgres --port 5432

# 별도 PowerShell 창에서
cd backend
$env:INSTRUCTOR_DATABASE_SYNC_URL = "postgresql+psycopg://icore_service:<url-encoded-password>@127.0.0.1:5432/icore_instructor"
python scripts/migrate_sqlite_to_postgres.py `
  --source "C:\path\to\내부_강사_정보.db" --dry-run

python scripts/migrate_sqlite_to_postgres.py `
  --source "C:\path\to\내부_강사_정보.db"
```

스크립트는 `instructors`, `instructors_private`, `lectures_projects`,
`certificates_careers`만 upsert합니다. 삭제를 수행하지 않습니다.

## 앱 SQLite 데이터 이전 (선택)

새 운영 환경에서 Google OAuth로 로그인하면 사용자 계정은 자동 생성되므로,
기존 사용자·과업·매칭 이력을 보존하지 않아도 된다면 이 단계는 생략할 수 있습니다.

```powershell
cd backend
$env:APP_DATABASE_SYNC_URL = "postgresql+psycopg://icore_service:<url-encoded-password>@127.0.0.1:5432/icore_app"
python scripts/migrate_app_sqlite_to_postgres.py --source "C:\path\to\app.db" --dry-run
python scripts/migrate_app_sqlite_to_postgres.py --source "C:\path\to\app.db"
```

## 확인 순서

1. Cloud SQL Studio에서 `SELECT count(*) FROM instructors;`를 실행해 원본과 같은 108명인지 확인합니다.
2. Cloud Run 새 리비전에 두 DB URL Secret을 주입합니다.
3. `/api/instructors`로 강사 목록을 확인합니다.
4. 과업지시서를 업로드하고 매칭을 실행합니다.
