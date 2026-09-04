/**
 * FRONTEND PROTOTYPE ONLY
 * 실제 신청조회 API·DB가 아닙니다. 임시 샘플 신청번호만 사용합니다.
 */

export const APPLICATION_STATUSES = [
  "작성 중",
  "승인대기",
  "검토 중",
  "보완요청",
  "재검토",
  "가입승인",
  "가입거절",
  "신청취소",
] as const;

export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

export type DocumentStatusItem = {
  name: string;
  state: "제출" | "미제출" | "보완필요" | "확인완료";
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
  status: ApplicationStatus;
  reviewer: string;
  lastProcessedAt: string;
  processMessage: string;
  documents: DocumentStatusItem[];
  history: StatusHistoryItem[];
  rejectionReason?: string;
};

const baseDocsSubmitted: DocumentStatusItem[] = [
  { name: "사업자등록증", state: "제출" },
  { name: "관광사업등록증 또는 여행업등록증", state: "제출" },
  { name: "통신판매업 신고증", state: "미제출" },
  { name: "회사소개서", state: "제출" },
];

/** 임시 샘플 신청 — URL/표시에 개인식별번호·실연락처를 넣지 않습니다. */
export const SAMPLE_APPLICATIONS: SampleApplication[] = [
  {
    applicationNumber: "AOS-S-DRAFT-001",
    appliedAt: "2026.09.01 10:20",
    agencyName: "샘플여행사 A",
    status: "작성 중",
    reviewer: "—",
    lastProcessedAt: "2026.09.01 10:20",
    processMessage: "작성 중인 신청입니다. 제출 전까지 내용을 수정할 수 있습니다.",
    documents: [
      { name: "사업자등록증", state: "미제출" },
      { name: "관광사업등록증 또는 여행업등록증", state: "미제출" },
      { name: "회사소개서", state: "미제출" },
    ],
    history: [
      {
        at: "2026.09.01 10:20",
        status: "작성 중",
        message: "가입신청 작성 시작",
        actor: "신청자",
      },
    ],
  },
  {
    applicationNumber: "AOS-S-WAIT-002",
    appliedAt: "2026.09.02 14:05",
    agencyName: "샘플여행사 B",
    status: "승인대기",
    reviewer: "제휴운영팀",
    lastProcessedAt: "2026.09.02 14:05",
    processMessage: "신청이 접수되었습니다. 관리자 배정 후 검토가 시작됩니다.",
    documents: baseDocsSubmitted,
    history: [
      {
        at: "2026.09.02 13:50",
        status: "작성 중",
        message: "신청서 작성",
        actor: "신청자",
      },
      {
        at: "2026.09.02 14:05",
        status: "승인대기",
        message: "가입신청 제출 완료",
        actor: "신청자",
      },
    ],
  },
  {
    applicationNumber: "AOS-S-REVIEW-003",
    appliedAt: "2026.09.02 09:30",
    agencyName: "샘플여행사 C",
    status: "검토 중",
    reviewer: "김운영 / 제휴운영팀",
    lastProcessedAt: "2026.09.03 11:10",
    processMessage: "제출서류와 사업자 정보를 검토 중입니다.",
    documents: [
      { name: "사업자등록증", state: "확인완료" },
      { name: "관광사업등록증 또는 여행업등록증", state: "확인완료" },
      { name: "회사소개서", state: "제출" },
    ],
    history: [
      {
        at: "2026.09.02 09:30",
        status: "승인대기",
        message: "가입신청 제출",
        actor: "신청자",
      },
      {
        at: "2026.09.03 11:10",
        status: "검토 중",
        message: "담당자 배정 및 검토 시작",
        actor: "김운영",
      },
    ],
  },
  {
    applicationNumber: "AOS-S-FIX-004",
    appliedAt: "2026.08.28 16:40",
    agencyName: "샘플여행사 D",
    status: "보완요청",
    reviewer: "이검토 / 제휴운영팀",
    lastProcessedAt: "2026.09.03 15:22",
    processMessage: "관광사업등록증 이미지가 흐려 확인이 어렵습니다. 선명한 서류로 다시 첨부해 주세요.",
    documents: [
      { name: "사업자등록증", state: "확인완료" },
      { name: "관광사업등록증 또는 여행업등록증", state: "보완필요" },
      { name: "회사소개서", state: "제출" },
    ],
    history: [
      {
        at: "2026.08.28 16:40",
        status: "승인대기",
        message: "가입신청 제출",
        actor: "신청자",
      },
      {
        at: "2026.09.01 10:00",
        status: "검토 중",
        message: "검토 시작",
        actor: "이검토",
      },
      {
        at: "2026.09.03 15:22",
        status: "보완요청",
        message: "서류 보완 요청",
        actor: "이검토",
      },
    ],
  },
  {
    applicationNumber: "AOS-S-REREV-005",
    appliedAt: "2026.08.20 11:15",
    agencyName: "샘플여행사 E",
    status: "재검토",
    reviewer: "박재검 / 제휴운영팀",
    lastProcessedAt: "2026.09.04 09:05",
    processMessage: "보완 서류를 반영하여 재검토 중입니다.",
    documents: [
      { name: "사업자등록증", state: "확인완료" },
      { name: "관광사업등록증 또는 여행업등록증", state: "제출" },
      { name: "보험 관련 서류", state: "제출" },
    ],
    history: [
      {
        at: "2026.08.20 11:15",
        status: "승인대기",
        message: "가입신청 제출",
        actor: "신청자",
      },
      {
        at: "2026.08.25 14:00",
        status: "보완요청",
        message: "서류 보완 요청",
        actor: "박재검",
      },
      {
        at: "2026.09.02 18:30",
        status: "재검토",
        message: "보완 서류 제출 후 재검토 진입",
        actor: "신청자",
      },
      {
        at: "2026.09.04 09:05",
        status: "재검토",
        message: "재검토 진행",
        actor: "박재검",
      },
    ],
  },
  {
    applicationNumber: "AOS-S-OK-006",
    appliedAt: "2026.08.10 13:00",
    agencyName: "샘플여행사 F",
    status: "가입승인",
    reviewer: "최승인 / 제휴운영팀",
    lastProcessedAt: "2026.09.01 17:40",
    processMessage: "제휴여행사 가입이 승인되었습니다. 상품공유그룹은 관리자가 별도로 지정합니다.",
    documents: [
      { name: "사업자등록증", state: "확인완료" },
      { name: "관광사업등록증 또는 여행업등록증", state: "확인완료" },
      { name: "회사소개서", state: "확인완료" },
    ],
    history: [
      {
        at: "2026.08.10 13:00",
        status: "승인대기",
        message: "가입신청 제출",
        actor: "신청자",
      },
      {
        at: "2026.08.12 10:20",
        status: "검토 중",
        message: "검토 시작",
        actor: "최승인",
      },
      {
        at: "2026.09.01 17:40",
        status: "가입승인",
        message: "가입승인 처리",
        actor: "최승인",
      },
    ],
  },
  {
    applicationNumber: "AOS-S-REJECT-007",
    appliedAt: "2026.08.05 09:45",
    agencyName: "샘플여행사 G",
    status: "가입거절",
    reviewer: "정심의 / 제휴운영팀",
    lastProcessedAt: "2026.08.18 16:10",
    processMessage: "가입이 거절되었습니다. 거절사유를 확인한 뒤 필요 시 재신청해 주세요.",
    rejectionReason:
      "제출하신 여행업 등록정보와 사업자등록증의 상호·대표자 정보가 일치하지 않아 가입이 거절되었습니다. (샘플 사유)",
    documents: [
      { name: "사업자등록증", state: "확인완료" },
      { name: "관광사업등록증 또는 여행업등록증", state: "보완필요" },
    ],
    history: [
      {
        at: "2026.08.05 09:45",
        status: "승인대기",
        message: "가입신청 제출",
        actor: "신청자",
      },
      {
        at: "2026.08.10 11:00",
        status: "검토 중",
        message: "검토 시작",
        actor: "정심의",
      },
      {
        at: "2026.08.18 16:10",
        status: "가입거절",
        message: "가입거절 처리",
        actor: "정심의",
      },
    ],
  },
  {
    applicationNumber: "AOS-S-CANCEL-008",
    appliedAt: "2026.07.30 15:20",
    agencyName: "샘플여행사 H",
    status: "신청취소",
    reviewer: "—",
    lastProcessedAt: "2026.08.01 10:05",
    processMessage: "신청자가 신청을 취소했습니다. 다시 신청하려면 재신청을 이용해 주세요.",
    documents: baseDocsSubmitted,
    history: [
      {
        at: "2026.07.30 15:20",
        status: "승인대기",
        message: "가입신청 제출",
        actor: "신청자",
      },
      {
        at: "2026.08.01 10:05",
        status: "신청취소",
        message: "신청 취소",
        actor: "신청자",
      },
    ],
  },
];

export function findSampleApplication(applicationNumber: string) {
  return SAMPLE_APPLICATIONS.find((item) => item.applicationNumber === applicationNumber) ?? null;
}

export function statusBadgeTone(status: ApplicationStatus) {
  switch (status) {
    case "작성 중":
      return "draft";
    case "승인대기":
      return "wait";
    case "검토 중":
    case "재검토":
      return "review";
    case "보완요청":
      return "fix";
    case "가입승인":
      return "ok";
    case "가입거절":
      return "reject";
    case "신청취소":
      return "cancel";
    default:
      return "wait";
  }
}
