# 홈페이지 디자인 편집기 이전 설계안

작성일: 2026-11-02  
상태: **설계만.** 코드 이전·신규 구현은 하지 않는다.  
원본: `/Users/taein/Projects/AviaNext/aos-admin-live`  
이전 대상(확정): `/Users/taein/Projects/AviaNext/aos-platform/admin-site`  
공개 홈(확정): `/Users/taein/Projects/AviaNext/aos-platform/website`  
로컬 백업: `/Users/taein/Projects/AviaNext/backups/aos-admin-live-editor-20261102-1447`

운영 관리자와 MSSQL 실데이터에 쓰기 작업을 하지 않은 상태에서 소스만 분석했다.

---

## 1. 현재 원본 구조

3단 편집기 화면은 live의 `홈페이지설정` `/homeDesign/home_setting` 에만 있다.  
`admin-site` 메뉴 `시스템설정 > 홈페이지설정`은 “다음 단계에서 제공될 예정입니다”이며 페이지가 없다.

### 화면

| 영역 | DOM | 역할 |
|---|---|---|
| 좌 | `#editorSectionPanel` / `#sectionList` | 섹션 목록, 사용여부, 삭제, 추가, 정렬 |
| 중 | `#editorPreviewPanel` / `#editorPreviewCanvas` | PC/모바일 미리보기. 선택 섹션은 iframe `srcdoc` |
| 우 | `#editorPropertyPanel` | 섹션 속성·카드 편집, TinyMCE(html) |

핵심 파일:

- `views/homeDesign/home_setting.ejs` — 레이아웃 (`avn-design-editor-v2`)
- `public/css/home_editor_v2.css` — 3단 CSS (Git 미추적)
- `public/scripts/home_setting.js` — 클라이언트
- `handlers/homeDesign/home_setting.js` — 목록/속성 HTML 조립
- `handlers/homeDesign/previewData.js` — 미리보기 HTML
- `handlers/homeDesign/designSave.js` — 섹션/카드 저장
- `handlers/homeDesign/liveSetting.js` — 라이브 적용(파일 발행)
- `handlers/homeDesign/lib/sectionRenderer.js` — 템플릿 치환 공용

섹션 유형 (`common/src/utils/tempConst.js` `arrTempSection`):  
banner, imagecard, category, multicategory, html, board, video, map, calendar, gnb, gfb

---

## 2. 저장 / 미리보기 / 라이브 적용

```
[우측 속성 입력]
    │
    ├─ 상단「저장」 editorSave() → sectionSetSave()
    │     POST /homeDesign/designSave  mode=sectionCardData
    │     → HomeDatas_set / HomeDatas_minor / HomeDatas_multi 등 UPDATE
    │
    ├─ 중앙 미리보기 editorLoadSelectedPreview()
    │     POST /homeDesign/previewData  mode=sectionPreview
    │     applyPostedPreviewValues()로 미저장 폼 값을 덮어쓴 뒤
    │     sectionList.sectionData + 이미지(img_manager)로 HTML 생성
    │     → iframe srcdoc (DB 미기록)
    │
    ├─ 상단「미리보기」 editorOpenPreview() → sectionPreview()
    │     동일 previewData, 모달로 표시
    │
    └─ 상단「라이브 적용」 liveSetting()
          POST /homeDesign/liveSetting  mode=liveSetting
          HomeDatas* + sectionList + gnbData + site + img_manager 조회
          renderLiveSection()으로 전체 페이지 HTML/CSS 생성
          파일 기록:
            ../../../frontPage/views/sites/{siteCode}/include/top.inc
            ../../../frontPage/public/css (사이트 CSS)
          해석 경로: /Users/taein/Projects/AviaNext/frontPage/...
          (2026-11-02 로컬에 frontPage 폴더 없음)
```

미리보기는 **쓰기 없음**. 저장은 **MSSQL UPDATE**. 라이브 적용은 **MSSQL 읽기 + 로컬 파일 쓰기**.

사이트 식별: 쿠키 `b2bSiteCode` (기본 `OY01470`), 템플릿 `tempCode` (기본 `AOS02`).

---

## 3. MSSQL 의존성

핸들러가 직접 조회/갱신하는 테이블 (접두사 `deps.hubTemp` 포함 가능):

| 테이블 | 용도 |
|---|---|
| `HomeDatas` / `homeDatas` | 페이지·섹션 행 (코드에 대소문자 혼용) |
| `HomeDatas_set` | 섹션 설정(여백, 높이, 타이틀, 노출) |
| `HomeDatas_minor` | 카드/슬라이드 단위 콘텐츠 |
| `HomeDatas_multi` | 멀티카테고리 탭 |
| `HomeDatas_sub` | 히어로 퀵메뉴 |
| `sectionList` | 템플릿별 섹션 HTML/CSS/JS 원본 |
| `tempList` | 템플릿 메타, homepageCss |
| `gnbData`, `gnbData_sub`, `gnbData_sub2` | 상단 메뉴 |
| `img_manager` | PC/모바일 이미지 파일명 |
| `site`, `site_account` | 도메인, 로고, 계좌, 전화 (board 치환) |

로그인·세션: `AviaLoginId`, `b2bSiteCode` 쿠키. 연결 풀은 `@common/dependencies` `getPool()` (mssql).

`admin-site`는 Drizzle + D1(SQLite)이며 위 테이블이 없다.

---

## 4. 이전 원칙

1. **live를 운영 원본으로 유지**한다. 이전 중에도 live 편집기·라이브 적용은 그대로 둔다.
2. **EJS를 복사해 admin-site에 넣지 않는다.** React/Next로 화면만 재구현하고, 저장·미리보기 계약은 기존 mode/필드명을 따른다.
3. **실데이터 쓰기는 마지막 단계**다. 그 전에는 읽기 전용 또는 스테이징 DB.
4. **발행 대상을 먼저 정한다.** 지금은 `frontPage` 파일이다. `website`로 바꿀지는 별도 결정이다.
5. 기능 단위: 화면 셸 → 미리보기(읽기) → 저장(쓰기) → 라이브 적용.

---

## 5. 권장 단계 (구현은 후속 요청)

### STEP A — 읽기 전용 셸 (`admin-site`)

- `시스템설정 > 홈페이지설정`을 `/home-design` 같은 경로로 연결.
- 3단 레이아웃만 React로 재현. 샘플/빈 상태. MSSQL 쓰기 없음.
- live 미커밋 UI(`home_editor_v2.css`, dirty badge, PC/모바일)를 시각 기준으로 삼는다.

### STEP B — 미리보기 읽기 API

- admin-site Route Handler가 live와 **같은 SELECT**를 수행하거나, live에 읽기 전용 프록시를 둔다.
- 요청 필드: `tempCode`, `uid_minor`, `gubun`, `section_num`, 폼 오버라이드.
- 응답: HTML 조각. `sectionRenderer` 치환 규칙을 공유 모듈로 옮길 수 있으면 옮긴다. 실패 시 live 로직을 복제하지 말고 차이를 기록한다.

### STEP C — 저장 API (스테이징 먼저)

- `designSave`의 `sectionCardData` / 카드 추가·삭제·정렬과 필드 호환.
- 운영 DB 직접 UPDATE 전에 스테이징 또는 트랜잭션+롤백 검증.
- TinyMCE html 섹션, 이미지 `img_manager` 업로드 경로를 별도 확인.

### STEP D — 라이브 적용 대상 결정 후 발행

선택지 (미정, 구현 전 결정 필요):

1. 기존처럼 `frontPage/views/sites/{siteCode}/include/*.inc` 기록 (운영 호환, `website`와 무관)
2. `website`가 읽는 API/JSON으로 전환 (스택 일치, 기존 avianext 홈과 단절)
3. 당분간 1 유지, `website`는 별도 공개 사이트

로컬에 `frontPage`가 없으므로 1번도 경로·배포 위치를 확인해야 한다.

### STEP E — 병행 운영 후 live 화면 비활성

- 동일 사이트코드로 저장 결과가 live 편집기·실제 홈과 일치하는지 비교.
- 일치 확인 후에만 live 메뉴에서 해당 화면을 숨긴다. 핸들러 삭제는 더 나중.

---

## 6. admin-site 쪽 예상 위치 (아직 만들지 않음)

| 구분 | 제안 경로 |
|---|---|
| 화면 | `admin-site/app/home-design/page.tsx` |
| 미리보기 API | `admin-site/app/api/admin/home-design/preview/route.ts` |
| 저장 API | `admin-site/app/api/admin/home-design/save/route.ts` |
| 라이브 적용 API | `admin-site/app/api/admin/home-design/publish/route.ts` |
| 메뉴 | `lib/admin/navigation.ts`의 `홈페이지설정` → `/home-design` |

`website`에는 편집기를 두지 않는다. 편집기는 관리자(3001)만.

---

## 7. 이전 시작 전에 해결할 문제

1. **발행 타깃:** `frontPage`(미존재) vs `WEBSERVICE/avianext` vs `website`. 운영 홈이 어느 디렉터리에서 파일을 읽는지 서버에서 확인해야 한다.
2. **MSSQL 접속을 admin-site에 둘지:** 현재 admin-site는 D1. 운영 DB 자격 증명을 Next/Vite 프로세스에 넣는 방식, 읽기 전용 계정, 방화벽을 정해야 한다.
3. **테이블명 대소문자:** `home_setting.js`는 `homeDatas`, 다른 핸들러는 `HomeDatas`. SQL Server collation에 따라 깨질 수 있어 이전 전에 실제 개체명을 확인한다.
4. **쿠키 인증:** live는 `AviaLoginId` / `b2bSiteCode`. admin-site 로그인과 사이트를 어떻게 매핑할지 없다.
5. **이미지·업로드:** `img_manager` + 디스크/S3 경로. admin-site에 동일 스토리지가 없다.
6. **live Git 원격 부재:** `aos-admin-live-work` GitHub 저장소가 조회되지 않는다. 미커밋 편집기는 로컬 백업에만 있다. 원격 백업 여부를 결정해야 한다.
7. **포트:** live 기본 3001. 병행 검증 시 live는 다른 `PORT`만 사용하고 admin-site 3001은 유지한다.
8. **`website`와 실홈 분리:** 새 홈은 편집기 발행 대상이 아니다. 편집기 이전과 `website` 개편을 한 작업으로 묶지 않는다.
9. **스테이징 DB:** 운영 `HomeDatas*`에 테스트 UPDATE를 치지 않을 복사본이 있는지 확인한다.
10. **섹션 템플릿 HTML:** `sectionList.sectionData`가 실제 .inc와 동기화돼 있는지, 템플릿 AOS01–AOS04 범위를 확정한다.

---

## 8. 명시적으로 하지 않은 것

- admin-site에 편집기 페이지/API를 만들지 않았다.
- live 파일을 수정·이동·커밋하지 않았다.
- MSSQL에 접속·쓰기 하지 않았다.
- `frontPage` / `website` 발행 경로를 바꾸지 않았다.
