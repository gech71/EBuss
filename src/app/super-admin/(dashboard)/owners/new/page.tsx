
import prisma from "@/lib/prisma";
import { NewOwnerForm } from "@/components/super-admin/NewOwnerForm";

export default async function NewOwnerPage() {
    const allOwners = await prisma.busOwner.findMany({
        select: {
            name: true,
            bankAccountNumber: true,
        }
    });

    const allUsers = await prisma.user.findMany({
        select: {
            email: true
        }
    });

    const existingOwnerNames = allOwners.map(o => o.name);
    const existingAccountNumbers = allOwners.map(o => o.bankAccountNumber);
    const existingEmails = allUsers.map(u => u.email);

    return (
        <NewOwnerForm 
            existingOwnerNames={existingOwnerNames} 
            existingAccountNumbers={existingAccountNumbers} 
            existingEmails={existingEmails}
        />
    );
}
