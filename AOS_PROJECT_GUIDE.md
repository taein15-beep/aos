# AOS 프로젝트 개발 가이드

이 문서는 2026-11-02 구조 점검 및 **개발 기준 확정** 결과다.

점검·백업 범위에서 `aos-admin-live` 파일 삭제, Git reset/clean, 코드 이전, 배포는 하지 않았다.

---

## 1. 확정된 역할

| 구분 | 절대경로 | 역할 |
|---|---|---|
| 프로젝트 루트 | `/Users/taein/Projects/AviaNext/aos-platform` | Git 저장소 루트. 새 관리자·홈페이지·문서 |
| **최종 관리자** | `/Users/taein/Projects/AviaNext/aos-platform/admin-site` | 신규 관리자·판매점 관리자 개발 위치 |
| **여행사 홈페이지** | `/Users/taein/Projects/AviaNext/aos-platform/website` | 홈페이지·제휴/판매점 가입 공개 화면 |
| 기존 운영 관리자 (보존) | `/Users/taein/Projects/AviaNext/aos-admin-live` | Express/EJS + MSSQL. 홈페이지 3단 편집기 원본 |
| 루트 HTML 관리자 | `/Users/taein/Projects/AviaNext/aos-platform/public/admin` | 이전 HTML 대시보드. 루트 `npm run dev`가 이 경로를 연다 |
| 공통 라이브러리 | `/Users/taein/Projects/AviaNext/common` | `aos-admin-live`가 참조 |

---

## 2. 고정 포트

| 서비스 | 포트 | 실행 위치 |
|---|---|---|
| 관리자페이지 | **3001** | `admin-site` |
| 여행사 홈페이지 | **3002** | `website` |

포트가 사용 중이면 번호를 바꾸지 말고, 점유한 프로세스와 작업 폴더를 먼저 확인한다.

루트 `npm run dev`는 기본 **3080**이며 이전 HTML 관리자 서버다. 새 관리자 실행 명령으로 쓰지 않는다.

`aos-admin-live`의 `server.js` 기본 포트도 **3001**이다. 새 관리자와 충돌하므로, 기존 관리자를 띄울 때는 명시 요청이 있을 때만 `PORT`를 지정한다. `admin-site` 포트는 바꾸지 않는다.

---

## 3. 실행 명령

### 홈페이지 3002

```bash
cd /Users/taein/Projects/AviaNext/aos-platform/website
npm run dev -- --port 3002 --strictPort
```

접속: http://localhost:3002/

### 관리자 3001

```bash
cd /Users/taein/Projects/AviaNext/aos-platform/admin-site
npm run dev -- --port 3001 --strictPort
```

접속: http://localhost:3001/

### 양쪽 동시 실행

위 두 명령을 **서로 다른 터미널**에서 실행한다. 루트 `npm run dev`는 함께 쓰지 않는다.

### 서버 종료

해당 터미널에서 `Ctrl+C`로 종료한다. 다른 작업의 서버를 임의로 종료하지 않는다.

### 포트 충돌

```bash
lsof -nP -iTCP:3001 -sTCP:LISTEN
lsof -nP -iTCP:3002 -sTCP:LISTEN
```

점유 프로세스의 cwd를 확인한 뒤, 같은 프로젝트면 재사용하고 다른 프로젝트면 사용자에게 알린다. 포트를 임의로 3000/3003 등으로 바꾸지 않는다.

---

## 4. 최종 관리자 (확정)

**앞으로의 새 관리자·판매점 관리자 기능은 `admin-site`에서만 개발한다.**

근거:

- 상품·예약·정산·회원·판매점·직원·스탬프투어 UI가 `admin-site`에 모여 있다.
- 판매점 관리자(`/seller`)는 `admin-site`에만 있다.
- 사용자 고정 기준도 관리자 3001 = `admin-site`다.
- `website`(3002)와 같은 저장소·같은 Next/Vinext 스택이다.

**운영 원본:** 현재 운영형(MSSQL 로그인, 홈페이지 디자인 저장/라이브 적용) 관리자는 `aos-admin-live`다. 3단 디자인 편집기도 여기에만 있다. 이전 완료 전까지 삭제·덮어쓰기·git 손실 작업을 하지 않는다.

홈페이지 디자인 편집기 이전 설계: `docs/planning/homepage-design-editor-migration.md`

로컬 백업: `/Users/taein/Projects/AviaNext/backups/aos-admin-live-editor-20261102-1447`

---

## 5. 수정 금지 대상

명시 요청이 없으면 다음 위치에 새 기능을 추가하지 않는다.

- `/Users/taein/Projects/AviaNext/aos-admin-live`
- `/Users/taein/Projects/AviaNext/aos-platform/public/admin`
- `/Users/taein/Projects/AviaNext/aos-platform/server.js` (루트 HTML 관리자)

기존 파일과 미커밋 변경을 삭제·덮어쓰기·일괄 병합하지 않는다.
`aos-admin-live`에서 `git reset`, `git clean`, `git checkout`으로 작업 트리를 되돌리지 않는다.

---

## 6. 새 기능 작업 기준

| 요청 유형 | 작업 폴더 | 포트 |
|---|---|---|
| 공급여행사 관리자, 판매점 관리자 | `admin-site` | 3001 |
| 여행사 홈페이지, 제휴/판매점 가입 공개 화면 | `website` | 3002 |
| 스탬프투어 관리 | `admin-site/app/stamp-tours` | 3001 |
| 홈페이지 디자인 편집기 | 원본은 `aos-admin-live`. 이전은 설계안 확정·데이터 연동 검증 후 `admin-site` | 3001 |

기존 관리자 기능 이전은 화면 단위로 비교하고, 저장/라이브 데이터 연동을 확인한 뒤에만 진행한다.

---

## 7. Git 및 배포

| 저장소 | 경로 | origin | 비고 |
|---|---|---|---|
| aos-platform | `/Users/taein/Projects/AviaNext/aos-platform` | `git@github.com:taein15-beep/aos.git` | 브랜치 `main` |
| aos-admin-live | `/Users/taein/Projects/AviaNext/aos-admin-live` | `https://github.com/taein15-beep/aos-admin-live-work.git` | 브랜치 `mainNewClean`. 원격 저장소는 2026-11-02 기준 GitHub에서 조회되지 않음 |

배포 대상:

- 새 관리자·홈페이지: `aos-platform`의 `admin-site`, `website`
- 기존 운영 관리자·디자인 편집기: `aos-admin-live` (이전 완료 전까지 유지)

작업과 관계없는 파일을 커밋하지 않는다.
