"use client";

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CurrentStudent } from '../models/student.schema';
import { GlassCard } from '@/ui/components/modules/layout/GlassCard';

interface StudentSearchSelectProps {
    students: CurrentStudent[];
    onSelect?: (student: CurrentStudent) => void;
    onSearchFocus?: () => void;
}

export function StudentSearchSelect({ students, onSelect, onSearchFocus }: StudentSearchSelectProps) {
    const router = useRouter();
    const [searchTerm, setSearchTerm] = useState('');
    const [isFocused, setIsFocused] = useState(false);
    const inputRef = useRef<HTMLInputElement | null>(null);

    const filtered = students.filter(s =>
        (s.first_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s.last_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s.document_number || '').includes(searchTerm)
    );

    const handleSelect = (student: CurrentStudent) => {
        if (onSelect) {
            onSelect(student);
            setSearchTerm(`${student.first_name} ${student.last_name}`);
        } else {
            router.push(`/dashboard/matriculas/${student.id}/edit`);
        }
    };

    const handleFocusReset = () => {
        setIsFocused(true);
        setSearchTerm('');
        onSearchFocus?.();
        inputRef.current?.focus();
    };

    return (
        <GlassCard className="p-6 relative z-50 transition-all duration-500 hover:shadow-[0_8px_40px_0_hsl(var(--primary)/0.1)] animate-in slide-in-from-bottom-6 fade-in duration-700 delay-150 fill-mode-both border border-white/10 bg-black/60 shadow-xl dark:shadow-none">
            <div className="space-y-4 relative z-50">
                <label className="text-[10px] font-black text-slate-600 dark:text-muted-foreground uppercase tracking-[0.2em] block pl-1">
                    Buscar Estudiante
                </label>

                <div
                    className={`relative rounded-xl border transition-all duration-500 bg-white/5 backdrop-blur-md cursor-pointer ${isFocused
                    ? 'border-accent ring-2 ring-accent/10 shadow-[0_0_25px_hsl(var(--accent)/0.2)] scale-[1.01]'
                    : 'border-white/10 hover:border-accent/30'
                    }`}
                    onClick={handleFocusReset}
                >
                    {/* Icono Lupa */}
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <svg
                            className={`w-5 h-5 transition-colors duration-500 ${isFocused ? 'text-accent' : 'text-muted-foreground/40'}`}
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>

                    <input
                        type="text"
                        ref={inputRef}
                        className="w-full h-full bg-transparent border-none text-foreground rounded-xl outline-none focus:outline-none focus:ring-0 placeholder:text-gray-500 font-bold tracking-tight pl-12 pr-4 py-4"
                        placeholder="Escriba nombre o documento..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        onFocus={() => {
                            handleFocusReset();
                        }}
                        onBlur={() => setTimeout(() => setIsFocused(false), 200)}
                    />
                </div>

                {/* Dropdown flotante al enfocar (Combobox behavior) */}
                {isFocused && (
                    <div 
                        className="absolute w-full left-0 right-0 mt-3 p-2 bg-[#0a0a0a]/90 backdrop-blur-2xl border border-accent/20 rounded-2xl shadow-2xl dark:shadow-[0_20px_50px_-10px_rgba(0,0,0,0.5)] z-[100] max-h-60 overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-300 custom-scrollbar border-t-accent/40"
                    >
                        {filtered.length === 0 ? (
                            <div className="p-6 text-center text-[11px] font-black uppercase tracking-widest text-muted-foreground/50">
                                No se encontraron coincidencias
                            </div>
                        ) : (
                            <ul className="space-y-1.5 focus-within:outline-none">
                                {filtered.map((student) => (
                                    <li
                                        key={student.id}
                                        className="flex justify-between items-center p-3.5 rounded-xl hover:bg-white/5 cursor-pointer transition-all group border border-transparent hover:border-white/10"
                                        onMouseDown={(e) => {
                                            e.preventDefault(); // Evita que el input pierda el foco antes de procesar el clic
                                            handleSelect(student);
                                            setIsFocused(false);
                                            setSearchTerm(`${student.first_name} ${student.last_name}`);
                                        }}
                                    >
                                        <div className="flex flex-col">
                                            <span className="font-black text-white group-hover:text-accent transition-colors uppercase tracking-tight italic">
                                                {student.first_name} {student.last_name}
                                            </span>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest bg-white/5 px-1.5 py-0.5 rounded">
                                                    UOC: {student.document_number}
                                                </span>
                                                <span className={`text-[10px] font-black uppercase tracking-tighter ${student.enrollment_status === 'Activo' ? 'text-accent' : 'text-primary'}`}>
                                                    • {student.enrollment_status}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3">
                                            <span className="text-[10px] font-black text-accent opacity-0 group-hover:opacity-100 transition-all uppercase tracking-widest">
                                                Gestionar
                                            </span>
                                            <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center text-accent ring-1 ring-accent/20 group-hover:scale-110 transition-transform">
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
                                                </svg>
                                            </div>
                                        </div>
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
