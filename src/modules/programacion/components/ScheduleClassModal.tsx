'use client';

import { useState } from 'react';
import { GlassCard } from '@/ui/components/modules/layout/GlassCard';
import { PremiumButton } from '@/ui/components/modules/buttons/PremiumButton';

export function ScheduleClassModal() {
    const [isOpen, setIsOpen] = useState(false);

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        // UI ONLY for now
        setIsOpen(false);
    };

    return (
        <>
            <PremiumButton
                onClick={() => setIsOpen(true)}
                variant="primary"
                className="shadow-[0_0_20px_hsl(var(--accent)/0.5)] bg-accent hover:bg-accent/80 text-accent-foreground border-accent whitespace-nowrap"
            >
                <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Agendar Clase
            </PremiumButton>

            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <GlassCard className="w-full max-w-xl p-8 border-accent/20 bg-black/80 relative shadow-[0_0_50px_hsl(var(--accent)/0.15)] animate-in zoom-in-95 duration-300">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-accent to-transparent opacity-50" />

                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-black uppercase tracking-widest text-accent drop-shadow-md italic">
                                Agendar Nueva Clase
                            </h2>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="text-muted-foreground hover:text-white transition-colors"
                            >
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest pl-1">
                                        Estudiante
                                    </label>
                                    <select
                                        required
                                        className="w-full bg-background/50 border border-border/50 rounded-xl px-4 py-3 text-foreground focus:ring-2 focus:ring-accent focus:border-accent/50 transition-all font-bold appearance-none"
                                    >
                                        <option value="">Seleccionar estudiante...</option>
                                        <option value="test1">Juan Pérez</option>
                                        <option value="test2">María Gómez</option>
                                    </select>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest pl-1">
                                        Docente
                                    </label>
                                    <select
                                        required
                                        className="w-full bg-background/50 border border-border/50 rounded-xl px-4 py-3 text-foreground focus:ring-2 focus:ring-accent focus:border-accent/50 transition-all font-bold appearance-none"
                                    >
                                        <option value="">Seleccionar docente...</option>
                                        <option value="doc1">Andrés García</option>
                                        <option value="doc2">Marta Pérez</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest pl-1">
                                        Día
                                    </label>
                                    <select
                                        required
                                        className="w-full bg-background/50 border border-border/50 rounded-xl px-4 py-3 text-foreground focus:ring-2 focus:ring-accent focus:border-accent/50 transition-all font-bold appearance-none"
                                    >
                                        <option value="">Día...</option>
                                        <option value="lunes">Lunes</option>
                                        <option value="martes">Martes</option>
                                        <option value="miercoles">Miércoles</option>
                                        <option value="jueves">Jueves</option>
                                        <option value="viernes">Viernes</option>
                                        <option value="sabado">Sábado</option>
                                    </select>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest pl-1">
                                        Hora Inicio
                                    </label>
                                    <input
                                        type="time"
                                        required
                                        className="w-full bg-background/50 border border-border/50 rounded-xl px-4 py-3 text-foreground focus:ring-2 focus:ring-accent focus:border-accent/50 transition-all font-bold font-mono"
                                        style={{ colorScheme: 'dark' }}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest pl-1">
                                        Hora Fin
                                    </label>
                                    <input
                                        type="time"
                                        required
                                        className="w-full bg-background/50 border border-border/50 rounded-xl px-4 py-3 text-foreground focus:ring-2 focus:ring-accent focus:border-accent/50 transition-all font-bold font-mono"
                                        style={{ colorScheme: 'dark' }}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest pl-1">
                                    Tipo de Clase
                                </label>
                                <select
                                    required
                                    className="w-full bg-background/50 border border-border/50 rounded-xl px-4 py-3 text-foreground focus:ring-2 focus:ring-accent focus:border-accent/50 transition-all font-bold appearance-none"
                                >
                                    <option value="">Seleccionar tipo...</option>
                                    <option value="regular">Regular</option>
                                    <option value="reposicion">Reposición</option>
                                    <option value="taller">Taller</option>
                                </select>
                            </div>

                            <div className="flex justify-end gap-3 pt-6 border-t border-white/5">
                                <button
                                    type="button"
                                    onClick={() => setIsOpen(false)}
                                    className="px-6 py-3 text-[11px] font-black uppercase tracking-widest text-muted-foreground hover:text-white bg-white/5 hover:bg-white/10 rounded-xl transition-all"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="px-6 py-3 text-[11px] font-black uppercase tracking-widest text-accent-foreground bg-accent/80 hover:bg-accent shadow-[0_0_20px_hsl(var(--accent)/0.5)] border border-accent/50 rounded-xl transition-all flex items-center justify-center min-w-[140px]"
                                >
                                    Guardar Clase
                                </button>
                            </div>
                        </form>
                    </GlassCard>
                </div>
            )}
        </>
    );
}
