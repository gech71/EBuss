
import { notFound, redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { validateRequest } from "@/lib/server/auth";
import { EditBusForm } from "@/components/admin/EditBusForm";

interface EditBusPageProps {
    params: { id: string };
}

export default async function EditBusPage({ params }: EditBusPageProps) {
    const { user } = await validateRequest();
    if (!user || !user.busOwnerId) {
        return redirect('/login');
    }

    const bus = await prisma.bus.findFirst({
        where: { 
            id: params.id,
            ownerId: user.busOwnerId
        },
        include: {
            layout: {
                include: {
                    seats: true
                }
            },
            _count: {
                select: { routes: true }
            }
        }
    });

    if (!bus) {
        notFound();
    }
    
    // Server-side check to prevent editing a bus with routes
    if (bus._count.routes > 0) {
        // Redirect or show an error page. Redirecting is cleaner.
        return redirect('/admin/buses?error=edit_in_use');
    }

    if (!bus.layout) {
        // This case should ideally not happen if a bus is created correctly
        // but it's good to handle it.
         return <p>Error: This bus does not have a layout and cannot be edited.</p>
    }

    return (
       <EditBusForm bus={bus} />
    );
}
