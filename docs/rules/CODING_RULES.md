# AOS Coding Rules

## 1. 기본 원칙

코드는 다음을 우선한다.

- Readability
- Maintainability
- Stability
- Reusability
- Consistency

복잡한 코드보다 이해하기 쉬운 코드를 우선한다.

---

## 2. 기존 프로젝트 우선

기존 프로젝트의 기술 스택과 폴더 구조를 우선한다.

작업 편의를 이유로 프레임워크 또는 구조를 임의로 변경하지 않는다.

새 라이브러리를 추가하기 전에 기존 코드로 해결 가능한지 확인한다.

---

## 3. HTML

HTML5 semantic structure를 사용한다.

의미 없는 div 중첩을 최소화한다.

ID는 페이지 내에서 중복하지 않는다.

Form 요소에는 가능한 Label을 연결한다.

Button 기능에는 `<button>`을 사용한다.

링크 이동에는 `<a>`를 사용한다.

---

## 4. CSS

공통 스타일을 우선 사용한다.

CSS 작성 순서는 가능한 다음 기준을 따른다.

Layout
→
Component
→
State
→
Responsive

중복 CSS 생성을 피한다.

Inline style 사용을 최소화한다.

`!important`는 특별한 이유가 없는 한 사용하지 않는다.

지나치게 구체적인 selector를 피한다.

---

## 5. CSS Naming

기존 naming convention이 존재하면 기존 방식을 따른다.

새 클래스는 기능과 역할을 이해할 수 있게 작성한다.

좋은 예:

`.reservation-summary`

`.search-filter`

`.status-badge`

`.payment-summary`

나쁜 예:

`.box1`

`.aaa`

`.new-style`

---

## 6. JavaScript

Vanilla JavaScript를 사용하는 기존 페이지에서는 불필요하게 다른 프레임워크를 도입하지 않는다.

전역 변수 사용을 최소화한다.

함수는 하나의 명확한 역할을 갖도록 한다.

중복 코드를 함수로 분리한다.

DOM 요소가 존재하는지 확인한다.

---

## 7. Event

동일 이벤트가 중복 등록되지 않도록 한다.

Inline Event 사용을 최소화한다.

가능하면 `addEventListener`를 사용한다.

---

## 8. 데이터

화면 데이터 구조는 향후 API 연결을 고려한다.

업무 데이터와 UI 코드를 가능한 분리한다.

예:

예약 데이터
→
렌더링
→
이벤트

구조를 구분한다.

---

## 9. 금액

내부 계산에서는 숫자 타입을 사용한다.

표시할 때 천 단위 콤마와 원 단위를 적용한다.

문자열 상태의 금액으로 직접 계산하지 않는다.

---

## 10. 날짜

날짜 데이터 형식을 가능한 일관되게 유지한다.

화면 표시:

`YYYY-MM-DD`

화면 표시가 필요하면 별도의 format 함수를 사용한다.

---

## 11. API

API 호출 코드는 UI 로직과 지나치게 결합하지 않는다.

다음 상태를 고려한다.

- Loading
- Success
- Empty
- Error

API 오류가 전체 JavaScript 실행을 중단시키지 않도록 한다.

---

## 12. Security

사용자 입력값을 신뢰하지 않는다.

민감한 정보를 Front-end 코드에 하드코딩하지 않는다.

다음 값을 소스코드에 직접 작성하지 않는다.

- API Secret
- DB Password
- Access Token
- Private Key
- 실제 개인정보

환경변수 또는 서버 설정을 사용한다.

`.env` 파일은 GitHub에 commit하지 않는다.

---

## 13. 개인정보

고객 이름, 전화번호, 이메일, 생년월일 등 실제 개인정보를 테스트 데이터로 GitHub에 올리지 않는다.

샘플 데이터를 사용한다.

예:

홍길동
010-1234-5678
sample@example.com

---

## 14. 파일 수정

요청 대상 파일을 우선 수정한다.

관련 없는 파일을 함께 formatting하거나 수정하지 않는다.

작업과 무관한 대규모 코드 정리를 하지 않는다.

---

## 15. 신규 파일

새 파일을 생성하기 전에 기존 파일로 처리 가능한지 확인한다.

새 파일이 필요하면 프로젝트 폴더 구조와 naming convention을 따른다.

---

## 16. 주석

코드 자체로 이해 가능한 내용에는 불필요한 주석을 남발하지 않는다.

업무 규칙이나 복잡한 로직에는 필요한 설명을 작성한다.

---

## 17. Console

배포 대상 코드에 불필요한 `console.log()`를 남기지 않는다.

`console.error()` 등이 필요한 경우 목적을 명확히 한다.

---

## 18. Error Handling

사용자에게 기술적인 오류 내용을 그대로 노출하지 않는다.

예:

나쁜 예:

`TypeError: Cannot read properties of undefined`

좋은 예:

`예약정보를 불러오지 못했습니다.`

---

## 19. Accessibility

Button, Input, Modal 등 주요 UI는 키보드 접근성을 고려한다.

이미지에는 필요한 경우 alt를 제공한다.

색상만으로 상태를 구분하지 않는다.

---

## 20. 테스트

작업 후 최소한 다음을 확인한다.

- 페이지 로딩
- Console Error
- 버튼
- 링크
- Form
- Modal
- 검색
- Table
- 금액 계산
- 날짜
- 기존 기능

---

## 21. Git

기능별 변경 범위를 작게 유지한다.

Commit message는 작업 내용을 이해할 수 있게 작성한다.

예:

`feat: 예약달력 화면 추가`

`fix: 예약상세 인원변경 계산 오류 수정`

`style: 예약리스트 검색영역 UI 개선`

`docs: 예약관리 기획문서 추가`

---

## 22. Branch

큰 기능은 별도 branch에서 작업한다.

예:

`feature/reservation-calendar`

`feature/reservation-detail`

`feature/product-management`

`feature/settlement-management`

작업 완료 후 검토하고 main에 merge한다.

---

## 23. Refactoring

현재 요청과 관계없는 대규모 refactoring을 하지 않는다.

Refactoring이 필요한 경우 기능 수정과 분리해서 진행한다.

---

## 24. AI Generated Code

AI가 생성한 코드도 반드시 기존 코드와 동일한 기준으로 검토한다.

"AI가 작성했기 때문에 정상일 것"이라고 가정하지 않는다.

작업 후 실제 실행 및 기존 기능 영향을 확인한다.

---

## 25. 최종 원칙

코드를 새로 만드는 것보다 기존 AOS 구조와 자연스럽게 연결되는 코드를 만드는 것을 우선한다.