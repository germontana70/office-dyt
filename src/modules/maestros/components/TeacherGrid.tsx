'use client';

import { useState } from 'react';
import { Teacher } from '../repository/teacher-repo';
import { TeacherGridCard } from './TeacherGridCard';

export function TeacherGrid({ initialTeachers }: { initialTeachers: Teacher[] }) {
    const [filter, setFilter] = useState<'activos' | 'inactivos' | 'todos'>('activos');

    const filteredTeachers = initialTeachers.filter(t => {
        if (filter === 'activos') return t.is_active;
        if (filter === 'inactivos') return !t.is_active;
        return true;
    });

    return (
        <div className="space-y-8">
            {/* Tabs */}
            <div className="flex justify-center mb-8">
                <div className="inline-flex p-1 bg-black/40 backdrop-blur-md rounded-2xl border border-white/10 shadow-[0_0_20px_hsl(var(--primary)/0.1)]">
                    {(['activos', 'inactivos', 'todos'] as const).map((f) => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-300 ${filter === f
                                    ? 'bg-accent text-accent-foreground shadow-[0_0_15px_hsl(var(--accent)/0.4)]'
                                    : 'text-muted-foreground hover:text-white hover:bg-white/5'
                                }`}
                        >
                            {f}
                        </button>
                    ))}
                </div>
            </div>

            {filteredTeachers.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-16 border border-white/5 bg-black/20 backdrop-blur-md rounded-3xl group">
                    <div className="w-20 h-20 bg-accent/10 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500 shadow-[0_0_30px_hsl(var(--accent)/0.2)]">
                        <svg className="w-10 h-10 text-accent/50 group-hover:text-accent transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                    </div>
                    <h3 className="text-xl font-black uppercase tracking-widest text-muted-foreground mb-2">No hay maestros {filter}</h3>
                </div>
            ) : (
                <div className="flex flex-col w-full gap-3">
                    {filteredTeachers.map(teacher => (
                        <TeacherGridCard key={teacher.id} teacher={teacher} />
                    ))}
                </div>
            )}
        </div>
    );
}

