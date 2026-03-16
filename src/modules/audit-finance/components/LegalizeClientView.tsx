'use client';

import { useEffect, useMemo, useState } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { PremiumButton } from '@/ui/components/modules/buttons/PremiumButton';
import { AuditSyncButton } from '@/modules/audit-finance/components/AuditSyncButton';
import { LegalizeConsole } from '@/modules/audit-finance/components/LegalizeConsole';
import { legalizeEnrollmentProgram } from '@/app/actions/audit-finance';

type LegalizeRow = {
    enrollmentId: string;
    programId: string | null;
    studentName: string;
    age: number | null;
    programName: string | null;
    semester: string | null;
};

type ProgramOption = {
    name: string;
};

type LegalizeClientViewProps = {
    rows: LegalizeRow[];
    programs: ProgramOption[];
    semester: string;
};

const formatIssueDate = () => {
    return new Date().toLocaleDateString('es-CO', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
};

const rowKeyFor = (row: LegalizeRow) => `${row.enrollmentId}:${row.programId || 'new'}`;

const loadImageDataUrl = async (path: string) => {
    const response = await fetch(path);
    if (!response.ok) return null;
    const blob = await response.blob();
    return await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error('No se pudo cargar el logo.'));
        reader.readAsDataURL(blob);
    });
};

export function LegalizeClientView({ rows, programs, semester }: LegalizeClientViewProps) {
    const [showAll, setShowAll] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isBatching, setIsBatching] = useState(false);
    const [batchProgress, setBatchProgress] = useState<{ current: number; total: number } | null>(null);
    const [pendingRowKeys, setPendingRowKeys] = useState<Set<string>>(new Set());
    const [removingRowKeys, setRemovingRowKeys] = useState<Set<string>>(new Set());
    const [dismissedRowKeys, setDismissedRowKeys] = useState<Set<string>>(new Set());
    const [selections, setSelections] = useState<Record<string, string>>({});
    const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    const totalSinPrograma = rows.length;
    const totalElegibles = rows.length;

    useEffect(() => {
        if (typeof window === 'undefined') return;
        const stored = window.localStorage.getItem(`legalize-selections-${semester}`);
        const storedShowAll = window.localStorage.getItem(`legalize-showall-${semester}`);
        if (stored) {
            try {
                setSelections(JSON.parse(stored));
            } catch {
                setSelections({});
            }
        }
        if (storedShowAll === '1') {
            setShowAll(true);
        }
    }, [semester]);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        window.localStorage.setItem(`legalize-selections-${semester}`, JSON.stringify(selections));
    }, [selections, semester]);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        window.localStorage.setItem(`legalize-showall-${semester}`, showAll ? '1' : '0');
    }, [showAll, semester]);

    useEffect(() => {
        const validKeys = new Set(rows.map(rowKeyFor));
        setSelections((prev) => {
            const next: Record<string, string> = {};
            Object.entries(prev).forEach(([key, value]) => {
                if (validKeys.has(key)) {
                    next[key] = value;
                }
            });
            return next;
        });
        setDismissedRowKeys((prev) => {
            const next = new Set<string>();
            prev.forEach((key) => {
                if (validKeys.has(key)) {
                    next.add(key);
                }
            });
            return next;
        });
    }, [rows]);

    const filteredRows = useMemo(() => {
        const base = rows;
        return base.filter((row) => !dismissedRowKeys.has(rowKeyFor(row)));
    }, [rows, dismissedRowKeys]);

    const handleSelectionChange = (rowKey: string, value: string) => {
        setSelections((prev) => ({ ...prev, [rowKey]: value }));
    };

    const removeRowWithAnimation = (rowKey: string) => {
        setRemovingRowKeys((prev) => new Set(prev).add(rowKey));
        setTimeout(() => {
            setRemovingRowKeys((prev) => {
                const next = new Set(prev);
                next.delete(rowKey);
                return next;
            });
            setDismissedRowKeys((prev) => new Set(prev).add(rowKey));
            setSelections((prev) => {
                const next = { ...prev };
                delete next[rowKey];
                return next;
            });
        }, 450);
    };

    const handleLegalize = async (row: LegalizeRow, options?: { silent?: boolean }) => {
        const rowKey = rowKeyFor(row);
        const selectedProgram = selections[rowKey];
        if (!selectedProgram || pendingRowKeys.has(rowKey)) return;

        if (!options?.silent) {
            setStatusMessage(null);
        }
        setPendingRowKeys((prev) => new Set(prev).add(rowKey));

        try {
            const formData = new FormData();
            formData.append('enrollmentId', row.enrollmentId);
            formData.append('programId', row.programId || '');
            formData.append('programName', selectedProgram);
            formData.append('semester', row.semester || semester);

            const result = await legalizeEnrollmentProgram(formData);
            if (result?.success) {
                if (!options?.silent) {
                    setStatusMessage({ type: 'success', text: 'Legalizacion aplicada correctamente.' });
                }
                removeRowWithAnimation(rowKey);
                return { success: true };
            }

            if (result?.programSaved) {
                if (!options?.silent) {
                    setStatusMessage({
                        type: 'error',
                        text: 'Programa guardado, pero error en finanzas. Reintentar finanzas.'
                    });
                }
                return { success: false, financeError: true };
            }

            if (!options?.silent) {
                setStatusMessage({ type: 'error', text: result?.error || 'No se pudo legalizar.' });
            }
            return { success: false };
        } catch (error: any) {
            if (!options?.silent) {
                setStatusMessage({ type: 'error', text: error?.message || 'Error inesperado.' });
            }
            return { success: false };
        } finally {
            setPendingRowKeys((prev) => {
                const next = new Set(prev);
                next.delete(rowKey);
                return next;
            });
        }
    };

    const handleBatchLegalize = async () => {
        if (isBatching) return;
        const selectedRows = filteredRows.filter((row) => {
            const key = rowKeyFor(row);
            return Boolean(selections[key]) && !pendingRowKeys.has(key);
        });

        if (selectedRows.length === 0) {
            setStatusMessage({ type: 'error', text: 'Selecciona programas antes de legalizar en lote.' });
            return;
        }

        setIsBatching(true);
        setBatchProgress({ current: 0, total: selectedRows.length });
        setStatusMessage(null);

        let successCount = 0;
        let failureCount = 0;

        for (let index = 0; index < selectedRows.length; index += 1) {
            setBatchProgress({ current: index + 1, total: selectedRows.length });
            const result = await handleLegalize(selectedRows[index], { silent: true });
            if (result?.success) {
                successCount += 1;
            } else {
                failureCount += 1;
            }
        }

        setIsBatching(false);
        setBatchProgress(null);
        setStatusMessage({
            type: failureCount === 0 ? 'success' : 'error',
            text: `${successCount} exitosos, ${failureCount} fallidos.`
        });
    };

    const handleExport = async () => {
        if (isGenerating) return;
        setIsGenerating(true);

        try {
            const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
            const pageWidth = doc.internal.pageSize.getWidth();
            const pageHeight = doc.internal.pageSize.getHeight();
            const issueDate = formatIssueDate();

            const logoDataUrl = await loadImageDataUrl('/logos/dyt-logo-dark.png');

            const drawHeader = () => {
                doc.setTextColor(0);
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(13);

                if (logoDataUrl) {
                    doc.addImage(logoDataUrl, 'PNG', 14, 12, 22, 22);
                }

                doc.text(`REPORTE DE LEGALIZACION FINANCIERA - ${semester}`, 40, 18);

                doc.setFont('helvetica', 'normal');
                doc.setFontSize(9);
                doc.text(`Fecha de emision: ${issueDate}`, 40, 26);
                doc.setDrawColor(0);
                doc.setLineWidth(0.2);
                doc.line(14, 35, pageWidth - 14, 35);
            };

            drawHeader();

            const tableBody = filteredRows.map((row) => [
                row.studentName || '',
                row.age !== null && !Number.isNaN(row.age) ? String(row.age) : '',
                '',
                ''
            ]);

            const lastColumnWidth = pageWidth - 28 - 70 - 14 - 35;

            autoTable(doc, {
                startY: 40,
                margin: { top: 40, left: 14, right: 14 },
                head: [[
                    'Estudiante',
                    'Edad',
                    'Programa Actual',
                    'PROGRAMA A ASIGNAR (Manual)'
                ]],
                body: tableBody,
                styles: {
                    font: 'helvetica',
                    fontSize: 9,
                    textColor: 0,
                    lineColor: 0,
                    lineWidth: 0.2,
                    cellPadding: 2
                },
                headStyles: {
                    fillColor: [255, 255, 255],
                    textColor: 0,
                    lineWidth: 0.3,
                    fontStyle: 'bold'
                },
                columnStyles: {
                    0: { cellWidth: 70 },
                    1: { cellWidth: 14, halign: 'center' },
                    2: { cellWidth: 35 },
                    3: { cellWidth: lastColumnWidth }
                },
                didDrawPage: (data) => {
                    if (data.pageNumber > 1) {
                        drawHeader();
                    }
                }
            });

            const finalY = (doc as any).lastAutoTable?.finalY ?? 40;
            let footerY = finalY + 12;
            if (footerY + 40 > pageHeight - 10) {
                doc.addPage();
                footerY = 30;
            }

            doc.setFont('helvetica', 'bold');
            doc.setFontSize(10);
            doc.text('Firma Secretaria:', 14, footerY);
            doc.line(50, footerY + 1, 120, footerY + 1);

            doc.setFont('helvetica', 'normal');
            doc.text('Observaciones:', 14, footerY + 12);
            doc.rect(14, footerY + 15, pageWidth - 28, 22);

            doc.save(`reporte-legalizacion-${semester}.pdf`);
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="relative min-h-screen w-full overflow-hidden bg-slate-950 text-white">
            <div className="absolute inset-0">
                <div className="absolute -left-40 top-10 h-80 w-80 rounded-full bg-emerald-500/10 blur-[120px]" />
                <div className="absolute right-0 top-1/3 h-96 w-96 rounded-full bg-amber-500/10 blur-[140px]" />
                <div className="absolute bottom-0 left-1/3 h-96 w-96 rounded-full bg-cyan-500/10 blur-[140px]" />
            </div>

            <main className="relative z-10 px-6 py-10 md:px-12">
                <header className="flex flex-col gap-4">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_20px_rgba(52,211,153,0.6)]" />
                            <div>
                                <p className="text-[11px] font-black uppercase tracking-[0.4em] text-emerald-200/70">
                                    Consola de Legalizacion
                                </p>
                                <h1 className="text-3xl font-black uppercase tracking-tight text-white">
                                    Asignacion de Emergencia - {semester}
                                </h1>
                            </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-3">
                            <AuditSyncButton path="/dashboard/audit-finance/legalize" />
                            <PremiumButton
                                onClick={handleExport}
                                disabled={isGenerating}
                                variant="outline"
                                className="border-emerald-400/40 text-emerald-100 hover:bg-emerald-400/10 hover:text-emerald-100 min-w-[320px]"
                            >
                                {isGenerating ? (
                                    <>
                                        <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-emerald-100" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Generando documento...
                                    </>
                                ) : (
                                    'DESCARGAR REPORTE DE CAMPO (PDF)'
                                )}
                            </PremiumButton>
                            <PremiumButton
                                onClick={handleBatchLegalize}
                                disabled={isBatching || filteredRows.length === 0}
                                variant="primary"
                                className="min-w-[260px]"
                            >
                                {isBatching ? 'Legalizando...' : 'LEGALIZAR TODOS LOS SELECCIONADOS'}
                            </PremiumButton>
                        </div>
                    </div>
                    <p className="text-sm text-white/60 max-w-3xl">
                        Vista tipo Excel para legalizar alumnos sin programa asignado. Selecciona un programa y dispara
                        la creacion inmediata del plan de pagos en la Boveda Financiera.
                    </p>
                    {batchProgress && (
                        <div className="mt-2">
                            <p className="text-xs uppercase tracking-widest text-emerald-200/80">
                                Legalizando {batchProgress.current} de {batchProgress.total}...
                            </p>
                            <div className="mt-2 h-2 w-full rounded-full bg-white/10 overflow-hidden">
                                <div
                                    className="h-full bg-emerald-400/70 transition-all duration-300"
                                    style={{
                                        width: `${Math.round((batchProgress.current / batchProgress.total) * 100)}%`
                                    }}
                                />
                            </div>
                        </div>
                    )}
                    {statusMessage && !batchProgress && (
                        <div
                            className={`mt-2 rounded-lg border px-4 py-2 text-xs font-semibold uppercase tracking-widest ${
                                statusMessage.type === 'success'
                                    ? 'border-emerald-400/40 text-emerald-200 bg-emerald-400/10'
                                    : 'border-rose-400/40 text-rose-200 bg-rose-400/10'
                            }`}
                        >
                            {statusMessage.text}
                        </div>
                    )}
                </header>

                <LegalizeConsole
                    rows={filteredRows}
                    programs={programs}
                    showAll={showAll}
                    onToggleShowAll={setShowAll}
                    totalSinPrograma={totalSinPrograma}
                    totalElegibles={totalElegibles}
                    selections={selections}
                    onSelectionChange={handleSelectionChange}
                    onLegalizeRow={handleLegalize}
                    pendingRowKeys={pendingRowKeys}
                    removingRowKeys={removingRowKeys}
                />
            </main>
        </div>
    );
}
