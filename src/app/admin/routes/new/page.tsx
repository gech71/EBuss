
import prisma from "@/lib/prisma";
import { NewRouteForm } from "@/components/admin/NewRouteForm";

export default async function NewRoutePage() {
    const [locations, buses, discounts] = await Promise.all([
        prisma.route.findMany({
            select: { origin: true, destination: true },
        }),
        prisma.bus.findMany({ orderBy: { name: 'asc' } }),
        prisma.discount.findMany({ orderBy: { name: 'asc' } })
    ]);

    const locationSet = new Set<string>();
    locations.forEach(route => {
        locationSet.add(route.origin);
        locationSet.add(route.destination);
    });
    const uniqueLocations = Array.from(locationSet).sort();

    return (
        <NewRouteForm 
            locations={uniqueLocations}
            buses={buses}
            discounts={discounts}
        />
    );
}
