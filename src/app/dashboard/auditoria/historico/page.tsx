import { getRawHistoricalData } from '@/app/actions/audit-history';

export const dynamic = 'force-dynamic';

export default async function HistoricoAuditPage() {
    const data = await getRawHistoricalData();
    const hasData = data && data.length > 0;
    
    // Extracción dinámica de cabeceras de la tabla legacy
    const headers = hasData ? Object.keys(data[0]) : [];

    return (
        <div className="flex flex-col gap-6 w-full p-6 md:p-10">
            {/* Encabezado */}
            <div>
                <h1 className="text-2xl font-black italic tracking-tight text-white mb-2 uppercase flex items-center gap-2">
                    <span className="w-1.5 h-6 bg-accent block shadow-[0_0_10px_rgba(6,182,212,0.5)]"></span>
                    Auditoría: Tabla Verdad Histórico (RAW)
                </h1>
                <p className="text-sm text-muted-foreground uppercase tracking-widest font-semibold max-w-2xl">
                    Visualización cruda de registros migrados de SIA 2.0.
                </p>
            </div>

            {/* CONTENEDOR GRID (LA SOLUCIÓN DEFINITIVA) */}
            <div className="glass-panel rounded-xl border border-white/10 w-full p-4 grid grid-cols-1 bg-black/60 shadow-2xl">
                <div className="overflow-x-auto w-full custom-scrollbar">
                    <table className="w-full text-left border-collapse whitespace-nowrap">
                        <thead>
                            <tr>
                                {headers.map((key) => (
                                    <th key={key} className="px-6 py-4 bg-white/5 text-primary uppercase text-xs font-bold border-b border-white/10">
                                        {key.replace(/_/g, ' ')}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {data.map((row, index) => (
                                <tr key={index} className="hover:bg-white/5 transition-colors group">
                                    {headers.map((key, i) => {
                                        const val = row[key];
                                        return (
                                            <td key={i} className="px-6 py-4 border-b border-white/5 text-sm text-white/90 group-hover:border-accent/10">
                                                {val !== null && val !== undefined ? String(val) : <span className="text-white/10 italic text-[10px]">— void</span>}
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Footer / Info Tooltip */}
            <footer className="flex justify-end pr-2">
                <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                    <span className="text-[9px] font-black uppercase tracking-widest text-primary/70">Source: Supabase • Table: Tabla_Verdad_Estudiantes</span>
                </div>
            </footer>
        </div>
    );
}
