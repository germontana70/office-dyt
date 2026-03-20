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
            
            <div className="relative z-10 space-y-10">
                {/* Header */}
                <div className="flex items-start justify-between">
                    <div>
                        <h3 className="text-[10px] font-black uppercase text-accent tracking-[0.2em] drop-shadow-md">Inventario Global</h3>
                        <p className="text-4xl font-black mt-1 uppercase tracking-tighter drop-shadow-lg text-white italic">
                            Gestión de Instrumentos
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                    {/* Columna Izquierda: Formulario (4/12) */}
                    <div className="lg:col-span-4 space-y-6">
                        <div className="space-y-4">
                            <div className="flex flex-col gap-2 font-bold uppercase tracking-widest text-[10px] text-accent/70 ml-1">
                                {editingId ? 'Editando Instrumento' : 'Registro de Nuevo Instrumento'}
                            </div>
                            <div className="space-y-4">
                                <div className="relative">
                                    <input
                                        type="text"
                                        placeholder="Ej. Piano Entonado..."
                                        value={formName}
                                        onChange={(e) => setFormName(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                                        className="w-full bg-black/60 border border-white/10 rounded-2xl py-4 px-5 shadow-2xl focus:outline-none focus:border-accent transition-all text-base text-white placeholder:text-white/20"
                                    />
                                    {editingId && (
                                        <button 
                                            onClick={cancelEdit}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white transition-colors p-1"
                                        >
                                            <X size={20} />
                                        </button>
                                    )}
                                </div>
                                <PremiumButton
                                    onClick={handleSubmit}
                                    disabled={isPending || !formName.trim()}
                                    variant="primary"
                                    size="lg"
                                    className="w-full"
                                >
                                    {isPending ? (
                                        <Loader2 className="animate-spin" size={20} />
                                    ) : editingId ? (
                                        'Actualizar Datos'
                                    ) : (
                                        <><Plus size={20} className="mr-2" /> Registrar Instrumento</>
                                    )}
                                </PremiumButton>

                                {status && (
                                    <div className={`flex items-center gap-3 text-[11px] font-black uppercase tracking-widest p-4 rounded-xl ${
                                        status.type === 'success' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
                                    } animate-in fade-in slide-in-from-top-2 duration-300`}>
                                        {status.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                                        {status.text}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5">
                            <h5 className="text-[10px] font-black uppercase text-muted-foreground tracking-widest mb-3">Guía Técnica</h5>
                            <p className="text-xs text-muted-foreground leading-relaxed">
                                Los instrumentos creados aquí estarán disponibles globalmente en el selector de programas para todas las matrículas, sin distinción de semestre.
                            </p>
                        </div>
                    </div>

                    {/* Columna Derecha: Catálogo (8/12) */}
                    <div className="lg:col-span-8 space-y-6">
                        <div className="flex items-center justify-between ml-1">
                            <h4 className="text-[10px] text-accent/70 uppercase tracking-widest font-black">Catálogo Activo</h4>
                            <span className="text-[10px] text-muted-foreground font-bold">{instruments.length} TOTAL</span>
                        </div>
                        
                        <div className="flex flex-wrap gap-3 max-h-[500px] overflow-y-auto pr-4 custom-scrollbar content-start">
                            {instruments.length === 0 && !isPending && (
                                <div className="w-full py-20 flex flex-col items-center justify-center border border-dashed border-white/10 rounded-3xl bg-white/[0.01]">
                                    <p className="text-[10px] text-white/20 uppercase tracking-widest font-black">El catálogo está vacío</p>
                                </div>
                            )}
                            
                            {instruments.map((inst) => (
                                <div
                                    key={inst.id}
                                    className={`group/pill pl-5 pr-3 py-3 rounded-2xl text-[13px] font-bold uppercase tracking-wider border transition-all flex items-center gap-4 backdrop-blur-xl ${
                                        inst.is_active 
                                        ? 'bg-primary/5 text-white border-primary/20 hover:border-accent/40' 
                                        : 'bg-white/5 text-white/40 border-white/5 line-through decoration-white/30'
                                    } ${editingId === inst.id ? 'ring-2 ring-accent border-accent/50 bg-accent/5' : ''} hover:bg-white/5`}
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
