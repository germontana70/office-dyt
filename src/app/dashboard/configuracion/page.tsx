import { SemesterRepository } from '@/modules/configuracion/repository/semester-repo';
import { GlassCard } from '@/ui/components/modules/layout/GlassCard';
import { CreateSemesterCard } from '@/modules/configuracion/components/CreateSemesterCard';
import { ChangeSemesterCard } from '@/modules/configuracion/components/ChangeSemesterCard';

export const dynamic = 'force-dynamic';

export default async function ConfiguracionPage() {
    // Revalidación siempre fresca por ser admin config
    const semesters = await SemesterRepository.getAll();
    const activeSemester = await SemesterRepository.getActive();

    return (
        <div className="relative min-h-screen w-full overflow-hidden p-6 md:p-10">
            {/* Gradientes y resplandores base (Glassmorphism Environment) */}
            <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-accent/5 blur-[150px] rounded-full pointer-events-none" />
            <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-primary/10 blur-[150px] rounded-full pointer-events-none" />

            <main className="relative z-10 max-w-5xl mx-auto space-y-10">

                {/* Cabecera Premium */}
                <header className="space-y-4 animate-in slide-in-from-top-6 fade-in duration-700">
                    <div className="flex items-center gap-3">
                        <div className="w-1.5 h-8 bg-accent rounded-full shadow-[0_0_15px_hsl(var(--accent))]" />
                        <h1 className="text-3xl font-black tracking-tighter text-foreground drop-shadow-md uppercase italic">
                            Configuración del Sistema
                        </h1>
                    </div>
                    <p className="text-muted-foreground text-sm max-w-xl leading-relaxed font-medium">
                        Sala de máquinas principal. Gestión de períodos académicos y fuentes de sincronización.
                    </p>
                </header>

                <div className="grid grid-cols-1 gap-8 animate-in slide-in-from-bottom-5 fade-in duration-700 delay-75 fill-mode-both">
                    {/* Tarjeta 1: Semestre Activo Actual */}
                    <GlassCard className="p-8 border-accent/20 bg-accent/5 relative overflow-hidden group">
                        <div className="absolute right-[-5%] top-[-5%] w-[300px] h-[300px] bg-accent/10 rounded-full blur-[80px] pointer-events-none group-hover:scale-110 transition-transform duration-700" />

                        <div className="flex flex-col md:flex-row gap-6 items-start md:items-center justify-between relative z-10">
                            <div>
                                <h3 className="text-[12px] font-black uppercase text-accent tracking-widest drop-shadow-md">Escenario Actual En Vivo</h3>
                                <p className="text-4xl font-black mt-2 uppercase tracking-tighter drop-shadow-lg">
                                    {activeSemester ? activeSemester.name : 'NO CONFIGURADO'}
                                </p>
                            </div>

                            {activeSemester?.sheet_url && (
                                <div className="p-4 bg-black/60 backdrop-blur-md rounded-xl border border-white/5 shadow-inner max-w-sm w-full">
                                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold mb-2 break-words">Google Sheet Vinculado (Sincronización)</p>
                                    <a href={activeSemester.sheet_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:text-accent font-mono truncate block transition-colors">
                                        {activeSemester.sheet_url.slice(0, 45)}...
                                    </a>
                                </div>
                            )}
                        </div>
                    </GlassCard>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Tarjeta 2: Crear / Editar Semestre */}
                        <div className="h-full">
                            <CreateSemesterCard />
                        </div>

                        {/* Tarjeta 3: Cambiar Semestre Activo */}
                        <div className="h-full">
                            <ChangeSemesterCard semesters={semesters} currentActiveId={activeSemester?.id || null} />
                        </div>
                    </div>
                </div>

            </main>
        </div>
    );
}
