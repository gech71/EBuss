
import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import { EditOwnerForm } from "@/components/super-admin/EditOwnerForm";
import type { CommissionTier, BusOwner } from "@prisma/client";

interface EditOwnerPageProps {
    params: { id: string };
}

export default async function EditOwnerPage({ params }: EditOwnerPageProps) {
    const owner = await prisma.busOwner.findUnique({
        where: { id: params.id },
        include: {
            commissionTiers: {
                orderBy: {
                    minSales: 'asc'
                }
            }
        }
    });

    const allOwners = await prisma.busOwner.findMany({
        where: {
            id: {
                not: params.id
            }
        },
        select: {
            name: true
        }
    });

    if (!owner) {
        notFound();
    }

    const otherOwnerNames = allOwners.map(o => o.name);

    // Prisma returns Decimal for 'value', need to convert to number for the form
    const sanitizedOwner = {
        ...owner,
        commissionTiers: owner.commissionTiers.map(tier => ({
            ...tier,
            value: tier.value.toNumber()
        }))
    } as BusOwner & { commissionTiers: CommissionTier[] }


    return (
        <EditOwnerForm owner={sanitizedOwner} otherOwnerNames={otherOwnerNames} />
    );
}

