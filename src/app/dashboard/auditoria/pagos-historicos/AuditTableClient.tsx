'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { GradientText } from '@/ui/components/modules/typography/GradientText';
import { AuditRecord } from '@/app/actions/audit-legacy-payments';
import { syncSelectedPayments, fixInstallmentMismatches } from '@/app/actions/persist-audit-payments';
import { Check, AlertTriangle, Loader2, ArrowRightLeft, FileSearch, Wrench } from 'lucide-react';

export default function AuditTableClient({ initialData }: { initialData?: AuditRecord[] }) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [selectedDocs, setSelectedDocs] = useState<Set<string>>(new Set());
    const [isFixing, setIsFixing] = useState(false);
    const [syncSummary, setSyncSummary] = useState<string | null>(null);

    // DEFENSA DE DATOS: Aseguramos que siempre sea un array
    const records = initialData || [];
    // Formateador determinista robusto anti-hidratación
    const formatCurrency = (val: number) => {
        return '$ ' + val.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    };

    const toggleSelection = (doc: string) => {
        const newSet = new Set(selectedDocs);
        if (newSet.has(doc)) {
            newSet.delete(doc);
        } else {
            newSet.add(doc);
        }
        setSelectedDocs(newSet);
    };

    // Filtramos los que tienen match, no tienen mismatch de cuotas y tienen al menos una cuota no sincronizada
    const syncableRecords = records.filter(r => 
        r?.isMatch && !r?.hasInstallmentsMismatch && r?.installments?.some(inst => !inst.isSynced)
    );

    const toggleAll = () => {
        if (selectedDocs.size === syncableRecords.length) {
            setSelectedDocs(newSet => {
                const emptySet = new Set(newSet);
                syncableRecords.forEach(r => emptySet.delete(r.document));
                return emptySet;
            });
        } else {
            setSelectedDocs(newSet => {
                const fullSet = new Set(newSet);
                syncableRecords.forEach(r => fullSet.add(r.document));
                return fullSet;
            });
        }
    };

    const mismatchRecords = records.filter(r => 
        r?.isMatch && 
        (r?.hasInstallmentsMismatch || r?.hasProgramMismatch) && 
        (r?.paymentPlanId !== undefined || r?.enrollmentId !== undefined)
    );

    const handleAutoFix = async () => {
        setIsFixing(true);
        try {
            const fixes = mismatchRecords.map(r => ({
                paymentPlanId: r.paymentPlanId,
                enrollmentId: r.enrollmentId,
                sheetCuotas: r.sheetCuotas || 0,
                sheetPrograms: r.sheetPrograms || []
            }));
            const res = await fixInstallmentMismatches(fixes);
            if (res.success) {
                setSyncSummary(`✨ Auto Fix Completado: ${res.fixedCount} discrepancias de cuotas resueltas. Recargando datos...`);
                setSelectedDocs(new Set()); // Limpiar selección por si acaso
                startTransition(() => {
                    router.refresh();
                });
                setTimeout(() => setSyncSummary(null), 8000);
            } else {
                alert("Error al autocorregir: " + res.error);
            }
        } catch (error: any) {
            console.error("AutoFix Catch:", error);
            alert("Error de conexión al autocorregir cuotas.");
        } finally {
            setIsFixing(false);
        }
    };

    // Calcular montos seleccionados (solo de cuotas que NO estén sincronizadas)
    const selectedAmountTotal = syncableRecords
        .filter(r => selectedDocs.has(r.document))
        .reduce((acc, r) => {
            return acc + r.installments.filter(i => !i.isSynced).reduce((sum, i) => sum + (i.amount || 0), 0);
        }, 0);

    const handleSync = async () => {
        if (selectedDocs.size === 0) return;

        const recordsToSync = records.filter(r => selectedDocs.has(r.document));
        const amountToSync = selectedAmountTotal;

        startTransition(async () => {
            try {
                const result = await syncSelectedPayments(recordsToSync);
                console.log('Resultado de Sincronización:', result);
                setSelectedDocs(new Set());
                setSyncSummary(`✅ Sincronización Exitosa: Se han legalizado ${result.synced} pagos por un valor total de ${formatCurrency(amountToSync)}.`);
                router.refresh(); 
                
                // Limpiar el mensaje de éxito después de unos segundos
                setTimeout(() => setSyncSummary(null), 8000);
            } catch (error) {
                console.error('Error sincronizando pagos:', error);
                setSyncSummary(`❌ Error al sincronizar pagos: ${error instanceof Error ? error.message : String(error)}`);
                setTimeout(() => setSyncSummary(null), 8000);
            }
        });
    };

    const isAllSelected = syncableRecords.length > 0 && selectedDocs.size === syncableRecords.length;

    // VALIDACIÓN DE RENDERIZADO: Estado vacío Neon-Glass
    if (!records || records.length === 0) {
        return (
            <div className="p-8 space-y-8 animate-in fade-in duration-700">
                <header className="flex flex-col gap-4 border-b border-white/10 pb-6">
                    <GradientText
                        className="text-4xl font-extrabold tracking-tight"
                        colors="from-cyan-400 to-blue-500"
                    >
                        AUDITORÍA DE PAGOS LEGADOS
                    </GradientText>
                </header>
                <div className="flex flex-col items-center justify-center p-16 rounded-2xl border border-white/10 bg-black/60 backdrop-blur-2xl shadow-2xl text-center space-y-4">
                    <div className="p-4 rounded-full bg-blue-500/10 border border-blue-500/20">
                        <FileSearch className="w-12 h-12 text-blue-400 opacity-80" />
                    </div>
                    <div className="space-y-1">
                        <h3 className="text-xl font-bold text-white">Estado de Auditoría Vacío</h3>
                        <p className="text-zinc-400 max-w-md mx-auto">
                            No se detectaron pagos pendientes de sincronización o hubo un error en la carga desde Google Sheets.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="p-8 space-y-8 animate-in fade-in duration-700">
            <header className="flex flex-col gap-4 border-b border-white/10 pb-6 relative">
                <div>
                    <GradientText
                        className="text-4xl font-extrabold tracking-tight"
                        colors="from-cyan-400 to-blue-500"
                    >
                        AUDITORÍA DE PAGOS LEGADOS
                    </GradientText>
                    <p className="text-zinc-400 font-mono text-sm uppercase tracking-widest mt-2">
                        Sincronización con Google Sheets v4 • Registro de Transacciones Formulario
                    </p>
                </div>

                {selectedDocs.size > 0 && (
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 animate-in slide-in-from-right fade-in flex items-center gap-6">
                        <div className="hidden md:flex flex-col items-end">
                            <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Total a Sincronizar</span>
                            <span className="text-xl font-black text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.3)]">
                                {formatCurrency(selectedAmountTotal)}
                            </span>
                        </div>
                        <button
                            onClick={handleSync}
                            disabled={isPending}
                            className={`
                                flex items-center gap-2 px-6 py-3 rounded-full font-bold shadow-xl transition-all
                                ${isPending ? 'bg-zinc-800 text-zinc-400 cursor-not-allowed' : 'bg-gradient-to-r from-cyan-500 hover:from-cyan-400 to-blue-600 hover:to-blue-500 text-white hover:shadow-cyan-500/25'}
                            `}
                        >
                            {isPending ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    <span>Sincronizando...</span>
                                </>
                            ) : (
                                <>
                                    <ArrowRightLeft className="w-5 h-5" />
                                    <span>Sincronizar {selectedDocs.size} Pagos</span>
                                </>
                            )}
                        </button>
                    </div>
                )}
            </header>

            {syncSummary && (
                <div className={`p-4 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 ${syncSummary.startsWith('✅') ? 'bg-emerald-500/10 border border-emerald-500/30' : syncSummary.startsWith('✨') ? 'bg-blue-500/10 border border-blue-500/30' : 'bg-rose-500/10 border border-rose-500/30'}`}>
                    <div className={`p-2 rounded-full ${syncSummary.startsWith('✅') ? 'bg-emerald-500/20' : syncSummary.startsWith('✨') ? 'bg-blue-500/20' : 'bg-rose-500/20'}`}>
                        {syncSummary.startsWith('✅') && <Check className="w-5 h-5 text-emerald-400" />}
                        {syncSummary.startsWith('✨') && <Wrench className="w-5 h-5 text-blue-400" />}
                        {syncSummary.startsWith('❌') && <AlertTriangle className="w-5 h-5 text-rose-400" />}
                    </div>
                    <div>
                        <h4 className={`font-bold ${syncSummary.startsWith('✅') ? 'text-emerald-400' : syncSummary.startsWith('✨') ? 'text-blue-400' : 'text-rose-400'}`}>
                            {syncSummary.startsWith('✅') ? '¡Operación Exitosa!' : syncSummary.startsWith('✨') ? '¡Autocorrección Iniciada!' : '¡Error!'}
                        </h4>
                        <p className={`text-sm ${syncSummary.startsWith('✅') ? 'text-emerald-200/70' : syncSummary.startsWith('✨') ? 'text-blue-200/70' : 'text-rose-200/70'}`}>
                            {syncSummary}
                        </p>
                    </div>
                </div>
            )}

            <section className="grid gap-6">
                <div className="flex justify-end mb-4">
                    {/* Botón de Auto-Corrección (Oculto si no hay Mismatches) */}
                    {mismatchRecords.length > 0 && (
                        <button
                            onClick={handleAutoFix}
                            disabled={isFixing || isPending}
                            className={`
                                flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all duration-300
                                ${isFixing || isPending
                                    ? 'bg-amber-500/20 text-amber-500/50 cursor-not-allowed border border-amber-500/20'
                                    : 'bg-amber-500/10 text-amber-400 border border-amber-500/30 hover:bg-amber-500/20 hover:border-amber-400/50 hover:shadow-[0_0_20px_rgba(245,158,11,0.3)]'
                                }
                            `}
                        >
                            {isFixing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wrench className="w-4 h-4" />}
                            AUTOCORREGIR {mismatchRecords.length} DISCREPANCIAS
                        </button>
                    )}
                </div>
                <div className="overflow-x-auto rounded-xl border border-white/5 bg-black/40 backdrop-blur-3xl shadow-2xl">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead>
                            <tr className="bg-white/5 border-b border-white/10 text-zinc-300 font-semibold uppercase tracking-wider">
                                <th className="p-4 px-6 w-12 text-center">
                                    <input 
                                        type="checkbox" 
                                        className="w-4 h-4 rounded border-white/20 bg-black/50 text-cyan-500 focus:ring-cyan-500/50 cursor-pointer"
                                        checked={isAllSelected}
                                        onChange={toggleAll}
                                        disabled={syncableRecords.length === 0 || isPending}
                                    />
                                </th>
                                <th className="p-4 px-6">Identificación</th>
                                <th className="p-4 px-6">Estudiante (Formulario)</th>
                                <th className="p-4 px-6">Match en BD (2026-1)</th>
                                <th className="p-4 px-6">Estado Cruce</th>
                                <th className="p-4 px-6 text-right">Cant. Cuotas</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {records.map((record, idx) => {
                                const isSyncable = record?.isMatch && !record?.hasInstallmentsMismatch && record?.installments?.some(inst => !inst?.isSynced);
                                const isSelected = selectedDocs.has(record?.document);

                                return (
                                    <AuditRow 
                                        key={idx} 
                                        record={record} 
                                        isSelected={isSelected}
                                        isSyncable={isSyncable}
                                        isPending={isPending}
                                        onToggle={() => toggleSelection(record.document)}
                                        formatCurrency={formatCurrency}
                                    />
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            </section>
        </div>
    );
}

function AuditRow({ record, isSelected, isSyncable, isPending, onToggle, formatCurrency }: { 
    record: AuditRecord, 
    isSelected: boolean,
    isSyncable: boolean,
    isPending: boolean,
    onToggle: () => void,
    formatCurrency: (val: number) => string
}) {
    const isMatch = record?.isMatch;

    return (
        <tr className={`
            transition-colors group
            ${isSelected ? 'bg-cyan-900/20' : 'hover:bg-white/5'}
        `}>
            <td colSpan={6} className="p-0">
                <table className="w-full">
                    <tbody>
                        <tr>
                            <td className={`p-4 px-6 w-12 text-center border-l-4 transition-colors ${isMatch ? (record?.hasProgramMismatch ? 'border-amber-500/50' : 'border-emerald-500/50') : 'border-rose-500/50'}`}>
                                <input 
                                    type="checkbox" 
                                    className="w-4 h-4 rounded border-white/20 bg-black/50 text-cyan-500 focus:ring-cyan-500/50 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                    checked={isSelected}
                                    onChange={onToggle}
                                    disabled={!isSyncable || isPending}
                                />
                            </td>
                            <td className="p-4 px-6 font-mono font-medium text-zinc-300 group-hover:text-cyan-400 transition-colors w-[15%]">
                                {record?.document}
                            </td>
                            <td className="p-4 px-6 text-zinc-300 capitalize w-[25%] flex items-center gap-2">
                                <span>{record?.sheetName?.toLowerCase() || 'N/A'}</span>
                                {record?.hasProgramMismatch && (
                                    <div className="group/tooltip relative flex items-center justify-center cursor-help">
                                        <div className="flex bg-amber-500/20 border border-amber-500/50 rounded-full px-2 py-0.5 items-center gap-1">
                                            <AlertTriangle className="w-3 h-3 text-amber-500" />
                                            <span className="text-[10px] text-amber-400 font-bold hidden xl:inline">PROG. MISMATCH</span>
                                        </div>
                                        <div className="absolute top-1/2 -translate-y-1/2 left-full ml-3 hidden group-hover/tooltip:block w-72 bg-black/95 border border-amber-500/50 text-amber-200 text-xs rounded-xl p-3 z-50 shadow-[0_0_15px_rgba(245,158,11,0.2)] backdrop-blur-xl">
                                            <p className="font-bold mb-2 border-b border-amber-500/30 pb-1 text-amber-400 uppercase tracking-wider text-[10px]">Diferencia de Programas</p>
                                            
                                            <div className="mb-2">
                                                <span className="text-white/50 text-[10px] uppercase">En Formulario (Sheet)</span>
                                                <ul className="list-disc pl-4 text-white font-medium mt-1">
                                                    {(record.sheetPrograms && record.sheetPrograms.length > 0) ? record.sheetPrograms.map((p, i) => (
                                                        <li key={i}>{p}</li>
                                                    )) : <li className="text-zinc-500 italic">Ninguno</li>}
                                                </ul>
                                            </div>
                                            
                                            <div>
                                                <span className="text-white/50 text-[10px] uppercase">En Sistema (DB)</span>
                                                <ul className="list-disc pl-4 text-emerald-400 font-medium mt-1">
                                                    {(record.dbPrograms && record.dbPrograms.length > 0) ? record.dbPrograms.map((p, i) => (
                                                        <li key={i}>{p}</li>
                                                    )) : <li className="text-zinc-500 italic">Ninguno</li>}
                                                </ul>
                                            </div>
                                            
                                            <p className="mt-3 text-[10px] text-amber-300/80 italic leading-snug">Verifique si esto requiere atención o es solo ortografía. No detiene la sincronización.</p>
                                        </div>
                                    </div>
                                )}
                            </td>
                            <td className={`p-4 px-6 font-semibold w-[25%] ${isMatch ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {record?.dbName || 'SIN MATCH'}
                            </td>
                            <td className="p-4 px-6 w-[15%]">
                                <span className={`
                                    px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest
                                    ${isMatch ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}
                                `}>
                                    {isMatch ? 'VINCULADO' : 'SIN MATRÍCULA'}
                                </span>
                            </td>
                            <td className="p-4 px-6 text-right font-mono text-zinc-300 w-[15%] flex items-center justify-end gap-2">
                                {(record?.sheetCuotas || record?.installments?.length || 0)} {(record?.sheetCuotas || record?.installments?.length || 0) === 1 ? 'Cuota' : 'Cuotas'}
                                {record?.hasInstallmentsMismatch && (
                                    <div className="group/tooltip relative flex items-center justify-center cursor-help">
                                        <div className="flex bg-rose-500/20 border border-rose-500/50 rounded-full px-2 py-0.5 items-center gap-1">
                                            <AlertTriangle className="w-3 h-3 text-rose-500 animate-pulse" />
                                            <span className="text-[10px] text-rose-400 font-bold">MISMATCH</span>
                                        </div>
                                        <div className="absolute bottom-full right-0 mb-2 hidden group-hover/tooltip:block w-max bg-black/95 border border-rose-500/50 text-rose-200 text-xs rounded py-2 px-3 z-10 shadow-[0_0_15px_rgba(244,63,94,0.3)] backdrop-blur-xl">
                                            <p className="font-bold mb-1 border-b border-rose-500/30 pb-1">Discrepancia de Cuotas detectada:</p>
                                            <p>Sheet indica <strong className="text-white">{record.sheetCuotas}</strong> cuotas, pero la DB tiene <strong className="text-white">{record.dbCuotas}</strong>.</p>
                                            <p className="text-[10px] text-rose-300/80 mt-1">Debe corregirse en el Vault (Contado vs Cuotas) antes de sincronizar.</p>
                                        </div>
                                    </div>
                                )}
                            </td>
                        </tr>
                        {(record?.installments?.length || 0) > 0 && (
                            <tr className={`${isSelected ? 'bg-transparent' : 'bg-white/[0.02]'}`}>
                                <td colSpan={6} className="p-6 pt-0 border-b border-white/10">
                                    <div className={`ml-16 p-4 rounded-lg border shadow-inner grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 transition-colors ${isSelected ? 'bg-black/60 border-cyan-500/30' : 'bg-black/40 border-white/10'}`}>
                                        {record.installments.map((inst, i) => (
                                            <div key={i} className="flex flex-col gap-1 p-3 rounded border border-white/5 bg-white/5 relative overflow-hidden group/card">
                                                <div className="absolute top-2 right-2">
                                                    {inst?.isSynced ? (
                                                        <span className="flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider backdrop-blur-md">
                                                            <Check className="w-3 h-3" /> Sincronizado
                                                        </span>
                                                    ) : (
                                                        <span className="flex items-center gap-1 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider backdrop-blur-md">
                                                            Pendiente
                                                        </span>
                                                    )}
                                                </div>

                                                <span className="text-[10px] font-bold text-cyan-500 uppercase">Cuota {inst?.cuota}</span>
                                                <div className="flex justify-between items-baseline mt-1">
                                                    <span className={`text-xl font-black ${inst?.isSynced ? 'text-zinc-400' : 'text-white'}`}>{formatCurrency(inst?.amount || 0)}</span>
                                                </div>
                                                <div className={`flex flex-col text-[11px] font-mono mt-2 ${inst?.isSynced ? 'text-zinc-600' : 'text-zinc-500'}`}>
                                                    <span>📅 {inst?.date || 'N/A'}</span>
                                                    <span>📑 REF: {inst?.reference || 'N/A'}</span>
                                                    <span className="italic mt-1 border-t border-white/5 pt-1">💳 {inst?.method || 'Otro'}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </td>
        </tr>
    );
}
