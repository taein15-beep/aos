import { redirect } from "next/navigation";
import { SELLER_ADMIN_BASE_PATH } from "@/lib/seller/navigation";

/** /seller → 대시보드 */
export default function SellerAdminRootPage() {
  redirect(`${SELLER_ADMIN_BASE_PATH}/dashboard`);
}
