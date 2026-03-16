'use client';

import { useFormStatus } from 'react-dom';
import { PremiumButton } from '@/ui/components/modules/buttons/PremiumButton';
import { refreshAuditData } from '@/app/actions/audit-finance';

type AuditSyncButtonProps = {
    path: string;
};

function AuditSyncButtonContent() {
    const { pending } = useFormStatus();

    return (
        <PremiumButton
            type="submit"
            disabled={pending}
            variant="primary"
            className="shadow-[0_0_18px_hsl(var(--primary)/0.55)] min-w-[230px]"
        >
            {pending ? (
                <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Sincronizando...
                </>
            ) : (
                <>
                    <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Sincronizar con Supabase
                </>
            )}
        </PremiumButton>
    );
}

export function AuditSyncButton({ path }: AuditSyncButtonProps) {
    return (
        <form action={refreshAuditData} className="inline-flex">
            <input type="hidden" name="path" value={path} />
            <AuditSyncButtonContent />
        </form>
    );
}
