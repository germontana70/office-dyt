'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { TeacherPaymentInfo } from '@/infra/services/payments';
import { reportService } from '@/infra/services/reports';
import { resolveStudentLabel } from '@/core/utils/resolveStudentLabel';
import { syncCalendarEventsAction } from '@/app/actions/sync-calendar-events';
import { ChevronDown, ExternalLink, CreditCard, Clock, DollarSign, BookOpen, ArrowLeft, ArrowRight, AlertTriangle, CheckCircle2 } from 'lucide-react';

type SyncWarning = { eventTitle: string; date: string; calendarName: string; studentHint: string };
type ActiveTab = 'liquidacion' | 'advertencias';

interface Props {
    initialPayments: TeacherPaymentInfo[];
    startDate: string;
    endDate: string;
}

export default function PaymentClientWrapper({ initialPayments, startDate, endDate }: Props) {
    const router = useRouter();
    const [payments, setPayments] = useState(initialPayments);
    const [selectedTeacher, setSelectedTeacher] = useState<TeacherPaymentInfo | null>(null);
    const [activeTab, setActiveTab] = useState<ActiveTab>('liquidacion');
    const [syncWarnings, setSyncWarnings] = useState<SyncWarning[]>([]);
    const [syncMessage, setSyncMessage] = useState<{ type: 'success' | 'error' | 'warn'; text: string } | null>(null);

    const [localStart, setLocalStart] = useState(startDate);
    const [localEnd, setLocalEnd] = useState(endDate);
    const [isSyncing, setIsSyncing] = useState(false);
    const [sortConfig, setSortConfig] = useState<{ key: 'teacherName' | 'totalPayment', direction: 'asc' | 'desc' }>({ key: 'teacherName', direction: 'asc' });
    const [warnSortKey, setWarnSortKey] = useState<'date' | 'eventTitle' | 'calendarName' | 'studentHint'>('date');
    const [warnSortDir, setWarnSortDir] = useState<'asc' | 'desc'>('asc');
    const [warnFilter, setWarnFilter] = useState('');

    const handleSync = async () => {
        setIsSyncing(true);
        setSyncMessage(null);
        try {
            const res = await syncCalendarEventsAction(localStart, localEnd, "2026-1");
            if (res.success) {
                const warnList = (res as any).warningsList as SyncWarning[] || [];
                setSyncWarnings(warnList);
                if (warnList.length > 0) {
                    setSyncMessage({ type: 'warn', text: res.message });
                    setActiveTab('advertencias');
                } else {
                    setSyncMessage({ type: 'success', text: res.message });
                }
                // Navegar a la URL con las fechas sincronizadas.
                // Si la URL ya tiene esas fechas, push() no recarga → usamos push + refresh.
                router.push(`/dashboard/payments?start=${localStart}&end=${localEnd}`);
                router.refresh(); // Fuerza al Server Component a re-ejecutarse y leer Supabase fresco
            } else {
                setSyncMessage({ type: 'error', text: res.message });
            }
        } catch (error: any) {
            setSyncMessage({ type: 'error', text: `Error inesperado: ${error.message}` });
        } finally {
            setIsSyncing(false);
        }
    };

    const handleRateChange = (idx: number, newRate: number) => {
        const updated = [...payments];
        updated[idx].hourlyRate = newRate;
        updated[idx].totalPayment = updated[idx].totalHours * newRate;
        setPayments(updated);
    };

    const handleFilterChange = () => {
        // push() a la misma URL no recarga el Server Component en Next.js.
        // Usamos push() para actualizar params + refresh() para forzar re-render del servidor.
        router.push(`/dashboard/payments?start=${localStart}&end=${localEnd}`);
        router.refresh();
    };

    const requestSort = (key: 'teacherName' | 'totalPayment') => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const sortedPayments = [...payments].sort((a, b) => {
        const valA = a[sortConfig.key];
        const valB = b[sortConfig.key];

        if (typeof valA === 'string' && typeof valB === 'string') {
            return sortConfig.direction === 'asc'
                ? valA.localeCompare(valB)
                : valB.localeCompare(valA);
        }

        if (typeof valA === 'number' && typeof valB === 'number') {
            return sortConfig.direction === 'asc' ? valA - valB : valB - valA;
        }

        return 0;
    });

    const shiftMonth = (direction: -1 | 1) => {
        const [yearStr, monthStr] = localEnd.split('-');
        let year = parseInt(yearStr);
        let month = parseInt(monthStr) - 1; // 0-indexed month of end date

        month += direction;

        const newStart = new Date(year, month - 1, 26);
        const newEnd = new Date(year, month, 25);

        const startStr = newStart.toISOString().split('T')[0];
        const endStr = newEnd.toISOString().split('T')[0];

        setLocalStart(startStr);
        setLocalEnd(endStr);
        router.push(`/dashboard/payments?start=${startStr}&end=${endStr}`);
    };

    const formatDateGMT5 = (dateStr: string) => {
        try {
            // El backend ya entregó formato con offset o Zulu real, Date lo lee exacto.
            const d = new Date(dateStr);
            return new Intl.DateTimeFormat('es-CO', {
                timeZone: 'America/Bogota',
                year: 'numeric',
                month: 'short',
                day: '2-digit'
            }).format(d);
        } catch {
            return new Intl.DateTimeFormat('es-CO', {
                timeZone: 'America/Bogota',
                year: 'numeric',
                month: 'short',
                day: '2-digit'
            }).format(new Date());
        }
    };

    const formatTimeGMT5 = (dateStr: string) => {
        try {
            // Nativo: previene doble corrección horaria de offsets Supabase vs Local
            const d = new Date(dateStr);
            return new Intl.DateTimeFormat('es-CO', {
                timeZone: 'America/Bogota',
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
            }).format(d);
        } catch {
            return new Intl.DateTimeFormat('es-CO', {
                timeZone: 'America/Bogota',
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
            }).format(new Date());
        }
    };

    const getBadgeStyle = (status: string | null) => {
        const s = (status || '').toLowerCase();
        if (s === 'cancelled') return 'bg-rose-500/20 text-rose-400 border border-rose-500/30';
        if (s === 'makeup') return 'bg-amber-500/20 text-amber-500 border border-amber-500/30';
        return 'bg-white/10 text-white/70 border border-white/5';
    };

    const getBadgeText = (status: string | null) => {
        const s = (status || '').toLowerCase();
        if (s === 'cancelled') return 'CANCELADA';
        if (s === 'makeup') return 'REPOSICIÓN';
        if (s === 'completed') return 'COMPLETADA';
        return 'PROGRAMADA';
    };

    return (
        <div className="animate-fade-in relative z-10">
            {/* Header con Filtros Glassmorphism */}
            <div className="glass p-6 md:p-8 rounded-[24px] mb-8 border border-white/10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-black/40 backdrop-blur-xl">
                <div>
                    <h1 className="text-4xl md:text-5xl font-bold font-outfit" style={{ background: 'linear-gradient(135deg, #fff 0%, hsl(var(--primary)) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                        Liquidación <span className="text-white" style={{ WebkitTextFillColor: 'white' }}>Docentes</span>
                    </h1>
                    <p className="text-muted-foreground mt-2 tracking-widest text-sm font-semibold uppercase">
                        PERIODO: {startDate} — {endDate}
                    </p>
                </div>

                <div className="flex flex-wrap gap-4 items-center">
                    {/* Premium Period Navigation Panel */}
                    <div className="flex bg-black/60 backdrop-blur-2xl rounded-2xl border border-white/5 p-1.5 shadow-[0_8px_32px_rgba(0,0,0,0.8)]">
                        <button 
                            onClick={() => shiftMonth(-1)} 
                            className="flex items-center gap-3 px-5 py-2.5 rounded-xl hover:bg-white/5 hover:text-primary transition-all duration-300 group/btn"
                        >
                            <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/5 flex items-center justify-center group-hover/btn:border-primary/30 group-hover/btn:shadow-[0_0_15px_rgba(var(--primary-rgb),0.2)] transition-all">
                                <ArrowLeft className="w-4 h-4 text-zinc-400 group-hover/btn:text-primary transition-colors" />
                            </div>
                            <span className="text-sm font-bold tracking-tight text-zinc-300 group-hover/btn:text-white">Mes Anterior</span>
                        </button>
                        
                        <div className="w-[1px] bg-white/5 my-2" />

                        <button 
                            onClick={() => shiftMonth(1)} 
                            className="flex items-center gap-3 px-5 py-2.5 rounded-xl hover:bg-white/5 hover:text-primary transition-all duration-300 group/btn"
                        >
                            <span className="text-sm font-bold tracking-tight text-zinc-300 group-hover/btn:text-white">Mes Siguiente</span>
                            <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/5 flex items-center justify-center group-hover/btn:border-primary/30 group-hover/btn:shadow-[0_0_15px_rgba(var(--primary-rgb),0.2)] transition-all">
                                <ArrowRight className="w-4 h-4 text-zinc-400 group-hover/btn:text-primary transition-colors" />
                            </div>
                        </button>
                    </div>

                    <div className="flex flex-col">
                        <span className="text-[9px] text-muted-foreground uppercase absolute -mt-4 ml-2 bg-black/50 px-1 rounded font-bold tracking-widest border border-white/5">Desde</span>
                        <input
                            type="date"
                            value={localStart}
                            onChange={(e) => setLocalStart(e.target.value)}
                            className="glass px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white font-medium hover:bg-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50 [&::-webkit-calendar-picker-indicator]:filter [&::-webkit-calendar-picker-indicator]:invert text-sm"
                        />
                    </div>

                    <div className="flex flex-col">
                        <span className="text-[9px] text-muted-foreground uppercase absolute -mt-4 ml-2 bg-black/50 px-1 rounded font-bold tracking-widest border border-white/5">Hasta</span>
                        <input
                            type="date"
                            value={localEnd}
                            onChange={(e) => setLocalEnd(e.target.value)}
                            className="glass px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white font-medium hover:bg-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50 [&::-webkit-calendar-picker-indicator]:filter [&::-webkit-calendar-picker-indicator]:invert text-sm"
                        />
                    </div>

                    <button
                        onClick={handleFilterChange}
                        className="px-6 py-3 rounded-xl bg-white/5 text-white border border-white/10 font-bold uppercase tracking-widest text-[10px] hover:bg-white/10 transition-all active:scale-95"
                    >
                        Filtrar
                    </button>
                    <button
                        onClick={handleSync}
                        disabled={isSyncing}
                        className={`px-6 py-3 rounded-xl ${isSyncing ? 'bg-orange-500/20 text-orange-400 border-orange-500/30 cursor-wait' : 'bg-primary/20 text-primary border border-primary/30 hover:bg-primary/30 cursor-pointer shadow-[0_0_20px_rgba(var(--primary-rgb),0.2)]'} border font-black uppercase tracking-widest text-[10px] transition-all active:scale-95`}
                    >
                        {isSyncing ? 'Sincronizando...' : 'Sincronizar'}
                    </button>
                </div>
            </div>

            {/* Banner de feedback post-sincronización (reemplaza el alert) */}
            {syncMessage && (
                <div className={`flex items-center gap-3 px-5 py-3 mb-6 rounded-2xl border text-sm font-semibold backdrop-blur-xl animate-in fade-in slide-in-from-top-2 duration-300 ${
                    syncMessage.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' :
                    syncMessage.type === 'warn'    ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' :
                                                    'bg-rose-500/10 border-rose-500/30 text-rose-400'
                }`}>
                    {syncMessage.type === 'success' && <CheckCircle2 className="w-4 h-4 shrink-0" />}
                    {syncMessage.type === 'warn'    && <AlertTriangle className="w-4 h-4 shrink-0" />}
                    {syncMessage.type === 'error'   && <AlertTriangle className="w-4 h-4 shrink-0" />}
                    <span>{syncMessage.text}</span>
                    <button onClick={() => setSyncMessage(null)} className="ml-auto text-white/40 hover:text-white transition-colors text-lg leading-none">&times;</button>
                </div>
            )}

            {/* ── Tab Navigation ───────────────────────────────────────────────── */}
            <div className="flex items-center gap-1 mb-6 bg-black/40 backdrop-blur-xl border border-white/5 rounded-2xl p-1.5 w-fit shadow-[0_4px_24px_rgba(0,0,0,0.5)]">
                <button
                    onClick={() => setActiveTab('liquidacion')}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-200 ${
                        activeTab === 'liquidacion'
                            ? 'bg-primary/20 text-primary border border-primary/30 shadow-[0_0_15px_rgba(var(--primary-rgb),0.15)]'
                            : 'text-zinc-500 hover:text-white hover:bg-white/5'
                    }`}
                >
                    <DollarSign className="w-3 h-3" />
                    Liquidación
                </button>
                <button
                    onClick={() => setActiveTab('advertencias')}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-200 ${
                        activeTab === 'advertencias'
                            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.15)]'
                            : 'text-zinc-500 hover:text-white hover:bg-white/5'
                    }`}
                >
                    <AlertTriangle className="w-3 h-3" />
                    Advertencias
                    {syncWarnings.length > 0 && (
                        <span className="bg-amber-500/30 text-amber-300 border border-amber-500/30 text-[9px] font-black px-1.5 py-0.5 rounded-full">
                            {syncWarnings.length}
                        </span>
                    )}
                </button>
            </div>

            {/* ══════════════════ TAB: LIQUIDACIÓN ══════════════════ */}
            {activeTab === 'liquidacion' && (
            <div className="glass overflow-hidden border border-white/10 rounded-[24px] bg-black/30 backdrop-blur-xl mb-12 shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[900px]">
                        <thead>
                            <tr className="border-b border-white/10 bg-white/5">
                                <th 
                                    onClick={() => requestSort('teacherName')}
                                    className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-muted-foreground cursor-pointer hover:text-white transition-colors group"
                                >
                                    <div className="flex items-center gap-2">
                                        Docente
                                        <ChevronDown className={`w-3 h-3 transition-transform ${sortConfig.key === 'teacherName' && sortConfig.direction === 'desc' ? 'rotate-180' : ''} ${sortConfig.key !== 'teacherName' ? 'opacity-20' : 'text-primary'}`} />
                                    </div>
                                </th>
                                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Especialidad</th>
                                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                    <div className="flex items-center gap-2">
                                        <Clock className="w-3 h-3 opacity-40" />
                                        Horas Mes
                                    </div>
                                </th>
                                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-muted-foreground text-center">
                                    <div className="flex items-center justify-center gap-2">
                                        <DollarSign className="w-3 h-3 opacity-40" />
                                        Tarifa Base
                                    </div>
                                </th>
                                <th 
                                    onClick={() => requestSort('totalPayment')}
                                    className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-muted-foreground cursor-pointer hover:text-white transition-colors text-right"
                                >
                                    <div className="flex items-center justify-end gap-2">
                                        Total a Pagar
                                        <ChevronDown className={`w-3 h-3 transition-transform ${sortConfig.key === 'totalPayment' && sortConfig.direction === 'desc' ? 'rotate-180' : ''} ${sortConfig.key !== 'totalPayment' ? 'opacity-20' : 'text-success'}`} />
                                    </div>
                                </th>
                                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-muted-foreground text-center">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {sortedPayments.map((p, idx) => {
                                // Encontrar el índice original para el handleRateChange
                                const originalIdx = payments.findIndex(orig => orig.teacherName === p.teacherName);
                                
                                return (
                                    <tr key={idx} className="group hover:bg-white/[0.03] transition-colors">
                                        <td className="px-8 py-5">
                                            <div className="font-bold text-white tracking-tight">{p.teacherName}</div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="flex items-center gap-2 text-primary/70 text-[10px] font-black uppercase tracking-wider bg-primary/5 px-2.5 py-1 rounded-full border border-primary/10 w-fit">
                                                <BookOpen className="w-3 h-3" />
                                                {p.instrument || 'Grupales'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="font-mono text-lg font-bold text-zinc-400 group-hover:text-white transition-colors">
                                                {p.totalHours}
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="flex items-center justify-center gap-1.5 bg-black/40 border border-white/5 rounded-xl px-4 py-2 w-fit mx-auto">
                                                <span className="text-zinc-600 font-mono text-xs">$</span>
                                                <input
                                                    type="number"
                                                    value={p.hourlyRate}
                                                    onChange={(e) => handleRateChange(originalIdx, Number(e.target.value))}
                                                    className="bg-transparent w-20 text-right text-white font-mono font-bold focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all text-sm rounded px-1"
                                                />
                                            </div>
                                        </td>
                                        <td className="px-6 py-5 text-right">
                                            <div className="text-xl font-bold font-mono tracking-tighter" style={{ color: 'hsl(var(--success, 142.1 76.2% 36.3%))', textShadow: '0 0 10px hsla(var(--success, 142.1 76.2% 36.3%), 0.2)' }}>
                                                $ {p.totalPayment.toLocaleString('es-CO')}
                                            </div>
                                        </td>
                                        <td className="px-8 py-5 text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                <button
                                                    onClick={() => setSelectedTeacher(p)}
                                                    className="p-2.5 rounded-xl border border-white/10 bg-white/5 text-white/50 hover:text-white hover:bg-white/10 transition-all group/btn"
                                                    title="Ver Detalle"
                                                >
                                                    <ExternalLink className="w-4 h-4 group-hover/btn:scale-110 transition-transform" />
                                                </button>
                                                <button
                                                    onClick={() => { }}
                                                    className="p-2.5 rounded-xl bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 hover:border-primary/40 transition-all flex items-center justify-center group/pay"
                                                    title="Procesar Pago"
                                                >
                                                    <CreditCard className="w-4 h-4 group-hover/pay:scale-110 transition-transform" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
            )} {/* fin tab liquidacion */}

            {/* ══════════════════ TAB: ADVERTENCIAS ══════════════════ */}
            {activeTab === 'advertencias' && (
            <div className="glass overflow-hidden border border-amber-500/20 rounded-[24px] bg-black/30 backdrop-blur-xl mb-12 shadow-[0_20px_50px_rgba(245,158,11,0.08)]">
                {/* Header de la tabla */}
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 px-8 py-5 border-b border-amber-500/10 bg-amber-500/5">
                    <div className="flex items-center gap-3">
                        <AlertTriangle className="w-4 h-4 text-amber-400" />
                        <h3 className="text-sm font-black uppercase tracking-widest text-amber-400">
                            Alumnos Huérfanos — {syncWarnings.length} eventos sin cruzar
                        </h3>
                    </div>
                    <input
                        type="text"
                        placeholder="Filtrar por nombre, título o calendario..."
                        value={warnFilter}
                        onChange={(e) => setWarnFilter(e.target.value)}
                        className="glass px-4 py-2 rounded-xl border border-amber-500/20 bg-amber-500/5 text-white placeholder-zinc-600 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500/40 w-full md:w-72 transition-all"
                    />
                </div>

                {syncWarnings.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-zinc-600">
                        <CheckCircle2 className="w-10 h-10 mb-3 text-emerald-500/40" />
                        <p className="text-sm font-semibold uppercase tracking-widest">Sin advertencias — todos los alumnos fueron cruzados</p>
                        <p className="text-xs mt-1">Sincroniza para poblar este panel</p>
                    </div>
                ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[860px]">
                        <thead>
                            <tr className="border-b border-white/5 bg-white/[0.02]">
                                {([
                                    ['date',          'Fecha / Hora'],
                                    ['eventTitle',    'Título del Evento'],
                                    ['calendarName',  'Calendario'],
                                    ['studentHint',   'Nombre Extraído (Hint)'],
                                ] as const).map(([key, label]) => (
                                    <th
                                        key={key}
                                        onClick={() => {
                                            if (warnSortKey === key) setWarnSortDir(d => d === 'asc' ? 'desc' : 'asc');
                                            else { setWarnSortKey(key as any); setWarnSortDir('asc'); }
                                        }}
                                        className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-amber-500/60 cursor-pointer hover:text-amber-400 transition-colors select-none"
                                    >
                                        <div className="flex items-center gap-1.5">
                                            {label}
                                            <ChevronDown className={`w-3 h-3 transition-transform ${warnSortKey === key && warnSortDir === 'desc' ? 'rotate-180' : ''} ${warnSortKey !== key ? 'opacity-20' : 'text-amber-400'}`} />
                                        </div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.03]">
                            {[...syncWarnings]
                                .filter(w =>
                                    !warnFilter ||
                                    w.studentHint.toLowerCase().includes(warnFilter.toLowerCase()) ||
                                    w.eventTitle.toLowerCase().includes(warnFilter.toLowerCase()) ||
                                    w.calendarName.toLowerCase().includes(warnFilter.toLowerCase())
                                )
                                .sort((a, b) => {
                                    const va = a[warnSortKey] || '';
                                    const vb = b[warnSortKey] || '';
                                    return warnSortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
                                })
                                .map((w, i) => {
                                    const d = new Date(w.date);
                                    const dateStr = new Intl.DateTimeFormat('es-CO', { timeZone: 'America/Bogota', day: '2-digit', month: 'short', year: 'numeric' }).format(d);
                                    const timeStr = new Intl.DateTimeFormat('es-CO', { timeZone: 'America/Bogota', hour: '2-digit', minute: '2-digit', hour12: true }).format(d);
                                    return (
                                        <tr key={i} className="group hover:bg-amber-500/[0.03] transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="font-mono text-xs text-white/70">{dateStr}</div>
                                                <div className="font-mono text-[10px] text-zinc-600">{timeStr}</div>
                                            </td>
                                            <td className="px-6 py-4 max-w-[280px]">
                                                <p className="text-white text-xs font-semibold leading-tight truncate" title={w.eventTitle}>{w.eventTitle}</p>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-[10px] font-bold uppercase tracking-wide text-primary/60 bg-primary/5 px-2 py-0.5 rounded-full border border-primary/10">
                                                    {w.calendarName}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-amber-300 font-mono text-xs bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-lg">
                                                    {w.studentHint}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                        </tbody>
                    </table>
                </div>
                )}
            </div>
            )} {/* fin tab advertencias */}

            {/* Modal de Detalle (Glassmorphism Modal) */}
            {selectedTeacher && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="glass max-w-3xl w-full max-h-[85vh] overflow-y-auto bg-[#0a0a0a]/90 border border-white/10 rounded-[32px] p-8 md:p-10 shadow-2xl relative">
                        {/* Glow Header Background */}
                        <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-primary/10 to-transparent rounded-t-[32px] pointer-events-none" />

                        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
                            <div>
                                <h2 className="text-3xl font-bold font-outfit text-white mb-2">{selectedTeacher.teacherName}</h2>
                                <p className="text-primary/80 uppercase tracking-widest text-sm font-semibold">{selectedTeacher.instrument || 'Docente'}</p>
                            </div>
                            <div className="flex gap-4">
                                <button
                                    onClick={() => reportService.generateTeacherPDF(selectedTeacher, localStart, localEnd)}
                                    className="px-6 py-3 rounded-xl bg-white/10 text-white font-bold text-xs tracking-widest uppercase hover:bg-white/20 transition-colors border border-white/10"
                                >
                                    PDF Deta.
                                </button>
                                <button
                                    onClick={() => setSelectedTeacher(null)}
                                    className="px-6 py-3 rounded-xl bg-red-500/20 text-red-400 font-bold text-xs tracking-widest uppercase hover:bg-red-500/30 transition-colors border border-red-500/30"
                                >
                                    Cerrar
                                </button>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8 relative z-10">
                            <div className="glass p-6 bg-white/5 border border-white/5 rounded-2xl flex items-center justify-between">
                                <div>
                                    <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Horas Totales</p>
                                    <p className="text-3xl font-bold text-white font-mono">{selectedTeacher.totalHours}</p>
                                </div>
                                <div className="h-12 w-12 rounded-full border border-white/10 flex items-center justify-center bg-white/5">
                                    <svg className="w-5 h-5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                            </div>
                            <div className="glass p-6 bg-white/5 border border-white/5 rounded-2xl flex items-center justify-between relative overflow-hidden">
                                <div className="absolute inset-0 bg-gradient-to-r from-success/5 to-transparent pointer-events-none" />
                                <div className="relative z-10">
                                    <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Valor a Liquidar</p>
                                    <p className="text-3xl font-bold font-mono" style={{ color: 'hsl(var(--success, 142.1 76.2% 36.3%))' }}>
                                        $ {selectedTeacher.totalPayment.toLocaleString('es-CO')}
                                    </p>
                                </div>
                                <div className="h-12 w-12 rounded-full border border-success/20 flex items-center justify-center bg-success/10 relative z-10">
                                    <svg className="w-5 h-5" style={{ color: 'hsl(var(--success, 142.1 76.2% 36.3%))' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-3 relative z-10">
                            <h4 className="text-sm font-semibold text-muted-foreground tracking-widest uppercase mb-4">Registro de Clases</h4>
                            {selectedTeacher.sessions.map((s, i) => {
                                const isCancelled = (s.status || '').toLowerCase() === 'cancelled';
                                const subtotal = isCancelled ? 0 : Math.round(selectedTeacher.hourlyRate * (((new Date(s.event_end_time || s.event_date).getTime() - new Date(s.event_date).getTime()) / (1000 * 60 * 60)) || 1));

                                // Resolución discriminada: 1a1 → nombre alumno | Grupal → nombre programa
                                const studentName = resolveStudentLabel(s);


                                return (
                                    <div key={i} className={`glass p-4 bg-white/5 border border-white/5 rounded-xl flex flex-col hover:bg-white/10 transition-colors ${isCancelled ? 'opacity-60 grayscale' : ''}`}>
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <p className="font-semibold text-white mb-1 flex items-center flex-wrap gap-2">
                                                    <span>{studentName}</span>
                                                    <span className="text-primary/70 text-sm">| {s.program_name}</span>
                                                    {s.class_number && <span className="text-muted-foreground text-xs uppercase tracking-wider bg-white/5 px-2 py-0.5 rounded-full border border-white/10">Clase {s.class_number}</span>}
                                                </p>
                                                <div className="flex items-center gap-3 mt-1">
                                                    <p className="text-xs text-muted-foreground font-mono flex items-center gap-1">
                                                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                        </svg>
                                                        {formatDateGMT5(s.event_date)}
                                                    </p>
                                                    <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full ${getBadgeStyle(s.status)}`}>
                                                        {getBadgeText(s.status)}
                                                    </span>
                                                </div>
                                            </div>
                                            {s.event_end_time && (
                                                <div className="text-right flex flex-col items-end">
                                                    <p className="text-xs font-mono text-white/50 mb-1">
                                                        {formatTimeGMT5(s.event_date)}
                                                        {' - '}
                                                        {formatTimeGMT5(s.event_end_time)}
                                                    </p>
                                                    <p className={`text-xs font-bold ${isCancelled ? 'text-zinc-500 line-through' : 'text-primary/80'}`}>
                                                        {Math.round(((new Date(s.event_end_time).getTime() - new Date(s.event_date).getTime()) / (1000 * 60 * 60)) * 100) / 100} h
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
