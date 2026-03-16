'use client';

import { useState, useEffect, useTransition } from 'react';
import { GlassCard } from '@/ui/components/modules/layout/GlassCard';
import { searchStudents } from '@/app/actions/students';

interface Student {
    id: string;
    first_name: string;
    last_name: string;
    document_number?: string;
    email?: string | null;
}

interface StudentPickerProps {
    onSelect: (student: Student) => void;
    selectedStudent: Student | null;
}

export function StudentPicker({ onSelect, selectedStudent }: StudentPickerProps) {
    const [searchTerm, setSearchTerm] = useState('');
    const [results, setResults] = useState<Student[]>([]);
    const [isFocused, setIsFocused] = useState(false);
    const [isPending, startTransition] = useTransition();

    useEffect(() => {
        if (searchTerm.length < 2 || selectedStudent) {
            setResults([]);
            return;
        }

        const delayDebounceFn = setTimeout(() => {
            startTransition(async () => {
                const data = await searchStudents(searchTerm);
                setResults(data);
            });
        }, 300);

        return () => clearTimeout(delayDebounceFn);
    }, [searchTerm, selectedStudent]);

    return (
        <GlassCard className="p-6 border-primary/10 relative overflow-hidden group">
            <div className="absolute right-[-5%] top-[-5%] w-[300px] h-[300px] bg-primary/5 rounded-full blur-[80px] pointer-events-none group-hover:scale-110 transition-transform duration-700" />
            
            <div className="relative z-10 space-y-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-[12px] font-black uppercase text-primary tracking-widest drop-shadow-md">Paso 1</h3>
                        <p className="text-2xl font-black mt-1 uppercase tracking-tighter text-white">
                            Seleccionar Estudiante
                        </p>
                    </div>
                    {selectedStudent && (
                        <div className="px-4 py-1.5 bg-green-500/20 border border-green-500/20 rounded-full text-[10px] font-black uppercase tracking-widest text-green-400 animate-pulse">
                            Identificado
                        </div>
                    )}
                </div>

                <div className="relative">
                    <div className={`relative rounded-xl border transition-all duration-300 bg-black/40 ${isFocused ? 'border-primary shadow-[0_0_20px_rgba(var(--primary-rgb),0.2)]' : 'border-white/10'}`}>
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            {isPending ? (
                                <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                            ) : (
                                <svg className={`w-5 h-5 transition-colors ${isFocused ? 'text-primary' : 'text-white/20'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                            )}
                        </div>
                        <input
                            type="text"
                            placeholder="Buscar por nombre o documento..."
                            className="w-full bg-transparent border-none text-white pl-12 pr-4 py-4 rounded-xl focus:outline-none focus:ring-0 placeholder:text-white/10 font-bold"
                            value={selectedStudent ? `${selectedStudent.first_name} ${selectedStudent.last_name}` : searchTerm}
                            onChange={(e) => {
                                if (selectedStudent) onSelect(null as any);
                                setSearchTerm(e.target.value);
                            }}
                            onFocus={() => setIsFocused(true)}
                            onBlur={() => setTimeout(() => setIsFocused(false), 200)}
                        />
                        {selectedStudent && (
                            <button 
                                onClick={() => { setSearchTerm(''); onSelect(null as any); }}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white transition-colors"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        )}
                    </div>

                    {isFocused && !selectedStudent && searchTerm.length >= 2 && (
                        <div className="absolute left-0 right-0 mt-2 p-2 bg-black/90 border border-primary/20 rounded-xl shadow-2xl z-50 max-h-60 overflow-y-auto custom-scrollbar">
                            {results.length === 0 && !isPending ? (
                                <div className="p-4 text-center text-[10px] font-bold uppercase tracking-widest text-white/30">
                                    No se encontraron resultados
                                </div>
                            ) : (
                                <ul className="space-y-1">
                                    {results.map((s) => (
                                        <li
                                            key={s.id}
                                            onClick={() => {
                                                onSelect(s);
                                                setIsFocused(false);
                                            }}
                                            className="p-3 rounded-lg hover:bg-primary/10 cursor-pointer transition-colors group flex justify-between items-center"
                                        >
                                            <div className="flex flex-col">
                                                <span className="font-bold text-white/80 group-hover:text-primary transition-colors italic">
                                                    {s.first_name} {s.last_name}
                                                </span>
                                                <span className="text-[9px] text-white/30 font-mono tracking-tighter">
                                                    DOC: {s.document_number}
                                                </span>
                                            </div>
                                            <span className="text-[9px] font-black uppercase tracking-widest text-white/20 group-hover:text-primary/50 transition-colors">
                                                Seleccionar
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </GlassCard>
    );
}
