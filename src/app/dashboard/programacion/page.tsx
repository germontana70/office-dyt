import { GlassCard } from '@/ui/components/modules/layout/GlassCard';
import { ScheduleClassModal } from '@/modules/programacion/components/ScheduleClassModal';

export const dynamic = 'force-dynamic';

export default function ProgramacionPage() {
    return (
        <div className="relative min-h-screen w-full overflow-hidden p-6 md:p-10">
            {/* Gradientes y resplandores base (Glassmorphism Environment) */}
            <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-accent/10 blur-[150px] rounded-full pointer-events-none" />
            <div className="absolute bottom-1/4 left-1/4 w-[400px] h-[400px] bg-primary/10 blur-[150px] rounded-full pointer-events-none" />

            <main className="relative z-10 max-w-7xl mx-auto space-y-8 flex flex-col h-[calc(100vh-8rem)]">

                {/* Cabecera Premium */}
                <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 animate-in slide-in-from-top-6 fade-in duration-700 flex-shrink-0">
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="w-1.5 h-8 bg-accent rounded-full shadow-[0_0_15px_hsl(var(--accent))]" />
                            <h1 className="text-3xl font-black tracking-tighter text-foreground drop-shadow-md uppercase italic">
                                Programación de Clases
                            </h1>
                        </div>
                        <p className="text-muted-foreground text-sm max-w-xl leading-relaxed font-medium">
                            Cerebro logístico de la escuela. Panel general para visualización de espacios, asignación de docentes y gestión de aulas.
                        </p>
                    </div>

                    <div className="flex items-center gap-4">
                        <ScheduleClassModal />
                    </div>
                </header>

                {/* Dashboard Dividido */}
                <div className="flex-1 flex flex-col lg:flex-row gap-6 animate-in slide-in-from-bottom-8 fade-in duration-700 delay-150 fill-mode-both overflow-hidden min-h-0">

                    {/* Panel Izquierdo: Filtros */}
                    <div className="w-full lg:w-80 flex flex-col gap-6 flex-shrink-0">
                        <GlassCard className="p-6 border-white/5 bg-black/30 dark:bg-black/40 backdrop-blur-xl flex-1 flex flex-col h-full overflow-y-auto custom-scrollbar">
                            <h2 className="text-[12px] font-black uppercase tracking-widest text-accent mb-6 flex items-center gap-2">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>
                                Parametrización
                            </h2>

                            <div className="space-y-6">
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest pl-1">Seleccionar Día</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'].map((dia, idx) => (
                                            <button key={dia} className={`px-2 py-2 text-[10px] font-bold uppercase tracking-widest rounded-lg border transition-all ${idx === 0 ? 'bg-primary/20 border-primary text-primary shadow-[0_0_10px_hsl(var(--primary)/0.2)]' : 'bg-background/50 border-border/50 text-muted-foreground hover:border-primary/50'}`}>
                                                {dia}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest pl-1">Filtrar por Docente</label>
                                    <select className="w-full bg-background/50 border border-border/50 rounded-xl px-4 py-3 text-foreground focus:ring-2 focus:ring-accent focus:border-accent/50 transition-all font-bold appearance-none cursor-pointer text-sm">
                                        <option value="">Todos los docentes</option>
                                        <option value="1">Andrés García (Piano)</option>
                                        <option value="2">Marta Pérez (Canto)</option>
                                    </select>
                                </div>
                            </div>
                        </GlassCard>
                    </div>

                    {/* Panel Derecho: Lienzo (Timetable Container) */}
                    <div className="flex-1 min-w-0">
                        <GlassCard className="p-6 h-full flex flex-col border-white/5 bg-black/30 dark:bg-black/40 backdrop-blur-xl overflow-hidden relative group">
                            <div className="flex items-center justify-between mb-6 pb-4 border-b border-border/50">
                                <h3 className="text-lg font-black uppercase text-foreground italic tracking-tighter">Horario: Lunes</h3>
                                <div className="flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
                                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">En Vivo</span>
                                </div>
                            </div>

                            <div className="flex-1 flex flex-col items-center justify-center p-10 border border-dashed border-white/10 rounded-2xl bg-black/20">
                                <div className="w-16 h-16 bg-accent/10 rounded-2xl flex items-center justify-center mb-6 shadow-[0_0_30px_hsl(var(--accent)/0.2)] animate-pulse">
                                    <svg className="w-8 h-8 text-accent opacity-80" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                </div>
                                <h3 className="text-xl font-black uppercase tracking-widest text-muted-foreground mb-2 italic">Lienzo Vacío</h3>
                                <p className="text-sm text-muted-foreground/60 font-medium max-w-xs text-center">
                                    El grid horario se dibujará aquí dinámicamente según la parametrización seleccionada.
                                </p>
                            </div>
                        </GlassCard>
                    </div>

                </div>
            </main>
        </div>
    );
}
