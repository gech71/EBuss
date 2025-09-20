
import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import { validateRequest } from "@/app/lib/auth";
import { EditDiscountForm } from "@/components/admin/EditDiscountForm";

interface EditDiscountPageProps {
    params: { id: string };
}

export default async function EditDiscountPage({ params }: EditDiscountPageProps) {
    const { user } = await validateRequest();

    const discount = await prisma.discount.findUnique({
        where: { 
            id: params.id,
            // Security: Ensure the user can only edit their own discounts
            ownerId: user?.busOwnerId 
        },
        include: { tiers: { orderBy: { minTickets: 'asc' } } }
    });

    if (!discount) {
        notFound();
    }
    
    // Prisma returns Decimal for 'value', which needs to be serialized for the client.
    const sanitizedDiscount = {
      ...discount,
      tiers: discount.tiers.map(tier => ({...tier, percentage: tier.percentage}))
    }

    return (
       <EditDiscountForm discount={sanitizedDiscount} />
    );
}
