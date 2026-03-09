'use client';

import { useState } from 'react';
import { CurrentStudent } from '../models/student.schema';
import { GlassCard } from '@/ui/components/modules/layout/GlassCard';

interface StudentSearchSelectProps {
    students: CurrentStudent[];
}

export function StudentSearchSelect({ students }: StudentSearchSelectProps) {
    const [searchTerm, setSearchTerm] = useState('');
    const [isFocused, setIsFocused] = useState(false);

    const filtered = students.filter(s =>
        s.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.document_number.includes(searchTerm)
    );

    return (
        <GlassCard className="p-6 relative transition-all duration-300 hover:shadow-[0_8px_32px_0_hsl(var(--primary)/0.15)] animate-in slide-in-from-bottom-6 fade-in duration-700 delay-150 fill-mode-both">
            <div className="space-y-4">
                <label className="text-sm font-medium text-white/70 tracking-wide block">
                    Buscar Estudiante
                </label>

                <div className={`relative rounded-xl border transition-all duration-300 bg-white/5 ${isFocused
                    ? 'border-primary ring-2 ring-primary/20 shadow-[0_0_20px_hsl(var(--primary)/0.2)]'
                    : 'border-white/10 hover:border-white/20'
                    }`}>
                    {/* Icono Lupa */}
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <svg
                            className={`w-5 h-5 transition-colors duration-300 ${isFocused ? 'text-primary' : 'text-white/40'}`}
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>

                    <input
                        type="text"
                        className="w-full bg-transparent border-none text-white pl-12 pr-4 py-4 rounded-xl focus:outline-none focus:ring-0 placeholder:text-white/20 font-medium"
                        placeholder="Escriba nombre o documento..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        onFocus={() => setIsFocused(true)}
                        onBlur={() => setTimeout(() => setIsFocused(false), 200)}
                    />
                </div>

                {/* Dropdown flotante al enfocar (Combobox behavior) */}
                {isFocused && (
                    <div className="absolute left-0 right-0 mt-2 p-2 bg-black/60 backdrop-blur-2xl border border-white/10 rounded-xl shadow-[0_10px_40px_-10px_hsl(var(--primary)/0.3)] z-50 max-h-64 overflow-y-auto animate-in fade-in zoom-in-95 duration-200 custom-scrollbar">
                        {filtered.length === 0 ? (
                            <div className="p-4 text-center text-sm text-white/40">
                                No se encontraron coincidencias
                            </div>
                        ) : (
                            <ul className="space-y-1">
                                {filtered.map((student) => (
                                    <li
                                        key={student.id}
                                        className="flex justify-between items-center p-3 rounded-lg hover:bg-white/10 cursor-pointer transition-colors group"
                                    >
                                        <div>
                                            <span className="font-medium text-white/90 group-hover:text-white transition-colors">
                                                {student.first_name} {student.last_name}
                                            </span>
                                            <p className="text-xs text-secondary/60 mt-0.5">
                                                Doc: {student.document_number} • Edo: {student.enrollment_status}
                                            </p>
                                        </div>

                                        <button className="opacity-0 group-hover:opacity-100 px-3 py-1 bg-primary/20 hover:bg-primary/40 text-primary-foreground text-xs rounded-md transition-all shadow-[0_0_10px_hsl(var(--primary)/0.2)] border border-primary/30">
                                            Gestionar
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                )}
            </div>
        </GlassCard>
    );
}
