"use client";
import Link from "next/link";
import { useState, type ReactNode } from "react";
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
  Users,
} from "lucide-react";
import styles from "./join.module.css";

type ConsentType =
  | "TERMS"
  | "PRIVACY"
  | "LOCATION"
  | "AGE_OVER_14"
  | "MARKETING";

type JoinMode = "individual" | "group";

type GroupDone = {
  groupName: string;
  representative: string;
  phone: string;
  headcount: number;
};

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

function maskPhone(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.length < 7) return value;
  const tail = digits.slice(-4);
  return `${digits.slice(0, 3)}-****-${tail}`;
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
  const [mode, setMode] = useState<JoinMode>("individual");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [groupName, setGroupName] = useState("");
  const [headcount, setHeadcount] = useState("");
  const [checked, setChecked] = useState<Record<ConsentType, boolean>>({
    TERMS: false,
    PRIVACY: false,
    LOCATION: false,
    AGE_OVER_14: false,
    MARKETING: false,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [groupDone, setGroupDone] = useState<GroupDone | null>(null);
  const all = consents.every((c) => checked[c.type]);
  const required = consents
    .filter((c) => c.required)
    .every((c) => checked[c.type]);

  function switchToGroup() {
    setError("");
    setMode("group");
  }

  function switchToIndividual() {
    setError("");
    setMode("individual");
  }

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

  function validateGroup() {
    if (!groupName.trim()) {
      setError("단체명을 입력해 주세요.");
      return false;
    }
    if (!name.trim()) {
      setError("대표자명을 입력해 주세요.");
      return false;
    }
    if (!/^01[016789]-?\d{3,4}-?\d{4}$/.test(phone)) {
      setError("연락처를 확인해 주세요.");
      return false;
    }
    if (!headcount.trim()) {
      setError("참여 인원을 입력해 주세요.");
      return false;
    }
    if (!/^\d+$/.test(headcount.trim())) {
      setError("참여 인원은 정수로 입력해 주세요.");
      return false;
    }
    const count = Number(headcount);
    if (!Number.isInteger(count) || count < 2) {
      setError("단체 참여 인원은 2명 이상이어야 합니다.");
      return false;
    }
    return true;
  }

  async function submitIndividual() {
    if (busy || !validateIdentity()) return;
    if (!required) {
      setError("필수 약관에 모두 동의해 주세요.");
      return;
    }
    setBusy(true);
    setError("");
    await new Promise((r) => setTimeout(r, 350));
    window.location.assign(previewReturn(tourCode));
  }

  function submitGroup() {
    if (busy || !validateGroup()) return;
    setBusy(true);
    setError("");
    window.setTimeout(() => {
      setGroupDone({
        groupName: groupName.trim(),
        representative: name.trim(),
        phone,
        headcount: Number(headcount),
      });
      setBusy(false);
    }, 280);
  }

  if (groupDone) {
    return (
      <Frame tourCode={tourCode}>
        <section className={styles.complete} aria-live="polite">
          <span>
            <Check />
          </span>
          <h1>단체 참여 등록이 완료되었습니다.</h1>
          <p>입력하신 단체정보로 샘플 참여가 등록되었습니다.</p>
          <dl className={styles.doneSummary}>
            <div>
              <dt>단체명</dt>
              <dd>{groupDone.groupName}</dd>
            </div>
            <div>
              <dt>대표자</dt>
              <dd>{groupDone.representative}</dd>
            </div>
            <div>
              <dt>연락처</dt>
              <dd>{maskPhone(groupDone.phone)}</dd>
            </div>
            <div>
              <dt>참여 인원</dt>
              <dd>{groupDone.headcount}명</dd>
            </div>
          </dl>
          <Link href={`/tour/${tourCode}/stampbook?preview=eligible`}>
            스탬프북 보기
            <ChevronRight />
          </Link>
        </section>
      </Frame>
    );
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
          <p>
            {mode === "group"
              ? "대표자 한 분만 정보를 입력해 주세요. 단체 구성원은 각각 등록할 필요가 없습니다."
              : "이름과 휴대전화번호를 입력하면 준비된 여행 기록을 확인할 수 있어요."}
          </p>
          {mode === "individual" && (
            <ol aria-label="참여 등록 진행 단계">
              <li className={name ? styles.done : styles.current}>정보 입력</li>
              <li>번호 인증 준비 중</li>
              <li className={name && phone ? styles.current : ""}>약관 동의</li>
            </ol>
          )}
        </section>

        {mode === "individual" && (
          <section className={styles.groupHint} aria-label="단체 참여 안내">
            <div>
              <strong>단체로 방문하셨나요?</strong>
              <p>대표자 한 분이 단체정보를 입력할 수 있습니다.</p>
            </div>
            <button type="button" onClick={switchToGroup}>
              <Users />
              단체로 참여하기
            </button>
          </section>
        )}

        <section className={styles.card}>
          <header>
            <span>{mode === "group" ? <Users /> : <UserRound />}</span>
            <div>
              <small>{mode === "group" ? "단체 참여" : "STEP 1"}</small>
              <h2>{mode === "group" ? "단체 참여정보" : "참여자 정보"}</h2>
            </div>
          </header>

          {mode === "group" ? (
            <>
              <label>
                <span>
                  단체명 <b>필수</b>
                </span>
                <input
                  value={groupName}
                  onChange={(e) => {
                    setGroupName(e.target.value);
                    setError("");
                  }}
                  placeholder="예: 철원행복투어"
                  maxLength={60}
                  autoComplete="organization"
                />
              </label>
              <label>
                <span>
                  대표자 <b>필수</b>
                </span>
                <input
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    setError("");
                  }}
                  autoComplete="name"
                  placeholder="대표자명을 입력해 주세요"
                  maxLength={30}
                />
              </label>
              <label>
                <span>
                  연락처 <b>필수</b>
                </span>
                <input
                  value={phone}
                  onChange={(e) => {
                    setPhone(formatPhone(e.target.value));
                    setError("");
                  }}
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="010-0000-0000"
                />
              </label>
              <label>
                <span>
                  인원 <b>필수</b>
                </span>
                <div className={styles.unitField}>
                  <input
                    value={headcount}
                    onChange={(e) => {
                      setHeadcount(e.target.value.replace(/\D/g, "").slice(0, 4));
                      setError("");
                    }}
                    inputMode="numeric"
                    placeholder="2"
                    aria-label="참여 인원"
                  />
                  <em>명</em>
                </div>
              </label>
              <button type="button" className={styles.modeSwitch} onClick={switchToIndividual}>
                개인으로 변경하기
              </button>
            </>
          ) : (
            <>
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
            </>
          )}
        </section>

        {mode === "individual" && (
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
        )}

        {error && (
          <p className={styles.error} role="alert">
            <Info />
            {error}
          </p>
        )}

        <button
          className={styles.submit}
          type="button"
          onClick={() => (mode === "group" ? submitGroup() : void submitIndividual())}
          disabled={busy || (mode === "individual" && !required)}
        >
          {busy ? (
            <>
              <LoaderCircle className={styles.spin} />
              처리 중이에요
            </>
          ) : mode === "group" ? (
            "단체로 참여하기"
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
  children: ReactNode;
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
