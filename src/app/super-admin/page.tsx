
"use client";

import { RecentBookings } from "@/components/admin/RecentBookings";
import { Analytics } from "@/components/admin/Analytics";

export default function SuperAdminDashboard() {
  return (
    <div className="space-y-8">
      <Analytics />
      <div>
        <RecentBookings />
      </div>
    </div>
  );
}
