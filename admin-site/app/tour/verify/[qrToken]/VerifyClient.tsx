"use client";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  ChevronRight,
  Clock3,
  Crosshair as Gps,
  Gift,
  Info,
  LoaderCircle,
  MapPin,
  Navigation,
  ShieldCheck,
  Stamp,
  Trophy,
} from "lucide-react";
import styles from "./verify.module.css";
type Qr = {
  qrId: string;
  spotId: string;
  spotCode: string;
  spotName: string;
  description: string;
  address: string;
  allowedRadiusMeters: number;
  opensAt: string;
  closesAt: string;
  tourCode: string;
  tourName: string;
  tourStatus: string;
  tourStartsAt: string;
  tourEndsAt: string;
};
type Progress = {
  verifiedSpotCount: number;
  spots: Array<{ spotCode: string; verified: number }>;
};
type Result = {
  verificationId: string;
  idempotentReplay: boolean;
  spotCode: string;
  spotName: string;
  verifiedSpotCount: number;
  totalSpotCount: number;
  newlyAchievedReward?: { name: string; requiredSpotCount: number };
  nextReward?: { name: string; requiredSpotCount: number };
};
type Api<T> = {
  data?: T;
  error?: { code: string; message: string; details?: Record<string, number> };
};
type Preview =
  | "normal"
  | "invalid"
  | "inactive"
  | "other-tour"
  | "scheduled"
  | "ended"
  | "outside-hours"
  | "paused"
  | "duplicate"
  | "permission"
  | "distance"
  | "accuracy"
  | "network"
  | "replay"
  | "success"
  | null;
const hero =
  "https://ojsfile.ohmynews.com/STD_IMG_FILE/2022/0930/IE003057414_STD.jpg";
const fixture: Qr = {
  qrId: "qr_cheorwon_01",
  spotId: "spot_cheorwon_01",
  spotCode: "CHW-SPOT-001",
  spotName: "고석정",
  description: "한탄강 협곡과 고석바위를 만나는 철원 대표 관광지",
  address: "강원특별자치도 철원군 동송읍 태봉로 1825",
  allowedRadiusMeters: 120,
  opensAt: "09:00",
  closesAt: "18:00",
  tourCode: "CHEORWON-DMZ-2026",
  tourName: "철원 DMZ 평화관광 스탬프투어",
  tourStatus: "ACTIVE",
  tourStartsAt: "2026-01-01",
  tourEndsAt: "2027-12-31",
};
export default function VerifyClient({ qrToken }: { qrToken: string }) {
  const [qr, setQr] = useState<Qr | null>(null);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<{ code: string; message: string } | null>(
    null,
  );
  const [result, setResult] = useState<Result | null>(null);
  const [requestId, setRequestId] = useState("");
  const preview = useMemo<Preview>(() => {
    if (typeof window === "undefined") return null;
    const v = new URLSearchParams(location.search).get("preview");
    return [
      "normal",
      "invalid",
      "inactive",
      "other-tour",
      "scheduled",
      "ended",
      "outside-hours",
      "paused",
      "duplicate",
      "permission",
      "distance",
      "accuracy",
      "network",
      "replay",
      "success",
    ].includes(v ?? "")
      ? (v as Preview)
      : null;
  }, []);
  const load = useCallback(async () => {
    await Promise.resolve();
    setLoading(true);
    if (preview) {
      await new Promise((r) => setTimeout(r, 220));
      if (["invalid", "inactive", "other-tour"].includes(preview)) {
        setError({
          code: preview,
          message:
            preview === "invalid"
              ? "유효하지 않은 QR입니다."
              : preview === "inactive"
                ? "만료되었거나 비활성화된 QR입니다."
                : "다른 투어에서 발급된 QR입니다.",
        });
        setLoading(false);
        return;
      }
      setQr({
        ...fixture,
        tourStatus:
          preview === "paused"
            ? "PAUSED"
            : preview === "scheduled"
              ? "SCHEDULED"
              : preview === "ended"
                ? "ENDED"
                : "ACTIVE",
      });
      setProgress({ verifiedSpotCount: 2, spots: [] });
      if (preview === "success" || preview === "replay")
        setResult({
          verificationId: "preview",
          idempotentReplay: preview === "replay",
          spotCode: fixture.spotCode,
          spotName: fixture.spotName,
          verifiedSpotCount: 3,
          totalSpotCount: 5,
          newlyAchievedReward: {
            name: "관광 기념 스티커",
            requiredSpotCount: 3,
          },
          nextReward: { name: "평화관광 에코백", requiredSpotCount: 4 },
        });
      setLoading(false);
      return;
    }
    try {
      const qrResponse = await fetch(
        `/api/tour/qr/${encodeURIComponent(qrToken)}`,
      );
      const qrJson = (await qrResponse.json()) as Api<Qr>;
      if (!qrResponse.ok) throw { api: qrJson.error };
      const progressResponse = await fetch(
        `/api/tour/${qrJson.data!.tourCode}/me/progress`,
      );
      if (progressResponse.status === 401) {
        location.replace(
          `/tour/${qrJson.data!.tourCode}/join?returnTo=${encodeURIComponent(`/tour/verify/${qrToken}`)}`,
        );
        return;
      }
      const progressJson = (await progressResponse.json()) as Api<Progress>;
      if (!progressResponse.ok) throw { api: progressJson.error };
      setQr(qrJson.data!);
      setProgress(progressJson.data!);
    } catch (cause) {
      const api = (cause as { api?: Api<never>["error"] }).api;
      setError({
        code: api?.code ?? "NETWORK_ERROR",
        message: api?.message ?? "QR 정보를 불러오지 못했습니다.",
      });
    } finally {
      setLoading(false);
    }
  }, [preview, qrToken]);
  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, [load]);
  async function verify() {
    if (!qr || processing) return;
    setProcessing(true);
    setError(null);
    const currentId = requestId || crypto.randomUUID();
    setRequestId(currentId);
    if (preview) {
      await new Promise((r) => setTimeout(r, 500));
      const errors: Record<string, string> = {
        scheduled: "아직 투어 운영이 시작되지 않았습니다.",
        ended: "투어 운영이 종료되었습니다.",
        "outside-hours": "현재는 관광지 인증 가능 시간이 아닙니다.",
        paused: "투어 운영이 일시중지되었습니다.",
        duplicate: "이미 인증한 관광지입니다.",
        permission:
          "위치 권한이 거부되었습니다. 브라우저 설정에서 위치 권한을 허용해 주세요.",
        distance: "관광지 인증 허용 반경 밖입니다.",
        accuracy:
          "GPS 정확도가 낮습니다. 하늘이 잘 보이는 곳에서 다시 시도해 주세요.",
        network:
          "서버 응답이 끊겼습니다. 같은 요청으로 안전하게 다시 확인할 수 있어요.",
      };
      if (errors[preview ?? ""]) {
        setError({ code: preview!, message: errors[preview!] });
        setProcessing(false);
        return;
      }
      setResult({
        verificationId: "preview",
        idempotentReplay: preview === "replay",
        spotCode: qr.spotCode,
        spotName: qr.spotName,
        verifiedSpotCount: 3,
        totalSpotCount: 5,
        newlyAchievedReward: { name: "관광 기념 스티커", requiredSpotCount: 3 },
        nextReward: { name: "평화관광 에코백", requiredSpotCount: 4 },
      });
      setProcessing(false);
      return;
    }
    try {
      const position = await new Promise<GeolocationPosition>(
        (resolve, reject) =>
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 12000,
            maximumAge: 0,
          }),
      );
      const response = await fetch(`/api/tour/${qr.tourCode}/visits`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          qrToken,
          requestId: currentId,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracyMeters: position.coords.accuracy,
        }),
      });
      const json = (await response.json()) as Api<Result>;
      if (!response.ok) throw { api: json.error };
      setResult(json.data!);
      setRequestId("");
    } catch (cause) {
      if (cause instanceof GeolocationPositionError)
        setError({
          code: "LOCATION_DENIED",
          message:
            cause.code === 1
              ? "위치 권한이 거부되었습니다. 브라우저 설정에서 허용해 주세요."
              : "현재 위치를 정확히 확인하지 못했습니다.",
        });
      else {
        const api = (cause as { api?: Api<never>["error"] }).api;
        setError({
          code: api?.code ?? "NETWORK_ERROR",
          message:
            api?.message ?? "네트워크 연결이 끊겼습니다. 다시 시도해 주세요.",
        });
      }
    } finally {
      setProcessing(false);
    }
  }
  if (loading)
    return (
      <Frame>
        <State
          icon={<LoaderCircle className={styles.spin} />}
          title="QR 정보를 확인하고 있어요"
          text="잠시만 기다려 주세요."
        />
      </Frame>
    );
  if (error && !qr)
    return (
      <Frame>
        <State
          icon={<AlertTriangle />}
          title="QR을 확인할 수 없어요"
          text={error.message}
          action={<Link href="/">투어 홈으로 돌아가기</Link>}
        />
      </Frame>
    );
  if (result && qr)
    return (
      <Frame>
        <main className={styles.success}>
          <span className={styles.stamp}>
            <Stamp />
            <i>
              <Check />
            </i>
          </span>
          <small>
            {result.idempotentReplay
              ? "인증 결과 재확인 완료"
              : "새 스탬프 획득"}
          </small>
          <h1>
            {result.spotName}
            <br />
            방문 인증 완료!
          </h1>
          <p>
            {result.idempotentReplay
              ? "이미 서버에 저장된 성공 결과를 안전하게 불러왔어요."
              : "현장 위치가 확인되어 스탬프가 기록됐어요."}
          </p>
          <div className={styles.count}>
            <span>
              <b>{result.verifiedSpotCount}</b>현재 인증
            </span>
            <i />
            <span>
              <b>{result.totalSpotCount}</b>전체 관광지
            </span>
          </div>
          {result.newlyAchievedReward && (
            <div className={styles.achieved}>
              <Trophy />
              <span>
                <small>새로운 경품 달성</small>
                <strong>{result.newlyAchievedReward.name}</strong>
              </span>
            </div>
          )}
          {result.nextReward && (
            <p className={styles.next}>
              {result.nextReward.requiredSpotCount - result.verifiedSpotCount}곳
              더 방문하면 <b>{result.nextReward.name}</b>
            </p>
          )}
          <div className={styles.actions}>
            <Link href={`/tour/${qr.tourCode}/stampbook`}>
              <Stamp />내 스탬프북 보기
            </Link>
            <Link href={`/tour/${qr.tourCode}/rewards`}>
              <Gift />
              경품 확인하기
            </Link>
            <Link
              className={styles.primary}
              href={`/tour/${qr.tourCode}/spots`}
            >
              <Navigation />
              다음 관광지 보기
              <ChevronRight />
            </Link>
          </div>
        </main>
      </Frame>
    );
  if (!qr) return null;
  const unavailable = qr.tourStatus !== "ACTIVE";
  const unavailableReason =
    qr.tourStatus === "PAUSED"
      ? "투어 운영이 일시중지되었습니다. 운영 재개 후 다시 시도해 주세요."
      : qr.tourStatus === "SCHEDULED"
        ? "아직 투어 운영이 시작되지 않았습니다."
        : qr.tourStatus === "ENDED"
          ? "투어 운영이 종료되어 방문 인증을 진행할 수 없습니다."
          : "";
  return (
    <Frame>
      <header className={styles.hero}>
        <Image
          src={hero}
          alt={`${qr.spotName} 관광지 풍경`}
          fill
          priority
          sizes="(max-width:480px) 100vw,480px"
        />
        <div />
        <Link href={`/tour/${qr.tourCode}`} aria-label="투어 홈으로 돌아가기">
          <ArrowLeft />
        </Link>
        <span>{qr.tourName}</span>
      </header>
      <main className={styles.main}>
        <section className={styles.place}>
          <span className={unavailable ? styles.unavailable : styles.available}>
            <i />
            {unavailable ? "현재 인증 불가" : "현재 인증 가능"}
          </span>
          <h1>{qr.spotName}</h1>
          <p>{qr.description}</p>
          <dl>
            <div>
              <dt>
                <MapPin />
                주소
              </dt>
              <dd>{qr.address}</dd>
            </div>
            <div>
              <dt>
                <Clock3 />
                인증시간
              </dt>
              <dd>
                {qr.opensAt} – {qr.closesAt}
              </dd>
            </div>
            <div>
              <dt>
                <Gps />
                허용반경
              </dt>
              <dd>관광지에서 {qr.allowedRadiusMeters}m 이내</dd>
            </div>
          </dl>
        </section>
        <section className={styles.progress}>
          <Stamp />
          <span>
            <small>현재 모은 스탬프</small>
            <strong>{progress?.verifiedSpotCount ?? 0}개</strong>
          </span>
        </section>
        <section className={styles.guide}>
          <h2>방문 인증 전 확인</h2>
          <ol>
            <li>
              <span>1</span>위치 권한을 허용해 주세요.
            </li>
            <li>
              <span>2</span>관광지 현장에서 인증해 주세요.
            </li>
            <li>
              <span>3</span>처리 중에는 화면을 닫지 마세요.
            </li>
          </ol>
        </section>
        {unavailableReason && (
          <div className={styles.error} role="status">
            <Info />
            <span>
              <strong>현재 인증할 수 없어요</strong>
              <p>{unavailableReason}</p>
            </span>
          </div>
        )}
        {error && (
          <div className={styles.error} role="alert">
            <Info />
            <span>
              <strong>인증하지 못했어요</strong>
              <p>{error.message}</p>
              {error.code === "NETWORK_ERROR" && (
                <small>같은 요청 번호로 재시도해 중복 인증을 방지합니다.</small>
              )}
            </span>
          </div>
        )}
        <button
          className={styles.verify}
          type="button"
          onClick={() => void verify()}
          disabled={processing || unavailable}
        >
          {processing ? (
            <>
              <LoaderCircle className={styles.spin} />
              위치와 방문을 확인 중이에요
            </>
          ) : (
            <>
              <ShieldCheck />
              현재 위치로 방문 인증하기
            </>
          )}
        </button>
        <p className={styles.secure}>
          <ShieldCheck />
          QR만으로 인증되지 않으며 서버에서 위치와 참여 상태를 다시 확인합니다.
        </p>
      </main>
    </Frame>
  );
}
function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.page}>
      <div className={styles.phone}>{children}</div>
    </div>
  );
}
function State({
  icon,
  title,
  text,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
  action?: React.ReactNode;
}) {
  return (
    <main className={styles.state}>
      <span>{icon}</span>
      <h1>{title}</h1>
      <p>{text}</p>
      {action}
    </main>
  );
}
