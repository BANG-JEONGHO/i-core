# 요구사항 검증 질문

아래 질문에 답변해 주세요. 각 질문의 [Answer]: 태그 뒤에 선택한 알파벳을 입력해 주세요.
선택지 중 맞는 것이 없으면 마지막 옵션(Other)을 선택하고 설명을 추가해 주세요.

---

## Question 1
강사 이력서 데이터는 어떤 형식으로 보유하고 계신가요?

A) Excel/CSV 파일

B) PDF 파일

C) 데이터베이스 (이미 구조화된 데이터)

D) Word/한글(.hwp) 문서

E) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question 2
과업지시서(나라장터)는 어떤 형식으로 업로드될 예정인가요?

A) PDF 파일

B) Word/한글(.hwp) 문서

C) Excel 파일

D) 여러 형식 혼합 (PDF + 한글 등)

E) Other (please describe after [Answer]: tag below)

[Answer]: D

## Question 3
강사 매칭 시 주요 기준은 무엇인가요? (가장 중요한 것)

A) 전문 분야/교육 과목 일치

B) 경력 연수 및 자격증

C) 지역(근무 가능 지역) 일치

D) 위 항목 모두 종합적으로 고려

E) Other (please describe after [Answer]: tag below)

[Answer]: A, B
## Question 4
이 플랫폼을 사용할 사용자는 누구인가요?

A) 나(인턴) 혼자만 사용

B) 우리 팀 (소수 인원, 5명 이내)

C) 회사 전체 직원

D) 외부 고객/기관도 사용

E) Other (please describe after [Answer]: tag below)

[Answer]: C

## Question 5
로그인/인증 기능이 필요한가요?

A) 필요 없음 (내부 도구로 간단히 사용)

B) 간단한 로그인만 (ID/비밀번호)

C) 회사 SSO 연동 필요

D) 역할별 권한 관리 필요 (관리자/일반 사용자 등)

E) Other (please describe after [Answer]: tag below)

[Answer]: C

## Question 6
매칭 결과를 어떻게 보여주길 원하시나요?

A) 상위 1명의 최적 강사만 추천

B) 상위 3~5명 강사를 순위별로 추천

C) 점수 기반 목록으로 전체 강사를 정렬해서 보여줌

D) 매칭 이유(근거)와 함께 추천

E) Other (please describe after [Answer]: tag below)

[Answer]: C,D가 있으면 좋겠는데 C는 직관적으로 보이고, D는 클릭했을때 카드 형식으로 보여주면 좋겠어

## Question 7
기술 스택에 대한 선호가 있나요?

A) Python (Flask/Django/FastAPI) 기반

B) Node.js (Express/Next.js) 기반

C) Java/Spring Boot 기반

D) 특별한 선호 없음 (추천해 주세요)

E) Other (please describe after [Answer]: tag below)

[Answer]: 백엔드는: A가 좋고 프론트엔드는: React + typescript로 제작해주면 좋겠어

## Question 8
AI/자연어 처리를 활용한 매칭을 원하시나요?

A) 키워드 기반 단순 매칭 (정확한 텍스트 일치)

B) AI 활용 의미 기반 매칭 (예: OpenAI API, 임베딩 유사도)

C) 규칙 기반 매칭 (가중치 점수 시스템)

D) Other (please describe after [Answer]: tag below)

[Answer]: A, B, C  그리고 검증을 위한 랄리지 그래프, AI Agent을 활용해주면 좋을거 같아.

## Question 9
강사 이력서 데이터의 규모는 어느 정도인가요?

A) 소규모 (50명 이하)

B) 중규모 (50~200명)

C) 대규모 (200명 이상)

D) Other (please describe after [Answer]: tag below)

[Answer]: B 108명 정도 갖고있어. 

## Question 10
배포 환경은 어떻게 계획하고 계신가요?

A) 로컬에서만 실행 (개발/데모용)

B) 회사 내부 서버에 배포

C) 클라우드 배포 (AWS, Azure, GCP 등)

D) 아직 결정하지 않음

E) Other (please describe after [Answer]: tag below)

[Answer]: D

---

## Question 11: Security Extensions
이 프로젝트에 보안 확장 규칙을 적용할까요?

A) Yes — 모든 보안 규칙을 차단 제약으로 적용 (프로덕션 수준의 애플리케이션에 권장)

B) No — 보안 규칙 건너뛰기 (PoC, 프로토타입, 실험적 프로젝트에 적합)

X) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question 12: Resiliency Extensions
이 프로젝트에 복원력(Resiliency) 베이스라인을 적용할까요?

이 확장 기능은 AWS Well-Architected Framework (신뢰성 축)에서 파생된 복원력 설계 모범 사례를 적용합니다. 장애 허용, 고가용성, 관측 가능성, 복구 가능성 방향으로 설계를 안내합니다.

A) Yes — 복원력 베이스라인을 방향성 모범 사례로 적용 (비즈니스 크리티컬 워크로드에 권장)

B) No — 복원력 베이스라인 건너뛰기 (PoC, 프로토타입, 실험적 프로젝트에 적합)

X) Other (please describe after [Answer]: tag below)

[Answer]: B — 복원력 베이스라인 건너뛰기 (PoC, 프로토타입, 실험적 프로젝트에 적합)

## Question 13: Property-Based Testing Extension
이 프로젝트에 속성 기반 테스팅(PBT) 규칙을 적용할까요?

A) Yes — 모든 PBT 규칙을 차단 제약으로 적용 (비즈니스 로직, 데이터 변환, 직렬화, 상태 관리 컴포넌트가 있는 프로젝트에 권장)

B) Partial — 순수 함수와 직렬화 왕복 테스트에만 PBT 규칙 적용

C) No — PBT 규칙 건너뛰기 (단순 CRUD, UI 전용, 또는 비즈니스 로직이 적은 프로젝트에 적합)

X) Other (please describe after [Answer]: tag below)

[Answer]:A
