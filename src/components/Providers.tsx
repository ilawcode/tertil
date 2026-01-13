'use client';

import { SessionProvider } from 'next-auth/react';
import { LocaleProvider } from '@/context/LocaleContext';
import { ReactNode } from 'react';

interface ProvidersProps {
    children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
    return (
        <SessionProvider>
            <LocaleProvider>{children}</LocaleProvider>
        </SessionProvider>
    );
}
