import { SiteFooter, SiteHeader } from "../components/SiteHeader";

export function SellerChrome({ children }: { children: React.ReactNode }) {
  return (
    <div className="seller-site">
      <SiteHeader variant="seller" />
      {children}
      <SiteFooter variant="seller" />
    </div>
  );
}
