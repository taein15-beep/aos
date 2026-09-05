/**
 * FRONTEND PROTOTYPE ONLY
 * 판매점 가입 신청현황 화면 확인용 샘플입니다.
 * 실제 API·DB가 아니며, 제휴여행사 sample-data와 공유하지 않습니다.
 */

import type {
  SellerApplicationStatus,
  SellerOperatingStatus,
  SellerType,
} from "../apply/form-state";

export const SELLER_STATUS_SAMPLE_STATUSES = [
  "승인대기",
  "보완요청",
  "승인완료",
  "가입거절",
] as const;

export type SellerStatusSampleStatus = (typeof SELLER_STATUS_SAMPLE_STATUSES)[number];

export type SellerDocumentDisplayState = "첨부 완료" | "미첨부" | "보완 필요" | "확인 완료";

export type SellerDocumentStatusItem = {
  name: string;
  state: SellerDocumentDisplayState;
  required?: boolean;
  fileName?: string | null;
};

export type SellerStatusHistoryItem = {
  at: string;
  label: string;
  status: SellerApplicationStatus;
  message?: string;
};

export type SellerSampleApplication = {
  isSample: true;
  applicationNumber: string;
  appliedAt: string;
  operatorAgencyDisplayName: string;
  sellerType: SellerType;
  sellerName: string;
  businessName?: string;
  businessNumber?: string;
  representativeName?: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  referralCodePhone: string;
  status: SellerApplicationStatus;
  operatingStatus?: SellerOperatingStatus;
  processMessage: string;
  documents: SellerDocumentStatusItem[];
  history: SellerStatusHistoryItem[];
  rejectionReason?: string;
  supplementItems?: string[];
  adminNote?: string;
  requestedAt?: string;
  processedAt?: string;
};

/** 임시 샘플 신청 — 명백한 가상 정보만 사용합니다. */
export const SELLER_SAMPLE_APPLICATIONS: SellerSampleApplication[] = [
  {
    isSample: true,
    applicationNumber: "AOS-S-SAMPLE-WAIT-01",
    appliedAt: "2026. 9. 2. 오후 2:05",
    operatorAgencyDisplayName: "현재 홈페이지 운영 여행사",
    sellerType: "business",
    sellerName: "샘플판매점 대기",
    businessName: "샘플상호 대기",
    businessNumber: "111-22-33333",
    representativeName: "김샘플",
    contactName: "이담당",
    contactPhone: "010-1000-2000",
    contactEmail: "seller-wait@example.com",
    referralCodePhone: "010-1000-2000",
    status: "승인대기",
    processMessage:
      "현재 홈페이지 운영 여행사가 신청정보와 증빙서류를 검토하고 있습니다. 검토 결과는 담당자 이메일로 안내됩니다.",
    documents: [
      { name: "사업자등록증", state: "첨부 완료", required: true, fileName: "sample-biz-license.png" },
      { name: "통신판매업 신고증", state: "미첨부", required: false },
      { name: "여행업등록증", state: "미첨부", required: false },
      { name: "기타 증빙서류", state: "미첨부", required: false },
    ],
    history: [
      {
        at: "2026. 9. 2. 오후 2:05",
        label: "가입신청 접수",
        status: "승인대기",
        message: "승인대기",
      },
    ],
  },
  {
    isSample: true,
    applicationNumber: "AOS-S-SAMPLE-FIX-01",
    appliedAt: "2026. 8. 28. 오후 4:40",
    operatorAgencyDisplayName: "현재 홈페이지 운영 여행사",
    sellerType: "business",
    sellerName: "샘플판매점 보완",
    businessName: "샘플상호 보완",
    businessNumber: "222-33-44444",
    representativeName: "박샘플",
    contactName: "최담당",
    contactPhone: "010-2000-3000",
    contactEmail: "seller-fix@example.com",
    referralCodePhone: "010-2000-3000",
    status: "보완요청",
    processMessage: "가입신청 검토를 위해 추가 정보 또는 서류 보완이 필요합니다.",
    adminNote: "사업자등록증 이미지가 흐려 상호·대표자 확인이 어렵습니다. 선명한 서류로 다시 첨부해 주세요. (샘플 안내)",
    requestedAt: "2026. 9. 3. 오후 3:22",
    supplementItems: ["사업자등록증 — 선명한 이미지로 재첨부"],
    documents: [
      { name: "사업자등록증", state: "보완 필요", required: true, fileName: "blurry-sample.png" },
      { name: "통신판매업 신고증", state: "미첨부", required: false },
      { name: "여행업등록증", state: "첨부 완료", required: false, fileName: "sample-tourism.png" },
      { name: "기타 증빙서류", state: "미첨부", required: false },
    ],
    history: [
      {
        at: "2026. 8. 28. 오후 4:40",
        label: "가입신청 접수",
        status: "승인대기",
      },
      {
        at: "2026. 9. 1. 오전 11:10",
        label: "서류 검토",
        status: "승인대기",
      },
      {
        at: "2026. 9. 3. 오후 3:22",
        label: "보완요청",
        status: "보완요청",
        message: "서류 보완 요청",
      },
    ],
  },
  {
    isSample: true,
    applicationNumber: "AOS-S-SAMPLE-OK-01",
    appliedAt: "2026. 8. 10. 오후 1:00",
    operatorAgencyDisplayName: "현재 홈페이지 운영 여행사",
    sellerType: "business",
    sellerName: "샘플판매점 승인",
    businessName: "샘플상호 승인",
    businessNumber: "333-44-55555",
    representativeName: "정샘플",
    contactName: "한담당",
    contactPhone: "010-3000-4000",
    contactEmail: "seller-ok@example.com",
    referralCodePhone: "010-3000-4000",
    status: "승인완료",
    operatingStatus: "설정대기",
    processMessage:
      "판매점 가입이 승인되었습니다. 판매 가능 상품과 수수료 등 운영 설정이 완료된 후 판매를 시작할 수 있습니다.",
    documents: [
      { name: "사업자등록증", state: "확인 완료", required: true, fileName: "sample-biz-ok.png" },
      { name: "통신판매업 신고증", state: "확인 완료", required: false, fileName: "sample-mail.png" },
      { name: "여행업등록증", state: "미첨부", required: false },
      { name: "기타 증빙서류", state: "미첨부", required: false },
    ],
    history: [
      {
        at: "2026. 8. 10. 오후 1:00",
        label: "가입신청 접수",
        status: "승인대기",
      },
      {
        at: "2026. 8. 20. 오전 10:15",
        label: "서류 검토",
        status: "승인대기",
      },
      {
        at: "2026. 9. 1. 오후 5:40",
        label: "가입 승인",
        status: "승인완료",
      },
      {
        at: "2026. 9. 1. 오후 5:40",
        label: "운영 설정대기",
        status: "승인완료",
        message: "판매상품·수수료·정산정보 설정 대기",
      },
    ],
  },
  {
    isSample: true,
    applicationNumber: "AOS-S-SAMPLE-REJECT-01",
    appliedAt: "2026. 8. 5. 오전 9:45",
    operatorAgencyDisplayName: "현재 홈페이지 운영 여행사",
    sellerType: "individual",
    sellerName: "샘플개인판매점",
    contactName: "오신청",
    contactPhone: "010-4000-5000",
    contactEmail: "seller-reject@example.com",
    referralCodePhone: "010-4000-5000",
    status: "가입거절",
    processMessage: "검토 결과 판매점 가입이 승인되지 않았습니다.",
    rejectionReason:
      "제출하신 활동 정보와 신청 내용이 판매점 가입 기준에 맞지 않아 가입이 거절되었습니다. (샘플 사유)",
    processedAt: "2026. 8. 18. 오후 4:10",
    documents: [
      { name: "활동 경력 증빙", state: "확인 완료", required: false, fileName: "sample-activity.pdf" },
      { name: "기타 증빙서류", state: "미첨부", required: false },
    ],
    history: [
      {
        at: "2026. 8. 5. 오전 9:45",
        label: "가입신청 접수",
        status: "승인대기",
      },
      {
        at: "2026. 8. 12. 오후 2:00",
        label: "서류 검토",
        status: "승인대기",
      },
      {
        at: "2026. 8. 18. 오후 4:10",
        label: "가입거절",
        status: "가입거절",
      },
    ],
  },
];

export function findSellerSampleApplication(applicationNumber: string) {
  const normalized = applicationNumber.trim();
  return SELLER_SAMPLE_APPLICATIONS.find((item) => item.applicationNumber === normalized) ?? null;
}

export function findSellerSampleByNumberAndEmail(applicationNumber: string, email: string) {
  const sample = findSellerSampleApplication(applicationNumber);
  if (!sample) return null;
  if (sample.contactEmail.trim().toLowerCase() !== email.trim().toLowerCase()) return null;
  return sample;
}

export function sellerStatusBadgeTone(status: SellerApplicationStatus) {
  switch (status) {
    case "승인대기":
      return "wait";
    case "보완요청":
      return "fix";
    case "승인완료":
      return "ok";
    case "가입거절":
      return "reject";
    default:
      return "wait";
  }
}
