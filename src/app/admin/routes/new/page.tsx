
import prisma from "@/lib/prisma";
import { NewRouteForm } from "@/components/admin/NewRouteForm";

export default async function NewRoutePage() {
    const [locations, buses, discounts] = await Promise.all([
        prisma.location.findMany({ orderBy: { name: 'asc' } }),
        prisma.bus.findMany({ orderBy: { name: 'asc' } }),
        prisma.discount.findMany({ orderBy: { name: 'asc' } })
    ]);

    return (
        <NewRouteForm 
            locations={locations}
            buses={buses}
            discounts={discounts}
        />
    );
}
