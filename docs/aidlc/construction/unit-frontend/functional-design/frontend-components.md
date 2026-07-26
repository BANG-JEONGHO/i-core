# 프론트엔드 컴포넌트 설계 — unit-frontend

## 개요
React + TypeScript SPA. 사용자 여정 흐름 기반 페이지 구성.

---

## 페이지 구조

### Page 1: LoginPage
- **경로**: `/login`
- **컴포넌트**: LoginForm
- **상태**: username, password, error message
- **API**: POST /api/auth/login → 토큰 저장 (localStorage)
- **동작**: 성공 시 `/dashboard`로 이동

### Page 2: RegisterPage
- **경로**: `/register`
- **컴포넌트**: RegisterForm
- **상태**: username, password, name, error
- **API**: POST /api/auth/register → 로그인 페이지로 이동

### Page 3: DashboardPage
- **경로**: `/` (기본)
- **컴포넌트**: RecentMatchings, InstructorStats
- **API**: GET /api/matching/history, GET /api/instructors/statistics
- **동작**: 최근 매칭 이력 + 강사 통계 차트

### Page 4: InstructorsPage
- **경로**: `/instructors`
- **컴포넌트**: InstructorList, SearchBar, UploadButton
- **상태**: instructors[], keyword, pagination
- **API**: GET /api/instructors/, POST /api/instructors/upload

### Page 5: InstructorDetailPage
- **경로**: `/instructors/:id`
- **컴포넌트**: InstructorCard, EditForm
- **API**: GET/PUT/DELETE /api/instructors/{id}

### Page 6: TaskOrderUploadPage
- **경로**: `/task-orders/upload`
- **컴포넌트**: FileDropzone, ParsedResultPreview
- **상태**: file, parsing status, parsed result
- **API**: POST /api/task-orders/upload
- **동작**: 파일 드래그앤드롭 → 업로드 → 파싱 결과 미리보기

### Page 7: TaskOrderDetailPage
- **경로**: `/task-orders/:id`
- **컴포넌트**: ParsedResultEditor, MatchButton
- **API**: GET /api/task-orders/{id}, PUT /api/task-orders/{id}/parsed
- **동작**: 파싱 결과 확인/수정 → 매칭 실행 버튼

### Page 8: MatchingResultPage
- **경로**: `/matching/:id`
- **컴포넌트**: ScoreList, InstructorMatchCard
- **상태**: results[], selectedInstructor
- **API**: GET /api/matching/{id}
- **동작**: 점수 목록 + 클릭 시 카드 팝업

### Page 9: TaskOrderHistoryPage
- **경로**: `/task-orders`
- **컴포넌트**: TaskOrderList
- **API**: GET /api/task-orders/

---

## 공통 컴포넌트

| 컴포넌트 | 역할 |
|---|---|
| Layout | 사이드바 + 헤더 + 콘텐츠 영역 |
| Sidebar | 네비게이션 메뉴 |
| Header | 유저 정보 + 로그아웃 버튼 |
| ProtectedRoute | 인증 확인 래퍼 |
| LoadingSpinner | 로딩 표시 |
| ErrorBoundary | 에러 UI |
| Pagination | 페이지네이션 컨트롤 |

---

## 상태 관리

| Store | 역할 | 라이브러리 |
|---|---|---|
| authStore | 토큰, 유저 정보 | Zustand |
| API 상태 | 서버 데이터 캐시 | React Query (TanStack Query) |

---

## API 호출 패턴

```typescript
// api/client.ts — Axios 인스턴스
const apiClient = axios.create({
  baseURL: "http://localhost:8000",
});

// 인터셉터: 토큰 자동 첨부
apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// 인터셉터: 401 시 로그인 페이지 이동
apiClient.interceptors.response.use(null, (error) => {
  if (error.response?.status === 401) {
    useAuthStore.getState().logout();
    window.location.href = "/login";
  }
  return Promise.reject(error);
});
```

---

## 폼 검증 규칙

| 폼 | 필드 | 검증 |
|---|---|---|
| LoginForm | username | 필수, 3자 이상 |
| LoginForm | password | 필수, 8자 이상 |
| RegisterForm | name | 필수 |
| InstructorEdit | name | 필수, 100자 이하 |
| InstructorEdit | experience_years | 0~50 |
| FileUpload | file | 필수, .pdf/.hwp/.docx/.xlsx/.csv |

---

## 사용자 흐름 (핵심)

```
로그인 → 대시보드
  → 강사 관리 (목록/상세/업로드)
  → 과업지시서 업로드 → 파싱 결과 확인 → 매칭 실행
  → 매칭 결과 (점수 목록 → 카드 상세)
```
