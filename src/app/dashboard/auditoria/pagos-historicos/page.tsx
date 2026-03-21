import { fetchLegacyPaymentsAudit } from '@/app/actions/audit-legacy-payments';
import AuditTableClient from './AuditTableClient';
import { AuditRecord } from '@/app/actions/audit-legacy-payments';

// Forzar renderizado dinámico para obtener datos frescos de Google Sheets cada vez
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function AuditPagosHistoricosPage() {
    let auditData: AuditRecord[] = [];
    
    try {
        // Obtenemos los datos desde la Server Action en el servidor
        auditData = await fetchLegacyPaymentsAudit();
    } catch (error) {
        console.error('[PAGE AUDITORY] Error fetching legacy payments:', error);
        // Dejamos auditData como [] para que el Client Component maneje el empty state
    }

    return (
        <main className="min-h-screen bg-[#030712] selection:bg-cyan-500/30">
            {/* Pasamos los datos al componente cliente con resiliencia */}
            <AuditTableClient initialData={auditData || []} />
        </main>
    );
}
