# 비즈니스 로직 모델 — unit-backend

## 개요
FastAPI 백엔드의 서비스 레이어 비즈니스 로직입니다.

---

## 1. AuthService — 인증 로직

### 1.1 회원가입 흐름
```
입력: RegisterRequest (username, password, name)
  → username 중복 확인 (DB 조회)
    - 중복 시: 409 Conflict
  → 비밀번호 해싱 (bcrypt, salt rounds=12)
  → User 레코드 생성 및 저장
  → UserResponse 반환
```

### 1.2 로그인 흐름
```
입력: LoginRequest (username, password)
  → username으로 User 조회
    - 미존재: 401 Unauthorized (구체적 이유 미노출)
  → bcrypt 비밀번호 검증
    - 불일치: 401 Unauthorized
  → JWT 토큰 생성:
    - payload: {sub: user.id, exp: now + 24h}
    - algorithm: HS256
    - secret: 환경변수 SECRET_KEY
  → TokenResponse 반환
```

### 1.3 토큰 검증 (미들웨어)
```
입력: Authorization 헤더 (Bearer <token>)
  → 토큰 추출
  → JWT 디코딩 (시그니처 + 만료 시간 검증)
    - 실패: 401 Unauthorized
  → user_id로 User 조회
    - 미존재 또는 비활성: 401 Unauthorized
  → request.state.user에 사용자 정보 주입
```

---

## 2. InstructorService — 강사 관리 로직

### 2.1 일괄 업로드 흐름
```
입력: Excel/CSV 파일
  → pandas로 파일 읽기 (read_excel 또는 read_csv)
  → 컬럼 매핑 확인:
    - 필수: 이름
    - 선택: 전문분야, 과목, 경력, 자격증, 학력, 연락처
  → 각 행에 대해:
    - 데이터 검증 (이름 필수)
    - keywords 자동 생성 (전문분야 + 과목 + 자격증 결합)
    - Instructor 레코드 생성
  → BulkUploadResponse 반환 (성공/실패 건수)
```

### 2.2 목록 조회 (검색/필터)
```
입력: FilterParams (keyword, specialization, certification)
  → 쿼리 빌드:
    - keyword: name, specializations, subjects, certifications에서 LIKE 검색
    - specialization: JSON 배열에서 포함 여부
  → 정렬: 이름 가나다순 (기본)
  → 페이지네이션 (offset/limit)
  → List[InstructorResponse] 반환
```

### 2.3 통계
```
입력: 없음
  → 전체 강사 수
  → specializations 필드 집계 (전문분야별 강사 수)
  → 평균 경력 연수
  → InstructorStats 반환
```

---

## 3. TaskOrderService — 과업지시서 로직

### 3.1 업로드 및 파싱 흐름
```
입력: 파일 (UploadFile)
  → 파일 저장 (uploads/ 디렉토리)
  → matching_core.parse_and_extract() 호출
    - 성공: 파싱 결과 저장
    - 실패: ParseError → 400 응답
  → TaskOrder 레코드 생성:
    - file_name, file_path, file_type
    - qualifications, evaluation_criteria (JSON)
    - parsed_at = now
  → TaskOrderResponse 반환
```

### 3.2 파싱 결과 수정
```
입력: task_order_id, ParsedResultUpdate
  → TaskOrder 조회 (미존재: 404)
  → qualifications, evaluation_criteria 업데이트
  → TaskOrderResponse 반환
```

---

## 4. MatchingService — 매칭 로직

### 4.1 매칭 실행 흐름
```
입력: task_order_id
  → TaskOrder 조회 (미존재: 404)
  → 요구사항이 비어있으면: 400 (파싱 결과 확인 요청)
  → 전체 강사 목록 로드 (DB → matching_core.Instructor로 변환)
  → TaskRequirements 구성 (DB JSON → matching_core 엔티티로 변환)
  → matching_core.match_instructors() 호출
  → matching_core.generate_match_reasons() 호출 (상위 10명)
  → MatchingResult 레코드 저장
  → MatchingResultResponse 반환
```

### 4.2 강사 비교
```
입력: CompareRequest (instructor_ids, 2~5개)
  → 최근 매칭 결과에서 해당 강사들의 점수 추출
  → 비교 데이터 구성 (항목별 점수 나란히)
  → ComparisonResult 반환
```

---

## 5. 공통 로직

### 5.1 에러 처리
- 글로벌 에러 핸들러: 예외 → JSON 에러 응답
- MatchingCoreError → 400 + user_message
- ValidationError (Pydantic) → 422 + field 정보
- 기타 Exception → 500 + "서버 오류가 발생했습니다"

### 5.2 미들웨어
- CORS 미들웨어 (프론트엔드 도메인 허용)
- Rate Limiting 미들웨어 (slowapi)
- Security Headers 미들웨어
- 요청 로깅 미들웨어
