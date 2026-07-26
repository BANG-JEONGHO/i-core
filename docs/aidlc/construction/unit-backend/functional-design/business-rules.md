# 비즈니스 규칙 — unit-backend

## 인증 규칙

### BR-A01: 비밀번호 정책
- 최소 8자 이상
- 최대 100자 이하
- bcrypt로 해싱 (work factor=12)

### BR-A02: JWT 토큰
- 알고리즘: HS256
- 만료: 24시간
- payload: sub(user_id), exp(만료시간)
- Secret: 환경변수 `SECRET_KEY` (최소 32자)

### BR-A03: 인증 실패 응답
- 구체적 이유 미노출 (사용자 미존재 vs 비밀번호 오류 구분 안함)
- 일관된 메시지: "아이디 또는 비밀번호가 올바르지 않습니다"

### BR-A04: 보호 엔드포인트
- `/api/auth/register`, `/api/auth/login` 외 모든 엔드포인트는 인증 필수
- Authorization 헤더 없음 → 401

---

## 강사 관리 규칙

### BR-I01: Excel/CSV 컬럼 매핑
- 필수 컬럼: "이름" 또는 "name"
- 선택 컬럼: "전문분야", "과목", "경력", "자격증", "학력", "연락처"
- 매핑 실패 시: 해당 행 건너뛰기 + 에러 로그

### BR-I02: 키워드 자동 생성
- 강사 등록/수정 시 keywords 필드 자동 갱신
- 소스: specializations + subjects + certifications 합산
- 중복 제거, 소문자 정규화

### BR-I03: 삭제 처리
- 실제 삭제 (hard delete)
- 관련 매칭 결과에서는 강사명만 유지 (ID 참조 불가)

---

## 과업지시서 규칙

### BR-T01: 파일 저장
- 저장 위치: `uploads/{year}/{month}/{uuid}_{원본파일명}`
- 원본 파일 보존 (삭제 안함)
- 파일 크기 제한: 50MB (matching_core와 동일)

### BR-T02: 파싱 실패 처리
- matching_core에서 ParseError 발생 시
- TaskOrder 레코드는 생성하되, parsed_at = null
- 사용자에게 에러 메시지 전달

### BR-T03: 파싱 결과 수정
- 사용자가 수정한 결과가 매칭에 사용됨
- 수정 시 원본 파싱 결과는 덮어쓰기 (히스토리 미보존)

---

## 매칭 규칙

### BR-M01: 매칭 전제조건
- TaskOrder의 qualifications 또는 evaluation_criteria가 최소 1개 이상
- 강사 풀이 1명 이상
- 미충족 시: 400 에러 + 안내 메시지

### BR-M02: DB ↔ matching_core 변환
- DB Instructor → matching_core.Instructor 변환
- DB TaskOrder.qualifications (JSON) → matching_core.TaskRequirements 변환
- matching_core.MatchScore → DB MatchingResult.results (JSON) 변환

### BR-M03: 매칭 결과 저장
- 전체 강사의 점수를 JSON으로 저장
- top_instructors: 상위 10명 ID 별도 저장

---

## API 규칙

### BR-API01: 페이지네이션
- 기본 limit: 20
- 최대 limit: 100
- offset: 0부터 시작

### BR-API02: 응답 형식
- 성공: `{"data": {...}}` 또는 `{"data": [...]}`
- 에러: `{"detail": "에러 메시지"}`
- 목록: `{"data": [...], "total": N}`

### BR-API03: Rate Limiting
- 기본: 100 req/min per user
- 파일 업로드: 10 req/min per user
- 매칭 실행: 30 req/min per user
