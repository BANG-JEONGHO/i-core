# NFR 설계 — unit-frontend

## 프로젝트 구조

```
instructor-matching-frontend/
├── src/
│   ├── main.tsx              # 앱 엔트리포인트
│   ├── App.tsx               # 라우팅 설정
│   ├── api/
│   │   ├── client.ts         # Axios 인스턴스 + 인터셉터
│   │   ├── auth.ts           # 인증 API
│   │   ├── instructors.ts    # 강사 API
│   │   ├── taskOrders.ts     # 과업지시서 API
│   │   └── matching.ts       # 매칭 API
│   ├── store/
│   │   └── authStore.ts      # Zustand 인증 스토어
│   ├── pages/
│   │   ├── LoginPage.tsx
│   │   ├── RegisterPage.tsx
│   │   ├── DashboardPage.tsx
│   │   ├── InstructorsPage.tsx
│   │   ├── InstructorDetailPage.tsx
│   │   ├── TaskOrderUploadPage.tsx
│   │   ├── TaskOrderDetailPage.tsx
│   │   ├── TaskOrderHistoryPage.tsx
│   │   └── MatchingResultPage.tsx
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Layout.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   └── Header.tsx
│   │   ├── common/
│   │   │   ├── ProtectedRoute.tsx
│   │   │   ├── LoadingSpinner.tsx
│   │   │   ├── Pagination.tsx
│   │   │   └── ErrorMessage.tsx
│   │   ├── instructors/
│   │   │   ├── InstructorList.tsx
│   │   │   └── InstructorCard.tsx
│   │   ├── taskOrders/
│   │   │   ├── FileDropzone.tsx
│   │   │   └── ParsedResultPreview.tsx
│   │   └── matching/
│   │       ├── ScoreList.tsx
│   │       └── InstructorMatchCard.tsx
│   ├── hooks/
│   │   ├── useInstructors.ts
│   │   ├── useTaskOrders.ts
│   │   └── useMatching.ts
│   └── types/
│       └── index.ts          # TypeScript 타입 정의
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
└── tailwind.config.js
```

## 보안 설계

### 토큰 관리
```typescript
// store/authStore.ts
interface AuthState {
  token: string | null;
  user: User | null;
  login: (token: string, user: User) => void;
  logout: () => void;
}

// localStorage에 토큰만 저장 (비밀번호 등 민감정보 미저장)
// 401 수신 시 자동 로그아웃
```

### 입력 검증
- 폼 제출 전 클라이언트 검증 (사용자 편의)
- 서버가 최종 검증 수행 (보안 보장)
- XSS 방지: React 기본 이스케이핑 활용

## Security Compliance Summary

| 규칙 | 상태 | 적용 내용 |
|---|---|---|
| SECURITY-04 | 준수 | CSP 메타 태그, 인라인 스크립트 미사용 |
| SECURITY-05 | 준수 | 클라이언트 입력 검증 (서버 보조) |
| SECURITY-09 | 준수 | 사용자 친화적 에러 메시지만 표시 |
| SECURITY-10 | 준수 | package-lock.json 버전 고정 |
| SECURITY-12 | 준수 | localStorage 토큰 저장, 민감정보 미저장 |
| SECURITY-13 | N/A | SRI: CDN 미사용 (번들 자체 포함) |
| 기타 | N/A | 서버 사이드 규칙 (백엔드에서 처리) |
