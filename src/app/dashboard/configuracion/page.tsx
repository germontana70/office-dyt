import { SemesterRepository } from '@/modules/configuracion/repository/semester-repo';
import { GlassCard } from '@/ui/components/modules/layout/GlassCard';
import { CreateSemesterCard } from '@/modules/configuracion/components/CreateSemesterCard';
import { ChangeSemesterCard } from '@/modules/configuracion/components/ChangeSemesterCard';
import { GlobalSettingsCard } from '@/modules/configuracion/components/GlobalSettingsCard';
import { InstrumentManagerCard } from '@/modules/configuracion/components/InstrumentManagerCard';
// import { MigrationCard } from '@/components/dashboard/MigrationCard'; // TODO: Retained for historical reference only, DO NOT RENDER
import { getGlobalSettings, getInstruments } from '@/app/actions/settings';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function ConfiguracionPage() {
    // Revalidación siempre fresca por ser admin config
    const semesters = await SemesterRepository.getAll();
    const activeSemester = await SemesterRepository.getActive();
    
    // Nueva Bóveda Transaccional: Filtros y Datos Globales
    const currentSemesterName = activeSemester?.name || '2026-1';
    const globalSettings = await getGlobalSettings(currentSemesterName);
    const instruments = await getInstruments();

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
                        Sala de máquinas principal. Gestión de períodos académicos, costos globales y catálogo de instrumentos.
                    </p>
                </header>

                <div className="grid grid-cols-1 gap-8 animate-in slide-in-from-bottom-5 fade-in duration-700 delay-75 fill-mode-both">
                    
                    {/* SECCIÓN 1: ESTADO Y PRECIOS */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
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

                        {/* Tarjeta 1.5: Configuración de Precios */}
                        <Link href="/dashboard/configuracion/precios" className="h-full">
                            <GlassCard className="p-8 border-primary/20 bg-primary/5 h-full relative overflow-hidden group hover:border-primary/50 transition-all cursor-pointer flex flex-col justify-center">
                                <div className="absolute right-[-5%] top-[-5%] w-[300px] h-[300px] bg-primary/10 rounded-full blur-[80px] pointer-events-none group-hover:scale-110 transition-transform duration-700" />
                                <div className="relative z-10 flex items-center justify-between">
                                    <div>
                                        <h3 className="text-[12px] font-black uppercase text-primary tracking-widest drop-shadow-md">Motor de Precios</h3>
                                        <p className="text-3xl font-black mt-2 uppercase tracking-tighter drop-shadow-lg text-white">
                                            Valores y Cuotas
                                        </p>
                                        <p className="text-sm text-white/50 mt-4 max-w-sm">Gestiona el valor de contado y porcentaje de incremento matemático, aislado por semestre.</p>
                                    </div>
                                    <div className="p-4 rounded-xl bg-primary/10 text-primary group-hover:bg-primary/20 transition-colors">
                                        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    </div>
                                </div>
                            </GlassCard>
                        </Link>
                    </div>

                    {/* SECCIÓN 2: COSTOS GLOBALES E INSTRUMENTOS (Fase 1 Nueva Arquitectura) */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <GlobalSettingsCard 
                            initialSettings={globalSettings} 
                            currentSemester={currentSemesterName} 
                        />
                        <InstrumentManagerCard 
                            initialInstruments={instruments} 
                        />
                    </div>

                    {/* SECCIÓN 3: GESTIÓN DE SEMESTRES */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 border-t border-white/5 pt-8">
                        <div className="h-full">
                            <CreateSemesterCard />
                        </div>

                        <div className="h-full">
                            <ChangeSemesterCard semesters={semesters} currentActiveId={activeSemester?.id || null} />
                        </div>
                    </div>

                    {/* SECCIÓN 4: ZONA DE PELIGRO (Migración) — HIDDEN: COMPLETADA CON ÉXITO */}
                    {/* 
                    <div className="pt-8 border-t border-white/5">
                        <MigrationCard />
                    </div> 
                    */}
                </div>


            </main>
        </div>
    );
}

