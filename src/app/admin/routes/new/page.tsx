
import prisma from "@/lib/prisma";
import { NewRouteForm } from "@/components/admin/NewRouteForm";
import { validateRequest } from "@/lib/server/auth";
import { redirect } from "next/navigation";

export default async function NewRoutePage() {
    const { user } = await validateRequest();
    if (!user || !user.busOwnerId) {
        return redirect('/login');
    }

    const [locations, buses, discounts] = await Promise.all([
        prisma.location.findMany({ 
            where: { ownerId: user.busOwnerId },
            orderBy: { name: 'asc' } 
        }),
        prisma.bus.findMany({ 
            where: { ownerId: user.busOwnerId },
            orderBy: { name: 'asc' } 
        }),
        prisma.discount.findMany({ 
            where: { ownerId: user.busOwnerId },
            orderBy: { name: 'asc' } 
        })
    ]);

    return (
        <NewRouteForm 
            locations={locations}
            buses={buses}
            discounts={discounts}
        />
    );
}
