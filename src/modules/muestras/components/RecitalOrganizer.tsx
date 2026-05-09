'use client';

import { useState, useTransition, useCallback } from 'react';
import { reorderItem, insertBlankEvent, deleteRecitalItem } from '@/app/actions/muestras';
import { calculateTimeline, getTotalRecitalDuration, secondsToHHMMSS, type TimelineEntry } from '@/infra/utils/timeline';
import type { MuestraPresentacion, RecitalFilters } from '@/infra/types/muestras';
import { toast } from 'sonner';
import {
    ChevronUp, ChevronDown, Clock, Music, Star, Trash2,
    Plus, Filter, UserCheck, AlertTriangle, UserX, GripVertical
} from 'lucide-react';

interface Props {
    initialItems: MuestraPresentacion[];
    recitalId: string;
    recitalStartISO: string;
    teachers: string[];
    instruments: string[];
}

// ── Bio-Correlator Badge (inline) ─────────────────────────
function ConfidenceBadge({ confidence, age }: { confidence: string; age: number | null }) {
    const map: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
        exact: { icon: <UserCheck className="w-3 h-3" />, color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20', label: 'ID' },
        fuzzy: { icon: <AlertTriangle className="w-3 h-3" />, color: 'text-amber-400 bg-amber-500/10 border-amber-500/20', label: '~' },
        none:  { icon: <UserX className="w-3 h-3" />,   color: 'text-rose-400 bg-rose-500/10 border-rose-500/20',     label: '?' },
    };
    const cfg = map[confidence] ?? map.none;
    return (
        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md border text-[10px] font-bold ${cfg.color}`}>
            {cfg.icon}
            {cfg.label}
            {age !== null && <span className="opacity-70">·{age}a</span>}
        </span>
    );
}

// ── Blank Event Dialog (inline) ────────────────────────────
function BlankEventDialog({
    afterOrder,
    recitalId,
    onClose,
    onSuccess,
}: {
    afterOrder: number;
    recitalId: string;
    onClose: () => void;
    onSuccess: () => void;
}) {
    const [label, setLabel] = useState('Saludo inicial');
    const [duration, setDuration] = useState('00:02:00');
    const [isPending, startTransition] = useTransition();

    const handleInsert = () => {
        startTransition(async () => {
            const res = await insertBlankEvent(recitalId, afterOrder, label, duration);
            if (res.success) {
                toast.success(`Evento "${label}" insertado`);
                onSuccess();
                onClose();
            } else {
                toast.error(res.error ?? 'Error al insertar evento');
            }
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
            <div
                className="bg-black/80 backdrop-blur-2xl border border-white/15 rounded-2xl p-6 w-80 space-y-4 shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                <h4 className="text-sm font-black text-foreground uppercase tracking-wider flex items-center gap-2">
                    <Star className="w-4 h-4 text-accent" /> Evento Especial
                </h4>
                <div className="space-y-3">
                    <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Etiqueta</label>
                        <input
                            value={label}
                            onChange={(e) => setLabel(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Duración (HH:MM:SS)</label>
                        <input
                            value={duration}
                            onChange={(e) => setDuration(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-accent"
                        />
                    </div>
                </div>
                <div className="flex gap-2 pt-1">
                    <button onClick={onClose} className="flex-1 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-muted-foreground text-xs font-bold uppercase transition-all">
                        Cancelar
                    </button>
                    <button
                        onClick={handleInsert}
                        disabled={isPending || !label.trim()}
                        className="flex-1 py-2 rounded-xl bg-accent text-accent-foreground text-xs font-bold uppercase transition-all hover:opacity-90 disabled:opacity-50"
                    >
                        {isPending ? 'Insertando...' : 'Insertar'}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ── Main Component ─────────────────────────────────────────
export function RecitalOrganizer({ initialItems, recitalId, recitalStartISO, teachers, instruments }: Props) {
    const [items, setItems] = useState<MuestraPresentacion[]>(initialItems);
    const [isPending, startTransition] = useTransition();
    const [blankDialogAfter, setBlankDialogAfter] = useState<number | null>(null);
    const [filters, setFilters] = useState<RecitalFilters>({
        teacher: '',
        instrument: '',
        maxAge: null,
        minAge: null,
    });
    const [showFilters, setShowFilters] = useState(false);

    const recitalStart = new Date(recitalStartISO);

    // Aplicar filtros
    const filteredItems = items.filter((item) => {
        if (item.is_blank_event) return true; // Eventos especiales siempre visibles
        if (filters.teacher && item.teacher_name !== filters.teacher) return false;
        if (filters.instrument && item.instrument !== filters.instrument) return false;
        if (filters.minAge !== null && (item.age_at_recital ?? 0) < filters.minAge) return false;
        if (filters.maxAge !== null && (item.age_at_recital ?? 999) > filters.maxAge) return false;
        return true;
    });

    const timeline: TimelineEntry[] = calculateTimeline(filteredItems, recitalStart);
    const totalSecs = getTotalRecitalDuration(timeline);

    const handleMove = useCallback((index: number, direction: 'up' | 'down') => {
        const swapIndex = direction === 'up' ? index - 1 : index + 1;
        if (swapIndex < 0 || swapIndex >= timeline.length) return;

        // Optimistic update
        const newItems = [...items];
        const itemA = timeline[index];
        const itemB = timeline[swapIndex];
        const idxA = newItems.findIndex((i) => i.id === itemA.id);
        const idxB = newItems.findIndex((i) => i.id === itemB.id);

        const tempOrder = newItems[idxA].sort_order;
        newItems[idxA].sort_order = newItems[idxB].sort_order;
        newItems[idxB].sort_order = tempOrder;
        newItems.sort((a, b) => a.sort_order - b.sort_order);
        setItems([...newItems]);

        startTransition(async () => {
            const res = await reorderItem(itemA.id, itemA.sort_order, itemB.id, itemB.sort_order);
            if (!res.success) {
                setItems(initialItems); // Rollback
                toast.error('Error al reordenar: ' + res.error);
            }
        });
    }, [items, timeline, initialItems]);

    const handleDelete = useCallback((itemId: string, label: string) => {
        startTransition(async () => {
            const res = await deleteRecitalItem(itemId);
            if (res.success) {
                setItems((prev) => prev.filter((i) => i.id !== itemId));
                toast.success(`"${label}" eliminado del recital`);
            } else {
                toast.error(res.error ?? 'Error al eliminar');
            }
        });
    }, []);

    const handleBlankSuccess = () => {
        // Recargar página para obtener el nuevo estado
        window.location.reload();
    };

    const hasActiveFilters = filters.teacher || filters.instrument || filters.minAge !== null || filters.maxAge !== null;

    return (
        <>
            {/* Blank Event Dialog */}
            {blankDialogAfter !== null && (
                <BlankEventDialog
                    afterOrder={blankDialogAfter}
                    recitalId={recitalId}
                    onClose={() => setBlankDialogAfter(null)}
                    onSuccess={handleBlankSuccess}
                />
            )}

            <div className="bg-black/60 backdrop-blur-2xl border border-white/10 rounded-2xl overflow-hidden">
                {/* Header con stats */}
                <div className="p-4 border-b border-white/10">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-primary/10 rounded-lg border border-primary/20">
                                <Clock className="w-4 h-4 text-primary" />
                            </div>
                            <h3 className="text-sm font-black text-foreground uppercase tracking-wider">
                                Organizador de Recital
                            </h3>
                        </div>
                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold uppercase tracking-wider transition-all ${
                                hasActiveFilters
                                    ? 'bg-accent/15 border-accent/30 text-accent'
                                    : 'bg-white/5 border-white/10 text-muted-foreground hover:bg-white/10'
                            }`}
                        >
                            <Filter className="w-3 h-3" />
                            Filtros {hasActiveFilters && `(activos)`}
                        </button>
                    </div>

                    {/* Stats Row */}
                    <div className="grid grid-cols-3 gap-2">
                        {[
                            { label: 'Presentaciones', value: timeline.filter((e) => !e.is_blank_event).length },
                            { label: 'Eventos', value: timeline.filter((e) => e.is_blank_event).length },
                            { label: 'Duración Total', value: secondsToHHMMSS(totalSecs) },
                        ].map(({ label, value }) => (
                            <div key={label} className="bg-white/5 rounded-xl px-3 py-2 border border-white/8">
                                <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">{label}</p>
                                <p className="text-sm font-black text-foreground font-mono">{value}</p>
                            </div>
                        ))}
                    </div>

                    {/* Filters Panel */}
                    {showFilters && (
                        <div className="mt-3 grid grid-cols-2 gap-2 pt-3 border-t border-white/10">
                            <div className="space-y-1">
                                <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Maestro</label>
                                <select
                                    value={filters.teacher}
                                    onChange={(e) => setFilters((f) => ({ ...f, teacher: e.target.value }))}
                                    className="w-full bg-black/40 border border-white/10 rounded-xl px-2 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-accent"
                                >
                                    <option value="">Todos</option>
                                    {teachers.map((t) => <option key={t} value={t}>{t}</option>)}
                                </select>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Instrumento</label>
                                <select
                                    value={filters.instrument}
                                    onChange={(e) => setFilters((f) => ({ ...f, instrument: e.target.value }))}
                                    className="w-full bg-black/40 border border-white/10 rounded-xl px-2 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-accent"
                                >
                                    <option value="">Todos</option>
                                    {instruments.map((i) => <option key={i} value={i}>{i}</option>)}
                                </select>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Edad mínima</label>
                                <input
                                    type="number"
                                    placeholder="0"
                                    value={filters.minAge ?? ''}
                                    onChange={(e) => setFilters((f) => ({ ...f, minAge: e.target.value ? +e.target.value : null }))}
                                    className="w-full bg-black/40 border border-white/10 rounded-xl px-2 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-accent"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Edad máxima</label>
                                <input
                                    type="number"
                                    placeholder="99"
                                    value={filters.maxAge ?? ''}
                                    onChange={(e) => setFilters((f) => ({ ...f, maxAge: e.target.value ? +e.target.value : null }))}
                                    className="w-full bg-black/40 border border-white/10 rounded-xl px-2 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-accent"
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* Timeline List */}
                {timeline.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                        <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10 mb-4">
                            <Music className="w-6 h-6 text-primary/50" />
                        </div>
                        <p className="text-xs text-muted-foreground">Importa pestañas del Sheet para comenzar a organizar el recital.</p>
                    </div>
                ) : (
                    <ul className="divide-y divide-white/5">
                        {timeline.map((entry, i) => (
                            <li
                                key={entry.id}
                                className={`group flex items-center gap-2 px-3 py-3 transition-all hover:bg-white/3 ${
                                    entry.is_blank_event ? 'bg-accent/3 border-l-2 border-l-accent/40' : ''
                                }`}
                            >
                                {/* Reorder Controls */}
                                <div className="flex flex-col gap-0.5 flex-shrink-0">
                                    <button
                                        onClick={() => handleMove(i, 'up')}
                                        disabled={i === 0 || isPending}
                                        className="p-0.5 rounded text-muted-foreground/40 hover:text-accent disabled:opacity-10 transition-colors"
                                    >
                                        <ChevronUp className="w-3.5 h-3.5" />
                                    </button>
                                    <GripVertical className="w-3.5 h-3.5 text-white/10 mx-auto" />
                                    <button
                                        onClick={() => handleMove(i, 'down')}
                                        disabled={i === timeline.length - 1 || isPending}
                                        className="p-0.5 rounded text-muted-foreground/40 hover:text-accent disabled:opacity-10 transition-colors"
                                    >
                                        <ChevronDown className="w-3.5 h-3.5" />
                                    </button>
                                </div>

                                {/* Position Number */}
                                <span className="w-5 text-center text-[10px] font-mono text-muted-foreground/50 flex-shrink-0">{i + 1}</span>

                                {/* Type Icon */}
                                <div className={`p-1.5 rounded-lg flex-shrink-0 ${entry.is_blank_event ? 'bg-accent/15 border border-accent/20' : 'bg-primary/10 border border-primary/15'}`}>
                                    {entry.is_blank_event
                                        ? <Star className="w-3 h-3 text-accent" />
                                        : <Music className="w-3 h-3 text-primary" />}
                                </div>

                                {/* Content */}
                                <div className="flex-1 min-w-0 space-y-0.5">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <p className="text-sm font-bold text-foreground truncate">
                                            {entry.is_blank_event ? entry.blank_event_label : entry.student_name}
                                        </p>
                                        {!entry.is_blank_event && (
                                            <ConfidenceBadge
                                                confidence={entry.student_id ? 'exact' : 'none'}
                                                age={entry.age_at_recital}
                                            />
                                        )}
                                    </div>
                                    {!entry.is_blank_event && (
                                        <p className="text-[11px] text-muted-foreground truncate">
                                            {entry.teacher_name}
                                            {entry.instrument ? ` · ${entry.instrument}` : ''}
                                        </p>
                                    )}
                                    {entry.program_details && entry.program_details.length > 0 && (
                                        <p className="text-[10px] text-muted-foreground/60 truncate">
                                            {(entry.program_details as any[]).map((p: any) => p.title).join(', ')}
                                        </p>
                                    )}
                                </div>

                                {/* Time Block */}
                                <div className="text-right flex-shrink-0 space-y-0.5">
                                    <p className="text-xs font-mono font-bold text-accent">{entry.scheduled_start}</p>
                                    <p className="text-[10px] text-muted-foreground font-mono">{entry.duration_text}</p>
                                </div>

                                {/* Actions (visible on hover) */}
                                <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                                    <button
                                        onClick={() => setBlankDialogAfter(entry.sort_order)}
                                        title="Insertar evento después"
                                        className="p-1 rounded-lg bg-accent/10 hover:bg-accent/20 text-accent transition-all"
                                    >
                                        <Plus className="w-3 h-3" />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(entry.id, entry.is_blank_event ? (entry.blank_event_label ?? '') : entry.student_name)}
                                        title="Eliminar"
                                        className="p-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-all"
                                    >
                                        <Trash2 className="w-3 h-3" />
                                    </button>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}

                {/* Footer: Hora de finalización */}
                {timeline.length > 0 && (
                    <div className="px-4 py-3 border-t border-white/10 flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                            Finalización estimada
                        </span>
                        <span className="text-sm font-mono font-black text-accent">
                            {timeline[timeline.length - 1]?.scheduled_end ?? '--:--'}
                        </span>
                    </div>
                )}
            </div>
        </>
    );
}
