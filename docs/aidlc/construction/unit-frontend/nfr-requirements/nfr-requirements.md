# NFR 요구사항 — unit-frontend

## 성능 (Performance)

| 요구사항 | 기준 |
|---|---|
| 초기 로딩 | < 3초 (첫 렌더링) |
| 페이지 이동 | < 500ms (SPA 라우팅) |
| API 응답 대기 중 | 로딩 스피너 표시 |
| 번들 크기 | < 500KB (gzip 압축 후) |

## 보안 (Security)

| 규칙 | 적용 내용 |
|---|---|
| SECURITY-04 | CSP 메타 태그 (인라인 스크립트 최소화) |
| SECURITY-05 | 클라이언트 입력 검증 (서버 검증의 보조) |
| SECURITY-09 | 에러 시 내부 정보 미노출 (사용자 친화적 메시지) |
| SECURITY-12 | 토큰 저장 (localStorage), 민감 정보 미저장 |

## 사용성 (Usability)

| 요구사항 | 기준 |
|---|---|
| 언어 | 한국어 전용 |
| 반응형 | 최소 1024px (데스크탑 사내 도구) |
| 접근성 | 기본 ARIA 레이블, 키보드 네비게이션 |
| 에러 표시 | 토스트 알림 (자동 사라짐) |

## 기술 스택

| 카테고리 | 선택 | 버전 | 근거 |
|---|---|---|---|
| 프레임워크 | React | 18.x | 컴포넌트 기반, 넓은 생태계 |
| 언어 | TypeScript | 5.x | 타입 안전성 |
| 빌드 | Vite | 5.x | 빠른 HMR, 작은 번들 |
| 상태 관리 | Zustand | 4.x | 간단하고 가벼움 |
| 서버 상태 | TanStack Query | 5.x | 캐싱, 자동 갱신 |
| HTTP 클라이언트 | Axios | 1.7.x | 인터셉터, 토큰 자동 첨부 |
| 라우팅 | React Router | 6.x | SPA 라우팅 표준 |
| UI | Tailwind CSS | 3.x | 유틸리티 기반, 빠른 스타일링 |
| 아이콘 | Lucide React | - | 경량 아이콘 |
| 차트 | Recharts | 2.x | React 차트 라이브러리 |
| 토스트 | React Hot Toast | - | 간단한 알림 |
| 테스트 | Vitest + Testing Library | - | Vite 통합 |
