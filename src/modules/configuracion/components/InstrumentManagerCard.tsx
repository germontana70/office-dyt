"use client";

import { useState, useTransition, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { GlassCard } from '@/ui/components/modules/layout/GlassCard';
import { deleteInstrument, upsertInstrument } from '@/app/actions/settings';

interface InstrumentManagerCardProps {
    initialInstruments: any[];
}

export function InstrumentManagerCard({ initialInstruments }: InstrumentManagerCardProps) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [instruments, setInstruments] = useState(initialInstruments);
    const [newName, setNewName] = useState('');
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    // Sincronizar estado cuando las props cambien (ej. tras router.refresh)
    useEffect(() => {
        setInstruments(initialInstruments);
    }, [initialInstruments]);

    const handleToggleStatus = (id: string, currentStatus: boolean) => {
        const instrument = instruments.find(i => i.id === id);
        if (!instrument) return;

        startTransition(async () => {
            const result = await upsertInstrument({ ...instrument, is_active: !currentStatus });
            if (result.success) {
                router.refresh();
            }
        });
    };

    const handleDelete = (id: string, name: string) => {
        if (!confirm(`¿Eliminar instrumento "${name}"? Esta acción no se puede deshacer.`)) return;

        startTransition(async () => {
            const result = await deleteInstrument(id);
            if (result.success) {
                setMessage({ type: 'success', text: 'Instrumento eliminado.' });
                router.refresh();
                setTimeout(() => setMessage(null), 3000);
            } else {
                setMessage({ type: 'error', text: result.error || 'Error al eliminar.' });
                setTimeout(() => setMessage(null), 4000);
            }
        });
    };

    const handleAdd = () => {
        if (!newName.trim()) return;

        startTransition(async () => {
            const result = await upsertInstrument({ name: newName, is_active: true });
            if (result.success) {
                setNewName('');
                setMessage({ type: 'success', text: 'Instrumento añadido.' });
                router.refresh();
                setTimeout(() => setMessage(null), 3000);
            } else {
                setMessage({ type: 'error', text: result.error || 'Error al añadir.' });
                setTimeout(() => setMessage(null), 4000);
            }
        });
    };

    return (
        <GlassCard className="p-8 border-pink-500/20 bg-pink-500/5 h-full relative overflow-hidden group">
            <div className="absolute right-[-5%] top-[-5%] w-[300px] h-[300px] bg-pink-500/10 rounded-full blur-[80px] pointer-events-none group-hover:scale-110 transition-transform duration-700" />
            
            <div className="relative z-10 space-y-6">
                <div>
                    <h3 className="text-[12px] font-black uppercase text-pink-400 tracking-widest drop-shadow-md">Catálogo de Instrumentos</h3>
                    <p className="text-3xl font-black mt-2 uppercase tracking-tighter drop-shadow-lg text-white">
                        Gestión de Instrumentos
                    </p>
                </div>

                <div className="flex gap-2">
                    <input
                        type="text"
                        placeholder="Nuevo instrumento (ej. Piano)"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                        className="flex-1 bg-black/40 border border-white/10 rounded-xl py-2 px-4 shadow-inner focus:outline-none focus:border-pink-500 transition-all text-sm"
                    />
                    <button
                        onClick={handleAdd}
                        disabled={isPending || !newName.trim()}
                        className="px-4 py-2 bg-pink-600 text-white rounded-xl font-bold uppercase text-[10px] tracking-widest hover:bg-pink-500 transition-all active:scale-95 disabled:opacity-50"
                    >
                        {isPending ? '...' : '+ Añadir'}
                    </button>
                </div>

                {message && (
                    <p className={`text-[10px] font-black uppercase tracking-widest text-center ${message.type === 'success' ? 'text-green-400' : 'text-red-400'} animate-bounce`}>
                        {message.text}
                    </p>
                )}

                <div className="flex flex-wrap gap-2 max-h-[250px] overflow-y-auto pr-2 no-scrollbar content-start">
                    {instruments.length === 0 && (
                        <p className="text-[10px] text-white/20 uppercase tracking-widest font-bold py-4 w-full text-center">No hay instrumentos registrados</p>
                    )}
                    {instruments.map((inst) => (
                        <div
                            key={inst.id}
                            className={`px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider border transition-all flex items-center gap-2 group/pill ${
                                inst.is_active 
                                ? 'bg-pink-500/10 text-pink-300 border-pink-500/20' 
                                : 'bg-white/5 text-white/30 border-white/10 line-through decoration-white/50'
                            }`}
                        >
                            <button
                                onClick={() => handleToggleStatus(inst.id, inst.is_active)}
                                disabled={isPending}
                                className="flex items-center gap-2 hover:opacity-90 transition-opacity"
                                title="Activar o desactivar"
                            >
                                <span>{inst.name}</span>
                                <span className={`w-1.5 h-1.5 rounded-full ${inst.is_active ? 'bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.5)]' : 'bg-red-500/50'}`} />
                            </button>
                            <button
                                onClick={() => handleDelete(inst.id, inst.name)}
                                disabled={isPending}
                                className="ml-1 text-red-400/80 hover:text-red-400 transition-colors"
                                title="Eliminar instrumento"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </GlassCard>
    );
}
