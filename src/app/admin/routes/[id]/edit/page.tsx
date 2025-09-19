
import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import { EditRouteForm } from "@/components/admin/EditRouteForm";

interface EditRoutePageProps {
    params: { id: string };
}

export default async function EditRoutePage({ params }: EditRoutePageProps) {

    const route = await prisma.route.findUnique({
        where: { id: params.id },
    });

    if (!route) {
        notFound();
    }
    
    const [locations, buses, discounts] = await Promise.all([
        prisma.location.findMany({ orderBy: { name: 'asc' } }),
        prisma.bus.findMany({ orderBy: { name: 'asc' } }),
        prisma.discount.findMany({ orderBy: { name: 'asc' } })
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
