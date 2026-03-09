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
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-700">

            {/* TARJETA 1: Programa Principal */}
            <GlassCard className="p-6 border-white/5 bg-black/40 relative overflow-hidden">
                {isPending && (
                    <div className="absolute top-2 right-4 flex items-center gap-2">
                        <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                        <span className="text-[10px] text-primary font-bold uppercase tracking-widest">Sincronizando</span>
                    </div>
                )}

                <div className="flex items-center gap-3 mb-8">
                    <div className="p-2 bg-purple-500/20 rounded-lg shadow-[0_0_15px_rgba(168,85,247,0.3)]">
                        <span className="text-xl">🎵</span>
                    </div>
                    <h2 className="text-xl font-bold text-white tracking-wide">Programa Académico</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Selector de Programa */}
                    <div className="space-y-2">
                        <label className="text-xs font-semibold text-white/50 uppercase tracking-widest pl-1">Programa / Semestre</label>
                        <select
                            defaultValue={student.program || ""}
                            onChange={(e) => debouncedSave('program', e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-primary focus:bg-white/10 transition-all font-medium appearance-none"
                        >
                            <option value="" className="bg-gray-900">Seleccionar Programa...</option>
                            {programs.map(p => <option key={p} value={p} className="bg-gray-900">{p}</option>)}
                        </select>
                    </div>

                    {/* Selector de Instrumento */}
                    <div className="space-y-2">
                        <label className="text-xs font-semibold text-white/50 uppercase tracking-widest pl-1">Instrumento</label>
                        <select
                            defaultValue={student.instrument || ""}
                            onChange={(e) => debouncedSave('instrument', e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-primary focus:bg-white/10 transition-all font-medium appearance-none"
                        >
                            <option value="" className="bg-gray-900">Seleccionar Instrumento...</option>
                            {instruments.map(i => <option key={i} value={i} className="bg-gray-900">{i}</option>)}
                        </select>
                    </div>

                    {/* Selector de Docente */}
                    <div className="space-y-2">
                        <label className="text-xs font-semibold text-white/50 uppercase tracking-widest pl-1">Docente Asignado</label>
                        <select
                            defaultValue={student.teacher || ""}
                            onChange={(e) => debouncedSave('teacher', e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-primary focus:bg-white/10 transition-all font-medium appearance-none"
                        >
                            <option value="" className="bg-gray-900">Asignar Docente...</option>
                            {teachers.map(t => <option key={t} value={t} className="bg-gray-900">{t}</option>)}
                        </select>
                    </div>
                </div>

                {/* Observaciones */}
                <div className="mt-8 space-y-2 border-t border-white/5 pt-6">
                    <label className="text-xs font-semibold text-white/50 uppercase tracking-widest pl-1">Observaciones Académicas</label>
                    <textarea
                        placeholder="Notas sobre el proceso del estudiante, requerimientos especiales, etc."
                        defaultValue={student.observations || ""}
                        onChange={(e) => debouncedSave('observations', e.target.value)}
                        rows={3}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 focus:ring-2 focus:ring-primary focus:bg-white/10 transition-all font-medium resize-none"
                    />
                </div>
            </GlassCard>

            {/* TARJETA 2: Horarios de Clases */}
            <GlassCard className="p-6 border-white/5 bg-black/40">
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-secondary/20 rounded-lg shadow-[0_0_15px_rgba(var(--secondary),0.3)]">
                            <span className="text-xl">📅</span>
                        </div>
                        <h2 className="text-xl font-bold text-white tracking-wide">Horario de Clase Principal</h2>
                    </div>

                    <button
                        type="button"
                        onClick={() => alert("Gestión de días múltiples próximamente")}
                        className="text-[10px] font-bold uppercase tracking-wider text-white/40 hover:text-primary transition-colors flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/5 bg-white/5 hover:bg-primary/10 hover:border-primary/20"
                    >
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Días Adicionales
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-end">
                    <div className="space-y-2">
                        <label className="text-xs font-semibold text-white/50 uppercase tracking-widest pl-1">Día de la semana</label>
                        <div className="flex flex-wrap gap-2">
                            {days.map(d => {
                                const isSelected = student.class_day === d;
                                return (
                                    <button
                                        key={d}
                                        type="button"
                                        onClick={() => debouncedSave('class_day', d)}
                                        className={`
                      px-4 py-2 rounded-xl text-xs font-bold transition-all duration-300 border
                      ${isSelected
                                                ? 'bg-secondary text-secondary-foreground border-secondary shadow-[0_0_15px_rgba(var(--secondary),0.4)]'
                                                : 'bg-white/5 text-white/40 border-white/10 hover:border-white/20 hover:text-white'}
                    `}
                                    >
                                        {d}
                                    </button>
                                )
                            })}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-semibold text-white/50 uppercase tracking-widest pl-1">Rango Horario</label>
                        <div className="relative group">
                            <input
                                type="text"
                                placeholder="Ej. 3:00 PM A 4:00 PM"
                                defaultValue={student.class_time || ""}
                                onChange={(e) => debouncedSave('class_time', e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-12 py-3 text-white placeholder-white/20 focus:ring-2 focus:ring-secondary focus:bg-white/10 transition-all font-mono"
                            />
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-secondary transition-colors">
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
