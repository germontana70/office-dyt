import { getRecitalesBySemester, getRecitalItems, getPoolItems } from '@/app/actions/muestras';
import { MuestrasDashboard } from '@/modules/muestras/components/MuestrasDashboard';
import { getActiveSemesterName } from '@/modules/configuracion/actions/set-active-semester';
import type { MuestraPresentacion } from '@/infra/types/muestras';

export const dynamic = 'force-dynamic';

export default async function MuestrasPage() {
    const semester = (await getActiveSemesterName()) ?? '2026-1';

    const { recitales = [] } = await getRecitalesBySemester(semester);
    const { items: poolItems = [] } = await getPoolItems(semester);

    // Cargar items de todos los recitales del semestre
    let allItems: MuestraPresentacion[] = [];
    for (const recital of recitales) {
        const { items = [] } = await getRecitalItems(recital.id);
        allItems = [...allItems, ...items];
    }

    // Extraer listas únicas para los filtros (combinar pool y recital items)
    const teachers = [...new Set([
        ...allItems.map((i) => i.teacher_name),
        ...poolItems.map((i) => i.teacher_name)
    ].filter(Boolean))].sort();
    
    const instruments = [...new Set([
        ...allItems.map((i) => i.instrument),
        ...poolItems.map((i) => i.instrument)
    ].filter(Boolean))].sort();

    return (
        <div className="relative min-h-screen w-full overflow-hidden p-6 md:p-10">
            {/* Glassmorphism Environment */}
            <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-accent/8 blur-[150px] rounded-full pointer-events-none" />
            <div className="absolute bottom-1/4 left-1/4 w-[400px] h-[400px] bg-primary/8 blur-[150px] rounded-full pointer-events-none" />

            <main className="relative z-10 max-w-7xl mx-auto space-y-8">
                {/* Cabecera Premium */}
                <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 animate-in slide-in-from-top-6 fade-in duration-700">
                    <div className="space-y-3">
                        <div className="flex items-center gap-3">
                            <div className="w-1.5 h-8 bg-accent rounded-full shadow-[0_0_15px_hsl(var(--accent))]" />
                            <h1 className="text-3xl font-black tracking-tighter text-foreground drop-shadow-md uppercase italic">
                                Programación de Muestras
                            </h1>
                        </div>
                        <p className="text-muted-foreground text-sm max-w-xl leading-relaxed font-medium">
                            Importa archivos de Google Sheets al Pool Maestro y arma tus recitales asignando las presentaciones dinámicamente.
                        </p>
                    </div>

                    {/* Semestre Badge */}
                    <div className="flex items-center gap-2 px-4 py-2 bg-black/30 backdrop-blur-xl border border-accent/20 rounded-2xl">
                        <span className="w-2 h-2 bg-accent rounded-full animate-pulse" />
                        <span className="text-xs font-black uppercase tracking-widest text-accent">
                            Semestre {semester}
                        </span>
                    </div>
                </header>

                {/* Stats Row */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-in slide-in-from-bottom-4 fade-in duration-700 delay-100">
                    {[
                        {
                            label: 'En Pool',
                            value: poolItems.length,
                            color: 'text-primary',
                            bg: 'bg-primary/10 border-primary/20',
                        },
                        {
                            label: 'Recitales',
                            value: recitales.length,
                            color: 'text-accent',
                            bg: 'bg-accent/10 border-accent/20',
                        },
                        {
                            label: 'Asignadas',
                            value: allItems.filter((i) => !i.is_blank_event).length,
                            color: 'text-emerald-400',
                            bg: 'bg-emerald-500/10 border-emerald-500/20',
                        },
                        {
                            label: 'Maestros',
                            value: teachers.length,
                            color: 'text-violet-400',
                            bg: 'bg-violet-500/10 border-violet-500/20',
                        },
                    ].map(({ label, value, color, bg }) => (
                        <div
                            key={label}
                            className={`bg-black/60 backdrop-blur-2xl rounded-2xl border p-4 space-y-1 ${bg}`}
                        >
                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{label}</p>
                            <p className={`text-3xl font-black font-mono ${color}`}>{value}</p>
                        </div>
                    ))}
                </div>

                {/* Main Dashboard */}
                <div className="animate-in slide-in-from-bottom-6 fade-in duration-700 delay-200">
                    <MuestrasDashboard
                        initialRecitales={recitales}
                        initialItems={allItems}
                        initialPoolItems={poolItems}
                        semester={semester}
                        teachers={teachers}
                        instruments={instruments}
                    />
                </div>
            </main>
        </div>
    );
}
