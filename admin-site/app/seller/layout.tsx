import type { Metadata } from "next";
import { SellerAdminShell } from "@/components/seller/SellerAdminShell";

export const metadata: Metadata = {
  title: "AOS Seller Admin",
  description: "판매점 전용 관리자 영역",
};

export default function SellerAdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <SellerAdminShell>{children}</SellerAdminShell>;
}
