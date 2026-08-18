import "./domestic.css";
import { DomesticShell } from "./DomesticShell";

export default function DomesticLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <DomesticShell>{children}</DomesticShell>;
}
