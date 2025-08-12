import { Header } from "@/components/Header";
import { TicketDisplay } from "@/components/booking/TicketDisplay";
import { notFound } from "next/navigation";

export default function TicketPage({ params }: { params: { id: string } }) {
  // Extract routeId from ticketId if the structure is consistent
  const routeId = params.id.split('-')[1];
  if (!routeId) {
      notFound();
  }

  return (
    <div className="flex flex-col min-h-screen bg-muted/30">
      <Header />
      <main className="flex-1 container mx-auto py-8 px-4 flex items-center justify-center">
        <TicketDisplay ticketId={params.id} routeId={routeId} />
      </main>
    </div>
  );
}
