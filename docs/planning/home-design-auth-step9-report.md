# AOS 9단계 구현·검증 보고 (2026-11-03)

기존 main 브랜치의 미커밋 구현을 보존하고 보완했다. 작업 시작 시 이미 인증 어댑터, 권한 계약, fixture, 라우터 가드, 로그인 UI 및 47개 관리자 테스트가 존재했다. 이번 작업에서 신규 인증 시스템을 중복 생성하지 않았다.

## 조사 결과

- admin-site 관리자/직원: `members-staff-data.ts`의 adminCode/groupName 등 UI Mock. 권한그룹 `members-permission-groups-data.ts` 역시 DB/API 없는 Mock이다. 표시용 그룹명을 인증 근거로 사용하지 않았다.
- 판매점: `lib/seller/auth.ts`의 별도 fixture 로그인 및 브라우저 작성 JSON 쿠키. 홈디자인 관리자 세션과 분리하고 해당 쿠키를 관리자 인증으로 인정하지 않는다.
- aos-admin-live: 읽기 전용으로 handlers/login_check.js 및 auth_check.js 조사. tblManager/site_manager 로그인, req.session 재생성, admin/B2B 구분, AviaLoginId/b2bSiteLoginId 및 암호화 인증 쿠키를 사용한다. 운영 DB 조회는 실행하지 않았다.
- Vite: Node 미들웨어가 인증/초안/발행 요청을 공통 라우터로 전달한다. Next route도 동일 라우터를 사용한다. 두 개발 서버는 localhost, strictPort 및 localhost/127.0.0.1 허용 설정이다. 실제 실행 위치도 각각 admin-site/website이고 ::1:3001/3002에 바인딩되어 있었다.

## 최종 동작

- development/test에서만 인증 허용. production 및 알 수 없는 환경은 거부한다.
- 기존 7개 기능 권한을 계정 fixture에 연결한다. 역할명만으로 허용하지 않는다. 플랫폼 관리자는 platformScope와 명시적 allowedSiteCodes가 필요하다.
- 서버 메모리에 보관한 세션과 무작위 프로세스 서명 키로 검증한다. 알려진 고정 기본 키를 제거했다. 8시간 세션, HttpOnly/SameSite=Lax 쿠키, 로그아웃 시 서버 세션 폐기. 서버 재시작/인증 모듈 재로딩 시 다시 로그인한다.
- 로그인은 JSON 및 출처 검사, 변경 요청은 세션 CSRF 토큰과 출처 검사. 브라우저 입력으로 역할/허용 사이트를 결정하지 않는다.
- 초안 조회/저장/버전/복원 및 모의 발행/발행본/이력/복구는 서버 가드를 통과한다. 저장은 draft_save와 edit 모두 필요하다. 데이터 기록의 수정자/발행자는 서버 세션에서 가져온다.
- 직원은 자기 사이트만 조회하고 편집 컨트롤·저장·발행은 비활성화된다.
- website는 사이트·페이지·초안/발행 범위가 지정된 최대 10분 토큰으로 관리자 API를 호출한다. 토큰은 원래 세션 만료를 넘지 않으며 로그아웃으로 폐기된다. 토큰만으로 쓰기는 불가능하다.
- 인증 응답/미리보기는 no-store, 미리보기 페이지는 no-referrer. 관리자 fetch 리다이렉트를 거부한다. 미리보기 창은 클릭 시 먼저 열고 토큰 발급 후 이동하며 팝업 차단 시 현재 창으로 이동한다.

## 검증

| 항목 | 결과 |
|---|---|
| 관리자 기존 47개 | 모두 유지·통과 |
| 신규 회귀 테스트 8개 | 모두 통과 |
| 관리자 합계 | 55/55 |
| 홈페이지 테스트 | 17/17 |
| admin-site TypeScript | 통과 |
| website TypeScript | 통과 |
| git diff --check | 통과 |

신규 테스트: 로그아웃 후 세션/토큰 재사용, 로그인 CSRF/입력 검증, 고정 키 위조/손상 쿠키, 플랫폼 범위, 홈페이지 로더→관리자 토큰 통합, 타 사이트 버전/이력/복구 및 판매점 쿠키, 실제 Vite 미들웨어 호출, 수정자 위조 및 edit 권한 검사.

브라우저: oy-staff 로그인, OY01470만 선택 가능, 편집·저장·모의발행 비활성, 저장된 초안 rev 4 렌더링, 로그아웃 후 기존 미리보기 재조회 거부 확인. 관리자 화면 콘솔 오류 없음 확인. 브라우저에서는 기존 초안/발행 데이터를 쓰지 않았다.

## 실행

각 경로에서 `npm run dev`:
- `/Users/taein/Projects/AviaNext/aos-platform/admin-site` → http://localhost:3001/home-design
- `/Users/taein/Projects/AviaNext/aos-platform/website` → http://localhost:3002/design-preview 또는 /design-published-preview (관리자 버튼으로 토큰 발급 후 접근)

각 프로젝트에서 `npm run test:home-design`, `./node_modules/.bin/tsc --noEmit --incremental false` 실행.
개발 fixture: oy-master / dev-oy-master!, oy-staff / dev-oy-staff!, platform / dev-platform!.

## 범위 및 제한

개발 단일 프로세스용 인증이다. 운영 인증·공유 세션 저장소·실발행 전환은 하지 않았다. media_manage 권한은 계약에 유지하며 미디어 업로드 기능은 이번 범위가 아니다. 전체 프로덕션 빌드 및 전체 관리자 화면 회귀 검사는 실행하지 않았다. aos-admin-live 수정, 운영 MSSQL 접속/수정, 실발행, 배포, Git 손실 명령, 커밋은 하지 않았다.

## 이번 작업에서 수정한 파일

- /Users/taein/Projects/AviaNext/aos-platform/admin-site/lib/admin/home-design/auth/session.ts
- /Users/taein/Projects/AviaNext/aos-platform/admin-site/lib/admin/home-design/auth/guard.ts
- /Users/taein/Projects/AviaNext/aos-platform/admin-site/lib/admin/home-design/auth/auth-router.ts
- /Users/taein/Projects/AviaNext/aos-platform/admin-site/lib/admin/home-design/draft-router.ts
- /Users/taein/Projects/AviaNext/aos-platform/admin-site/lib/admin/home-design/publish-router.ts
- /Users/taein/Projects/AviaNext/aos-platform/admin-site/lib/admin/home-design/draft-store.ts
- /Users/taein/Projects/AviaNext/aos-platform/admin-site/lib/admin/home-design/publish-store.ts
- /Users/taein/Projects/AviaNext/aos-platform/admin-site/lib/admin/home-design/draft-http.ts
- /Users/taein/Projects/AviaNext/aos-platform/admin-site/build/home-design-draft-plugin.ts
- /Users/taein/Projects/AviaNext/aos-platform/admin-site/app/home-design/HomeDesignEditor.tsx
- /Users/taein/Projects/AviaNext/aos-platform/admin-site/app/home-design/home-design.css
- /Users/taein/Projects/AviaNext/aos-platform/admin-site/tests/home-design-auth.test.ts
- /Users/taein/Projects/AviaNext/aos-platform/admin-site/package.json
- /Users/taein/Projects/AviaNext/aos-platform/website/package.json
- /Users/taein/Projects/AviaNext/aos-platform/website/lib/home-design/load-preview.ts
- /Users/taein/Projects/AviaNext/aos-platform/website/lib/home-design/load-published-preview.ts
- /Users/taein/Projects/AviaNext/aos-platform/website/app/design-preview/page.tsx
- /Users/taein/Projects/AviaNext/aos-platform/website/app/design-published-preview/page.tsx

## 신규 파일

- /Users/taein/Projects/AviaNext/aos-platform/docs/planning/home-design-auth-step9-report.md
