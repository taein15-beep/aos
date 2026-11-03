"use client";

import { useState } from "react";
import { ProductAdminShell } from "@/components/products/ProductAdminShell";
import { HomeDesignEditor } from "./HomeDesignEditor";
import "./home-design.css";

export default function HomeDesignPage() {
  const [toast, setToast] = useState("");

  const notify = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2200);
  };

  return (
    <ProductAdminShell
      activeMenu="시스템설정"
      currentChild="홈페이지설정"
      breadcrumb={
        <>
          <span>시스템설정</span>
          <b>/</b>
          <strong>홈페이지설정</strong>
        </>
      }
      toast={toast}
      onNotify={notify}
    >
      <HomeDesignEditor />
    </ProductAdminShell>
  );
}
