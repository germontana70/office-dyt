import { createClient } from '@/infra/services/server';
import { redirect } from 'next/navigation';
import { CheckSquare, XCircle, AlertTriangle } from 'lucide-react';
import React from 'react';

// Reutilizamos la normalización estricta NFD
const normalizeStr = (str: string) =>
    String(str || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim()
        .toLowerCase();

// Redondeo institucional
const roundup10k = (val: number) => Math.ceil(val / 10000) * 10000;

export const metadata = {
    title: 'Auditoría Financiera - Office DYT',
    description: 'Consola de Alineación de Programas y Precios Institucionales'
};

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function AuditFinancePage() {
    const supabase = await createClient();

    // 1. Obtener el Semestre Activo del Settings
    const { data: activeSetting } = await supabase
        .from('dyt_global_settings')
        .select('semester')
        .eq('is_active', true)
        .single();

    const currentSemester = activeSetting?.semester || '2026-1';

    // 2. Traer Todas las Matrículas Activas/Migradas del Semestre
    const { data: enrollments, error: enrollmentsError } = await supabase
        .from('dyt_enrollments')
        .select(`
            id, 
            student_id, 
            students!inner(
                id,
                first_name,
                last_name,
                document_number
            ),
            dyt_enrollment_programs(
                id,
                program_name,
                agreed_price
            )
        `)
        .eq('semester', currentSemester);

    if (enrollmentsError) {
        console.error('Error fetching enrollments for audit:', enrollmentsError);
        return <div className="p-8 text-white">Error de lectura de matrículas: {enrollmentsError.message}</div>;
    }

    // 3. Traer la Bóveda de Precios Actual del Semestre 
    const { data: programPricesArray, error: pricesError } = await supabase
        .from('program_prices')
        .select('*');

    if (pricesError) {
        console.error('Error fetching program prices:', pricesError);
        return <div className="p-8 text-white">Error de lectura de bóveda: {pricesError.message}</div>;
    }

    // 4. Mapear Bóveda para Lookup rápido
    const pricesVault = new Map();
    programPricesArray?.forEach((row: any) => {
        const key = normalizeStr(row.program_name);
        pricesVault.set(key, row);
    });

    // 5. Motor de Cruce (Match Logic)
    type AuditRow = {
        enrollmentId: string;
        studentName: string;
        document: string;
        programInMatricula: string;
        programInVault: string;
        isMatch: boolean;
        cashValue: number;
        financedValue: number;
    };

    const auditRows: AuditRow[] = [];
    let matchCount = 0;
    let discrepancyCount = 0;
    let studentsAudited = enrollments?.length || 0;

    enrollments?.forEach((enrollment: any) => {
        const programs = enrollment.dyt_enrollment_programs || [];
        const student = enrollment.students;

        if (programs.length === 0) {
            // Estudiante migrado sin programas (Discrepancia total)
            auditRows.push({
                enrollmentId: enrollment.id,
                studentName: `${student.first_name} ${student.last_name}`,
                document: student.document_number || 'N/A',
                programInMatricula: '[SIN PROGRAMA ASIGNADO]',
                programInVault: 'N/A',
                isMatch: false,
                cashValue: 0,
                financedValue: 0
            });
            discrepancyCount++;
            return;
        }

        programs.forEach((prog: any) => {
            const rawName = prog.program_name || 'Desconocido';
            const normalized = normalizeStr(rawName);
            const vaultEntry = pricesVault.get(normalized);

            if (vaultEntry) {
                // MATCH EXACTO
                const cash = Number(vaultEntry.valor_contado || vaultEntry.cash_price || 0);
                const increment = Number(vaultEntry.increment_percentage || 0);
                let financed = Number(vaultEntry.total_financed || 0);

                if (financed <= 0) {
                     if (increment > 0) {
                         financed = roundup10k(cash * (1 + (increment / 100)));
                     } else {
                         financed = cash;
                     }
                }

                auditRows.push({
                    enrollmentId: enrollment.id,
                    studentName: `${student.first_name} ${student.last_name}`,
                    document: student.document_number || 'N/A',
                    programInMatricula: vaultEntry.program_name || rawName, // Usamos el nombre estético de bóveda preferiblemente
                    programInVault: vaultEntry.program_name,
                    isMatch: true,
                    cashValue: cash,
                    financedValue: financed
                });
                matchCount++;
            } else {
                // DISCREPANCIA (No encontrado en catálogo)
                auditRows.push({
                    enrollmentId: enrollment.id,
                    studentName: `${student.first_name} ${student.last_name}`,
                    document: student.document_number || 'N/A',
                    programInMatricula: rawName,
                    programInVault: 'No Encontrado en Bóveda',
                    isMatch: false,
                    cashValue: 0,
                    financedValue: 0
                });
                discrepancyCount++;
            }
        });
    });

    const formatCurrency = (val: number) =>
        new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(val);

    return (
        <div className="p-8 space-y-8 animate-in fade-in duration-700">
            {/* Header / Typos */}
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-black uppercase tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">
                    Alineación de Programas - {currentSemester}
                </h1>
                <p className="text-sm font-bold text-white/50 tracking-widest uppercase">
                    Consola de Auditoría Financiera de Migración
                </p>
            </div>

            {/* Summaries / Indicators */}
            <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-4 gap-6">
                <div className="glass-panel p-6 rounded-2xl border border-white/5 shadow-xl flex flex-col gap-1">
                    <span className="text-[10px] font-black uppercase text-slate-500 dark:text-gray-400 tracking-widest">
                        Estudiantes Procesados
                    </span>
                    <span className="text-3xl font-black text-white">{studentsAudited}</span>
                </div>
                
                <div className="glass-panel p-6 rounded-2xl border border-white/5 shadow-xl flex flex-col gap-1">
                    <span className="text-[10px] font-black uppercase text-slate-500 dark:text-gray-400 tracking-widest">
                        Programas Auditados
                    </span>
                    <span className="text-3xl font-black text-white">{matchCount + discrepancyCount}</span>
                </div>

                <div className="p-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 shadow-xl flex flex-col gap-1">
                    <span className="text-[10px] font-black uppercase text-emerald-500/70 tracking-widest flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        Match Exacto (Éxito)
                    </span>
                    <span className="text-3xl font-black text-emerald-400">{matchCount}</span>
                </div>

                <div className={`p-6 rounded-2xl border shadow-xl flex flex-col gap-1 ${discrepancyCount > 0 ? 'bg-red-500/10 border-red-500/20' : 'bg-black/20 border-white/5'}`}>
                    <span className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-2 ${discrepancyCount > 0 ? 'text-red-500/70' : 'text-slate-500 dark:text-gray-500'}`}>
                        {discrepancyCount > 0 && <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>}
                        Discrepancia / Errores
                    </span>
                    <span className={`text-3xl font-black ${discrepancyCount > 0 ? 'text-red-400' : 'text-slate-500'}`}>{discrepancyCount}</span>
                </div>
            </div>

            {/* Neon-Glass Table Wrapper */}
            <div className="glass-panel rounded-2xl border border-white/10 shadow-xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="bg-black/40 border-b border-white/10 text-[10px] uppercase tracking-[0.15em] text-primary/70 dark:text-gray-400 font-black">
                            <tr>
                                <th className="px-6 py-4">Estudiante</th>
                                <th className="px-6 py-4">Programa en Matrícula</th>
                                <th className="px-6 py-4 text-center">Match / Estado</th>
                                <th className="px-6 py-4 text-right">Valor Contado</th>
                                <th className="px-6 py-4 text-right">Valor Financiado</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {auditRows.map((row, idx) => (
                                <tr key={`${row.enrollmentId}-${idx}`} className="hover:bg-white/5 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col">
                                            <span className="text-white font-medium text-xs truncate max-w-[200px]" title={row.studentName}>
                                                {row.studentName}
                                            </span>
                                            <span className="text-[10px] text-white/30 font-mono tracking-tighter">
                                                DNI: {row.document}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col">
                                            <span className="text-white text-xs font-bold uppercase tracking-tight">
                                                {row.programInMatricula}
                                            </span>
                                            {!row.isMatch && (
                                                <span className="text-[9px] text-red-400 uppercase tracking-widest flex items-center gap-1 mt-1">
                                                    <AlertTriangle className="w-3 h-3" />
                                                    Discrepancia DB
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        {row.isMatch ? (
                                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                                                <CheckSquare className="w-4 h-4" />
                                                <span className="text-[10px] font-black uppercase tracking-widest">Match Exacto</span>
                                            </div>
                                        ) : (
                                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-400">
                                                <XCircle className="w-4 h-4" />
                                                <span className="text-[10px] font-black uppercase tracking-widest">Desconocido</span>
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-right font-mono text-white/50">
                                        {row.isMatch ? formatCurrency(row.cashValue) : '-'}
                                    </td>
                                    <td className="px-6 py-4 text-right font-mono text-emerald-400/90 font-bold">
                                        {row.isMatch ? formatCurrency(row.financedValue) : '-'}
                                    </td>
                                </tr>
                            ))}
                            {auditRows.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-white/40 uppercase tracking-widest text-xs font-bold">
                                        No hay matrículas activas en el semestre seleccionado.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
