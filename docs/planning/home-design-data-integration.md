# 홈페이지 디자인 편집기 — 데이터 구조 및 연동 설계

작성일: 2026-11-02  
상태: **4단계 설계만.** 구현·운영 DB 연결·발행·배포는 하지 않는다.  
선행: 3단계 React 샘플 편집기 (`admin-site/app/home-design`), 이전 설계 (`docs/planning/homepage-design-editor-migration.md`)

| 구분 | 경로 | 이번 단계 |
|---|---|---|
| 최종 관리자 | `/Users/taein/Projects/AviaNext/aos-platform/admin-site` | 읽기만. API·스키마 미구현 |
| 여행사 홈페이지 | `/Users/taein/Projects/AviaNext/aos-platform/website` | 읽기만. 렌더러 미구현 |
| 기존 관리자 | `/Users/taein/Projects/AviaNext/aos-admin-live` | 읽기 전용 참고. **수정 금지** |
| 공용 상수 | `/Users/taein/Projects/AviaNext/common` | 읽기만 |

분석은 소스와 3단계 TypeScript 계약으로 했다. 운영 MSSQL에는 접속하지 않았다. 테이블 컬럼 목록은 `SELECT *` 및 INSERT/UPDATE 필드에서 재구성한 것이며, 실제 개체명·NULL 제약은 스테이징에서 확인해야 한다.

---

## 목차

1. [기존 데이터 흐름도](#1-기존-데이터-흐름도)
2. [신규 데이터 구조 및 관계](#2-신규-데이터-구조-및-관계)
3. [API 명세](#3-api-명세)
4. [이미지 관리 구조](#4-이미지-관리-구조)
5. [저장·미리보기·발행 흐름](#5-저장미리보기발행-흐름)
6. [기존 데이터 이전 방식](#6-기존-데이터-이전-방식)
7. [운영 위험 요소](#7-운영-위험-요소)
8. [다음 구현 단계와 권장 순서](#8-다음-구현-단계와-권장-순서)

부록: [기존 테이블·계약 상세](#부록-a-기존-테이블계약-상세) · [발행 대상 구분](#부록-b-발행-대상-구분) · [인증·안전](#부록-c-인증-및-데이터-안전성) · [미확인 사항](#부록-d-미확인-사항)

---

## 1. 기존 데이터 흐름도

현재 운영 편집기에는 **초안(draft)과 발행본이 분리되어 있지 않다.**  
속성 저장은 MSSQL을 즉시 덮어쓰고, 라이브 적용은 그 시점의 DB를 HTML 파일로 굽는다. 이전 버전 복구 테이블은 없다.

### 1.1 전체 흐름

```text
[관리자 브라우저]  /homeDesign/home_setting
        │
        │ 쿠키: AviaLoginId, b2bSiteCode (기본 OY01470)
        │ tempCode 기본 AOS02
        │
        ├─ 불러오기
        │     POST /homeDesign/home_setting  mode=set | sectionSet
        │     SELECT AviaTemp.dbo.homeDatas*  (코드에 HomeDatas 대소문자 혼용)
        │     JOIN img_manager, gnbData*, sectionList, site
        │
        ├─ 표시 ON/OFF
        │     POST /common/dataChange  mode=fieldChange
        │     UPDATE AviaTemp.dbo.homeDatas SET usage=@val WHERE uid=@uid
        │     (클라이언트에서 테이블명을 넘김)
        │
        ├─ 저장 (초안 없음)
        │     POST /homeDesign/designSave  mode=sectionCardData 등
        │     UPDATE HomeDatas_set / HomeDatas_minor / HomeDatas_multi / HomeDatas_sub
        │
        ├─ 미리보기 (쓰기 없음)
        │     POST /homeDesign/previewData  mode=sectionPreview
        │     DB 행 + 미저장 폼값 덮어쓰기 → sectionList HTML 치환
        │     응답: { success, html }  → iframe srcdoc / 모달
        │
        └─ 라이브 적용 (파일 발행)
              POST /homeDesign/liveSetting  mode=liveSetting
              SELECT usage='Y' 섹션 + GNB/GFB
              렌더 → 디스크 기록
                ../../../frontPage/views/sites/{siteCode}/include/top.inc
                ../../../frontPage/views/sites/{siteCode}/include/footer.inc
                ../../../frontPage/views/sites/{siteCode}/pages/main.inc
                ../../../frontPage/public/css/{tempCode}/{sha256(siteCode)}.css
              해석: /Users/taein/Projects/AviaNext/frontPage/...
              (2026-11-02 로컬에 frontPage 폴더 없음)
```

### 1.2 사이트코드 · 페이지코드

| 식별자 | 출처 | 역할 |
|---|---|---|
| `site_code` | 쿠키 `b2bSiteCode`, 테이블 `site.site_code` | 여행사(홈페이지) 단위. 예: `OY01470`, `AOS01005` |
| `tempCode` | `tempList`, 화면 hidden, 기본 `AOS02` | 디자인 템플릿 AOS01~AOS04 |
| `HomeDatas.section` | `main` / `page` / `gnb` / `gfb` | 메인, 하위페이지, 상단, 하단 |
| 페이지 키 | `gubun=''` 인 page 행의 `gAdd`(URL 키), `gName`(표시명) | 푸터 링크 `/About/{gAdd}` |
| 하위 섹션 | 같은 `site_code`+`tempCode`+`section='page'`+`minor_num` | 페이지 헤더 행(`gubun` 공백) 아래 섹션들 |
| 섹션 유형 | `gubun` = banner, imagecard, category, multicategory, html, board, video, map, calendar, gnb, gfb | `arrTempSection` |
| 섹션 스킨 | `HomeDatas_set.section_num` + `sectionList`(tempCode, sectionCode, sectionNum) | 같은 유형 안 변형 (배너 04/07/08/09 등) |

도메인 매핑은 live `server.js`의 vhost에 하드코딩되어 있다.

| 도메인 | rootDir | siteCode | 성격 |
|---|---|---|---|
| `admin.localhost` | `./` | ADMIN | 관리자 |
| `avianext.localhost`, `avia.avn.co.kr` | `./WEBSERVICE/avianext` | OY01470 | 애비아넥스트 **마케팅 홈** (편집기 발행 대상 아님) |
| `happyadmin.avn.co.kr` | `./` | AOS01005 | 해피 관리자 |

여행사 실홈은 `frontPage/config/site.json` + `views/sites/{siteCode}` 쪽이다. `WEBSERVICE/avianext`의 `views/main/main.ejs`는 고정 마케팅 페이지이며 HomeDatas를 읽지 않는다.

### 1.3 템플릿 AOS01~AOS04와 `sectionList`

`AviaTemp.dbo.sectionList`는 템플릿별 섹션 **껍데기 HTML/CSS/JS**다.

확인된 컬럼 (코드 기준): `uid`, `tempCode`, `sectionCode`, `sectionNum`, `sectionSubject`, `sectionDesc`, `sectionData`, `sectionCss`, `sectionScript`, `status`, `sampleImg`, `swiper_name`, `up_date`.

`tempList`: `tempCode`, `tempSubject`, `tempStyle`, `wSize`, `hSize`, `introduce`, `status`, `homepageCss`, `detailCss`, `adminCss`, `commonCss`, `domesticCss`, `interlineCss`, `subCss`, `sampleImg`.

렌더러 (`handlers/homeDesign/lib/sectionRenderer.js`):

- `HERO_TEMPLATES = ['AOS02','AOS03','AOS04']` — 배너 텍스트는 usage 대신 “내용 있으면 표시”.
- `AOS01` — 별도 GNB HTML, 텍스트는 usage 플래그.
- `AOS02` 특수 분기: `banner_04`(히어로+퀵메뉴), `banner_07`(스와이퍼), `banner_08`(검색 폼), `banner_09`(퀵링크).
- 치환 토큰: `{DATA}`, `{DATA_CSS}`, `{DATA_IMG}`, `{DATA_TITLE}`, `{DATA_DESC}`, `{DATA_NAME}`, `{DATA_TAG}`, `{DATA_PRICE}`, `{DATA_MULTI_TITLE}`, `{DATA_QUICK_MENU}`, `{DATA_QUICKLINK}`, GNB/푸터 `{LOGIN}` `{TOP_LINK}` `{DATA_GFB}` 등.

관리자가 “섹션 추가” 시 배너는 기본 `section_num='04'`. 다른 스킨은 `sectionSelectSet`으로 `sectionList`에서 고른다.

### 1.4 기존 API 요청·응답 계약

공통 JSON:

```json
{ "success": "ok" | "no", "errorMsg": "", "title": "", "html": "", "uid": 0 }
```

인증은 핸들러에서 세션을 강제하지 않는다. 쿠키 `b2bSiteCode`가 없으면 `OY01470`으로 저장한다. **사이트 스코프 검증이 약하다.**

#### POST `/homeDesign/home_setting`

| mode | 역할 | 주요 입력 | 응답 |
|---|---|---|---|
| `set` | 좌측 섹션 목록·페이지 탭 HTML | `tempCode`, `sectionName`(main/page), `sectionMinor`, `sectionUid` | `html`에 섹션 리스트 |
| `sectionSet` | 우측 속성 폼 HTML | `uid` (HomeDatas.uid) | 설정+카드 폼 |

#### POST `/homeDesign/designSave`

| mode | 쓰기 대상 |
|---|---|
| `sectionAdd` | HomeDatas INSERT + set/minor (+ banner면 sub 8건, multicategory면 multi 1건) |
| `sectionSortSave` | `sectionListValue` = `section_{uid}/...` → sorting 1..n |
| `pageAdd` | page 헤더 행. `page_url`/`gAdd`는 `arrCompany` 키. 중복 불가 |
| `pageAddCheck` | 미사용 페이지 옵션 HTML |
| `pageDelete` | 하위 섹션 있으면 거부 |
| `sectionCardData` | set UPDATE + minor 루프 UPDATE + banner 퀵메뉴 MERGE + multi subExpose |
| `sectionCardAdd` / `sectionCardDelete` | minor 행 |
| `sectionDelete` | sub, minor, set, multi, HomeDatas 연쇄 DELETE |
| `multiCardNameModify` / `sectionMultiCardAdd` / `sectionMultiCardNameDelete` | 멀티탭 |
| `sectionSelectSet` | `HomeDatas_set.section_num` |
| `sectionPreview` | **레거시.** 로컬 Template `.inc` 파일 읽기. 실제 미리보기는 `previewData` |
| `input`/`modify`/`save` | tempList 템플릿 메타 (편집기 본선 아님) |

`sectionCardData` minor 필드 키 규칙: `{field}_{uid_minor}_{minor_num}`  
예: `text1_1001_1`, `img_pc_1001_1`. 배열 `aUid[]` = `"uid_minor_minor_num"`.

#### POST `/homeDesign/previewData`

| mode | 읽기 | 쓰기 |
|---|---|---|
| `sectionPreview` | sectionList + set + minor + img_manager (+ multi, board면 site/site_account) | 없음. POST 폼으로 메모리만 덮음 |
| `mainmenuPreview` + `modeType=gnb\|gfb` | GNB/푸터 템플릿 미리보기 | 없음 |

미리보기 이미지 크기 접미사 `_M`. 라이브는 `_B`.

#### POST `/homeDesign/liveSetting`

| mode | 효과 |
|---|---|
| `liveSetting` | 파일 4종 덮어쓰기. 하위 페이지 `pages/{gAdd}.inc`는 **현재 코드에 없음** (메인은 `main.inc`만) |
| `sectionPreview` / `mainmenuPreview` | liveSetting.js 안에 남아 있는 구 미리보기 (실사용은 previewData) |

실패 시 이미 쓴 `top.inc`를 롤백하지 않는다. 트랜잭션·백업 파일이 없다.

#### POST `/common/dataChange`

클라이언트 지정 `table`/`field`로 UPDATE 또는 DELETE. 화이트리스트 없음. 신규 API에서 **재현 금지**.

---

## 2. 신규 데이터 구조 및 관계

목표: **사이트별로 홈페이지를 독립 관리**하고, **초안과 발행본을 분리**한다.  
저장소는 구현 단계에서 정한다. 권장: admin-site D1/SQLite 또는 전용 Postgres **스테이징**. 운영 MSSQL `HomeDatas*`는 읽기 전용 원본으로만 쓴다.

3단계 React 타입(`admin-site/lib/admin/home-design/types.ts`)은 화면용 뷰 모델이다. 아래는 서버 원본 모델이다. 화면은 계속 기존 필드명을 보여줄 수 있다.

### 2.1 관계

```text
HomeSite (site_code) 1 ── * HomePage
HomeSite            1 ── * HomeMedia
HomePage            1 ── * HomeSection          (초안 트리, page 소속)
HomeSection         1 ── 1 HomeSectionProps     (유형별 JSON)
HomeSection         1 ── * HomeSectionItem      (카드/슬라이드/탭)
HomePage            1 ── * HomeDraft            (저장 스냅샷)
HomePage            1 ── * HomePublishedVersion (발행 스냅샷)
HomePublishedVersion 1 ── * HomePublishLog
HomeSectionItem     * ── 0..1 HomeMedia         (PC/모바일 이미지)
```

사이트 단위로 페이지·미디어·발행이 갈라진다. `OY01470` 초안을 저장해도 `AOS01005`에 영향을 주지 않는다.

### 2.2 엔티티

#### HomeSite

| 필드 | 설명 | live 대응 |
|---|---|---|
| `site_code` | PK. 기존 코드 유지 | `site.site_code`, `HomeDatas.site_code` |
| `siteName` | 표시명 | `site.site_name` |
| `tempCode` | 현재 템플릿. 기본 AOS02 | `HomeDatas.tempCode`, vhost `tplCode` |
| `domains[]` | 공개 호스트 | `site.TempDomain`, frontPage `site.json` |
| `status` | `active` / `paused` | 없음 (신규) |
| `updatedAt`, `updatedBy` | 감사 | `up_date`만 부분 존재 |

#### HomePage

| 필드 | 설명 | live 대응 |
|---|---|---|
| `id` | 신규 UUID | page 헤더 행 `HomeDatas.uid` (`section=page`, `gubun` 공백) |
| `site_code` | 소속 | 동일 |
| `pageKey` | URL 키. 메인은 `main` | `gAdd` 또는 `main` |
| `name` | 탭 이름 | `gName` |
| `kind` | `main` / `sub` | `section` main/page |
| `sortOrder` | 탭 순서 | page 헤더 `sorting` / `minor_num` |
| `legacyMinorNum` | 이전용 | page 그룹 `minor_num` |

#### HomeSection

| 필드 | 설명 | live 대응 |
|---|---|---|
| `id` | UUID | `HomeDatas.uid` |
| `pageId` | 소속 페이지 | main이면 가상 메인 페이지 |
| `type` | 섹션 유형 | `gubun` |
| `skinCode` | `04` 등 | `HomeDatas_set.section_num` |
| `name` | 목록 이름 | `gName` |
| `enabled` | boolean | `usage` (`Y` / 공백·`N`) |
| `sortOrder` | 순서 | `sorting` |
| `legacyUid` | 이전 키 | `HomeDatas.uid` |

유형: 3단계와 동일 9종 + 장기 `gnb`, `gfb` (이번 편집기 범위 밖, 발행 시 필요).

#### HomeSectionProps

유형별 JSON. live `_set` + 일부 `_minor` 공통값을 한곳으로 모은다.

공통: `titlesUsage`, `titles`, `titlesDesc`, `margin{Left,Right,Top,Bottom}`, `heightPc`, `heightMob`, `slideTime`, `slideLoop`, `slideUsage`, `productExpose`(`A`/`M`/off), `productExposeCate`, `align`.

유형 예:

- banner: `quickMenus[8]` (emoji, menus, links, mediaId)
- html: `html` ← `text_data1`
- video: `videoUrl`
- map: `address`
- board: `boardName`, 치환은 발행 시 `site`에서
- multicategory: `tabs[]` ← `HomeDatas_multi`

`align`은 live `_set`에 없고 3단계 샘플에만 있다 → **transform (신규 전용, 내보내기 시 무시)**.

#### HomeSectionItem (카드)

live `HomeDatas_minor`. `legacyMinorNum` 유지.

호환 필드: `text1..8`, `text*_color`, `text*_px`, `text*_usage`, `text*_position`, `text_position`, `text_bgcolor`, `card_link`, `card_new_window`, `card_type`, `category1..3`, `minor_subject`, `minor_desc`, `minor_price`, `btn1_text/link`, `btn2_text/link`, `text_data1`, `usage`, `sub_minor`.

transform: `image_pc`/`image_mob` int uid → `mediaIdPc`/`mediaIdMob`.  
3단계 `imagePcId` 프리셋 문자열은 서버에서 사용하지 않는다.

#### HomeMedia

§4. live `img_manager.uid`는 `legacyUid`로 보관.

#### HomeDraft

페이지(또는 사이트) 단위 작업본.

| 필드 | 설명 |
|---|---|
| `id` | UUID |
| `site_code`, `pageId` | 범위 |
| `payload` | 페이지 트리 JSON (섹션+속성+아이템) |
| `revision` | 초안 번호 |
| `status` | `editing` / `saved` |
| `updatedAt`, `updatedBy` | 필수 (live에 수정자 없음) |

저장 버튼은 **이 레코드만** 갱신한다. 공개 홈과 `HomeDatas*`는 바꾸지 않는다.

#### HomePublishedVersion

| 필드 | 설명 |
|---|---|
| `id` | UUID |
| `site_code` | 사이트 |
| `version` | 사이트 전역 증가 정수 |
| `payload` | 해당 시점 전체 사이트 트리 (main+sub+gnb/gfb 요약) |
| `renderer` | `website-json` / `frontpage-html` (병행 시) |
| `status` | `active` / `superseded` / `failed` |
| `publishedAt`, `publishedBy` | 필수 |
| `note` | 메모 |

공개 `website`는 `status=active`만 읽는다. 복구는 이전 버전 payload를 새 초안으로 복사한 뒤 재발행한다. 운영 파일을 직접 되돌리지 않는다.

#### HomePublishLog

시도마다 1행: `versionId`, `actor`, `startedAt`, `finishedAt`, `result`(`ok`/`error`), `targets[]`(website cache, 선택적 frontPage 경로), `errorMessage`.  
라이브의 “파일만 쓰고 DB 이력 없음”을 여기서 보완한다.

### 2.3 호환 vs 변환

**그대로 매핑 (compatible)**

- `site_code`, `tempCode`, `uid`→`legacyUid`, `gubun`→`type`, `gName`→`name`
- `usage` ↔ `enabled` (`Y`↔true, 그 외 false)
- `sorting` ↔ `sortOrder`
- `_set`의 titles/margin/height/slide/productExpose*
- `_minor` 텍스트·링크·카테고리·HTML 본문
- `_multi.multi_name/multi_desc/minor_num/subExpose`
- `_sub` 퀵메뉴 8칸

**변환 필요 (transform)**

| live | 신규 | 규칙 |
|---|---|---|
| page 헤더 행 + `minor_num` 그룹 | `HomePage` | `gubun` 공백 행이 페이지, 같은 `minor_num`의 gubun 있는 행이 섹션 |
| `image_pc` int | `mediaId` | img_manager 조인 후 URL 생성. 실패 시 null |
| 프리셋 id (3단계 샘플) | media | 운영 이전 시 폐기 |
| `align` | props.align | live에 없음. import 기본 `center` |
| `video_url`, `map_address`, `board_name` (3단계) | props | live는 `text*`/`text_data1`에 섞여 있을 수 있음. import 시 gubun별 휴리스틱 |
| 파일 발행 HTML | `payload` JSON | 재렌더. HTML 역파싱 하지 않음 |
| 수정자 없음 | `updatedBy` | import 시 `migration` |
| 초안 없음 | Draft=현재 HomeDatas 스냅샷 | 1회 복사 |

**신규만 (live 없음)**

- 발행 버전, 이력, draft revision, 사이트 `status`, 도메인 배열, 캐시 키.

**의도적으로 1차 범위 밖**

- GNB/GFB 편집, 팝업, 라인배너, TinyMCE 외 템플릿 CSS(`tempList.homepageCss`) 직접 편집, 상품 자동노출 실데이터(`productExpose`+Products 조인).

---

## 3. API 명세

기본 경로: `admin-site`  
관리자: `/api/admin/home-design/*`  
공개(website): `/api/public/home-design/*`

구현 전 계약이다. 지금은 라우트가 없다.  
운영 MSSQL UPDATE를 이 API에 연결하지 않는다.

### 3.1 공통

- Content-Type: `application/json` (업로드만 multipart).
- 성공: `{ "ok": true, "data": ... }`
- 실패: `{ "ok": false, "error": { "code": "UNAUTHORIZED"|"FORBIDDEN"|"NOT_FOUND"|"VALIDATION"|"CONFLICT"|"STALE_DRAFT"|"PUBLISH_FAILED"|"NOT_IMPLEMENTED", "message": "한국어" } }`
- 관리자 API: 로그인 + 해당 `site_code` 권한. 마스터만 타 사이트.
- 공개 API: 인증 없음. **active 발행본만.** `?preview=1`은 미리보기 토큰 + 관리자 세션.
- 샘플 모드(현재 3단계): 모든 쓰기 API는 `NOT_IMPLEMENTED` 또는 로컬 메모리. 응답 헤더 `X-Home-Design-Mode: sample`.

### 3.2 사이트 목록

`GET /api/admin/home-design/sites`

응답:

```json
{
  "ok": true,
  "data": {
    "sites": [
      { "site_code": "OY01470", "siteName": "애비아넥스트", "tempCode": "AOS02", "domains": ["avianext.example"], "pageCount": 2 }
    ]
  }
}
```

권한: 마스터는 전체, 사이트 관리자는 자기 `site_code`만.

### 3.3 페이지 목록

`GET /api/admin/home-design/sites/:siteCode/pages`

응답: `{ pages: [{ id, pageKey, name, kind, sortOrder, sectionCount, draftRevision, publishedVersion }] }`

메인은 항상 `pageKey=main`으로 포함한다. live에 메인 헤더 행이 없어도 가상 페이지를 만든다.

### 3.4 섹션 목록·상세

`GET /api/admin/home-design/sites/:siteCode/pages/:pageId`

쿼리: `source=draft|published` (기본 draft)

응답: 페이지 + `sections[]` (props, items, 미디어 URL). 3단계 `HomeDesignPage`와 같은 모양으로 내려 화면 교체를 줄인다.

`GET /api/admin/home-design/sections/:sectionId` — 우측 패널용 단건.

### 3.5 초안 저장

`PUT /api/admin/home-design/sites/:siteCode/pages/:pageId/draft`

요청:

```json
{
  "revision": 3,
  "sections": [ { "id": "...", "type": "banner", "enabled": true, "sortOrder": 1, "props": {}, "items": [] } ]
}
```

- `revision` 불일치 → `STALE_DRAFT` (다른 탭 저장).
- 서버는 payload 검증(유형, 필수 텍스트, HTML sanitize) 후 Draft upsert.
- **HomeDatas UPDATE 없음. frontPage 쓰기 없음.**

섹션 단위 보조:

| 메서드 | 경로 | 대응 live mode |
|---|---|---|
| POST | `.../sections` | sectionAdd |
| PATCH | `.../sections/:id` | sectionCardData 일부 |
| DELETE | `.../sections/:id` | sectionDelete |
| POST | `.../sections/reorder` | `{ ids: [] }` → sectionSortSave |
| PATCH | `.../sections/:id/enabled` | usage (dataChange 대체) |

모두 draft만 변경.

### 3.6 미리보기

`POST /api/admin/home-design/preview`

요청: `{ site_code, pageId, viewport: "pc"|"mobile", sectionId?, overrides? }`  
`overrides`는 미저장 폼. live `applyPostedPreviewValues`와 같다.

응답 선택 (구현 시 하나 확정, 병행 가능):

1. **권장:** `{ tree: HomeDesignPage }` — React `PreviewCanvas`가 그림 (3단계와 동일).
2. 호환: `{ html }` — sectionList 치환. 스테이징에서만. 운영 live 핸들러 호출 금지.

미리보기는 발행·캐시를 건드리지 않는다.

`GET /api/public/home-design/preview/:token` — 만료 있는 초안 토큰. website가 `?preview=`로 같은 트리 렌더.

### 3.7 이미지 업로드·선택

`GET /api/admin/home-design/sites/:siteCode/media?folderId=&q=&page=`

`POST /api/admin/home-design/sites/:siteCode/media` multipart `file` + `folderId`  
응답: `{ id, urlPc, urlMob, urlThumb, width, height }`  
저장: 객체 스토리지 + HomeMedia. 운영 `img_manager` INSERT는 하지 않음.

`POST .../media/import-live` (나중, 스테이징) — live uid → HomeMedia 복사. 운영 업로드 경로에 쓰기 금지.

### 3.8 버전 발행

`POST /api/admin/home-design/sites/:siteCode/publish`

```json
{ "draftRevision": 3, "note": "메인 배너 교체", "targets": ["website"] }
```

서버:

1. 초안 검증, revision 확인.
2. 새 `HomePublishedVersion` (status 임시 `publishing` 가능).
3. website 캐시 키 갱신 (`home-design:{site_code}:active`).
4. 성공 시 이전 active → `superseded`. 실패 시 새 버전 `failed`, **기존 active 유지**.
5. `targets`에 `frontpage`가 있어도 **기본 거부.** 명시 플래그 + 스테이징 경로만.

응답: `{ version, publishedAt }`

### 3.9 이전 버전 복구

`POST /api/admin/home-design/sites/:siteCode/versions/:version/restore`

- 해당 payload를 **새 draft**로 복사. 즉시 공개 교체 없음.
- 공개 반영은 관리자가 다시 publish.
- `GET .../versions` 목록: version, publishedAt, publishedBy, note, status.

live에는 없는 기능이다. frontPage 파일을 직접 되돌리지 않는다.

### 3.10 오류·권한 요약

| 상황 | 코드 | HTTP |
|---|---|---|
| 미로그인 | UNAUTHORIZED | 401 |
| 타 사이트 | FORBIDDEN | 403 |
| 없는 페이지 | NOT_FOUND | 404 |
| revision 충돌 | STALE_DRAFT | 409 |
| 발행 중 렌더 실패 | PUBLISH_FAILED | 500, 이전 발행본 유지 |
| 샘플 모드 쓰기 | NOT_IMPLEMENTED | 501 |

GNB/팝업/실홈 파일 API는 이 목록에 넣지 않는다.

---

## 4. 이미지 관리 구조

### 4.1 기존 (`img_manager`)

관련 테이블: `img_group` (사이트별 폴더 depth1~3), `img_manager`.

코드상 컬럼: `uid`, `uid_minor`(폴더), `siteCode`, `file_name`, `file_ext`, `file_folder`, `file_size`(KB), `intro`, `up_date`.

업로드 (`handlers/imgManage/imageSave.js`):

1. 사이트코드 AES 폴더명, 년월 AES 하위 폴더.
2. sharp → WebP `_B`(최대 1400, 배너는 1920), `_M`(400), `_S`(150).
3. NCloud Object Storage `ImgManage/{siteFolder}/{dateFolder}/{name}_{B|M|S}.ext`
4. CDN: `bbsImgName` = `https://avia.gcdn.ntruss.com`
5. 미리보기 `_M`, 라이브 `_B`, 퀵메뉴 `_S`

HomeDatas_minor는 파일 경로가 아니라 **uid**만 가진다. 조인 실패 시 `/images/blank.gif`.

로고/파비콘은 `site_seo.logo_top/bottom/favicon` + 사이트 폴더 해시.

### 4.2 신규

```text
관리자 업로드 → HomeMedia (사이트 스코프) → CDN URL
섹션 아이템은 mediaId만 참조
website는 발행 payload에 포함된 절대 URL만 사용
```

권장 버킷 prefix: `home-design/{site_code}/{yyyy}/{mm}/{mediaId}/{variant}`  
variant: `original`, `pc`, `mobile`, `thumb`.

정책:

- 사이트 간 미디어 공유 없음 (live `siteCode`와 동일).
- 삭제 시 참조 중이면 거부하거나 soft-delete.
- 운영 `img_manager`에 신규 업로드를 섞지 않음. import는 읽기+복사.
- 3단계 색상 프리셋은 개발용. 연동 후 제거.

PC/모바일: 아이템에 `mediaIdPc`, `mediaIdMob`. 모바일이 비면 PC를 쓴다. CSS/뷰포트는 website와 미리보기 캔버스가 담당.

---

## 5. 저장·미리보기·발행 흐름

### 5.1 목표 흐름 (초안 ≠ 발행)

```text
[편집] 속성 변경
   │
   ├─ 미리보기 ── POST /preview (overrides, DB 미기록)
   │                 admin-site PreviewCanvas 또는 website ?preview=
   │
   ├─ 초안 저장 ── PUT /draft  → HomeDraft만
   │
   └─ 라이브 적용 ── POST /publish
          │
          ├─ 검증 실패 → 중단, 공개본 불변
          ├─ website 캐시에 새 version 기록
          ├─ 이전 active 유지하다가 swap
          └─ 실패 시 failed 로그, 기존 발행본 유지
```

live와의 차이: 저장이 곧 실데이터가 아니고, 발행이 곧 파일 덮어쓰기가 아니다.

### 5.2 website가 읽는 방식

권장:

1. 요청 Host → `HomeSite.domains` → `site_code`.
2. `GET /api/public/home-design/by-host?host=` 또는 빌드 시 사이트맵.
3. `active` payload JSON.
4. 페이지: `/` → `main`, `/p/{pageKey}` 또는 `/about/{pageKey}` (live `/About/{gAdd}`와 매핑표 유지).
5. 섹션 유형별 React 컴포넌트. 1차 범위는 9종. GNB/푸터는 기존 website 헤더이거나 발행 payload의 gnb 스냅샷.
6. `viewport`: CSS. 이미지 srcset pc/mobile.
7. `?preview=token`이면 초안. 인덱스하지 않음. noindex.
8. 캐시: `home-design:{site_code}:v{n}`. 발행 성공 시에만 포인터 `active`를 n으로.
9. 공개 API 오류/타임아웃 시 **마지막 성공 JSON 스냅샷**(로컬/KV)을 렌더. 빈 화면으로 바꾸지 않음.

### 5.3 발행 시 캐시

- swap은 포인터 원자적 교체.
- HTML 파일을 여러 개 순차 기록하던 live 방식은 사용하지 않음 (`top.inc` 기록 후 `main.inc` 실패 가능).
- CDN 캐시가 있으면 publish 후 purge. 실패해도 origin의 active 포인터가 진실.

---

## 6. 기존 데이터 이전 방식

운영 HomeDatas를 UPDATE하지 않는다. **읽기 → 변환 → 신규 Draft/Version 적재.**

### 6.1 1회 마이그레이션 (스테이징)

1. 스테이징 MSSQL 또는 승인된 SELECT만으로 사이트 1곳 dump.
2. Mapper:
   - HomeDatas 행을 page/section으로 분리 (`section`, `gubun`, `minor_num`).
   - `_set`/`_minor`/`_multi`/`_sub` 조인.
   - img_manager uid → URL 생성 → HomeMedia.legacyUid.
3. `HomeDraft` revision 1 = dump 결과.
4. `HomePublishedVersion` v1 = 같은 payload, `renderer=website-json`. **이 시점에 website 공개 전환하지 않음.**
5. 관리자가 3단계 편집기에서 dump를 열어 live 화면과 섹션 수·텍스트·이미지 URL을 대조.
6. 불일치 목록을 고친 뒤에만 다음 사이트.

### 6.2 필드 매핑 표 (요약)

| live | 신규 |
|---|---|
| HomeDatas (main, gubun≠'') | HomeSection of page `main` |
| HomeDatas (page, gubun='') | HomePage |
| HomeDatas (page, gubun≠'', same minor_num) | 해당 HomePage의 HomeSection |
| HomeDatas (gnb/gfb) | 1차 스킵, 발행 시 기존 헤더 유지 |
| HomeDatas_set | HomeSectionProps |
| HomeDatas_minor | HomeSectionItem |
| HomeDatas_multi | props.tabs |
| HomeDatas_sub | props.quickMenus |
| img_manager | HomeMedia |
| sectionList | 렌더러 스킨 카탈로그 (복사 또는 코드화) |
| tempList | HomeSite.tempCode |

### 6.3 병행 기간

- live 편집기 계속 운영 원본.
- admin-site는 dump 이후 **분기된 초안**. 양방향 동기화는 하지 않음 (충돌).
- 재import가 필요하면 live dump로 draft를 덮을지 사용자 확인.
- HomeDatas로 다시 export(dual-write)는 검증용 스테이징만. 운영 금지.

### 6.4 컷오버 조건 (이후 단계)

- 동일 site_code에서 섹션 수, 사용 ON 목록, 주요 텍스트, 이미지 URL이 live 미리보기와 일치.
- website가 발행 JSON으로 메인을 그릴 수 있음.
- 롤백: website 포인터를 이전 version으로. live 파일/DB는 손대지 않으면 live 실홈은 그대로.

---

## 7. 운영 위험 요소

1. **저장=즉시 운영 데이터.** live `designSave`/`dataChange`는 초안이 없다. admin-site 쓰기를 이 핸들러에 연결하면 실홈 원본이 바뀐다.
2. **`dataChange` 임의 테이블 UPDATE.** 신규에서 금지.
3. **쿠키만으로 site_code.** 누락 시 `OY01470`에 저장. 신규는 세션의 site_code만 신뢰.
4. **라이브 적용 부분 실패.** `top.inc` 기록 후 본문 실패 가능. 롤백 없음.
5. **로컬에 frontPage 없음.** 경로만 있고 검증 불가. 잘못된 발행은 운영 디스크를 겨냥할 수 있다.
6. **WEBSERVICE/avianext ≠ 여행사 실홈.** 여기로 발행하면 마케팅 사이트만 건드리고 실홈은 안 바뀐다. 반대로 착각하면 실홈을 놓친다.
7. **website는 현재 AOS 마케팅/가입 홈.** HomeDatas 소비 없음. 성급히 메인 페이지를 섹션 렌더러로 바꾸면 기존 3002 화면이 사라진다. 여행사 테넌트 라우트(예: `/s/{site_code}` 또는 별도 도메인)로 분리할 것.
8. **이미지 계정·버킷.** 운영 Object Storage에 테스트 업로드 금지.
9. **테이블명 대소문자** `homeDatas` vs `HomeDatas`. collation에 따라 스테이징에서 확인.
10. **`arrCompany` 페이지 키.** `designSave`가 `@utils/airConst`의 `arrCompany`를 쓰지만 현재 `airConst.js` export에 없음. 하위 페이지 이전이 불완전할 수 있다.
11. **상품 조인.** live 발행 SQL이 `Products`/`Products_costData`를 붙인다. 신규 1차는 저장된 카드 텍스트만. 가격 불일치 가능.
12. **HTML `text_data1` XSS.** 미리보기/website는 sanitize. live는 TinyMCE HTML을 그대로 넣음.
13. **자격 증명.** MSSQL 접속 정보가 `common/lib/config.js`에 있다. admin-site에 복사하지 말 것. 읽기 전용 계정·스테이징만.
14. **미커밋 live 편집기.** 로컬 백업 `aos-admin-live-editor-20261102-1447`이 원본 UI. Git 원격 조회 실패.
15. **포트 3001 충돌.** live와 admin-site. 검증 시 live만 `PORT=` 지정.

---

## 8. 다음 구현 단계와 권장 순서

구현은 이 문서 검토 후 별도 요청으로 진행한다. 아래는 권장 순서다.

### 5단계 — 계약 코드화 (쓰기 없음)

- `types.ts`를 이 문서 엔티티에 맞게 확장 (Draft, Version, Media). 화면 샘플 동작 유지.
- HomeDatas → 신규 payload **순수 함수 mapper** + 픽스처(익명화된 JSON). MSSQL 연결 없음.
- API 라우트는 `501` + 샘플 데이터 반환만 가능.

### 6단계 — 초안 저장소 (비운영)

- admin-site D1 또는 로컬 JSON 파일에 Draft 저장.
- 저장 버튼 활성화, 문구를 “초안 저장 (샘플/스테이징)”으로.
- 여전히 운영 DB·frontPage·website 메인 미변경.

### 7단계 — 읽기 전용 live 대조 (스테이징 SELECT만)

- 읽기 전용 계정, IP 제한, 사이트 1곳.
- mapper 결과를 편집기에 로드. live 스크린샷/미리보기와 비교표.
- UPDATE/liveSetting 호출 금지.

### 8단계 — website 테넌트 렌더러

- `website`에 **별도 경로**로 발행 JSON 렌더 (`/s/[siteCode]` 또는 개발 호스트).
- 기존 `/`, `/seller`, `/partnership`, `/domestic`는 유지.
- 초안 미리보기 토큰.
- 캐시 포인터 + 실패 시 이전 JSON.

### 9단계 — 이미지

- 전용 prefix 업로드.
- live 이미지 URL은 CDN 읽기 전용 참조 가능. img_manager INSERT 없음.

### 10단계 — 발행·복구

- publish/restore API.
- 모니터링(로그).
- `frontpage` 타깃은 기본 꺼짐.

### 11단계 — 컷오버 준비

- 사이트 단위 병행 확인.
- live 메뉴 숨김은 그 다음. 핸들러 삭제는 더 뒤.
- 운영 HomeDatas 쓰기는 하지 않는 것을 기본값으로 유지할지 별도 결정.

---

## 부록 A. 기존 테이블·계약 상세

스키마 prefix: `deps.hubTemp` = `AviaTemp.dbo.`  
`img_manager`, `site`, `site_account`, `site_seo`는 prefix 없이 사용.

### HomeDatas (코드에서 homeDatas 혼용)

INSERT 필드: `uid`, `site_code`, `tempCode`, `section`, `gubun`, `minor_num`, `minor_num2`, `gName`, `gAdd`, `usage`, `sorting`, `up_date`.

의미:

- `section=main` + `gubun` = 메인 섹션. `minor_num`은 유형별 일련.
- `section=page` + `gubun` 공백 = 페이지 탭. `gAdd`=URL, `minor_num`=페이지 그룹.
- `section=page` + `gubun` 있음 = 그 페이지의 섹션. `minor_num2`로 페이지 내 순서.
- `section=gnb|gfb` — 상·하단. liveSetting은 `usage='Y' OR section in ('gnb','gfb')`.

### HomeDatas_set

`uid`, `uid_minor`(=HomeDatas.uid), `titles_usage`, `titles`, `titles_desc`, 네 방향 margin, `section_height_pc/mob`, `slide_time/loop/usage`, `productExpose`, `productExposeCate`, `section_num`.

### HomeDatas_minor

`uid_minor`, `sub_minor`, `minor_num`, `image_pc`, `image_mob`, `category1..3`, `card_type`, `card_link`, `card_new_window`, `text1..8`, 색/px/usage/position, `text_position`, `text_bgcolor`, `usage`, `minor_subject/desc/price`, `text_data1`, `btn1/2_text/link`, `up_date`.

### HomeDatas_multi

`uid_minor`, `minor_num`, `multi_name`, `multi_desc`, `subExpose`.

### HomeDatas_sub

`uid_minor`, `minor_num`(1~8), `emoji`, `menus`, `links`, `imgUid`.

### 요청 필드 키 (sectionCardData)

`titles_*`, margin, height, slide_*, productExpose*, `quick_{emoji|menus|links|imgUid}_{uid_minor}_{1..8}`, `aUid[]`, `img_pc_*`, `img_mob_*`, `text*_*`, `usage_*`, `text_data1_*` 등.

---

## 부록 B. 발행 대상 구분

| 대상 | 현재 역할 | 편집기 발행 | 장기 |
|---|---|---|---|
| `frontPage` (`../frontPage/views/sites/{siteCode}`) | live `liveSetting`이 쓰는 **실홈 파일 트리**. 로컬 미존재 | **현재 실제 발행 대상** | 유지할지 사이트 단위로 결정. 신규 기본 경로는 아님 |
| `WEBSERVICE/avianext` | 애비아넥스트 회사/구독 마케팅 EJS | 대상 아님 | 대상 아님 |
| `website` (3002) | AOS 플랫폼 공개 홈, 제휴·판매점 가입, 국내여행 샘플 | **현재 미연동** | **여행사 테넌트 홈의 목표 렌더러.** 기존 마케팅 라우트와 분리 |

권장 문장:  
**지금은 운영 실홈 = frontPage 파일. 신규 설계의 진실 원본 = 발행 JSON. website는 그 JSON을 그리는 쪽. avianext 마케팅 사이트는 건드리지 않는다.**

---

## 부록 C. 인증 및 데이터 안전성

### 기존 live 로그인

- `POST /login_check`
- `tblManager` (본사/관리자) 또는 `site_manager` (사이트)
- 비밀번호 SHA-256 비교
- express-session `aviasid` + 쿠키 `AviaLoginId` / `b2bSiteLoginId`, `b2bSiteCode`, `b2bMASTER`, `aviaAuthorizedKey`
- 디자인 핸들러는 이 쿠키를 읽지만 **미로그인 차단이 약하고**, site_code 기본값이 타사 데이터로 떨어질 수 있다.
- `b2bMASTER==='Y'`만 섹션 템플릿 수정 UI가 보인다.

### 신규 admin-site

- 홈 디자인 전용 인증 없음. 대시보드·판매점은 프로토타입/세션 목.
- D1 스키마는 스탬프투어 중심. HomeDatas 없음.
- 설계: 관리자 세션에 `userId`, `role`(`master`/`site_admin`), `allowedSiteCodes[]`.
- 홈 디자인 쓰기는 `site_admin`이 자기 사이트, `master`는 선택 사이트.
- website 공개 GET은 인증 없음, active만.

### 서버 측 접근

```text
브라우저 → admin-site Route Handler
              ├─ 세션 검사
              ├─ Draft/Version: D1 또는 스테이징 DB
              ├─ Media: 전용 버킷
              └─ (옵션, 7단계+) MSSQL SELECT only, 읽기 전용 계정
website → 공개 GET active JSON (캐시)
```

운영 MSSQL 연결 문자열을 브라우저·website 워커에 넣지 않는다.

### 계정·환경

| 환경 | DB | 권한 | 발행 |
|---|---|---|---|
| 로컬 샘플 (현재) | 없음 | — | 불가 |
| 스테이징 | HomeDatas 복사본 또는 dump JSON | SELECT. UPDATE는 스테이징 스키마만 | website 개발 호스트만 |
| 운영 읽기 | 운영 MSSQL | SELECT, 홈 관련 뷰만, 앱 계정 ≠ sa | 없음 |
| 운영 쓰기 | **하지 않음 (기본값)** | — | website JSON 포인터만, 별도 승인 |

### 운영 데이터 변경 방지

- admin-site에서 `designSave`/`liveSetting`/`dataChange` 프록시 금지.
- publish `targets` 기본 `["website"]`. `frontpage`는 환경변수 + 명시 요청.
- CI/프로덕션 빌드에 `common/lib/config.js`의 운영 비밀번호를 넣지 않음.
- 샘플 모드 헤더가 켜져 있으면 실제 publish 거부.
- Git reset/clean, live 수정, website 마케팅 라우트 삭제 금지 (기존 작업 규칙).

---

## 부록 D. 미확인 사항

운영 DB에 접속하지 않아 아래는 미확인이다.

1. `HomeDatas` 실제 개체명·PK·NULL·인덱스.
2. 운영 사이트의 `tempCode`가 모두 AOS02인지, AOS01/03/04 사용 여부.
3. `sectionList`에 템플릿별 몇 개의 `sectionNum`이 있는지.
4. `frontPage` 배포 위치, `site.json` 내용, 실홈이 파일을 어떻게 include 하는지.
5. 하위 페이지 HTML을 다른 배치가 생성하는지 (liveSetting은 main만 기록).
6. `arrCompany` 키 목록과 `/About/{gAdd}` 실제 라우팅.
7. 스테이징 MSSQL 복사본 존재 여부.
8. NCloud 버킷에 `home-design/` prefix 추가 가능 여부.
9. admin-site 관리자 로그인 일정의 확정 스펙.
10. 상품 자동노출을 1차 렌더러에 넣을지.

---

## 이번 단계에서 하지 않은 것

- `aos-admin-live` 파일 수정 없음.
- 운영 MSSQL 연결·SELECT/UPDATE 없음.
- `website` 코드 수정 없음.
- `admin-site` 편집기/API 구현 없음 (3단계 샘플 유지).
- frontPage 발행, 배포, git reset/clean, 커밋 없음.
- 기존 미커밋 변경 유지.

검토 후 구현 단계(위 8장 5단계부터)를 따로 진행한다.
