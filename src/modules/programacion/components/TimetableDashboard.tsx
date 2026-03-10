'use client';

import { useState } from 'react';
import { GlassCard } from '@/ui/components/modules/layout/GlassCard';
import { ClassCard } from '@/modules/programacion/components/ClassCard';
import { LegacyCalendarEvent } from '../repository/calendar-event-repo';
import { Teacher } from '@/modules/maestros/repository/teacher-repo';

interface StudentParams { id: string; full_name: string; }

interface Props {
    events: LegacyCalendarEvent[];
    teachers: Teacher[];
    students: StudentParams[];
}

const DAYS = ['Todos', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

export function TimetableDashboard({ events, teachers, students }: Props) {
    const [selectedDay, setSelectedDay] = useState('Lunes');
    const [selectedTeacher, setSelectedTeacher] = useState('');
    const [searchStudent, setSearchStudent] = useState('');

    const filteredEvents = events.filter(e => {
        // Day filter
        if (selectedDay !== 'Todos' && e.day_of_week !== selectedDay) return false;

        // Teacher filter
        if (selectedTeacher) {
            const teacher = teachers.find(t => t.id === selectedTeacher);
            if (teacher && e.teacher_name !== teacher.name) return false;
        }

        // Student filter
        if (searchStudent.trim() !== '') {
            const student = students.find(s => s.id === e.student_id);
            if (!student || !student.full_name.toLowerCase().includes(searchStudent.toLowerCase())) {
                return false;
            }
        }

        return true;
    });

    return (
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
                                {DAYS.map((dia) => {
                                    const isActive = selectedDay === dia;
                                    return (
                                        <button
                                            key={dia}
                                            onClick={() => setSelectedDay(dia)}
                                            className={`px-2 py-2 text-[10px] font-bold uppercase tracking-widest rounded-lg border transition-all ${isActive ? 'bg-primary/20 border-primary text-primary shadow-[0_0_10px_hsl(var(--primary)/0.2)]' : 'bg-background/50 border-border/50 text-muted-foreground hover:border-primary/50'}`}
                                        >
                                            {dia}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest pl-1">Filtrar por Docente</label>
                            <select
                                value={selectedTeacher}
                                onChange={(e) => setSelectedTeacher(e.target.value)}
                                className="w-full bg-background/50 border border-border/50 rounded-xl px-4 py-3 text-foreground focus:ring-2 focus:ring-accent focus:border-accent/50 transition-all font-bold appearance-none cursor-pointer text-sm"
                            >
                                <option value="">Todos los docentes</option>
                                {teachers.map(t => (
                                    <option key={t.id} value={t.id}>{t.name} {t.instrument ? `(${t.instrument})` : ''}</option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest pl-1">Buscar por Estudiante</label>
                            <input
                                type="text"
                                placeholder="Nombre completo..."
                                value={searchStudent}
                                onChange={(e) => setSearchStudent(e.target.value)}
                                className="w-full bg-background/50 border border-border/50 rounded-xl px-4 py-3 text-foreground focus:ring-2 focus:ring-accent focus:border-accent/50 transition-all font-medium text-sm"
                            />
                        </div>
                    </div>
                </GlassCard>
            </div>

            {/* Panel Derecho: Lienzo (Timetable Container) */}
            <div className="flex-1 min-w-0">
                <GlassCard className="p-6 h-full flex flex-col border-white/5 bg-black/30 dark:bg-black/40 backdrop-blur-xl overflow-hidden relative group">
                    <div className="flex items-center justify-between mb-6 pb-4 border-b border-border/50">
                        <h3 className="text-lg font-black uppercase text-foreground italic tracking-tighter">
                            Horario: {selectedDay}
                        </h3>
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">En Vivo</span>
                        </div>
                    </div>

                    {filteredEvents.length === 0 ? (
                        <div className="flex-1 flex flex-col items-center justify-center p-10 border border-dashed border-white/10 rounded-2xl bg-black/20">
                            <div className="w-16 h-16 bg-accent/10 rounded-2xl flex items-center justify-center mb-6 shadow-[0_0_30px_hsl(var(--accent)/0.2)] animate-pulse">
                                <svg className="w-8 h-8 text-accent opacity-80" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-black uppercase tracking-widest text-muted-foreground mb-2 italic">Lienzo Despejado</h3>
                            <p className="text-sm text-muted-foreground/60 font-medium max-w-xs text-center">
                                No hay clases programadas para estos criterios.
                            </p>
                        </div>
                    ) : (
                        <div className="flex-1 overflow-y-auto custom-scrollbar">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pb-10">
                                {filteredEvents.map(event => {
                                    const student = students.find(s => s.id === event.student_id);
                                    return (
                                        <ClassCard
                                            key={event.id}
                                            event={event}
                                            studentName={student?.full_name}
                                        />
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </GlassCard>
            </div>
        </div>
    );
}
