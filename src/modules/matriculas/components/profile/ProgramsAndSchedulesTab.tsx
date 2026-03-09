'use client';

import { useTransition } from 'react';
import { CurrentStudent } from '../../models/student.schema';
import { GlassCard } from '@/ui/components/modules/layout/GlassCard';
import { useDebouncedCallback } from 'use-debounce';
import { updateStudentProgram } from '../../actions/update-student-program';

interface ProgramsAndSchedulesTabProps {
    student: CurrentStudent;
}

export function ProgramsAndSchedulesTab({ student }: ProgramsAndSchedulesTabProps) {
    const [isPending, startTransition] = useTransition();

    const debouncedSave = useDebouncedCallback((field: string, value: string) => {
        if (!student.id) return;
        startTransition(async () => {
            const res = await updateStudentProgram(student.id!, { [field]: value });
            if (res?.error) {
                console.error('Error auto-saving program:', res.error);
            }
        });
    }, 500);

    // Mock data para selectores (Fase 2 WIP)
    const programs = ["Semestre 2026-1", "Personalizado", "Vacacional", "Taller Especial"];
    const instruments = ["Piano", "Guitarra", "Bajo", "Batería", "Canto", "Violín", "Saxofón", "Ukelele"];
    const teachers = ["Andrés García", "Marta Pérez", "Carlos Ruiz", "Sofía López", "Diego Torres", "Lucía Mondragón"];
    const days = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-1000">

            {/* TARJETA 1: Programa Principal */}
            <GlassCard className="p-6 border-white/5 bg-black/40 backdrop-blur-2xl relative overflow-hidden group">
                {isPending && (
                    <div className="absolute top-4 right-6 flex items-center gap-2 px-3 py-1 bg-accent/10 rounded-full border border-accent/20 animate-pulse">
                        <div className="w-2 h-2 bg-accent rounded-full neon-pulse" />
                        <span className="text-[10px] text-accent font-black uppercase tracking-widest">Sincronizando</span>
                    </div>
                )}

                <div className="flex items-center gap-3 mb-8">
                    <div className="p-2.5 bg-primary/20 rounded-xl border border-primary/30 shadow-[0_0_20px_hsl(var(--primary)/0.2)]">
                        <span className="text-xl">🎵</span>
                    </div>
                    <div>
                        <h2 className="text-xl font-black text-foreground tracking-tight uppercase">Programa Académico</h2>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Configuración de clase y docente</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Selector de Programa */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] pl-1">Programa / Semestre</label>
                        <select
                            defaultValue={student.program || ""}
                            onChange={(e) => debouncedSave('program', e.target.value)}
                            className="w-full bg-background/50 border border-border rounded-xl px-4 py-3 text-foreground focus:ring-2 focus:ring-accent focus:border-accent/50 transition-all font-bold appearance-none cursor-pointer hover:bg-background"
                        >
                            <option value="" className="bg-background">Seleccionar Programa...</option>
                            {programs.map(p => <option key={p} value={p} className="bg-background">{p}</option>)}
                        </select>
                    </div>

                    {/* Selector de Instrumento */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] pl-1">Instrumento</label>
                        <select
                            defaultValue={student.instrument || ""}
                            onChange={(e) => debouncedSave('instrument', e.target.value)}
                            className="w-full bg-background/50 border border-border rounded-xl px-4 py-3 text-foreground focus:ring-2 focus:ring-accent focus:border-accent/50 transition-all font-bold appearance-none cursor-pointer hover:bg-background"
                        >
                            <option value="" className="bg-background">Seleccionar Instrumento...</option>
                            {instruments.map(i => <option key={i} value={i} className="bg-background">{i}</option>)}
                        </select>
                    </div>

                    {/* Selector de Docente */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] pl-1">Docente Asignado</label>
                        <select
                            defaultValue={student.teacher || ""}
                            onChange={(e) => debouncedSave('teacher', e.target.value)}
                            className="w-full bg-background/50 border border-border rounded-xl px-4 py-3 text-foreground focus:ring-2 focus:ring-accent focus:border-accent/50 transition-all font-bold appearance-none cursor-pointer hover:bg-background"
                        >
                            <option value="" className="bg-background">Asignar Docente...</option>
                            {teachers.map(t => <option key={t} value={t} className="bg-background">{t}</option>)}
                        </select>
                    </div>
                </div>

                {/* Observaciones */}
                <div className="mt-8 space-y-2 border-t border-border pt-6">
                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] pl-1">Observaciones Académicas</label>
                    <textarea
                        placeholder="Notas sobre el proceso del estudiante, requerimientos especiales, etc."
                        defaultValue={student.observations || ""}
                        onChange={(e) => debouncedSave('observations', e.target.value)}
                        rows={3}
                        className="w-full bg-background/50 border border-border rounded-xl px-4 py-4 text-foreground placeholder:text-muted-foreground/30 focus:ring-2 focus:ring-primary focus:border-primary/50 transition-all font-medium resize-none shadow-inner"
                    />
                </div>
            </GlassCard>

            {/* TARJETA 2: Horarios de Clases */}
            <GlassCard className="p-6 border-white/5 bg-black/40 backdrop-blur-2xl">
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-accent/10 rounded-xl border border-accent/20 shadow-[0_0_20px_hsl(var(--accent)/0.2)]">
                            <span className="text-xl">📅</span>
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-foreground tracking-tight uppercase">Horario Principal</h2>
                            <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Día y hora de encuentro</p>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={() => alert("Gestión de días múltiples próximamente")}
                        className="text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-accent transition-all flex items-center gap-2 px-4 py-2 rounded-full border border-border bg-background/50 hover:bg-accent/10 hover:border-accent/40"
                    >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" />
                        </svg>
                        Días Adicionales
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-start">
                    <div className="space-y-3">
                        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] pl-1">Día de la semana</label>
                        <div className="flex flex-wrap gap-2">
                            {days.map(d => {
                                const isSelected = student.class_day === d;
                                return (
                                    <button
                                        key={d}
                                        type="button"
                                        onClick={() => debouncedSave('class_day', d)}
                                        className={`
                      px-4 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all duration-500 border
                      ${isSelected
                                                ? 'bg-accent text-accent-foreground border-accent shadow-[0_0_20px_hsl(var(--accent)/0.5)] scale-105'
                                                : 'bg-background/40 text-muted-foreground border-border hover:border-accent/40 hover:text-accent'}
                    `}
                                    >
                                        {d}
                                    </button>
                                )
                            })}
                        </div>
                    </div>

                    <div className="space-y-3">
                        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] pl-1">Rango Horario</label>
                        <div className="relative group">
                            <input
                                type="text"
                                placeholder="Ej. 3:00 PM A 4:00 PM"
                                defaultValue={student.class_time || ""}
                                onChange={(e) => debouncedSave('class_time', e.target.value)}
                                className="w-full bg-background/50 border border-border rounded-xl px-12 py-4 text-foreground placeholder:text-muted-foreground/30 focus:ring-2 focus:ring-accent focus:border-accent/50 transition-all font-mono font-bold tracking-tighter text-lg"
                            />
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-accent transition-colors">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                        </div>
                    </div>
                </div>
            </GlassCard>

        </div>
    );
}
