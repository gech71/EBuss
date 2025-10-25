
import { notFound, redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { validateRequest } from "@/app/lib/auth";
import { EditLocationForm } from "@/components/admin/EditLocationForm";

interface EditLocationPageProps {
    params: { id: string };
}

export default async function EditLocationPage({ params }: EditLocationPageProps) {
    const { user } = await validateRequest();
    if (!user || !user.busOwnerId) {
        return redirect('/login');
    }

    const location = await prisma.location.findFirst({
        where: { 
            id: params.id,
            ownerId: user.busOwnerId
        },
    });

    if (!location) {
        notFound();
    }
    
    return (
       <EditLocationForm location={location} />
    );
}
