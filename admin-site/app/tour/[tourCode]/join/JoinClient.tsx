"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Check,
  ChevronRight,
  Clock3,
  Info,
  LoaderCircle,
  LockKeyhole,
  MessageSquareText,
  RefreshCw,
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
type Api<T> = {
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: { retryAfterSeconds?: number };
  };
};
type Preview =
  | "new"
  | "restore"
  | "wrong"
  | "expired"
  | "resent"
  | "missing-consent"
  | "existing"
  | null;
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
function timer(value: number) {
  return `${Math.floor(value / 60)}:${String(value % 60).padStart(2, "0")}`;
}
function safeReturn(tourCode: string) {
  if (typeof window === "undefined") return `/tour/${tourCode}`;
  const value = new URLSearchParams(window.location.search).get("returnTo");
  return value?.startsWith(`/tour/${tourCode}/`) && !value.startsWith("//")
    ? value
    : `/tour/${tourCode}`;
}
export default function JoinClient({ tourCode }: { tourCode: string }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [challengeId, setChallengeId] = useState("");
  const [proof, setProof] = useState("");
  const [seconds, setSeconds] = useState(0);
  const [resend, setResend] = useState(0);
  const [checked, setChecked] = useState<Record<ConsentType, boolean>>({
    TERMS: false,
    PRIVACY: false,
    LOCATION: false,
    AGE_OVER_14: false,
    MARKETING: false,
  });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [completed, setCompleted] = useState<{ restored: boolean } | null>(
    null,
  );
  const preview = useMemo<Preview>(() => {
    if (typeof window === "undefined") return null;
    const v = new URLSearchParams(location.search).get("preview");
    return [
      "new",
      "restore",
      "wrong",
      "expired",
      "resent",
      "missing-consent",
      "existing",
    ].includes(v ?? "")
      ? (v as Preview)
      : null;
  }, []);
  const all = consents.every((c) => checked[c.type]);
  const required = consents
    .filter((c) => c.required)
    .every((c) => checked[c.type]);
  useEffect(() => {
    if (seconds <= 0) return;
    const id = window.setInterval(
      () => setSeconds((v) => Math.max(0, v - 1)),
      1000,
    );
    return () => clearInterval(id);
  }, [seconds]);
  useEffect(() => {
    if (resend <= 0) return;
    const id = window.setInterval(
      () => setResend((v) => Math.max(0, v - 1)),
      1000,
    );
    return () => clearInterval(id);
  }, [resend]);
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
  async function requestCode() {
    if (!validateIdentity() || busy || resend > 0) return;
    setBusy(true);
    setError("");
    setMessage("");
    if (preview) {
      await new Promise((r) => setTimeout(r, 350));
      setChallengeId("preview-challenge");
      setSeconds(preview === "expired" ? 0 : 300);
      setResend(60);
      setMessage(
        preview === "resent"
          ? "새 인증번호를 다시 보냈어요."
          : "인증번호를 보냈어요.",
      );
      setBusy(false);
      return;
    }
    try {
      const response = await fetch(`/api/tour/${tourCode}/phone-auth/request`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const json = (await response.json()) as Api<{
        challengeId: string;
        expiresInSeconds: number;
        resendAfterSeconds: number;
        developmentOnlyCode?: string;
      }>;
      if (!response.ok) throw new Error(json.error?.message);
      setChallengeId(json.data!.challengeId);
      setSeconds(json.data!.expiresInSeconds);
      setResend(json.data!.resendAfterSeconds);
      setMessage(
        json.data!.developmentOnlyCode
          ? `개발 환경 인증번호: ${json.data!.developmentOnlyCode}`
          : "인증번호를 보냈어요.",
      );
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "인증번호를 보내지 못했어요.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function confirmCode() {
    if (!challengeId || busy) return;
    if (!/^\d{6}$/.test(code)) {
      setError("6자리 인증번호를 입력해 주세요.");
      return;
    }
    setBusy(true);
    setError("");
    if (preview) {
      await new Promise((r) => setTimeout(r, 300));
      if (preview === "wrong") {
        setError("인증번호가 일치하지 않습니다. 4회 더 시도할 수 있어요.");
        setBusy(false);
        return;
      }
      if (preview === "expired" || seconds === 0) {
        setError("인증번호가 만료되었습니다. 다시 요청해 주세요.");
        setBusy(false);
        return;
      }
      setProof("preview-proof");
      setMessage(
        preview === "existing" || preview === "restore"
          ? "기존 참여 기록을 확인했어요. 동의 후 안전하게 복원할게요."
          : "휴대전화 인증이 완료됐어요.",
      );
      setBusy(false);
      return;
    }
    try {
      const response = await fetch(`/api/tour/${tourCode}/phone-auth/confirm`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ challengeId, phone, code }),
      });
      const json = (await response.json()) as Api<{
        phoneVerificationId: string;
        phoneVerificationProof: string;
      }>;
      if (!response.ok) throw new Error(json.error?.message);
      setChallengeId(json.data!.phoneVerificationId);
      setProof(json.data!.phoneVerificationProof);
      setMessage("휴대전화 인증이 완료됐어요.");
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "인증번호를 확인하지 못했어요.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function submit() {
    if (busy || !proof) return;
    if (!required || preview === "missing-consent") {
      setError("필수 약관에 모두 동의해 주세요.");
      return;
    }
    setBusy(true);
    setError("");
    if (preview) {
      await new Promise((r) => setTimeout(r, 450));
      setCompleted({
        restored: preview === "existing" || preview === "restore",
      });
      setBusy(false);
      return;
    }
    try {
      const response = await fetch(`/api/tour/${tourCode}/participants`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          phone,
          phoneVerificationId: challengeId,
          phoneVerificationProof: proof,
          consents: consents.map((c) => ({
            type: c.type,
            policyVersion: "2026-08-01",
            agreed: checked[c.type],
          })),
        }),
      });
      const json = (await response.json()) as Api<{ alreadyJoined: boolean }>;
      if (!response.ok) throw new Error(json.error?.message);
      setCompleted({ restored: Boolean(json.data?.alreadyJoined) });
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "참여 등록을 완료하지 못했어요.",
      );
    } finally {
      setBusy(false);
    }
  }
  if (completed)
    return (
      <Frame tourCode={tourCode}>
        <main className={styles.complete}>
          <span>
            <Check />
          </span>
          <h1>
            {completed.restored
              ? "참여 기록을 복원했어요"
              : "스탬프투어 참여 완료!"}
          </h1>
          <p>
            {completed.restored
              ? "이전에 모은 스탬프와 경품 달성 현황을 그대로 이어갈 수 있어요."
              : "이제 철원의 관광지를 여행하며 첫 스탬프를 모아보세요."}
          </p>
          <Link href={safeReturn(tourCode)}>
            {completed.restored ? "내 스탬프 이어보기" : "투어 시작하기"}
            <ChevronRight />
          </Link>
        </main>
      </Frame>
    );
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
          <p>휴대전화 인증 한 번으로 여행 기록을 안전하게 이어갈 수 있어요.</p>
          <ol aria-label="참여 등록 진행 단계">
            <li className={name ? styles.done : styles.current}>정보 입력</li>
            <li
              className={
                proof ? styles.done : challengeId ? styles.current : ""
              }
            >
              번호 인증
            </li>
            <li className={proof ? styles.current : ""}>약관 동의</li>
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
                  setChallengeId("");
                  setProof("");
                }}
                inputMode="tel"
                autoComplete="tel"
                placeholder="010-0000-0000"
              />
              <button
                type="button"
                onClick={() => void requestCode()}
                disabled={busy || resend > 0}
              >
                {busy ? (
                  <LoaderCircle className={styles.spin} />
                ) : challengeId ? (
                  <RefreshCw />
                ) : (
                  <MessageSquareText />
                )}
                {challengeId
                  ? resend > 0
                    ? `${resend}초 후 재요청`
                    : "재요청"
                  : "인증번호 요청"}
              </button>
            </div>
          </label>
          {challengeId && (
            <label>
              <span>
                인증번호 <b>필수</b>
              </span>
              <div className={styles.codeRow}>
                <div>
                  <LockKeyhole />
                  <input
                    value={code}
                    onChange={(e) =>
                      setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                    }
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    placeholder="6자리 입력"
                    maxLength={6}
                  />
                  <em className={seconds === 0 ? styles.expired : ""}>
                    <Clock3 />
                    {seconds ? timer(seconds) : "만료"}
                  </em>
                </div>
                <button
                  type="button"
                  onClick={() => void confirmCode()}
                  disabled={busy || Boolean(proof)}
                >
                  {proof ? (
                    <>
                      <Check />
                      인증 완료
                    </>
                  ) : (
                    "번호 확인"
                  )}
                </button>
              </div>
            </label>
          )}
          {message && (
            <p className={styles.success} role="status">
              <Check />
              {message}
            </p>
          )}
        </section>
        <section
          className={`${styles.card} ${!proof ? styles.locked : ""}`}
        >
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
              disabled={!proof}
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
                      disabled={!proof}
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
          disabled={busy || !proof}
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
          인증된 참여 세션은 안전한 쿠키로 30일간 유지됩니다.
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
