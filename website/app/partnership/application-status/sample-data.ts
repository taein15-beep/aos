/**
 * FRONTEND PROTOTYPE ONLY
 * 실제 신청조회 API·DB가 아닙니다. 화면 확인용 샘플만 제공합니다.
 */

export const APPLICATION_STATUSES = ["승인대기", "보완요청", "승인완료", "가입거절"] as const;

export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

export type DocumentStatusItem = {
  name: string;
  state: "제출" | "미제출" | "보완필요" | "확인완료" | "첨부 완료" | "상세정보 없음";
  required?: boolean;
};

export type StatusHistoryItem = {
  at: string;
  status: ApplicationStatus;
  message: string;
  actor: string;
};

export type SampleApplication = {
  applicationNumber: string;
  appliedAt: string;
  agencyName: string;
  ceoName: string;
  businessNumber: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  status: ApplicationStatus;
  processMessage: string;
  documents: DocumentStatusItem[];
  history: StatusHistoryItem[];
  rejectionReason?: string;
  supplementItems?: string[];
  /** 화면 확인용 샘플임을 명시 */
  isSample: true;
};

const DOC_NAMES = {
  business: "사업자등록증",
  tourism: "관광사업등록증",
  mailOrder: "통신판매업 신고증",
} as const;

/** 임시 샘플 신청 — 가상 정보만 사용합니다. */
export const SAMPLE_APPLICATIONS: SampleApplication[] = [
  {
    isSample: true,
    applicationNumber: "AOS-S-WAIT-002",
    appliedAt: "2026. 9. 2. 오후 2:05",
    agencyName: "샘플여행사 B",
    ceoName: "김샘플",
    businessNumber: "123-45-67890",
    contactName: "이담당",
    contactPhone: "010-1000-2000",
    contactEmail: "sample-b@example.com",
    status: "승인대기",
    processMessage: "관리자가 신청정보와 증빙서류를 검토하고 있습니다. 검토 결과는 담당자 이메일로 안내됩니다.",
    documents: [
      { name: DOC_NAMES.business, state: "제출", required: true },
      { name: DOC_NAMES.tourism, state: "제출", required: true },
      { name: DOC_NAMES.mailOrder, state: "미제출", required: false },
    ],
    history: [
      {
        at: "2026. 9. 2. 오후 2:05",
        status: "승인대기",
        message: "가입신청 접수",
        actor: "신청자",
      },
    ],
  },
  {
    isSample: true,
    applicationNumber: "AOS-S-FIX-004",
    appliedAt: "2026. 8. 28. 오후 4:40",
    agencyName: "샘플여행사 D",
    ceoName: "박샘플",
    businessNumber: "234-56-78901",
    contactName: "최담당",
    contactPhone: "010-2000-3000",
    contactEmail: "sample-d@example.com",
    status: "보완요청",
    processMessage: "관광사업등록증 이미지가 흐려 확인이 어렵습니다. 선명한 서류로 다시 첨부해 주세요.",
    supplementItems: ["관광사업등록증 — 선명한 이미지로 재첨부"],
    documents: [
      { name: DOC_NAMES.business, state: "확인완료", required: true },
      { name: DOC_NAMES.tourism, state: "보완필요", required: true },
      { name: DOC_NAMES.mailOrder, state: "미제출", required: false },
    ],
    history: [
      {
        at: "2026. 8. 28. 오후 4:40",
        status: "승인대기",
        message: "가입신청 접수",
        actor: "신청자",
      },
      {
        at: "2026. 9. 3. 오후 3:22",
        status: "보완요청",
        message: "서류 보완 요청",
        actor: "이검토",
      },
    ],
  },
  {
    isSample: true,
    applicationNumber: "AOS-S-OK-006",
    appliedAt: "2026. 8. 10. 오후 1:00",
    agencyName: "샘플여행사 F",
    ceoName: "정샘플",
    businessNumber: "345-67-89012",
    contactName: "한담당",
    contactPhone: "010-3000-4000",
    contactEmail: "sample-f@example.com",
    status: "승인완료",
    processMessage: "제휴여행사 가입이 승인되었습니다.",
    documents: [
      { name: DOC_NAMES.business, state: "확인완료", required: true },
      { name: DOC_NAMES.tourism, state: "확인완료", required: true },
      { name: DOC_NAMES.mailOrder, state: "확인완료", required: false },
    ],
    history: [
      {
        at: "2026. 8. 10. 오후 1:00",
        status: "승인대기",
        message: "가입신청 접수",
        actor: "신청자",
      },
      {
        at: "2026. 9. 1. 오후 5:40",
        status: "승인완료",
        message: "가입 승인 처리",
        actor: "최승인",
      },
    ],
  },
  {
    isSample: true,
    applicationNumber: "AOS-S-REJECT-007",
    appliedAt: "2026. 8. 5. 오전 9:45",
    agencyName: "샘플여행사 G",
    ceoName: "오샘플",
    businessNumber: "456-78-90123",
    contactName: "윤담당",
    contactPhone: "010-4000-5000",
    contactEmail: "sample-g@example.com",
    status: "가입거절",
    processMessage: "가입이 거절되었습니다. 안내사항을 확인해 주세요.",
    rejectionReason:
      "제출하신 여행업 등록정보와 사업자등록증의 상호·대표자 정보가 일치하지 않아 가입이 거절되었습니다. (샘플 사유)",
    documents: [
      { name: DOC_NAMES.business, state: "확인완료", required: true },
      { name: DOC_NAMES.tourism, state: "보완필요", required: true },
      { name: DOC_NAMES.mailOrder, state: "미제출", required: false },
    ],
    history: [
      {
        at: "2026. 8. 5. 오전 9:45",
        status: "승인대기",
        message: "가입신청 접수",
        actor: "신청자",
      },
      {
        at: "2026. 8. 18. 오후 4:10",
        status: "가입거절",
        message: "가입거절 처리",
        actor: "정심의",
      },
    ],
  },
];

export function findSampleApplication(applicationNumber: string) {
  const normalized = applicationNumber.trim();
  return SAMPLE_APPLICATIONS.find((item) => item.applicationNumber === normalized) ?? null;
}

export function findSampleByNumberAndEmail(applicationNumber: string, email: string) {
  const sample = findSampleApplication(applicationNumber);
  if (!sample) return null;
  if (sample.contactEmail.trim().toLowerCase() !== email.trim().toLowerCase()) return null;
  return sample;
}

export function statusBadgeTone(status: ApplicationStatus) {
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
