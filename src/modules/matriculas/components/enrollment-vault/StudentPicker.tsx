'use client';

import { useState, useEffect, useTransition } from 'react';
import { GlassCard } from '@/ui/components/modules/layout/GlassCard';
import { searchStudents, HybridSearchResult } from '@/app/actions/students';
import { reintegrateStudentFromHistory } from '@/app/actions/reintegrate';

interface StudentPickerProps {
    onSelect: (student: HybridSearchResult) => void;
    selectedStudent: HybridSearchResult | null;
}

export function StudentPicker({ onSelect, selectedStudent }: StudentPickerProps) {
    const [searchTerm, setSearchTerm] = useState('');
    const [results, setResults] = useState<HybridSearchResult[]>([]);
    const [isFocused, setIsFocused] = useState(false);
    const [isPending, startTransition] = useTransition();
    const [pendingReintegration, setPendingReintegration] = useState<HybridSearchResult | null>(null);
    const [isReintegrating, setIsReintegrating] = useState(false);
    const [reintegrateError, setReintegrateError] = useState<string | null>(null);

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

    const handleResultClick = (student: HybridSearchResult) => {
        if (student.source === 'historical') {
            setPendingReintegration(student);
            setIsFocused(false);
        } else {
            onSelect(student);
            setIsFocused(false);
        }
    };

    const handleConfirmReintegration = async () => {
        if (!pendingReintegration?.truth_table_id) return;
        setIsReintegrating(true);
        setReintegrateError(null);

        const result = await reintegrateStudentFromHistory(pendingReintegration.truth_table_id);

        if (result.success && result.studentId) {
            // Seleccionar el estudiante reintegrado
            onSelect({ 
                ...pendingReintegration, 
                id: result.studentId, 
                source: 'current' 
            });
            setPendingReintegration(null);
        } else {
            setReintegrateError(result.error || 'Error en el reintegro.');
        }
        setIsReintegrating(false);
    };

    return (
        <>
            <GlassCard className="p-6 border-primary/10 relative overflow-hidden group">
                <div className="absolute right-[-5%] top-[-5%] w-[300px] h-[300px] bg-primary/5 rounded-full blur-[80px] pointer-events-none group-hover:scale-110 transition-transform duration-700" />
                
                <div className="relative z-10 space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-[12px] font-black uppercase text-primary tracking-widest drop-shadow-md">Paso 1</h3>
                            <p className="text-2xl font-black mt-1 uppercase tracking-tighter text-white">
                                Seleccionar Estudiante
                            </p>
                            <p className="text-[10px] text-white/30 font-mono mt-1">
                                Busca en semestre activo · Si no hay match, busca en histórico
                            </p>
                        </div>
                        {selectedStudent && (
                            <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest animate-pulse border ${
                                selectedStudent.source === 'current' 
                                ? 'bg-green-500/20 border-green-500/20 text-green-400' 
                                : 'bg-cyan-500/20 border-cyan-500/20 text-cyan-400'
                            }`}>
                                {selectedStudent.source === 'current' ? 'Activo' : 'Reintegrado'}
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
                            <div className="absolute left-0 right-0 mt-2 p-2 bg-black/90 border border-primary/20 rounded-xl shadow-2xl z-50 max-h-72 overflow-y-auto custom-scrollbar">
                                {results.length === 0 && !isPending ? (
                                    <div className="p-4 text-center text-[10px] font-bold uppercase tracking-widest text-white/30">
                                        No se encontraron resultados
                                    </div>
                                ) : (
                                    <ul className="space-y-1">
                                        {results.map((s) => (
                                            <li
                                                key={`${s.source}-${s.id}`}
                                                onClick={() => handleResultClick(s)}
                                                className={`p-3 rounded-lg cursor-pointer transition-colors group flex justify-between items-center ${
                                                    s.source === 'current'
                                                    ? 'hover:bg-primary/10'
                                                    : 'hover:bg-cyan-500/10'
                                                }`}
                                            >
                                                <div className="flex flex-col">
                                                    <span className={`font-bold text-white/80 italic transition-colors ${
                                                        s.source === 'current' 
                                                        ? 'group-hover:text-primary' 
                                                        : 'group-hover:text-cyan-400'
                                                    }`}>
                                                        {s.first_name} {s.last_name}
                                                    </span>
                                                    <span className="text-[9px] text-white/30 font-mono tracking-tighter">
                                                        DOC: {s.document_number}
                                                    </span>
                                                </div>
                                                <div className={`text-[9px] font-black px-2 py-1 rounded-md uppercase tracking-widest border ${
                                                    s.source === 'current'
                                                    ? 'text-primary/60 border-primary/20 bg-primary/5'
                                                    : 'text-cyan-400 border-cyan-500/30 bg-cyan-500/10'
                                                }`}>
                                                    {s.source === 'current' ? '● Activo' : '◈ Histórico'}
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </GlassCard>

            {/* Modal de Reintegro */}
            {pendingReintegration && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/70 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="w-full max-w-md bg-black/80 border border-cyan-500/30 rounded-[32px] p-8 shadow-[0_0_60px_rgba(34,211,238,0.15)] space-y-6">
                        <div className="space-y-2">
                            <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 text-2xl mb-4">
                                ◈
                            </div>
                            <h3 className="text-xl font-black uppercase tracking-tighter text-white">
                                Reintegro de Alumno Histórico
                            </h3>
                            <p className="text-sm text-white/50">
                                <span className="text-cyan-400 font-bold">{pendingReintegration.first_name} {pendingReintegration.last_name}</span> es un alumno histórico. 
                                Sus datos serán limpiados con el motor SIA 2.0 e insertados en el semestre activo.
                            </p>
                        </div>

                        {reintegrateError && (
                            <p className="text-red-400 text-xs font-bold p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                                ⚠️ {reintegrateError}
                            </p>
                        )}

                        <div className="flex gap-3">
                            <button
                                onClick={() => { setPendingReintegration(null); setReintegrateError(null); }}
                                className="flex-1 py-3 rounded-2xl font-black uppercase text-xs tracking-widest border border-white/10 text-white/40 hover:border-white/20 hover:text-white/60 transition-all"
                                disabled={isReintegrating}
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleConfirmReintegration}
                                disabled={isReintegrating}
                                className="flex-2 flex-1 py-3 rounded-2xl font-black uppercase text-xs tracking-widest bg-cyan-500 text-black hover:bg-cyan-400 transition-all shadow-[0_0_20px_rgba(34,211,238,0.3)] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isReintegrating ? 'Reintegrando...' : '✓ Confirmar Reintegro'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
