# 요구사항 명확화 질문

답변에서 몇 가지 추가 확인이 필요한 부분이 있습니다. [Answer]: 태그 뒤에 답변해 주세요.

---

## Clarification 1: SSO 연동 관련
Q5에서 "회사 SSO 연동 필요"를 선택하셨습니다.

### Clarification Question 1
회사에서 현재 사용 중인 SSO 시스템이 있나요?

A) Google Workspace (Google OAuth)

B) Microsoft 365 (Azure AD/Entra ID)

C) 자체 SSO 시스템이 있음

D) SSO 시스템은 없지만 향후 도입 예정 — 우선은 간단한 로그인(ID/비밀번호)으로 시작

E) Other (please describe after [Answer]: tag below)

[Answer]: E — 회사 계정으로 로그인 로직 (자체 계정 시스템)

## Clarification 2: AI 매칭 시스템 범위
Q8에서 키워드 매칭 + AI 임베딩 + 규칙 기반 + Knowledge Graph + AI Agent를 모두 원하셨습니다.
이것은 상당히 복잡한 시스템인데, 단계적 접근에 대해 확인하고 싶습니다.

### Clarification Question 2
매칭 시스템을 어떻게 구축하길 원하시나요?

A) 모두 한번에 구현 (키워드 + 임베딩 + 규칙 + Knowledge Graph + AI Agent 전부)

B) 단계적 구현 — 1단계: 키워드+규칙 기반 → 2단계: AI 임베딩 추가 → 3단계: Knowledge Graph + Agent 추가

C) 핵심만 먼저 — AI 임베딩 기반 매칭 + 규칙 가중치를 먼저 만들고, Knowledge Graph와 Agent는 나중에

D) Other (please describe after [Answer]: tag below)

[Answer]: B — 단계적 구현 (1단계: 키워드+규칙 → 2단계: AI 임베딩 → 3단계: Knowledge Graph + Agent)

## Clarification 3: 과업지시서 파싱 관련
Q2에서 여러 형식 혼합(PDF + 한글 등)을 선택하셨습니다.

### Clarification Question 3
과업지시서에서 추출해야 할 핵심 정보는 무엇인가요?

A) 교육 주제/과목명, 필요 자격 요건

B) 교육 주제, 자격 요건, 교육 기간, 예산

C) 교육 주제, 자격 요건, 기간, 예산, 지역, 대상자 수 등 전체 정보

D) Other (please describe after [Answer]: tag below)

[Answer]: D — 과업지시서에서 추출할 핵심 정보: 평가기준, 참여자격(신청자격)

## Clarification 4: Python 백엔드 프레임워크
Q7에서 Python 백엔드를 선택하셨습니다.

### Clarification Question 4
Python 백엔드 프레임워크 중 선호하는 것이 있나요?

A) FastAPI (빠른 성능, 자동 API 문서, 비동기 지원 — AI/ML 프로젝트에 추천)

B) Django (풀스택, 관리자 페이지 내장, ORM 강력)

C) Flask (가볍고 유연, 자유도 높음)

D) Other (please describe after [Answer]: tag below)

[Answer]: A — FastAPI
