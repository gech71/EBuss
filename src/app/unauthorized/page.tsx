
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldAlert } from "lucide-react";
import Link from "next/link";
import { useData } from "@/lib/store";
import { useRouter } from "next/navigation";

export default function UnauthorizedPage() {
    const { loggedInUser, isSuperAdmin } = useData();
    const router = useRouter();

    const getHomePage = () => {
        if (isSuperAdmin) return "/super-admin";
        if (loggedInUser && loggedInUser.ownerId !== 'customer') return "/admin";
        return "/";
    }
    
    return (
        <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
            <Card className="w-full max-w-md text-center">
                <CardHeader>
                    <div className="mx-auto bg-destructive/10 text-destructive p-3 rounded-full w-fit">
                        <ShieldAlert className="h-10 w-10" />
                    </div>
                    <CardTitle className="mt-4">Unauthorized Access</CardTitle>
                    <CardDescription>
                        You do not have the necessary permissions to view this page.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground">
                        Please contact your administrator if you believe this is an error.
                    </p>
                </CardContent>
                <CardFooter>
                    <Button asChild className="w-full">
                        <Link href={getHomePage()}>
                            Go to Homepage
                        </Link>
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}
