import { DomesticPage } from "../DomesticPage";

export default async function Page({ params }: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await params;
  return <DomesticPage path={`/domestic/${slug.join("/")}`} />;
}
