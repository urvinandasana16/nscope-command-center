import { ConsolePage, consoleSections } from "@/components/prototype-pages";

export function generateStaticParams() {
  return consoleSections.map((section) => ({ section }));
}

export default async function SectionPage({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;
  return <ConsolePage section={section} />;
}
