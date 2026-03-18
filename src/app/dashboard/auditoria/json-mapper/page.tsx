import { createClient } from '@/infra/services/server';

export const dynamic = 'force-dynamic';

export default async function JsonMapperAuditPage() {
    const supabase = await createClient();

    // Traer 50 estudiantes para diagnóstico inicial
    const { data: students, error } = await supabase
        .from('students')
        .select(`
            id,
            document_number,
            first_name,
            last_name,
            father_info,
            mother_info,
            guardian_info_detailed,
            health_insurance
        `)
        .order('created_at', { ascending: false })
        .limit(50);

    if (error) {
        return (
            <div className="p-8">
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-6 rounded-2xl">
                    <h2 className="text-xl font-black mb-2">Error de Conexión</h2>
                    <p className="font-mono text-sm">{error.message}</p>
                </div>
            </div>
        );
    }

    // Helper para parsear de forma segura y extraer las llaves/valor
    const safeParseJsonb = (data: any) => {
        if (!data) return { obj: null, error: false };
        try {
            const obj = typeof data === 'string' ? JSON.parse(data) : data;
            return { obj, error: false };
        } catch (e: any) {
            return { obj: null, error: true, raw: data, msg: e.message };
        }
    };

    const XRayCell = ({ data, label }: { data: any; label: string }) => {
        const { obj, error, raw, msg } = safeParseJsonb(data);

        if (error) {
            return (
                <div className="relative p-3 bg-red-500/5 border border-red-500/20 rounded-lg">
                    <span className="absolute -top-2 left-2 px-1 bg-black text-[9px] font-black uppercase text-red-500 tracking-widest">{label} - CORRUPTO</span>
                    <pre className="text-[10px] text-red-400 font-mono whitespace-pre-wrap mt-1">{String(raw)}</pre>
                    <p className="text-[9px] text-red-500/50 mt-1">{msg}</p>
                </div>
            );
        }

        if (!obj || Object.keys(obj).length === 0) {
            return (
                <div className="p-2 border border-white/5 rounded-lg flex items-center justify-center opacity-30">
                    <span className="text-[10px] uppercase font-bold text-white tracking-widest">N/A</span>
                </div>
            );
        }

        const keys = Object.keys(obj);

        return (
            <div className="relative p-4 bg-primary/5 border border-primary/20 rounded-xl hover:border-primary/40 transition-colors">
                <span className="absolute -top-2 left-3 px-1.5 bg-background text-[9px] font-black uppercase text-primary tracking-widest shadow-sm">
                    {label} HEADERS
                </span>
                
                <div className="flex flex-wrap gap-1 mb-3 pt-1">
                    {keys.map(key => (
                        <span key={key} className="px-1.5 py-0.5 rounded-sm bg-primary/10 text-primary text-[10px] font-mono font-bold leading-none border border-primary/20">
                            {key}
                        </span>
                    ))}
                </div>

                <div className="bg-black/50 p-2.5 rounded-lg border border-white/5">
                    <pre className="text-[10px] text-white/70 font-mono whitespace-pre-wrap break-all leading-tight">
                        {JSON.stringify(obj, null, 2)}
                    </pre>
                </div>
            </div>
        );
    };

    return (
        <div className="p-6 md:p-8 space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-3">
                    <span className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 21h7a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v11m0 5l4.879-4.879m0 0a3 3 0 104.243-4.242 3 3 0 00-4.243 4.242z" />
                        </svg>
                    </span>
                    Auditoría de Integridad JSONB (Mapper)
                </h1>
                <p className="mt-2 text-sm text-white/50">
                    Herramienta de diagnóstico para inspección cruda de datos anidados provenientes de SIA 2.0. Mostrando últimos 50 registros.
                </p>
            </div>

            {/* DataGrid */}
            <div className="bg-black/40 border border-white/10 rounded-[24px] overflow-hidden shadow-2xl">
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse min-w-[1200px]">
                        <thead>
                            <tr className="border-b border-white/10 bg-white/5">
                                <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-white/40 w-1/5 shrink-0">Estudiante</th>
                                <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-white/40 w-1/4">Ficha Padre</th>
                                <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-white/40 w-1/4">Ficha Madre</th>
                                <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-white/40 w-1/4">Acudiente / Médica</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {students?.map((student) => (
                                <tr key={student.id} className="hover:bg-white/[0.02] transition-colors">
                                    <td className="px-6 py-6 align-top">
                                        <div className="flex flex-col gap-1">
                                            <span className="font-bold text-sm text-white">{student.first_name} {student.last_name}</span>
                                            <span className="text-[10px] font-mono text-white/40 border border-white/10 px-1.5 py-0.5 rounded-md inline-block w-fit">
                                                DOC: {student.document_number || 'N/A'}
                                            </span>
                                            <span className="text-[9px] text-white/20 font-mono mt-1 break-all">ID: {student.id}</span>
                                        </div>
                                    </td>
                                    
                                    <td className="px-6 py-6 align-top">
                                        <XRayCell data={student.father_info} label="Father" />
                                    </td>
                                    
                                    <td className="px-6 py-6 align-top">
                                        <XRayCell data={student.mother_info} label="Mother" />
                                    </td>
                                    
                                    <td className="px-6 py-6 align-top">
                                        <div className="flex flex-col gap-4">
                                            <XRayCell data={student.guardian_info_detailed} label="Guardian" />
                                            
                                            {/* Salud (texto simple pero diagnóstico) */}
                                            <div className="p-3 bg-white/5 border border-white/10 rounded-lg flex flex-col gap-1">
                                                <span className="text-[9px] font-black uppercase tracking-widest text-cyan-400">Salud (String)</span>
                                                <span className="text-xs font-mono text-white/70">{student.health_insurance || 'N/A'}</span>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            ))}

                            {students?.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="px-6 py-12 text-center text-sm font-bold text-white/40">
                                        No hay estudiantes en la base de datos.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
