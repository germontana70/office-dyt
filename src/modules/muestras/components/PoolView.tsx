'use client';

import { useState, useTransition } from 'react';
import type { PresentacionPool, Recital } from '@/infra/types/muestras';
import { assignToRecital } from '@/app/actions/muestras';
import { toast } from 'sonner';
import { Layers, CheckSquare, Square, Search, Music, ArrowRight, Loader2 } from 'lucide-react';

interface Props {
    items: PresentacionPool[];
    recitales: Recital[];
    onAssigned: () => void;
}

export function PoolView({ items, recitales, onAssigned }: Props) {
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [searchTerm, setSearchTerm] = useState('');
    const [targetRecital, setTargetRecital] = useState<string>('');
    const [isPending, startTransition] = useTransition();

    const filtered = items.filter((item) =>
        item.student_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.instrument.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.teacher_name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const toggleItem = (id: string) => {
        setSelected((prev) => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    const toggleAll = () => {
        if (selected.size === filtered.length) setSelected(new Set());
        else setSelected(new Set(filtered.map((i) => i.id)));
    };

    const handleAssign = () => {
        if (!targetRecital) {
            toast.warning('Selecciona un recital destino');
            return;
        }
        if (selected.size === 0) return;

        startTransition(async () => {
            const res = await assignToRecital(Array.from(selected), targetRecital);
            if (res.success) {
                toast.success(`Asignadas ${selected.size} presentaciones al recital`);
                setSelected(new Set());
                onAssigned();
            } else {
                toast.error(res.error ?? 'Error al asignar presentaciones');
            }
        });
    };

    return (
        <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden flex flex-col h-[600px]">
            {/* Header / Actions */}
            <div className="p-4 border-b border-white/10 flex flex-col md:flex-row gap-4 items-center justify-between bg-white/5">
                <div className="relative w-full md:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Buscar estudiante, instr..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-black/40 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary transition-all"
                    />
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto">
                    <select
                        value={targetRecital}
                        onChange={(e) => setTargetRecital(e.target.value)}
                        className="flex-1 md:w-48 bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary appearance-none"
                    >
                        <option value="">-- Seleccionar Recital --</option>
                        {recitales.map((r) => (
                            <option key={r.id} value={r.id}>{r.name}</option>
                        ))}
                    </select>

                    <button
                        onClick={handleAssign}
                        disabled={isPending || selected.size === 0 || !targetRecital}
                        className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-[0_0_15px_hsl(var(--primary)/0.3)] disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
                    >
                        {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                        Asignar ({selected.size})
                    </button>
                </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {filtered.length > 0 && (
                    <button
                        onClick={toggleAll}
                        className="flex items-center gap-2 px-3 py-2 mb-2 rounded-xl bg-white/5 hover:bg-white/10 transition-all text-xs font-bold text-muted-foreground uppercase tracking-wider w-fit"
                    >
                        {selected.size === filtered.length ? <CheckSquare className="w-4 h-4 text-primary" /> : <Square className="w-4 h-4" />}
                        {selected.size === filtered.length ? 'Deseleccionar filtrados' : 'Seleccionar filtrados'}
                    </button>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {filtered.map((item) => {
                        const isSelected = selected.has(item.id);
                        return (
                            <div
                                key={item.id}
                                onClick={() => toggleItem(item.id)}
                                className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all ${
                                    isSelected
                                        ? 'bg-primary/10 border-primary/50 shadow-[0_0_15px_hsl(var(--primary)/0.15)]'
                                        : 'bg-black/40 border-white/10 hover:bg-white/5'
                                }`}
                            >
                                <div className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-all ${
                                    isSelected ? 'bg-primary border-primary' : 'border-white/30'
                                }`}>
                                    {isSelected && <svg className="w-3 h-3 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                                </div>
                                <div className="flex-1 min-w-0 space-y-1.5">
                                    <div className="flex items-center gap-2">
                                        <h4 className="text-sm font-bold text-foreground truncate">{item.student_name}</h4>
                                        {item.student_id && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" title="Identidad Correlacionada" />}
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                        <span className="px-2 py-0.5 bg-white/5 rounded-md border border-white/10 text-[10px] uppercase font-black tracking-wider">
                                            {item.instrument}
                                        </span>
                                        <span className="truncate">{item.teacher_name}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground/60">
                                        <Music className="w-3 h-3" />
                                        <span className="truncate">{item.program_details.map(p => p.title).join(', ')}</span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}

                    {filtered.length === 0 && (
                        <div className="col-span-full py-20 flex flex-col items-center justify-center text-center text-muted-foreground">
                            <Layers className="w-10 h-10 mb-3 opacity-20" />
                            <p className="text-sm">No se encontraron presentaciones en el pool.</p>
                            <p className="text-xs opacity-60">Usa el escáner para importar desde Google Drive.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
