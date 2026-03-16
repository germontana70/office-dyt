"use client";

import { useState, useTransition } from 'react';
import { GlassCard } from '@/ui/components/modules/layout/GlassCard';
import { Semester } from '../repository/semester-repo';
import { setActiveSemester } from '../actions/set-active-semester';

interface ChangeSemesterCardProps {
    semesters: Semester[];
    currentActiveId: string | null;
}

export function ChangeSemesterCard({ semesters, currentActiveId }: ChangeSemesterCardProps) {
    const [isPending, startTransition] = useTransition();
    const [selectedId, setSelectedId] = useState(currentActiveId || '');
    const [error, setError] = useState<string | null>(null);

    const handleActivate = () => {
        if (!selectedId) return;

        setError(null);
        startTransition(async () => {
            const res = await setActiveSemester(selectedId);
            if (res.error) {
                setError(res.error);
            }
        });
    };

    return (
        <GlassCard className="p-6 border-white/5 bg-black/30 dark:bg-black/40 backdrop-blur-xl relative overflow-hidden group">
            <div className="flex items-center gap-3 mb-8">
                <div className="p-2.5 bg-accent/10 rounded-xl border border-accent/20 shadow-[0_0_20px_hsl(var(--accent)/0.2)]">
                    <span className="text-xl">🔄</span>
                </div>
                <div>
                    <h2 className="text-xl font-black text-foreground tracking-tight uppercase">Cambiar Semestre Activo</h2>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Viajar en el tiempo en la plataforma</p>
                </div>
            </div>

            <div className="space-y-6">
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] pl-1">Seleccionar Semestre para Activar</label>
                    <select
                        value={selectedId}
                        onChange={(e) => setSelectedId(e.target.value)}
                        disabled={isPending}
                        className="w-full bg-background/50 border border-border/50 rounded-xl px-4 py-3 text-foreground focus:ring-2 focus:ring-accent focus:border-accent/50 transition-all font-bold appearance-none cursor-pointer"
                    >
                        <option value="" className="bg-background">Elegir semestre...</option>
                        {semesters.map(s => (
                            <option key={s.id} value={s.id} className="bg-background">
                                {s.name} {s.is_active ? '(Activo)' : ''}
                            </option>
                        ))}
                    </select>
                </div>

                {error && <p className="text-[12px] font-bold text-destructive">{error}</p>}

                <div className="flex justify-end pt-2">
                    <button
                        type="button"
                        onClick={handleActivate}
                        disabled={isPending || !selectedId || selectedId === currentActiveId}
                        className="px-6 py-3 text-[11px] font-black uppercase tracking-widest text-accent-foreground bg-accent/80 hover:bg-accent shadow-[0_0_20px_hsl(var(--accent)/0.5)] border border-accent/50 rounded-xl transition-all disabled:opacity-50 flex items-center gap-2"
                    >
                        {isPending && <div className="w-3 h-3 rounded-full border-2 border-white/30 border-t-white animate-spin" />}
                        Establecer como Semestre Activo
                    </button>
                </div>
            </div>
        </GlassCard>
    );
}
