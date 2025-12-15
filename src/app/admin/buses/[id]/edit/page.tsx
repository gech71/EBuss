import { notFound, redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { validateRequest } from "@/lib/server/auth";
import { EditBusForm } from "@/components/admin/EditBusForm";

interface EditBusPageProps {
  params: { id: string };
}

export default async function EditBusPage({ params }: EditBusPageProps) {
  const { id } = (await params) as { id: string };
  const { user } = await validateRequest();
  if (!user || !user.busOwnerId) {
    return redirect("/login");
  }

  const bus = await prisma.bus.findFirst({
    where: {
      id: id,
      ownerId: user.busOwnerId,
    },
    include: {
      layout: {
        include: {
          seats: true,
        },
      },
    },
  });

  if (!bus) {
    notFound();
  }

  // It's good practice to check if the bus is editable on the server-side as well
  const routeCount = await prisma.route.count({ where: { busId: id } });
  if (routeCount > 0) {
    // Or show a more friendly "This bus cannot be edited" page
    return redirect("/admin/buses?error=bus_in_use");
  }

  return <EditBusForm bus={bus} />;
}
