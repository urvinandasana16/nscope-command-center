import { DetailPage } from "@/components/prototype-pages";
import { clients, devices, tickets } from "@/lib/mock-data";
import { slugify } from "@/lib/utils";

export function generateStaticParams() {
  return [
    ...clients.map((client) => ({ section: "clients", id: client.id })),
    ...devices.map((device) => ({ section: "devices", id: device.id })),
    ...tickets.map((ticket) => ({ section: "tickets", id: slugify(ticket.id) })),
  ];
}

export default async function DetailRoute({
  params,
}: {
  params: Promise<{ section: string; id: string }>;
}) {
  const { section, id } = await params;
  return <DetailPage section={section} id={id} />;
}
