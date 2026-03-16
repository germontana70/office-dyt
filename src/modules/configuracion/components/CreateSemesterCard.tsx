"use client";

import { useState, useTransition } from 'react';
import { GlassCard } from '@/ui/components/modules/layout/GlassCard';
import { createSemester } from '../actions/create-semester';

export function CreateSemesterCard() {
    const [isPending, startTransition] = useTransition();
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError(null);

        const form = e.currentTarget;
        const formData = new FormData(form);

        startTransition(async () => {
            const res = await createSemester(formData);
            if (res.error) {
                setError(res.error);
            } else {
                form.reset();
            }
        });
    };

    return (
        <GlassCard className="p-6 border-white/5 bg-black/30 dark:bg-black/40 backdrop-blur-xl relative overflow-hidden group">
            <div className="flex items-center gap-3 mb-8">
                <div className="p-2.5 bg-primary/20 rounded-xl border border-primary/30 shadow-[0_0_20px_hsl(var(--primary)/0.2)]">
                    <span className="text-xl">⚙️</span>
                </div>
                <div>
                    <h2 className="text-xl font-black text-foreground tracking-tight uppercase">Crear / Editar Semestre</h2>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Añadir nueva infraestructura de Google Sheet</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] pl-1">Nombre del Semestre</label>
                        <input
                            type="text"
                            name="name"
                            required
                            placeholder="Ej. 2026-2"
                            disabled={isPending}
                            className="w-full bg-background/50 border border-border rounded-xl px-4 py-3 text-foreground focus:ring-2 focus:ring-accent focus:border-accent/50 transition-all font-mono font-bold hover:bg-background"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] pl-1">Inicio de Clases</label>
                        <input
                            type="date"
                            name="start_date"
                            required
                            disabled={isPending}
                            className="w-full bg-background/50 border border-border rounded-xl px-4 py-3 text-foreground focus:ring-2 focus:ring-accent focus:border-accent/50 transition-all font-bold hover:bg-background appearance-none"
                            style={{ colorScheme: 'dark' }}
                        />
                    </div>
                </div>

                <div className="space-y-2 border-t border-border pt-6">
                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] pl-1">Google Sheet URL (Crucial Sync)</label>
                    <input
                        type="url"
                        name="sheet_url"
                        required
                        placeholder="https://docs.google.com/spreadsheets/d/Id_Del_Documento..."
                        disabled={isPending}
                        className="w-full bg-background/50 border border-border rounded-xl px-4 py-4 text-foreground placeholder:text-muted-foreground/30 focus:ring-2 focus:ring-primary focus:border-primary/50 transition-all font-mono tracking-tight"
                    />
                    <p className="text-[10px] text-muted-foreground pt-1 pl-1">URL de respuestas de Formulario asociada a este período (Modo Fallback).</p>
                </div>

                {error && <p className="text-[12px] font-bold text-destructive">{error}</p>}

                <div className="flex justify-end pt-4">
                    <button
                        type="submit"
                        disabled={isPending}
                        className="px-6 py-3 text-[11px] font-black uppercase tracking-widest text-primary-foreground bg-primary/80 hover:bg-primary shadow-[0_0_20px_hsl(var(--primary)/0.5)] border border-primary/50 rounded-xl transition-all disabled:opacity-50 flex items-center gap-2"
                    >
                        {isPending && <div className="w-3 h-3 rounded-full border-2 border-white/30 border-t-white animate-spin" />}
                        Guardar Semestre
                    </button>
                </div>
            </form>
        </GlassCard>
    );
}
