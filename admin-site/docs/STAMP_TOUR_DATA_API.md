# 스탬프투어 공통 데이터 및 API

## 데이터 관계

`stamp_tours`는 `tour_code`로 외부에 노출되는 투어를 식별한다. 한 투어는 여러 `tour_spots`, `tour_participants`, `tier_rewards`를 가진다.

- `tour_spots`: 투어별 관광지. `(tour_id, spot_code)`가 고유하다.
- `spot_qrs`: 관광지 QR. 원본 관광지 ID 대신 무작위 토큰의 SHA-256 해시만 저장한다. QR 발급 응답에서 원문 토큰은 한 번만 반환한다.
- `tour_participants`: `(tour_id, phone_lookup_hash)`가 고유하다. 전화번호 조회에는 HMAC 해시, 복호화가 필요한 업무에는 AES-256-GCM 암호문을 사용한다.
- `participation_consents`: 약관·개인정보·위치정보·마케팅 동의 버전과 보관 만료일을 기록한다.
- `visit_verifications`: 성공·실패·취소, 실패 사유, QR, 위치 결과, 거리, 위치정보 만료일을 기록한다. 성공 이력은 참여자와 관광지 조합당 하나만 허용한다.
- `tier_rewards`: 3곳·4곳·5곳처럼 달성 관광지 수별 경품과 재고를 관리한다.
- `reward_applications`: 참여자당 하나만 허용해 신청 후 상위 경품 변경을 막는다. DB 트리거가 접수 시 재고를 차감하고 취소·반려 시 복구한다.
- `reward_process_history`: 경품 상태 변경 주체와 사유를 기록한다.

관리자가 성공 인증을 취소하면 해당 인증은 `CANCELLED`로 보존되고 참여자의 인증 수와 달성 경품 단계가 다시 계산된다.

## 사용자 API

기준 경로는 `/api/tour/{tourCode}`다. 성공 응답은 `{ "data": ... }`, 오류는 `{ "error": { "code", "message", "details?" } }` 형식이다.

| 메서드 | 경로 | 용도 |
| --- | --- | --- |
| GET | `/` | 공개 투어 정보 |
| GET | `/spots` | 공개 관광지 목록 |
| GET | `/spots/{spotCode}` | 관광지 상세 |
| POST | `/qr/verify` | QR 토큰 유효성 확인 |
| GET | `/api/tour/qr/{qrToken}` | QR 진입 전 토큰·투어·관광지 공개 정보 확인 |
| POST | `/phone-auth/request` | 휴대전화 인증 요청 |
| POST | `/phone-auth/confirm` | 인증번호 확인 및 참여용 증명 발급 |
| POST | `/participants` | 참여 등록 및 참여자 토큰 발급 |
| POST | `/visits` | QR·위치 방문 인증 |
| GET | `/me/progress` | 내 진행 현황 |
| GET | `/me/verifications` | 내 인증 이력 |
| GET | `/me/rewards` | 경품과 신청 가능 여부 |
| GET, POST | `/me/reward-application` | 신청 현황 조회·경품 신청 |
| PATCH | `/me/reward-application/shipping` | 발송 전 배송지 수정 |

`/me/**` 및 `/visits`는 참여 등록 응답의 토큰을 `Authorization: Bearer {participantToken}`으로 전달한다.

## 관리자 API

기준 경로는 `/api/admin/stamp-tours/{resource}`다. 프로젝트의 인증 계층이 설정하는 `oai-authenticated-user-email` 헤더가 필요하다. 조회 리소스는 `tours`, `spots`, `qrs`, `participants`, `consents`, `verifications`, `rewards`, `applications`, `reward-history`다. `GET /{resource}`, `GET /{resource}/{id}`를 제공하며 등록은 투어·관광지·QR·경품, 수정은 투어·관광지·QR·경품·참여자·신청에 제한한다. 물리 삭제 API는 제공하지 않는다.

- 인증 취소: `POST /api/admin/stamp-tours/verifications/{id}/cancel`, 본문 `{ "reason": "..." }`
- 경품 상태 변경: `PATCH /api/admin/stamp-tours/applications/{id}`, 본문 `{ "status": "APPROVED", "reason": "..." }`
- QR 발급: `POST /api/admin/stamp-tours/qrs`. 응답의 `qrToken`, `verifyUrlPath`, `printPath`는 원문 토큰을 포함하므로 발급 시 안전하게 보관한다.
- QR 이미지 내려받기: 발급 응답의 `printPath`에 관리자 인증 헤더를 포함해 요청한다. 서버는 저장된 해시와 원문 토큰을 다시 대조한 뒤 960px PNG를 내려준다.

## 방문 인증 요청

`POST /api/tour/{tourCode}/visits`에 `{ "qrToken", "requestId", "latitude", "longitude", "accuracyMeters" }`를 전달한다. `requestId`는 한 번의 사용자 인증 시도 동안 유지해야 하며 네트워크 재시도에도 바꾸지 않는다. 서버는 QR, 투어 상태·기간, 관광지 인증 기간·시간, 참여자, 중복 인증, GPS 정확도와 거리를 모두 재검증한다. 성공과 실패를 `visit_verifications`에 남기며, 같은 참여자와 `requestId`의 성공 재요청은 기존 결과를 반환한다.

15분 안에 10km보다 먼 관광지를 연속 인증하면 인증 자체와 별개로 `is_suspicious` 및 `suspicious_reason`에 의심 기록을 남긴다. 기준값은 향후 운영 정책 설정으로 분리할 수 있다.

## 환경 설정

- `STAMP_TOUR_HASH_SECRET`: 전화번호 조회용 HMAC 비밀값
- `STAMP_TOUR_ENCRYPTION_KEY`: 개인정보·위치정보 암호화 키 재료
- `STAMP_TOUR_SESSION_SECRET`: 참여자 세션 서명 비밀값
- `SMS_PROVIDER_ENDPOINT`, `SMS_PROVIDER_API_KEY`: 문자 제공자 어댑터 설정

개발 환경에서는 문자 제공자 설정이 없을 때 응답에 `developmentOnlyCode`와 경고가 포함된다. 프로덕션에서는 개발용 번호가 생성·노출되지 않으며 문자 제공자가 없으면 `SMS_PROVIDER_NOT_CONFIGURED`로 차단된다. 보안 비밀값이 없을 때도 프로덕션 요청은 `SECURITY_CONFIG_REQUIRED`로 차단된다.

샘플 투어 코드는 `CHEORWON-DMZ-2026`이다. 마이그레이션의 QR 원문 토큰은 로컬 개발 확인용 `dev-cheorwon-qr-01`부터 `dev-cheorwon-qr-05`까지이며 운영 배포 전 관리자 QR 재발급 API로 교체해야 한다.
