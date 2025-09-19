
import prisma from "@/lib/prisma";
import { NewOwnerForm } from "@/components/super-admin/NewOwnerForm";

export default async function NewOwnerPage() {
    const allOwners = await prisma.busOwner.findMany({
        select: {
            name: true
        }
    });

    const existingOwnerNames = allOwners.map(o => o.name);

    return (
        <NewOwnerForm existingOwnerNames={existingOwnerNames} />
    );
}
