
'use client';

import React from 'react';
import { DataContext, useDataProvider } from '@/lib/store';

export function Providers({ children }: { children: React.ReactNode }) {
    const data = useDataProvider();
    return <DataContext.Provider value={data}>{children}</DataContext.Provider>;
}
