
"use client";

import { Header } from "@/components/Header";
import { TicketDisplay } from "@/components/booking/TicketDisplay";
import { useParams } from "next/navigation";

export default function TicketPage() {
  const params = useParams();
  const ticketId = params.id as string;

  return (
    <div className="flex flex-col min-h-screen bg-muted/30">
      <Header />
      <main className="flex-1 container mx-auto py-8 px-4 flex items-center justify-center">
        <TicketDisplay ticketId={ticketId} />
      </main>
    </div>
  );
}
