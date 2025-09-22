
import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import { EditRouteForm } from "@/components/admin/EditRouteForm";
import { validateRequest } from "@/app/lib/auth";
import { redirect } from "next/navigation";

interface EditRoutePageProps {
    params: { id: string };
}

export default async function EditRoutePage({ params }: EditRoutePageProps) {
    const { user } = await validateRequest();
    if (!user || !user.busOwnerId) {
        return redirect('/login');
    }

    const route = await prisma.route.findFirst({
        where: { 
            id: params.id,
            bus: {
                ownerId: user.busOwnerId
            }
        },
    });

    if (!route) {
        notFound();
    }
    
    const [locations, buses, discounts] = await Promise.all([
        prisma.location.findMany({ where: { ownerId: user.busOwnerId }, orderBy: { name: 'asc' } }),
        prisma.bus.findMany({ where: { ownerId: user.busOwnerId }, orderBy: { name: 'asc' } }),
        prisma.discount.findMany({ where: { ownerId: user.busOwnerId }, orderBy: { name: 'asc' } })
    ]);

    return (
       <EditRouteForm 
            route={route}
            locations={locations}
            buses={buses}
            discounts={discounts}
        />
    );
}
