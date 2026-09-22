import { sellerLogoInitial } from "@/lib/seller/seller-admin-profile";

type SellerLogoProps = {
  sellerName: string;
  logoUrl?: string | null;
  size?: "sidebar" | "header";
};

export function SellerLogo({ sellerName, logoUrl, size = "sidebar" }: SellerLogoProps) {
  const className = size === "sidebar" ? "seller-logo seller-logo--sidebar" : "seller-logo seller-logo--header";

  if (logoUrl) {
    return (
      <span className={className} aria-hidden="true">
        <img src={logoUrl} alt="" />
      </span>
    );
  }

  return (
    <span className={`${className} seller-logo--placeholder`} aria-hidden="true">
      {sellerLogoInitial(sellerName)}
    </span>
  );
}
