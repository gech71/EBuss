
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
        prisma.route.findMany({
            select: { origin: true, destination: true },
        }),
        prisma.bus.findMany({ orderBy: { name: 'asc' } }),
        prisma.discount.findMany({ orderBy: { name: 'asc' } })
    ]);

    const locationSet = new Set<string>();
    locations.forEach(loc => {
        locationSet.add(loc.origin);
        locationSet.add(loc.destination);
    });
    const uniqueLocations = Array.from(locationSet).sort();


    return (
       <EditRouteForm 
            route={route}
            locations={uniqueLocations}
            buses={buses}
            discounts={discounts}
        />
    );
}

