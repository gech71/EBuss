
"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useData } from '@/lib/store';

type AuthRedirectOptions = {
    requiredRole?: 'admin' | 'super-admin';
    loginPath?: string;
};

export function useAuthRedirect(options: AuthRedirectOptions = {}) {
    const { requiredRole, loginPath = '/login' } = options;
    const { loggedInUserId, isSuperAdmin, loading: dataLoading } = useData();
    const router = useRouter();
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (dataLoading) {
            return; // Wait for data to be loaded, including auth state from localStorage
        }

        let shouldRedirect = false;
        const isAdmin = loggedInUserId && !isSuperAdmin;

        if (!loggedInUserId) {
            if (requiredRole) {
                router.replace(loginPath);
                shouldRedirect = true;
            }
        } else {
            if (requiredRole === 'admin') {
                if (!isAdmin) {
                    router.replace('/unauthorized');
                    shouldRedirect = true;
                }
            } else if (requiredRole === 'super-admin') {
                if (!isSuperAdmin) {
                    router.replace('/unauthorized');
                    shouldRedirect = true;
                }
            }
        }
        
        // Only set loading to false if we are not about to redirect.
        // The component will unmount on redirect anyway.
        if (!shouldRedirect) {
            setLoading(false);
        }

    }, [loggedInUserId, isSuperAdmin, requiredRole, router, dataLoading, loginPath]);

    return { loading: loading || dataLoading };
}
