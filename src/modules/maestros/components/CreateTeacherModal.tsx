'use client';

import { useState, useTransition } from 'react';
import { GlassCard } from '@/ui/components/modules/layout/GlassCard';
import { PremiumButton } from '@/ui/components/modules/buttons/PremiumButton';
import { createTeacher } from '../actions/create-teacher';

export function CreateTeacherModal() {
    const [isOpen, setIsOpen] = useState(false);
    const [isPending, startTransition] = useTransition();
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError(null);

        const form = e.currentTarget;
        const formData = new FormData(form);

        startTransition(async () => {
            const res = await createTeacher(formData);
            if (res.error) {
                setError(res.error);
            } else {
                setIsOpen(false);
                form.reset();
            }
        });
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
                Nuevo Maestro
            </PremiumButton>

            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <GlassCard className="w-full max-w-lg p-8 border-accent/20 bg-black/80 relative shadow-[0_0_50px_hsl(var(--accent)/0.15)] animate-in zoom-in-95 duration-300">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-accent to-transparent opacity-50" />

                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-black uppercase tracking-widest text-accent drop-shadow-md italic">
                                Registrar Maestro
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
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest pl-1">
                                    Nombre Completo *
                                </label>
                                <input
                                    type="text"
                                    name="full_name"
                                    required
                                    disabled={isPending}
                                    placeholder="Ej. Andrés García"
                                    className="w-full bg-background/50 border border-border/50 rounded-xl px-4 py-3 text-foreground focus:ring-2 focus:ring-accent focus:border-accent/50 transition-all font-bold placeholder:font-medium"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest pl-1">
                                        Especialidad
                                    </label>
                                    <input
                                        type="text"
                                        name="specialty"
                                        disabled={isPending}
                                        placeholder="Ej. Piano Clásico"
                                        className="w-full bg-background/50 border border-border/50 rounded-xl px-4 py-3 text-foreground focus:ring-2 focus:ring-accent focus:border-accent/50 transition-all font-medium"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest pl-1">
                                        Teléfono / Contacto
                                    </label>
                                    <input
                                        type="tel"
                                        name="phone"
                                        disabled={isPending}
                                        placeholder="+57 300..."
                                        className="w-full bg-background/50 border border-border/50 rounded-xl px-4 py-3 text-foreground focus:ring-2 focus:ring-accent focus:border-accent/50 transition-all font-medium font-mono tracking-tight"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2 border-t border-border/50 pt-5">
                                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest pl-1 flex items-center gap-2">
                                    <svg className="w-4 h-4 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                    Tarifa por Hora (Opcional)
                                </label>
                                <input
                                    type="number"
                                    name="hourly_rate"
                                    min="0"
                                    step="1000"
                                    disabled={isPending}
                                    placeholder="Ej. 25000"
                                    className="w-full bg-background/50 border border-border/50 rounded-xl px-4 py-3 text-foreground focus:ring-2 focus:ring-accent focus:border-accent/50 transition-all font-bold font-mono tracking-tighter"
                                />
                                <p className="text-[10px] text-muted-foreground pl-1 mt-1">Sirve de base para el cálculo automatizado de nómina.</p>
                            </div>

                            {error && <p className="text-xs font-bold text-destructive animate-in slide-in-from-top-2">{error}</p>}

                            <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
                                <button
                                    type="button"
                                    onClick={() => setIsOpen(false)}
                                    disabled={isPending}
                                    className="px-6 py-3 text-[11px] font-black uppercase tracking-widest text-muted-foreground hover:text-white bg-white/5 hover:bg-white/10 rounded-xl transition-all disabled:opacity-50"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={isPending}
                                    className="px-6 py-3 text-[11px] font-black uppercase tracking-widest text-accent-foreground bg-accent/80 hover:bg-accent shadow-[0_0_20px_hsl(var(--accent)/0.5)] border border-accent/50 rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2 min-w-[140px]"
                                >
                                    {isPending ? (
                                        <>
                                            <div className="w-3 h-3 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                                            <span>Guardando</span>
                                        </>
                                    ) : (
                                        'Crear Maestro'
                                    )}
                                </button>
                            </div>
                        </form>
                    </GlassCard>
                </div>
            )}
        </>
    );
}
