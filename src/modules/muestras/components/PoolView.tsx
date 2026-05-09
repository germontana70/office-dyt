'use client';

import { useState, useTransition, useMemo } from 'react';
import type { PresentacionPool, Recital } from '@/infra/types/muestras';
import { assignToRecital } from '@/app/actions/muestras';
import { toast } from 'sonner';
import {
    Layers, CheckSquare, Square, Search, Music, ArrowRight,
    Loader2, LayoutGrid, TableIcon, ChevronDown, X, Filter,
    User, GraduationCap, Piano
} from 'lucide-react';

interface Props {
    items: PresentacionPool[];
    recitales: Recital[];
    onAssigned: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getUniqueValues<T>(arr: T[], key: keyof T): string[] {
    return Array.from(new Set(arr.map((i) => String(i[key] ?? '')).filter(Boolean))).sort();
}

function FilterSelect({
    label, value, options, onChange, icon,
}: {
    label: string;
    value: string;
    options: string[];
    onChange: (v: string) => void;
    icon: React.ReactNode;
}) {
    return (
        <div className="relative flex-1 min-w-[140px]">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
                {icon}
            </div>
            <select
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="w-full bg-black/50 border border-white/10 hover:border-white/20 focus:border-primary/50 rounded-xl pl-8 pr-8 py-2 text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-primary/30 transition-all appearance-none cursor-pointer"
            >
                <option value="">{label}</option>
                {options.map((o) => (
                    <option key={o} value={o}>{o}</option>
                ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
        </div>
    );
}

// ─── TABLE ROW ────────────────────────────────────────────────────────────────

function TableRow({ item, isSelected, onToggle }: {
    item: PresentacionPool;
    isSelected: boolean;
    onToggle: () => void;
}) {
    const titulos = item.program_details?.map((p) => p.title).join(' · ') || '—';
    const compositores = item.program_details?.map((p) => p.composer).filter(Boolean).join(', ') || '—';
    const mins = Math.floor(item.total_duration_seconds / 60);
    const secs = item.total_duration_seconds % 60;
    const duracion = `${mins}:${String(secs).padStart(2, '0')}`;

    return (
        <tr
            onClick={onToggle}
            className={`group border-b border-white/5 cursor-pointer transition-all duration-150 ${
                isSelected
                    ? 'bg-primary/10 border-l-2 border-l-primary'
                    : 'hover:bg-white/[0.03] border-l-2 border-l-transparent'
            }`}
        >
            {/* Checkbox */}
            <td className="py-3 pl-4 pr-2 w-8">
                <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${
                    isSelected ? 'bg-primary border-primary' : 'border-white/30 group-hover:border-white/50'
                }`}>
                    {isSelected && (
                        <svg className="w-3 h-3 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                    )}
                </div>
            </td>

            {/* Estudiante */}
            <td className="py-3 px-3">
                <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white/90 whitespace-nowrap">
                        {item.student_name}
                    </span>
                    {item.student_id && (
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" title="Identidad Correlacionada" />
                    )}
                </div>
            </td>

            {/* Edad */}
            <td className="py-3 px-3 w-16 text-center">
                {item.age_at_recital !== null ? (
                    <span className="inline-block px-2 py-0.5 rounded-lg bg-white/5 border border-white/10 text-xs font-bold text-white/70 whitespace-nowrap">
                        {item.age_at_recital} a.
                    </span>
                ) : (
                    <span className="text-white/20 text-xs">—</span>
                )}
            </td>

            {/* Instrumento */}
            <td className="py-3 px-3 w-28">
                <span className="inline-block px-2.5 py-0.5 bg-primary/10 border border-primary/20 rounded-lg text-[11px] font-black uppercase tracking-wider text-primary whitespace-nowrap">
                    {item.instrument}
                </span>
            </td>

            {/* Profesor */}
            <td className="py-3 px-3">
                <span className="text-xs font-semibold text-white/60 whitespace-nowrap">
                    {item.teacher_name}
                </span>
            </td>

            {/* Repertorio */}
            <td className="py-3 px-3 max-w-xs">
                <p className="text-xs text-white/80 font-medium leading-relaxed">
                    {titulos}
                </p>
                <p className="text-[10px] text-white/30 mt-0.5 truncate">{compositores}</p>
            </td>

            {/* Duración */}
            <td className="py-3 px-3 w-20 text-right">
                <span className="text-xs font-mono font-bold text-accent/70 whitespace-nowrap">
                    {duracion}
                </span>
            </td>

            {/* Obras */}
            <td className="py-3 px-3 w-16 text-center">
                <span className="text-xs font-bold text-white/40">
                    {item.program_details?.length ?? 0}
                </span>
            </td>
        </tr>
    );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

export function PoolView({ items, recitales, onAssigned }: Props) {
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [searchTerm, setSearchTerm] = useState('');
    const [filterInstrument, setFilterInstrument] = useState('');
    const [filterTeacher, setFilterTeacher] = useState('');
    const [filterStudent, setFilterStudent] = useState('');
    const [filterAgeMin, setFilterAgeMin] = useState('');
    const [filterAgeMax, setFilterAgeMax] = useState('');
    const [targetRecital, setTargetRecital] = useState<string>('');
    const [isPending, startTransition] = useTransition();
    const [viewMode, setViewMode] = useState<'cards' | 'table'>('table');
    const [showFilters, setShowFilters] = useState(false);

    // Derived unique values for dropdowns
    const instruments = useMemo(() => getUniqueValues(items, 'instrument'), [items]);
    const teachers = useMemo(() => getUniqueValues(items, 'teacher_name'), [items]);
    const students = useMemo(() => getUniqueValues(items, 'student_name'), [items]);

    // Active filter count
    const activeFilterCount = [filterInstrument, filterTeacher, filterStudent, filterAgeMin, filterAgeMax].filter(Boolean).length;

    const filtered = useMemo(() => items.filter((item) => {
        // Text search
        const search = searchTerm.toLowerCase();
        if (search && !(
            item.student_name.toLowerCase().includes(search) ||
            item.instrument.toLowerCase().includes(search) ||
            item.teacher_name.toLowerCase().includes(search) ||
            item.program_details?.some(p => p.title.toLowerCase().includes(search))
        )) return false;

        if (filterInstrument && item.instrument !== filterInstrument) return false;
        if (filterTeacher && item.teacher_name !== filterTeacher) return false;
        if (filterStudent && item.student_name !== filterStudent) return false;

        const age = item.age_at_recital;
        if (filterAgeMin && (age === null || age < Number(filterAgeMin))) return false;
        if (filterAgeMax && (age === null || age > Number(filterAgeMax))) return false;

        return true;
    }), [items, searchTerm, filterInstrument, filterTeacher, filterStudent, filterAgeMin, filterAgeMax]);

    const clearFilters = () => {
        setFilterInstrument('');
        setFilterTeacher('');
        setFilterStudent('');
        setFilterAgeMin('');
        setFilterAgeMax('');
        setSearchTerm('');
    };

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
        if (!targetRecital) { toast.warning('Selecciona un recital destino'); return; }
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
        <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden flex flex-col">

            {/* ── TOOLBAR ── */}
            <div className="p-3 border-b border-white/10 bg-white/[0.02] flex flex-col gap-3">

                {/* Row 1: Search + View Toggle + Assign */}
                <div className="flex flex-wrap gap-3 items-center">
                    {/* Search */}
                    <div className="relative flex-1 min-w-[180px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="Buscar estudiante, instrumento, repertorio..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-black/40 border border-white/10 hover:border-white/20 focus:border-primary/50 rounded-xl pl-9 pr-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/30 transition-all"
                        />
                    </div>

                    {/* Filter Toggle */}
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-bold uppercase tracking-wider transition-all ${
                            showFilters || activeFilterCount > 0
                                ? 'bg-primary/15 border-primary/40 text-primary'
                                : 'bg-white/5 border-white/10 text-muted-foreground hover:bg-white/10 hover:text-foreground'
                        }`}
                    >
                        <Filter className="w-4 h-4" />
                        Filtros
                        {activeFilterCount > 0 && (
                            <span className="bg-primary text-primary-foreground text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center">
                                {activeFilterCount}
                            </span>
                        )}
                    </button>

                    {/* View Toggle */}
                    <div className="flex items-center gap-1 bg-black/40 border border-white/10 rounded-xl p-1">
                        <button
                            onClick={() => setViewMode('table')}
                            title="Vista Tabla"
                            className={`p-1.5 rounded-lg transition-all ${
                                viewMode === 'table'
                                    ? 'bg-primary/20 text-primary'
                                    : 'text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            <TableIcon className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setViewMode('cards')}
                            title="Vista Tarjetas"
                            className={`p-1.5 rounded-lg transition-all ${
                                viewMode === 'cards'
                                    ? 'bg-primary/20 text-primary'
                                    : 'text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            <LayoutGrid className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Recital Selector */}
                    <div className="relative">
                        <select
                            value={targetRecital}
                            onChange={(e) => setTargetRecital(e.target.value)}
                            className="bg-black/40 border border-white/10 hover:border-white/20 rounded-xl px-3 py-2 text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-primary/30 appearance-none pr-7 transition-all"
                        >
                            <option value="">-- Seleccionar Recital --</option>
                            {recitales.map((r) => (
                                <option key={r.id} value={r.id}>{r.name}</option>
                            ))}
                        </select>
                        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                    </div>

                    {/* Assign Button */}
                    <button
                        onClick={handleAssign}
                        disabled={isPending || selected.size === 0 || !targetRecital}
                        className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-[0_0_15px_hsl(var(--primary)/0.3)] disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
                    >
                        {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                        Asignar ({selected.size})
                    </button>
                </div>

                {/* Row 2: Advanced Filters (collapsible) */}
                {showFilters && (
                    <div className="flex flex-wrap gap-2 items-center animate-in slide-in-from-top-2 fade-in duration-200">
                        <FilterSelect
                            label="Instrumento"
                            value={filterInstrument}
                            options={instruments}
                            onChange={setFilterInstrument}
                            icon={<Piano className="w-3.5 h-3.5" />}
                        />
                        <FilterSelect
                            label="Profesor"
                            value={filterTeacher}
                            options={teachers}
                            onChange={setFilterTeacher}
                            icon={<User className="w-3.5 h-3.5" />}
                        />
                        <FilterSelect
                            label="Estudiante"
                            value={filterStudent}
                            options={students}
                            onChange={setFilterStudent}
                            icon={<GraduationCap className="w-3.5 h-3.5" />}
                        />

                        {/* Age Range */}
                        <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground whitespace-nowrap">Edad:</span>
                            <input
                                type="number"
                                min={0}
                                max={99}
                                placeholder="Desde"
                                value={filterAgeMin}
                                onChange={(e) => setFilterAgeMin(e.target.value)}
                                className="w-20 bg-black/50 border border-white/10 hover:border-white/20 focus:border-primary/50 rounded-lg px-2 py-2 text-xs text-foreground focus:outline-none transition-all"
                            />
                            <span className="text-muted-foreground text-xs">—</span>
                            <input
                                type="number"
                                min={0}
                                max={99}
                                placeholder="Hasta"
                                value={filterAgeMax}
                                onChange={(e) => setFilterAgeMax(e.target.value)}
                                className="w-20 bg-black/50 border border-white/10 hover:border-white/20 focus:border-primary/50 rounded-lg px-2 py-2 text-xs text-foreground focus:outline-none transition-all"
                            />
                        </div>

                        {activeFilterCount > 0 && (
                            <button
                                onClick={clearFilters}
                                className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-red-500/30 bg-red-500/10 text-red-400 text-xs font-bold hover:bg-red-500/20 transition-all whitespace-nowrap"
                            >
                                <X className="w-3.5 h-3.5" />
                                Limpiar filtros
                            </button>
                        )}
                    </div>
                )}

                {/* Status Bar */}
                <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    <span>
                        <span className="text-foreground font-black">{filtered.length}</span>
                        {' '}/ {items.length} presentaciones
                    </span>
                    {selected.size > 0 && (
                        <span className="text-primary">
                            {selected.size} seleccionada{selected.size !== 1 ? 's' : ''}
                        </span>
                    )}
                    {activeFilterCount > 0 && (
                        <span className="text-amber-400">
                            {activeFilterCount} filtro{activeFilterCount !== 1 ? 's' : ''} activo{activeFilterCount !== 1 ? 's' : ''}
                        </span>
                    )}
                </div>
            </div>

            {/* ── TABLE VIEW ── */}
            {viewMode === 'table' && (
                <div className="flex-1 overflow-auto" style={{ maxHeight: 'calc(100vh - 340px)', minHeight: '400px' }}>
                    <table className="w-full text-left border-collapse" style={{ minWidth: '800px' }}>
                        <thead className="sticky top-0 z-10">
                            <tr className="bg-[#0a0a0f]/95 backdrop-blur-xl border-b border-white/10">
                                {/* Select All */}
                                <th className="py-3 pl-4 pr-2 w-8">
                                    <button onClick={toggleAll} className="flex items-center justify-center">
                                        {selected.size > 0 && selected.size === filtered.length
                                            ? <CheckSquare className="w-4 h-4 text-primary" />
                                            : <Square className="w-4 h-4 text-muted-foreground hover:text-foreground transition-colors" />
                                        }
                                    </button>
                                </th>
                                <th className="py-3 px-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Estudiante</th>
                                <th className="py-3 px-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground w-16 text-center">Edad</th>
                                <th className="py-3 px-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground w-28">Instrumento</th>
                                <th className="py-3 px-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Profesor</th>
                                <th className="py-3 px-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Repertorio</th>
                                <th className="py-3 px-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground w-20 text-right">Duración</th>
                                <th className="py-3 px-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground w-16 text-center">Obras</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.length > 0 ? (
                                filtered.map((item) => (
                                    <TableRow
                                        key={item.id}
                                        item={item}
                                        isSelected={selected.has(item.id)}
                                        onToggle={() => toggleItem(item.id)}
                                    />
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={8} className="py-24 text-center">
                                        <div className="flex flex-col items-center gap-3 text-muted-foreground">
                                            <Layers className="w-10 h-10 opacity-20" />
                                            <p className="text-sm">No se encontraron presentaciones.</p>
                                            {activeFilterCount > 0 && (
                                                <button onClick={clearFilters} className="text-xs text-primary hover:underline">
                                                    Limpiar filtros
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {/* ── CARDS VIEW ── */}
            {viewMode === 'cards' && (
                <div className="flex-1 overflow-y-auto p-4" style={{ maxHeight: 'calc(100vh - 340px)', minHeight: '400px' }}>
                    {filtered.length > 0 && (
                        <button
                            onClick={toggleAll}
                            className="flex items-center gap-2 px-3 py-2 mb-3 rounded-xl bg-white/5 hover:bg-white/10 transition-all text-xs font-bold text-muted-foreground uppercase tracking-wider w-fit"
                        >
                            {selected.size === filtered.length
                                ? <CheckSquare className="w-4 h-4 text-primary" />
                                : <Square className="w-4 h-4" />
                            }
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
                                        {isSelected && (
                                            <svg className="w-3 h-3 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                            </svg>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0 space-y-1.5">
                                        <div className="flex items-center gap-2">
                                            <h4 className="text-sm font-bold text-foreground truncate">{item.student_name}</h4>
                                            {item.student_id && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" title="Identidad Correlacionada" />}
                                            {item.age_at_recital !== null && (
                                                <span className="text-[10px] font-bold text-white/40 ml-auto flex-shrink-0">{item.age_at_recital} años</span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                            <span className="px-2 py-0.5 bg-white/5 rounded-md border border-white/10 text-[10px] uppercase font-black tracking-wider">
                                                {item.instrument}
                                            </span>
                                            <span className="truncate">{item.teacher_name}</span>
                                        </div>
                                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground/60">
                                            <Music className="w-3 h-3" />
                                            <span className="truncate">{item.program_details?.map(p => p.title).join(', ')}</span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}

                        {filtered.length === 0 && (
                            <div className="col-span-full py-20 flex flex-col items-center justify-center text-center text-muted-foreground">
                                <Layers className="w-10 h-10 mb-3 opacity-20" />
                                <p className="text-sm">No se encontraron presentaciones en el pool.</p>
                                {activeFilterCount > 0 && (
                                    <button onClick={clearFilters} className="text-xs text-primary mt-2 hover:underline">
                                        Limpiar filtros
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
