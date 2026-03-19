"use client";

import { useState, useTransition, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { GlassCard } from '@/ui/components/modules/layout/GlassCard';
import { PremiumButton } from '@/ui/components/modules/buttons/PremiumButton';
import { deleteInstrument, upsertInstrument } from '@/app/actions/settings';
import { Loader2, Plus, Pencil, Trash2, X, AlertCircle, CheckCircle2 } from 'lucide-react';

interface Instrument {
    id: string;
    name: string;
    is_active: boolean;
}

interface InstrumentManagerCardProps {
    initialInstruments: Instrument[];
}

/**
 * @component InstrumentManagerCard
 * @description Gestor de catálogo de instrumentos con estética Neon-Glass.
 * Permite añadir, editar (fix typos), activar/desactivar y eliminar instrumentos.
 */
export function InstrumentManagerCard({ initialInstruments }: InstrumentManagerCardProps) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [instruments, setInstruments] = useState<Instrument[]>(initialInstruments);
    const [formName, setFormName] = useState('');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [status, setStatus] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    // Sincronizar estado cuando las props cambien tras revalidatePath / router.refresh
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
            } else {
                setStatus({ type: 'error', text: result.error || 'Error al cambiar estado.' });
            }
        });
    };

    const handleDelete = (id: string, name: string) => {
        if (!confirm(`¿Eliminar instrumento "${name}"? Esta acción no se puede deshacer.`)) return;

        startTransition(async () => {
            const result = await deleteInstrument(id);
            if (result.success) {
                setStatus({ type: 'success', text: 'Instrumento eliminado correctamente.' });
                router.refresh();
                setTimeout(() => setStatus(null), 3000);
            } else {
                setStatus({ type: 'error', text: result.error || 'Error al eliminar.' });
            }
        });
    };

    const handleSubmit = () => {
        const trimmedName = formName.trim();
        if (!trimmedName) return;

        startTransition(async () => {
            const payload = editingId 
                ? { id: editingId, name: trimmedName, is_active: true }
                : { name: trimmedName, is_active: true };

            const result = await upsertInstrument(payload);
            
            if (result.success) {
                setFormName('');
                setEditingId(null);
                setStatus({ 
                    type: 'success', 
                    text: editingId ? 'Instrumento actualizado.' : 'Instrumento añadido.' 
                });
                router.refresh();
                setTimeout(() => setStatus(null), 3000);
            } else {
                setStatus({ type: 'error', text: result.error || 'Error al guardar.' });
            }
        });
    };

    const startEdit = (inst: Instrument) => {
        setEditingId(inst.id);
        setFormName(inst.name);
        // Scroll up to form if mobile
    };

    const cancelEdit = () => {
        setEditingId(null);
        setFormName('');
    };

    return (
        <GlassCard className="p-8 border-primary/20 bg-black/60 backdrop-blur-2xl h-full relative overflow-hidden group">
            {/* Resplandor decorativo de fondo */}
            <div className="absolute right-[-10%] top-[-10%] w-[350px] h-[350px] bg-primary/10 rounded-full blur-[100px] pointer-events-none group-hover:scale-110 transition-transform duration-1000" />
            
            <div className="relative z-10 space-y-8">
                {/* Header */}
                <div className="flex items-start justify-between">
                    <div>
                        <h3 className="text-[10px] font-black uppercase text-accent tracking-[0.2em] drop-shadow-md">Inventario Global</h3>
                        <p className="text-3xl font-black mt-1 uppercase tracking-tighter drop-shadow-lg text-white italic">
                            Instrumentos
                        </p>
                    </div>
                </div>

                {/* Formulario de Entrada */}
                <div className="space-y-4">
                    <div className="flex flex-col gap-2">
                        <label className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold ml-1">
                            {editingId ? 'Editar Instrumento' : 'Nuevo Instrumento'}
                        </label>
                        <div className="flex gap-3">
                            <div className="relative flex-1">
                                <input
                                    type="text"
                                    placeholder="Ej. Piano Entonado, Guitarra, Violín..."
                                    value={formName}
                                    onChange={(e) => setFormName(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                                    className="w-full bg-black/40 border border-white/10 rounded-xl py-3 px-4 shadow-inner focus:outline-none focus:border-accent transition-all text-sm text-white placeholder:text-white/20"
                                />
                                {editingId && (
                                    <button 
                                        onClick={cancelEdit}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white transition-colors"
                                    >
                                        <X size={16} />
                                    </button>
                                )}
                            </div>
                            <PremiumButton
                                onClick={handleSubmit}
                                disabled={isPending || !formName.trim()}
                                variant="primary"
                                size="md"
                                className="!h-[46px] min-w-[120px]"
                            >
                                {isPending ? (
                                    <Loader2 className="animate-spin" size={18} />
                                ) : editingId ? (
                                    'Guardar'
                                ) : (
                                    <><Plus size={18} className="mr-2" /> Añadir</>
                                )}
                            </PremiumButton>
                        </div>
                    </div>

                    {status && (
                        <div className={`flex items-center gap-2 text-[11px] font-black uppercase tracking-widest p-2 rounded-lg ${
                            status.type === 'success' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
                        } animate-in fade-in slide-in-from-left-2 duration-300`}>
                            {status.type === 'success' ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                            {status.text}
                        </div>
                    )}
                </div>

                {/* Listado de Instrumentos (Scrollable area) */}
                <div className="space-y-4">
                    <h4 className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold ml-1">Catálogo Actual</h4>
                    <div className="flex flex-wrap gap-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar content-start">
                        {instruments.length === 0 && !isPending && (
                            <div className="w-full py-10 flex flex-col items-center justify-center border border-dashed border-white/5 rounded-2xl bg-white/[0.02]">
                                <p className="text-[10px] text-white/20 uppercase tracking-widest font-black">No hay instrumentos registrados</p>
                            </div>
                        )}
                        
                        {instruments.map((inst) => (
                            <div
                                key={inst.id}
                                className={`group/pill pl-4 pr-2 py-2 rounded-xl text-[12px] font-bold uppercase tracking-wider border transition-all flex items-center gap-3 backdrop-blur-sm hover:bg-white/5 ${
                                    inst.is_active 
                                    ? 'bg-primary/10 text-white border-primary/30 hover:border-accent/40' 
                                    : 'bg-white/5 text-white/40 border-white/5 line-through decoration-white/30'
                                } ${editingId === inst.id ? 'ring-2 ring-accent border-accent/50' : ''}`}
                            >
                                <button
                                    onClick={() => handleToggleStatus(inst.id, inst.is_active)}
                                    disabled={isPending}
                                    className="flex items-center gap-3 hover:opacity-80 transition-opacity"
                                    title={inst.is_active ? "Desactivar" : "Activar"}
                                >
                                    <span>{inst.name}</span>
                                    <div className={`w-2 h-2 rounded-full ${inst.is_active ? 'bg-accent shadow-[0_0_8px_hsl(var(--accent))]' : 'bg-red-500/30'}`} />
                                </button>

                                <div className="flex items-center gap-1 opacity-0 group-hover/pill:opacity-100 transition-opacity">
                                    <button
                                        onClick={() => startEdit(inst)}
                                        disabled={isPending}
                                        className="p-1.5 text-white/40 hover:text-accent hover:bg-accent/10 rounded-lg transition-all"
                                        title="Editar nombre"
                                    >
                                        <Pencil size={14} />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(inst.id, inst.name)}
                                        disabled={isPending}
                                        className="p-1.5 text-white/40 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all"
                                        title="Eliminar"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <style jsx>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: rgba(255, 255, 255, 0.02);
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(255, 255, 255, 0.1);
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: rgba(255, 255, 255, 0.2);
                }
            `}</style>
        </GlassCard>
    );
}
