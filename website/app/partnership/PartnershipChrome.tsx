import { SiteFooter, SiteHeader } from "../components/SiteHeader";

export function PartnershipChrome({ children }: { children: React.ReactNode }) {
  return (
    <div className="partnership-site">
      <SiteHeader variant="partnership" />
      {children}
      <SiteFooter variant="partnership" />
    </div>
  );
}
