"use client";

import { Eye, EyeOff } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  createSellerSessionCookieValue,
  SELLER_MOCK_PASSWORD,
  SELLER_REMEMBERED_LOGIN_ID_KEY,
  validateSellerLogin,
} from "@/lib/seller/auth";
import { SELLER_ADMIN_DEMO_PROFILE } from "@/lib/seller/seller-admin-profile";
import { SELLER_ADMIN_BASE_PATH } from "@/lib/seller/navigation";

export default function SellerLoginPage() {
  const router = useRouter();
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [rememberId, setRememberId] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const remembered =
      typeof window !== "undefined"
        ? window.localStorage.getItem(SELLER_REMEMBERED_LOGIN_ID_KEY)
        : null;
    if (remembered) {
      setLoginId(remembered);
      setRememberId(true);
    }
  }, []);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedId = loginId.trim();
    if (!trimmedId) {
      setErrorMessage("아이디를 입력해 주세요.");
      return;
    }
    if (!password.trim()) {
      setErrorMessage("비밀번호를 입력해 주세요.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");

    await new Promise((resolve) => window.setTimeout(resolve, 450));

    const next = new URLSearchParams(window.location.search).get("next");
    const nextPath =
      next && next.startsWith(`${SELLER_ADMIN_BASE_PATH}/`)
        ? next
        : `${SELLER_ADMIN_BASE_PATH}/dashboard`;

    const result = validateSellerLogin(trimmedId, password);
    if (!result.ok) {
      setIsSubmitting(false);
      setErrorMessage(result.message);
      return;
    }

    document.cookie = createSellerSessionCookieValue(result.account);
    if (rememberId) {
      window.localStorage.setItem(SELLER_REMEMBERED_LOGIN_ID_KEY, trimmedId);
    } else {
      window.localStorage.removeItem(SELLER_REMEMBERED_LOGIN_ID_KEY);
    }
    router.replace(nextPath);
    router.refresh();
  };

  return (
    <div className="seller-login-page">
      <div className="seller-login-card panel">
        <div className="seller-login-brand">
          <div className="seller-login-logo" aria-hidden="true">
            A
          </div>
          <strong>AOS</strong>
          <span>판매점 관리자</span>
          <p>승인된 판매점 계정으로 로그인해주세요.</p>
        </div>

        <form className="seller-login-form" onSubmit={submit} noValidate>
          <label className="seller-login-field">
            <span>아이디</span>
            <input
              type="text"
              value={loginId}
              onChange={(event) => setLoginId(event.target.value)}
              placeholder="판매점 아이디"
              autoComplete="username"
              aria-invalid={errorMessage ? true : undefined}
            />
          </label>

          <label className="seller-login-field">
            <span>비밀번호</span>
            <div className="seller-login-password">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="비밀번호"
                autoComplete="current-password"
                aria-invalid={errorMessage ? true : undefined}
              />
              <button
                type="button"
                className="secondary seller-login-password-toggle"
                onClick={() => setShowPassword((value) => !value)}
                aria-label={showPassword ? "비밀번호 숨기기" : "비밀번호 보기"}
              >
                {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                <span>{showPassword ? "숨김" : "보기"}</span>
              </button>
            </div>
          </label>

          <div className="seller-login-row">
            <label className="seller-login-check">
              <input
                type="checkbox"
                checked={rememberId}
                onChange={(event) => setRememberId(event.target.checked)}
              />
              <span>아이디 저장</span>
            </label>
            <button type="button" className="seller-login-link">
              비밀번호 찾기
            </button>
          </div>

          {errorMessage ? (
            <p className="seller-login-error" role="alert">
              {errorMessage}
            </p>
          ) : (
            <p className="seller-login-helper" role="note">
              판매점 관리자 계정은 승인된 판매점만 이용할 수 있습니다.
            </p>
          )}

          <button type="submit" className="primary seller-login-submit" disabled={isSubmitting}>
            {isSubmitting ? "로그인 중..." : "로그인"}
          </button>
        </form>

        <div className="seller-login-support">
          <div>
            <strong>판매점 관리자 문의 안내</strong>
            <p>계정 승인 및 접속 문의는 담당 운영자 또는 AOS 지원센터로 문의해 주세요.</p>
          </div>
          <div className="seller-login-support-note">
            <span>테스트용 Mock 계정</span>
            <strong>
              {SELLER_ADMIN_DEMO_PROFILE.loginId} / {SELLER_MOCK_PASSWORD}
            </strong>
          </div>
        </div>
      </div>
    </div>
  );
}
