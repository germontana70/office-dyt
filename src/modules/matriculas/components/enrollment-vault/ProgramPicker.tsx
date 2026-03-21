'use client';

import { useState, useMemo } from 'react';
import { GlassCard } from '@/ui/components/modules/layout/GlassCard';
import { Check, Circle } from 'lucide-react';

interface ProgramPickerProps {
    programs: any[];
    selectedPrograms: Array<{ id: string; name: string }>;
    onChange: (programs: Array<{ id: string; name: string }>) => void;
}

const normalizeText = (text: string) => 
    text ? text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase() : '';

export function ProgramPicker({ programs, selectedPrograms, onChange }: ProgramPickerProps) {
    const [searchTerm, setSearchTerm] = useState('');

    const filteredPrograms = useMemo(() => {
        const query = normalizeText(searchTerm);
        if (!query) return programs;
        
        return programs.filter(prog => 
            normalizeText(prog.program_name).includes(query)
        );
    }, [programs, searchTerm]);

    const handleToggle = (prog: any) => {
        const isSelected = selectedPrograms.some(p => p.id === prog.id);
        if (isSelected) {
            onChange(selectedPrograms.filter(p => p.id !== prog.id));
        } else {
            onChange([...selectedPrograms, { id: prog.id, name: prog.program_name }]);
        }
    };

    const formatCurrency = (val: number) => {
        const n = Math.round(Number(val) || 0);
        return '$ ' + n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    };

    return (
        <GlassCard className="p-6 border-violet-500/10 relative overflow-hidden group">
            <div className="absolute right-[-5%] top-[-5%] w-[300px] h-[300px] bg-cyan-500/5 rounded-full blur-[80px] pointer-events-none group-hover:scale-110 transition-transform duration-700" />
            
            <div className="relative z-10 space-y-6">
                <div>
                    <h3 className="text-[12px] font-black uppercase text-cyan-400 tracking-widest drop-shadow-md">Paso 3</h3>
                    <p className="text-2xl font-black mt-1 uppercase tracking-tighter text-white">
                        Programas Académicos
                    </p>
                </div>

                <div className="space-y-4">
                    <input
                        type="text"
                        placeholder="Buscar programa (ej. Teatro, Musica)..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-black/40 border border-white/10 rounded-xl py-3 px-4 text-white text-sm focus:outline-none focus:border-cyan-500 transition-all font-mono placeholder:text-white/20"
                    />

                    <div className="max-h-[300px] overflow-y-auto pr-2 space-y-2 custom-scrollbar">
                        {filteredPrograms.map((prog) => {
                            const isSelected = selectedPrograms.some(p => p.id === prog.id);
                            
                            return (
                                <div
                                    key={prog.id}
                                    onClick={() => handleToggle(prog)}
                                    className={`flex items-center justify-between p-4 rounded-2xl cursor-pointer transition-all border ${
                                        isSelected 
                                        ? 'bg-violet-600/20 border-violet-500/50 shadow-[0_0_15px_rgba(139,92,246,0.1)]' 
                                        : 'bg-black/40 border-white/5 hover:border-cyan-500/30'
                                    }`}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={`p-1 rounded-full ${isSelected ? 'text-primary' : 'text-white/20'}`}>
                                            {isSelected ? <Check size={20} /> : <Circle size={20} />}
                                        </div>
                                        <div>
                                            <p className={`font-bold uppercase text-sm ${isSelected ? 'text-white' : 'text-white/70'}`}>
                                                {prog.program_name}
                                            </p>
                                            <p className="text-[10px] text-accent tracking-widest uppercase italic">
                                                Contado: {formatCurrency(Number(prog.valor_contado))} | +{prog.increment_percentage}% Financiación
                                            </p>
                                        </div>
                                    </div>
                                    
                                    <div className="text-right flex flex-col items-end">
                                        <div className={`text-xs px-2 py-1 rounded-md font-bold ${
                                            isSelected ? 'bg-primary/20 text-primary' : 'bg-white/5 text-white/30'
                                        }`}>
                                            {isSelected ? 'Seleccionado' : 'Disponible'}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}

                        {filteredPrograms.length === 0 && (
                            <div className="p-8 text-center text-white/30 text-sm font-mono italic">
                                No se encontraron programas coincidiendo con "{searchTerm}"
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </GlassCard>
    );
}

