
"use client";

import { Header } from "@/components/Header";
import { TicketDisplay } from "@/components/booking/TicketDisplay";

export default function TicketPage({ params }: { params: { id: string } }) {
  return (
    <div className="flex flex-col min-h-screen bg-muted/30">
      <Header />
      <main className="flex-1 container mx-auto py-8 px-4 flex items-center justify-center">
        <TicketDisplay ticketId={params.id} />
      </main>
    </div>
  );
}
