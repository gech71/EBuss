import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import { EditOwnerForm } from "@/components/super-admin/EditOwnerForm";
import type { CommissionTier, BusOwner } from "@prisma/client";

interface EditOwnerPageProps {
  params: { id: string };
}

export default async function EditOwnerPage({ params }: EditOwnerPageProps) {
  const { id } = (await params) as { id: string };
  const ownerData = await prisma.busOwner.findUnique({
    where: { id: id },
    include: {
      commissionTiers: {
        orderBy: {
          minSales: "asc",
        },
      },
    },
  });

  const allOwners = await prisma.busOwner.findMany({
    where: {
      id: {
        not: id,
      },
    },
    select: {
      name: true,
    },
  });

  if (!ownerData) {
    notFound();
  }

  const otherOwnerNames = allOwners.map((o) => o.name);

  // Sanitize Decimal fields for client components
  const owner = {
    ...ownerData,
    commissionTiers: ownerData.commissionTiers.map((tier) => ({
      ...tier,
      value: Number(tier.value),
    })),
  };

  return <EditOwnerForm owner={owner} otherOwnerNames={otherOwnerNames} />;
}
