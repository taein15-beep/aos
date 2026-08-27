"use client";
import Link from "next/link";
import { useState } from "react";
import {
  ArrowLeft,
  Check,
  ChevronRight,
  Info,
  LoaderCircle,
  LockKeyhole,
  MessageSquareText,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import styles from "./join.module.css";
type ConsentType =
  | "TERMS"
  | "PRIVACY"
  | "LOCATION"
  | "AGE_OVER_14"
  | "MARKETING";
const consents: Array<{
  type: ConsentType;
  label: string;
  required: boolean;
  detail: string;
}> = [
  {
    type: "TERMS",
    label: "서비스 이용약관",
    required: true,
    detail:
      "스탬프투어 참여, 현장 인증, 경품 신청과 운영에 관한 기본 이용조건입니다.",
  },
  {
    type: "PRIVACY",
    label: "개인정보 수집·이용",
    required: true,
    detail:
      "참여 확인과 경품 운영을 위해 이름과 휴대전화번호를 수집하며, 투어 정책에 따른 보관기간 후 파기합니다.",
  },
  {
    type: "LOCATION",
    label: "위치정보 이용",
    required: true,
    detail:
      "관광지 현장 인증 시 현재 위치와 관광지 간 거리를 확인하며, 설정된 보관기간 후 위치정보를 파기합니다.",
  },
  {
    type: "AGE_OVER_14",
    label: "만 14세 이상입니다",
    required: true,
    detail:
      "만 14세 미만은 법정대리인의 동의와 관리자 안내가 필요합니다. 운영 문의처로 연락해 주세요.",
  },
  {
    type: "MARKETING",
    label: "관광·이벤트 정보 수신",
    required: false,
    detail:
      "철원 관광 소식과 이벤트 안내를 받을 수 있습니다. 동의하지 않아도 투어 참여가 가능합니다.",
  },
];
function formatPhone(value: string) {
  const n = value.replace(/\D/g, "").slice(0, 11);
  return n.length > 7
    ? `${n.slice(0, 3)}-${n.slice(3, 7)}-${n.slice(7)}`
    : n.length > 3
      ? `${n.slice(0, 3)}-${n.slice(3)}`
      : n;
}
function safeReturn(tourCode: string) {
  if (typeof window === "undefined") return `/tour/${tourCode}`;
  const value = new URLSearchParams(window.location.search).get("returnTo");
  if (!value || value.startsWith("//") || !value.startsWith("/tour/"))
    return `/tour/${tourCode}`;
  if (
    value === `/tour/${tourCode}` ||
    value.startsWith(`/tour/${tourCode}/`) ||
    value.startsWith("/tour/verify/")
  )
    return value;
  return `/tour/${tourCode}`;
}
function previewReturn(tourCode: string) {
  const target = safeReturn(tourCode);
  const url = new URL(target, window.location.origin);
  if (target.includes("/stampbook")) url.searchParams.set("preview", "eligible");
  else if (target.includes("/rewards/status")) url.searchParams.set("preview", "applied");
  else if (target.includes("/rewards")) url.searchParams.set("preview", "eligible");
  else if (target.startsWith("/tour/verify/")) url.searchParams.set("preview", "normal");
  else url.searchParams.set("preview", "progress");
  return `${url.pathname}${url.search}`;
}
export default function JoinClient({ tourCode }: { tourCode: string }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [checked, setChecked] = useState<Record<ConsentType, boolean>>({
    TERMS: false,
    PRIVACY: false,
    LOCATION: false,
    AGE_OVER_14: false,
    MARKETING: false,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const all = consents.every((c) => checked[c.type]);
  const required = consents
    .filter((c) => c.required)
    .every((c) => checked[c.type]);
  function validateIdentity() {
    if (name.trim().length < 2) {
      setError("이름을 2자 이상 입력해 주세요.");
      return false;
    }
    if (!/^01[016789]-?\d{3,4}-?\d{4}$/.test(phone)) {
      setError("올바른 휴대전화번호를 입력해 주세요.");
      return false;
    }
    return true;
  }
  async function submit() {
    if (busy || !validateIdentity()) return;
    if (!required) {
      setError("필수 약관에 모두 동의해 주세요.");
      return;
    }
    setBusy(true);
    setError("");
    await new Promise((r) => setTimeout(r, 350));
    window.location.assign(previewReturn(tourCode));
    return;
  }
  return (
    <Frame tourCode={tourCode}>
      <main className={styles.main}>
        <section className={styles.tour}>
          <span>참여할 투어</span>
          <h1>
            철원 DMZ 평화관광
            <br />
            스탬프투어
          </h1>
          <p>이름과 휴대전화번호를 입력하면 준비된 여행 기록을 확인할 수 있어요.</p>
          <ol aria-label="참여 등록 진행 단계">
            <li className={name ? styles.done : styles.current}>정보 입력</li>
            <li>번호 인증 준비 중</li>
            <li className={name && phone ? styles.current : ""}>약관 동의</li>
          </ol>
        </section>
        <section className={styles.card}>
          <header>
            <span>
              <UserRound />
            </span>
            <div>
              <small>STEP 1</small>
              <h2>참여자 정보</h2>
            </div>
          </header>
          <label>
            <span>
              이름 <b>필수</b>
            </span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
              placeholder="이름을 입력해 주세요"
              maxLength={30}
            />
          </label>
          <label>
            <span>
              휴대전화번호 <b>필수</b>
            </span>
            <div className={styles.phoneRow}>
              <input
                value={phone}
                onChange={(e) => {
                  setPhone(formatPhone(e.target.value));
                }}
                inputMode="tel"
                autoComplete="tel"
                placeholder="010-0000-0000"
              />
              <button
                type="button"
                aria-disabled="true"
                title="문자 인증 연동 전까지는 입력한 정보로 미리보기를 진행합니다."
              >
                <MessageSquareText />
                인증번호 요청
              </button>
            </div>
          </label>
        </section>
        <section className={styles.card}>
          <header>
            <span>
              <ShieldCheck />
            </span>
            <div>
              <small>STEP 2</small>
              <h2>약관 동의</h2>
            </div>
          </header>
          <label className={styles.allCheck}>
            <input
              type="checkbox"
              checked={all}
              onChange={(e) =>
                setChecked(
                  Object.fromEntries(
                    consents.map((c) => [c.type, e.target.checked]),
                  ) as Record<ConsentType, boolean>,
                )
              }
            />
            <i>
              <Check />
            </i>
            <span>
              <strong>약관 전체 동의</strong>
              <small>필수 및 선택 약관을 모두 확인했어요</small>
            </span>
          </label>
          <div className={styles.consentList}>
            {consents.map((c) => (
              <details key={c.type}>
                <summary>
                  <label>
                    <input
                      type="checkbox"
                      checked={checked[c.type]}
                      onChange={(e) =>
                        setChecked((v) => ({
                          ...v,
                          [c.type]: e.target.checked,
                        }))
                      }
                    />
                    <i>
                      <Check />
                    </i>
                    <span>
                      {c.required ? <b>필수</b> : <em>선택</em>} {c.label}
                    </span>
                  </label>
                  <ChevronRight aria-label={`${c.label} 전문 펼치기`} />
                </summary>
                <p>{c.detail}</p>
              </details>
            ))}
          </div>
        </section>
        {error && (
          <p className={styles.error} role="alert">
            <Info />
            {error}
          </p>
        )}
        <button
          className={styles.submit}
          type="button"
          onClick={() => void submit()}
          disabled={busy || !required}
        >
          {busy ? (
            <>
              <LoaderCircle className={styles.spin} />
              처리 중이에요
            </>
          ) : (
            "동의하고 투어 시작하기"
          )}
        </button>
        <p className={styles.security}>
          <LockKeyhole />
          현재는 확인용 화면이며 실제 문자 인증과 참여 등록은 추후 연결됩니다.
        </p>
      </main>
    </Frame>
  );
}
function Frame({
  tourCode,
  children,
}: {
  tourCode: string;
  children: React.ReactNode;
}) {
  return (
    <div className={styles.page}>
      <div className={styles.phone}>
        <header className={styles.top}>
          <Link href={`/tour/${tourCode}`} aria-label="투어 홈으로 돌아가기">
            <ArrowLeft />
          </Link>
          <strong>스탬프투어 참여</strong>
          <span />
        </header>
        {children}
      </div>
    </div>
  );
}
