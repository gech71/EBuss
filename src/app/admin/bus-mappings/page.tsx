
import prisma from "@/lib/prisma";
import { validateRequest } from "@/lib/server/auth";
import { redirect } from "next/navigation";
import { BusMappingsClient } from "@/components/admin/BusMappingsClient";

export default async function AdminBusMappingsPage() {
  const { user } = await validateRequest();
  if (!user || !user.busOwnerId) {
    return redirect('/login');
  }

  const [buses, locations, mappings] = await Promise.all([
    prisma.bus.findMany({
      where: { ownerId: user.busOwnerId },
      orderBy: { name: 'asc' }
    }),
    prisma.location.findMany({
      where: { ownerId: user.busOwnerId },
      orderBy: { name: 'asc' }
    }),
    prisma.busRoute.findMany({
      where: {
        bus: {
          ownerId: user.busOwnerId
        }
      },
      include: {
        bus: true,
        origin: true,
        destination: true,
      },
      orderBy: [
        { bus: { name: 'asc' } },
        { origin: { name: 'asc' } },
        { destination: { name: 'asc' } }
      ]
    })
  ]);

  return (
    <div className="space-y-6">
      <BusMappingsClient buses={buses} locations={locations} initialMappings={mappings} />
    </div>
  );
}
