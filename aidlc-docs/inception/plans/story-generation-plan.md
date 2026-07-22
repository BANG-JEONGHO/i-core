# 유저 스토리 생성 계획

## 개요
강사 매칭 플랫폼의 요구사항을 사용자 중심 스토리로 변환합니다.

---

## 질문

아래 질문에 답변해 주세요. [Answer]: 태그 뒤에 선택한 알파벳을 입력해 주세요.

### Question 1
유저 스토리를 어떤 방식으로 구성하길 원하시나요?

A) 사용자 여정 기반 — 사용자 워크플로우 흐름 순서로 스토리 구성 (로그인 → 데이터 업로드 → 매칭 → 결과 확인)

B) 기능 기반 — 시스템 기능 단위로 스토리 구성 (인증, 강사관리, 파싱, 매칭, 대시보드)

C) 구현 단계 기반 — 1단계/2단계/3단계 매칭 엔진 진화에 맞춰 스토리 구성

D) Other (please describe after [Answer]: tag below)

[Answer]: A

### Question 2
유저 스토리의 세분화 수준은 어느 정도가 적당할까요?

A) 대규모 스토리 (Epic 수준) — 큰 기능 단위로 5~8개 정도

B) 중간 크기 스토리 — 기능을 적절히 나눈 10~15개 정도

C) 세분화된 스토리 — 구현 단위에 가까운 20개 이상

D) Other (please describe after [Answer]: tag below)

[Answer]: C

### Question 3
수용 기준(Acceptance Criteria)의 상세 수준은?

A) 간결하게 — 핵심 동작만 1~2줄로 정리

B) 표준 수준 — Given/When/Then 형식으로 주요 시나리오 포함

C) 상세하게 — 정상/비정상/엣지 케이스까지 모두 포함

D) Other (please describe after [Answer]: tag below)

[Answer]: A

### Question 4
1단계 구현 범위에서 가장 중요한 사용자 흐름은 무엇인가요?

A) 과업지시서 업로드 → 자동 파싱 → 매칭 결과 확인 (핵심 흐름)

B) 강사 데이터 등록/관리 → 과업지시서 업로드 → 매칭 (데이터 준비부터)

C) 전체 흐름 동일하게 중요 (로그인 ~ 대시보드까지)

D) Other (please describe after [Answer]: tag below)

[Answer]: A

---

## 실행 계획

유저 스토리 생성 시 아래 단계를 순서대로 수행합니다:

- [x] Step 1: 사용자 페르소나 정의 (personas.md)
- [x] Step 2: 유저 스토리 작성 — 요구사항을 스토리로 변환
- [x] Step 3: 수용 기준 작성 — 각 스토리에 AC 추가
- [x] Step 4: 스토리 우선순위 및 단계 매핑 (1단계/2단계/3단계)
- [x] Step 5: INVEST 기준 검증
- [x] Step 6: 페르소나-스토리 매핑 확인

---

## 산출물
- `aidlc-docs/inception/user-stories/personas.md` — 사용자 페르소나
- `aidlc-docs/inception/user-stories/stories.md` — 유저 스토리 + 수용 기준
