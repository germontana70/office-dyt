'use client';

import { useState, useTransition } from 'react';
import { GlassCard } from '@/ui/components/modules/layout/GlassCard';
import { PremiumButton } from '@/ui/components/modules/buttons/PremiumButton';
import { scheduleClass } from '../actions/schedule-class';
import { Teacher } from '@/modules/maestros/repository/teacher-repo';
// TODO: Replace with real student type when available
interface StudentParams { id: string; full_name: string; }

interface Props {
    teachers: Teacher[];
    students: StudentParams[];
}

export function ScheduleClassModal({ teachers, students }: Props) {
    const [isOpen, setIsOpen] = useState(false);
    const [isPending, startTransition] = useTransition();
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError(null);

        const form = e.currentTarget;
        const formData = new FormData(form);

        startTransition(async () => {
            const res = await scheduleClass(formData);
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
                                        name="student_id"
                                        required
                                        disabled={isPending}
                                        className="w-full bg-background/50 border border-border/50 rounded-xl px-4 py-3 text-foreground focus:ring-2 focus:ring-accent focus:border-accent/50 transition-all font-bold appearance-none"
                                    >
                                        <option value="">Seleccionar estudiante...</option>
                                        {students.map(s => (
                                            <option key={s.id} value={s.id}>{s.full_name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest pl-1">
                                        Docente
                                    </label>
                                    <select
                                        name="teacher_id"
                                        required
                                        disabled={isPending}
                                        className="w-full bg-background/50 border border-border/50 rounded-xl px-4 py-3 text-foreground focus:ring-2 focus:ring-accent focus:border-accent/50 transition-all font-bold appearance-none"
                                    >
                                        <option value="">Seleccionar docente...</option>
                                        {teachers.map(t => (
                                            <option key={t.id} value={t.id}>{t.name} {t.instrument ? `(${t.instrument})` : ''}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest pl-1">
                                        Día
                                    </label>
                                    <select
                                        name="day_of_week"
                                        required
                                        disabled={isPending}
                                        className="w-full bg-background/50 border border-border/50 rounded-xl px-4 py-3 text-foreground focus:ring-2 focus:ring-accent focus:border-accent/50 transition-all font-bold appearance-none"
                                    >
                                        <option value="">Día...</option>
                                        <option value="Lunes">Lunes</option>
                                        <option value="Martes">Martes</option>
                                        <option value="Miércoles">Miércoles</option>
                                        <option value="Jueves">Jueves</option>
                                        <option value="Viernes">Viernes</option>
                                        <option value="Sábado">Sábado</option>
                                    </select>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest pl-1">
                                        Hora Inicio
                                    </label>
                                    <input
                                        type="time"
                                        name="start_time"
                                        required
                                        disabled={isPending}
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
                                        name="end_time"
                                        required
                                        disabled={isPending}
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
                                    name="class_type"
                                    required
                                    disabled={isPending}
                                    className="w-full bg-background/50 border border-border/50 rounded-xl px-4 py-3 text-foreground focus:ring-2 focus:ring-accent focus:border-accent/50 transition-all font-bold appearance-none"
                                >
                                    <option value="">Seleccionar tipo...</option>
                                    <option value="Regular">Regular</option>
                                    <option value="Reposición">Reposición</option>
                                    <option value="Taller">Taller</option>
                                </select>
                            </div>

                            {error && <p className="text-xs font-bold text-destructive animate-in slide-in-from-top-2">{error}</p>}

                            <div className="flex justify-end gap-3 pt-6 border-t border-white/5">
                                <button
                                    type="button"
                                    disabled={isPending}
                                    onClick={() => setIsOpen(false)}
                                    className="px-6 py-3 text-[11px] font-black uppercase tracking-widest text-muted-foreground hover:text-white bg-white/5 hover:bg-white/10 rounded-xl transition-all"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={isPending}
                                    className="px-6 py-3 text-[11px] font-black uppercase tracking-widest text-accent-foreground bg-accent/80 hover:bg-accent shadow-[0_0_20px_hsl(var(--accent)/0.5)] border border-accent/50 rounded-xl transition-all flex items-center justify-center min-w-[140px] disabled:opacity-50"
                                >
                                    {isPending ? (
                                        <>
                                            <div className="w-3 h-3 rounded-full border-2 border-white/30 border-t-white animate-spin mr-2" />
                                            <span>Guardando</span>
                                        </>
                                    ) : (
                                        'Agendar Clase'
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
