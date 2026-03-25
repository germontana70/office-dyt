'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { TeacherPaymentInfo } from '@/infra/services/payments';
import { reportService } from '@/infra/services/reports';
import { syncCalendarEventsAction } from '@/app/actions/sync-calendar-events';
import { ChevronDown, ExternalLink, CreditCard, Clock, DollarSign, BookOpen } from 'lucide-react';

interface Props {
    initialPayments: TeacherPaymentInfo[];
    startDate: string;
    endDate: string;
}

export default function PaymentClientWrapper({ initialPayments, startDate, endDate }: Props) {
    const router = useRouter();
    const [payments, setPayments] = useState(initialPayments);
    const [selectedTeacher, setSelectedTeacher] = useState<TeacherPaymentInfo | null>(null);

    const [localStart, setLocalStart] = useState(startDate);
    const [localEnd, setLocalEnd] = useState(endDate);
    const [isSyncing, setIsSyncing] = useState(false);
    const [sortConfig, setSortConfig] = useState<{ key: 'teacherName' | 'totalPayment', direction: 'asc' | 'desc' }>({ key: 'teacherName', direction: 'asc' });

    const handleSync = async () => {
        setIsSyncing(true);
        try {
            const res = await syncCalendarEventsAction(localStart, localEnd, "2026-1");
            if (res.success) {
                alert(`✅ ${res.message}`);
                router.refresh();
            } else {
                alert(`❌ Error: ${res.message}`);
            }
        } catch (error: any) {
            alert(`❌ Error inesperado: ${error.message}`);
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
        router.push(`/dashboard/payments?start=${localStart}&end=${localEnd}`);
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
            return new Intl.DateTimeFormat('es-CO', {
                timeZone: 'America/Bogota',
                year: 'numeric',
                month: 'short',
                day: '2-digit'
            }).format(new Date(dateStr));
        } catch {
            return new Date(dateStr).toLocaleDateString('es-CO');
        }
    };

    const formatTimeGMT5 = (dateStr: string) => {
        try {
            return new Intl.DateTimeFormat('es-CO', {
                timeZone: 'America/Bogota',
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
            }).format(new Date(dateStr));
        } catch {
            return new Date(dateStr).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
        }
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

                <div className="flex gap-4 items-center">
                    <div className="flex bg-white/5 rounded-xl border border-white/10 overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.5)]">
                        <button onClick={() => shiftMonth(-1)} className="px-4 py-3 hover:bg-white/10 transition-colors text-white text-sm font-bold tracking-wider border-r border-white/10">
                            ⬅️ Mes Anterior
                        </button>
                        <button onClick={() => shiftMonth(1)} className="px-4 py-3 hover:bg-white/10 transition-colors text-white text-sm font-bold tracking-wider">
                            Mes Siguiente ➡️
                        </button>
                    </div>

                    <div className="flex flex-col">
                        <span className="text-[10px] text-muted-foreground uppercase absolute -mt-4 ml-2 bg-black/50 px-1 rounded">Fecha Inicio</span>
                        <input
                            type="date"
                            value={localStart}
                            onChange={(e) => setLocalStart(e.target.value)}
                            className="glass px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white font-medium hover:bg-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50 [&::-webkit-calendar-picker-indicator]:filter [&::-webkit-calendar-picker-indicator]:invert"
                        />
                    </div>

                    <div className="flex flex-col">
                        <span className="text-[10px] text-muted-foreground uppercase absolute -mt-4 ml-2 bg-black/50 px-1 rounded">Fecha Fin</span>
                        <input
                            type="date"
                            value={localEnd}
                            onChange={(e) => setLocalEnd(e.target.value)}
                            className="glass px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white font-medium hover:bg-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50 [&::-webkit-calendar-picker-indicator]:filter [&::-webkit-calendar-picker-indicator]:invert"
                        />
                    </div>

                    <button
                        onClick={handleFilterChange}
                        className="ml-2 px-6 py-3 rounded-xl bg-primary/20 text-primary border border-primary/30 font-bold uppercase tracking-widest hover:bg-primary/30 transition-all shadow-[0_0_15px_rgba(var(--primary-rgb),0.2)]"
                    >
                        Filtrar
                    </button>
                    <button
                        onClick={handleSync}
                        disabled={isSyncing}
                        className={`ml-2 px-6 py-3 rounded-xl ${isSyncing ? 'bg-orange-500/20 text-orange-400 border-orange-500/30 cursor-wait' : 'bg-green-500/20 text-green-400 border-green-500/30 hover:bg-green-500/30 cursor-pointer shadow-[0_0_15px_rgba(34,197,94,0.2)]'} border font-bold uppercase tracking-widest transition-all`}
                    >
                        {isSyncing ? 'Sincronizando...' : '🔄 Sincronizar'}
                    </button>
                </div>
            </div>

            {/* Tabla de Liquidación (Tipo Excel / Neon-Glass) */}
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
                                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Programas</th>
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
                                    onClick={() => reportService.generateTeacherPDF(selectedTeacher, startDate, endDate)}
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
                            {selectedTeacher.sessions.map((s, i) => (
                                <div key={i} className="glass p-4 bg-white/5 border border-white/5 rounded-xl flex justify-between items-center hover:bg-white/10 transition-colors">
                                    <div>
                                        <p className="font-semibold text-white mb-1 flex items-center flex-wrap gap-2">
                                            <span>{s.students ? `${s.students.first_name} ${s.students.last_name}` : 'Estudiante N/A'}</span>
                                            <span className="text-primary/70 text-sm">| {s.program_name}</span>
                                            {s.class_number && <span className="text-muted-foreground text-xs uppercase tracking-wider bg-white/5 px-2 py-0.5 rounded-full border border-white/10">Clase {s.class_number}</span>}
                                        </p>
                                        <div className="flex items-center gap-3">
                                            <p className="text-xs text-muted-foreground font-mono flex items-center gap-1">
                                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                </svg>
                                                {formatDateGMT5(s.event_date)}
                                            </p>
                                            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-white/10 text-white/70">
                                                {s.status}
                                            </span>
                                        </div>
                                    </div>
                                    {s.event_end_time && (
                                        <div className="text-right">
                                            <p className="text-xs font-mono text-white/50 mb-1">
                                                {formatTimeGMT5(s.event_date)}
                                                {' - '}
                                                {formatTimeGMT5(s.event_end_time)}
                                            </p>
                                            <p className="text-xs font-bold text-primary/80">
                                                {Math.round(((new Date(s.event_end_time).getTime() - new Date(s.event_date).getTime()) / (1000 * 60 * 60)) * 100) / 100} h
                                            </p>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
