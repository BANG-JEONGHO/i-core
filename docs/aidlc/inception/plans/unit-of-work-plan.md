# 유닛 생성 계획

## 개요
강사 매칭 플랫폼을 관리 가능한 개발 유닛으로 분해합니다.

---

## 질문

### Question 1
개발 유닛을 어떻게 나누길 원하시나요?

A) 프론트엔드 / 백엔드 — 2개 유닛 (프론트엔드 전체 + 백엔드 전체)

B) 계층별 — 3개 유닛 (프론트엔드 + 백엔드 API/서비스 + 매칭엔진/파서)

C) 기능별 — 4개 유닛 (인증 + 강사관리 + 과업지시서/파싱 + 매칭)

D) Other (please describe after [Answer]: tag below)

[Answer]: B

### Question 2
프로젝트 디렉토리 구조 선호도는?

A) 단일 레포 모노레포 — frontend/와 backend/ 폴더로 분리

B) 완전 분리 — 프론트엔드와 백엔드를 별도 프로젝트로 관리

C) 통합 — 하나의 프로젝트 루트에서 모두 관리

D) Other (please describe after [Answer]: tag below)

[Answer]: B

### Question 3
개발 순서에 대한 선호가 있나요?

A) 백엔드 먼저 (API 완성 → 프론트엔드 연결)

B) 프론트엔드 먼저 (UI/목업 → 백엔드 API 연결)

C) 동시 개발 (백엔드 API + 프론트엔드를 병렬로)

D) 핵심 흐름 먼저 (과업지시서→파싱→매칭 흐름을 수직으로 먼저 완성)

E) Other (please describe after [Answer]: tag below)

[Answer]: C

---

## 실행 계획

- [x] Step 1: 유닛 정의 및 책임 범위 결정 (unit-of-work.md)
- [x] Step 2: 유닛 간 의존성 매트릭스 생성 (unit-of-work-dependency.md)
- [x] Step 3: 유저 스토리-유닛 매핑 (unit-of-work-story-map.md)
- [x] Step 4: 코드 구조 전략 문서화
- [x] Step 5: 유닛 경계 및 의존성 검증
