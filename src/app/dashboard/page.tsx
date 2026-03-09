import { GlassCard } from "@/ui/components/modules/layout/GlassCard";
import { PremiumButton } from "@/ui/components/modules/buttons/PremiumButton";
import Link from "next/link";
import { GradientText } from "@/ui/components/modules/typography/GradientText";

export default function DashboardPage() {
    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out relative">
            {/* Gradientes locales para profundidad extra */}
            <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-primary/5 blur-[120px] rounded-full pointer-events-none" />


            <div className="flex justify-between items-end">
                <div>
                    <GradientText as="h1" className="text-4xl font-extrabold tracking-tight">
                        Centro de Mandos
                    </GradientText>
                    <p className="text-muted-foreground mt-2 text-lg">
                        Bienvenido al panel principal de Office DYT
                    </p>
                </div>

                <PremiumButton variant="primary" className="shadow-[0_0_15px_hsl(var(--primary)/0.5)]">
                    <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Sincronizar Datos
                </PremiumButton>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">

                <Link href="/dashboard/matriculas" className="block outline-none focus:ring-2 focus:ring-primary/50 rounded-2xl transition-all duration-300">
                    <GlassCard interactive className="group relative overflow-hidden h-full hover:scale-[1.02] transition-transform cursor-pointer">
                        <div className="absolute right-0 top-0 w-24 h-24 bg-primary/20 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110" />
                        <div className="relative z-10">
                            <div className="flex items-center gap-4 text-primary">
                                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                </svg>
                                <h3 className="text-xl font-black uppercase italic tracking-tighter text-foreground">Matrículas Activas</h3>
                            </div>
                            <div className="mt-6">
                                <span className="text-6xl font-black tracking-tighter text-foreground drop-shadow-sm italic">342</span>
                                <p className="text-accent mt-3 font-black flex items-center uppercase tracking-[0.2em] text-[10px]">
                                    <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                                    +12% este semestre
                                </p>
                            </div>
                        </div>
                    </GlassCard>
                </Link>

                <GlassCard interactive className="group relative overflow-hidden">
                    <div className="absolute right-0 top-0 w-24 h-24 bg-secondary/20 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110" />
                    <div className="relative z-10">
                        <div className="flex items-center gap-4 text-secondary">
                            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                            </svg>
                            <h3 className="text-xl font-black uppercase italic tracking-tighter text-foreground">Staging (Nuevos)</h3>
                        </div>
                        <div className="mt-6">
                            <span className="text-6xl font-black tracking-tighter text-foreground drop-shadow-sm italic">15</span>
                            <p className="text-primary mt-3 font-black flex items-center uppercase tracking-[0.2em] text-[10px]">
                                <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                Esperando validación central
                            </p>
                        </div>
                    </div>
                </GlassCard>

                <GlassCard interactive className="group relative overflow-hidden md:col-span-2 lg:col-span-1">
                    <div className="absolute right-0 top-0 w-24 h-24 bg-accent/20 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110" />
                    <div className="relative z-10">
                        <div className="flex items-center gap-4 text-accent">
                            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <h3 className="text-xl font-black uppercase italic tracking-tighter text-foreground">Estado del Motor</h3>
                        </div>
                        <div className="mt-6">
                            <span className="text-2xl font-black tracking-tighter text-foreground block uppercase italic">Sincronización Pasiva</span>
                            <p className="text-accent mt-3 font-black uppercase tracking-[0.2em] text-[10px]">
                                Listo para Webhooks de GCP
                            </p>

                            <div className="mt-4 h-2 w-full bg-white/10 rounded-full overflow-hidden">
                                <div className="h-full bg-accent w-full neon-pulse" />
                            </div>
                        </div>
                    </div>
                </GlassCard>

            </div>

        </div>
    );
}
