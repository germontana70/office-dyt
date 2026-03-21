"use client";

import { useEffect, useRef, useState, useTransition } from 'react';
import { createPortal } from 'react-dom';
import { addDays, addMonths, format } from 'date-fns';
import { GlassCard } from '@/ui/components/modules/layout/GlassCard';
import { initializePaymentPlan, reconcileTransactionsToPaymentPlan, sealPaymentPlan } from '@/app/actions/finance';
import { syncProgramNames } from '@/app/actions/audit-finance';
import { getGlobalSettings, getInstruments, getProgramPricesBySemester, getGroupClassesBySemester, getTeachers } from '@/app/actions/settings';
import { uploadStudentPhoto } from '@/modules/matriculas/actions/upload-student-photo';
import { uploadPaymentEvidence } from '@/app/actions/drive';
import Image from 'next/image';

interface EnrollmentAuditCardProps {
    enrollment: any;
}

const clampInstallments = (value: number) => Math.max(1, Math.min(6, value));

const roundup10k = (val: number) => Math.ceil(val / 10000) * 10000;

interface FloatingOption {
    key: string;
    label: string;
}

interface FloatingSelectProps {
    value: string;
    options: FloatingOption[];
    onChange: (value: string) => void;
    placeholder?: string;
    loadingLabel?: string;
    disabled?: boolean;
}

function FloatingSelect({
    value,
    options,
    onChange,
    placeholder = 'Seleccionar',
    loadingLabel = 'Cargando...',
    disabled = false
}: FloatingSelectProps) {
    const triggerRef = useRef<HTMLButtonElement | null>(null);
    const menuRef = useRef<HTMLDivElement | null>(null);
    const [open, setOpen] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [rect, setRect] = useState<DOMRect | null>(null);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (!open || !triggerRef.current) return;
        const handleReposition = () => {
            if (triggerRef.current) {
                setRect(triggerRef.current.getBoundingClientRect());
            }
        };

        const handlePointerDown = (event: MouseEvent) => {
            const target = event.target as Node;
            if (triggerRef.current?.contains(target)) return;
            if (menuRef.current?.contains(target)) return;
            setOpen(false);
        };

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setOpen(false);
            }
        };

        handleReposition();
        document.addEventListener('mousedown', handlePointerDown);
        document.addEventListener('keydown', handleKeyDown);
        window.addEventListener('scroll', handleReposition, true);
        window.addEventListener('resize', handleReposition);

        return () => {
            document.removeEventListener('mousedown', handlePointerDown);
            document.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('scroll', handleReposition, true);
            window.removeEventListener('resize', handleReposition);
        };
    }, [open]);

    const selectedLabel = options.find((opt) => opt.key === value)?.label || '';

    return (
        <>
            <button
                type="button"
                ref={triggerRef}
                disabled={disabled}
                onClick={() => setOpen((prev) => !prev)}
                aria-haspopup="listbox"
                aria-expanded={open}
                className="w-full bg-black/60 backdrop-blur-md border border-white/10 dark:border-primary/30 rounded-xl px-3 py-2 text-[12px] text-white font-bold uppercase tracking-wide focus:outline-none focus:ring-2 focus:ring-primary/30 flex items-center justify-between gap-3 transition-all"
            >
                <span className="truncate text-current">{selectedLabel || placeholder}</span>
                <svg className="w-4 h-4 text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            {mounted && open && rect &&
                createPortal(
                    <>
                        <button
                            type="button"
                            aria-hidden="true"
                            onClick={() => setOpen(false)}
                            className="fixed inset-0 z-[9998] cursor-default bg-transparent"
                        />
                        <div
                            ref={menuRef}
                            role="listbox"
                            className="bg-black/90 border border-primary/40 rounded-xl shadow-2xl max-h-60 overflow-y-auto z-[9999] backdrop-blur-xl"
                            style={{
                                position: 'fixed',
                                top: rect.bottom + 6,
                                left: rect.left,
                                width: rect.width,
                                zIndex: 9999
                            }}
                        >
                            {options.length === 0 ? (
                                <div className="px-4 py-3 text-[11px] text-white/60">{loadingLabel}</div>
                            ) : (
                                options.map((opt) => (
                                    <button
                                        key={opt.key}
                                        role="option"
                                        aria-selected={opt.key === value}
                                        type="button"
                                        onClick={() => {
                                            onChange(opt.key);
                                            setOpen(false);
                                        }}
                                        className="w-full text-left px-4 py-2 text-[12px] text-white hover:bg-white/5 dark:hover:bg-primary/20 transition-colors"
                                    >
                                        {opt.label}
                                    </button>
                                ))
                            )}
                        </div>
                    </>,
                    document.body
                )}
        </>
    );
}

function MaskedCurrencyInput({
    value,
    onChange,
    className = "",
    placeholder = "0"
}: {
    value: number;
    onChange: (val: number) => void;
    className?: string;
    placeholder?: string;
}) {
    // Función para formatear con puntos de miles
    const formatValue = (val: number) => {
        if (!val && val !== 0) return "";
        return val.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    };

    const [displayValue, setDisplayValue] = useState(formatValue(value));

    useEffect(() => {
        setDisplayValue(formatValue(value));
    }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const raw = e.target.value.replace(/\./g, "");
        if (raw === "" || /^\d+$/.test(raw)) {
            const num = raw === "" ? 0 : parseInt(raw, 10);
            onChange(num);
            setDisplayValue(formatValue(num));
        }
    };

    return (
        <div className="relative group/masked">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-primary/50 font-black text-[12px]">$</span>
            <input
                type="text"
                value={displayValue}
                onChange={handleChange}
                placeholder={placeholder}
                className={`w-full bg-black/40 border border-white/10 rounded-xl py-2 pl-7 pr-3 text-white font-mono text-sm focus:ring-1 focus:ring-primary focus:border-primary focus:outline-none transition-all placeholder:text-white/20 ${className}`}
            />
        </div>
    );
}

function FileUploaderCell({
    value,
    onChange,
    studentName,
    studentDocument,
    semester,
    paymentTitle
}: {
    value: string | null;
    onChange: (url: string) => void;
    studentName: string;
    studentDocument: string;
    semester: string;
    paymentTitle: string;
}) {
    const [isUploading, startTransition] = useTransition();

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        startTransition(async () => {
            try {
                const formData = new FormData();
                formData.append('file', file);
                formData.append('studentName', studentName);
                formData.append('studentDocument', studentDocument);
                formData.append('semester', semester);
                formData.append('paymentTitle', paymentTitle);

                const result = await uploadPaymentEvidence(formData);
                console.log("[DRIVE API RESPONSE]:", result);

                const driveLink = result?.webViewLink || result?.url;
                console.log("URL Recibida para Píldora:", driveLink);

                if (result?.success && driveLink) {
                    onChange(driveLink);
                } else {
                    alert('Error subiendo archivo: ' + (result?.error || 'No se recibió URL de validación o webViewLink de Drive.'));
                }
            } catch (err: any) {
                console.error("[DRIVE UPLOAD EXCEPTION]:", err);
                alert('Excepción crítica al subir el archivo: ' + (err.message || 'Desconocido'));
            }
        });
    };

    return (
        <div className="flex flex-col gap-2 min-w-[100px]">
            {isUploading ? (
                <div className="flex items-center justify-center gap-2 text-[10px] font-black text-primary animate-pulse border border-primary/20 bg-primary/10 rounded px-2 py-1">
                    <div className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    Subiendo...
                </div>
            ) : (
                <label className="cursor-pointer text-[10px] bg-primary/20 text-primary border border-primary/30 px-2 py-1 rounded w-full flex items-center justify-center gap-1 uppercase tracking-tighter hover:bg-primary/40 transition-all font-black">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                    Subir
                    <input type="file" className="hidden" onChange={handleUpload} accept="application/pdf,image/*" disabled={isUploading} />
                </label>
            )}

            {value && (
                <a 
                    href={value} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-[9px] bg-primary/10 text-primary border border-primary/20 rounded-md px-2 py-1 flex items-center justify-center gap-1 uppercase tracking-tighter font-black hover:bg-primary/20 transition-all backdrop-blur-sm shadow-inner shadow-black/40"
                    title="Ver Soporte en Google Drive"
                >
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    📄 Ver Soporte
                </a>
            )}
        </div>
    );
}

const ROOM_OPTIONS = [
    'SALÓN 201', 'SALÓN 202', 'SALÓN 203A', 'SALÓN 203B', 'SALÓN 204A -M.A', 'SALÓN 204B- J.P', 'SALÓN 205-A', 'SALÓN 205-B', 'SALÓN 205-C', 'SALÓN 206', 'SALÓN 207', 'SALÓN 208', 'SALÓN 209', 'MASTER GERMÁN', 'CLASES VIRTUALES - SALA 1 - Dones y Talentos'
];
const DURATION_OPTIONS = ['30 min', '45 min', '60 min', '120 min'];
const DAY_OPTIONS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

const isIndividualProgram = (name: string) => {
    const lower = String(name || '').toLowerCase();
    return lower.includes('semestre personalizado') || lower.includes('curso libre');
};

const requiresInstrumentConfig = (name: string) => {
    const lower = String(name || '').toLowerCase();
    return lower.includes('semestre personalizado') || lower.includes('curso libre - instrumento');
};

export function EnrollmentAuditCard({ enrollment }: EnrollmentAuditCardProps) {
    if (!enrollment) return null;

    const [isReconciling, setIsReconciling] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isUploading, startUploadTransition] = useTransition();
    const [isDragging, setIsDragging] = useState(false);
    const [currentPhotoUrl, setCurrentPhotoUrl] = useState(enrollment.student?.photo_url);

    const handleUpdateProgramSchedule = (progId: string, scheduleIndex: number, field: string, value: string) => {
        setSelectedPrograms(prev => prev.map(prog => {
            if (prog.id === progId) {
                const schedules = [...(prog.schedules || [])];
                if (schedules[scheduleIndex]) {
                    schedules[scheduleIndex] = { ...schedules[scheduleIndex], [field]: value };
                }
                return { ...prog, schedules };
            }
            return prog;
        }));
    };

    const handleAddProgramSchedule = (progId: string) => {
        setSelectedPrograms(prev => prev.map(prog => {
            if (prog.id === progId) {
                const schedules = [...(prog.schedules || [])];
                schedules.push({ id: `sch-${Date.now()}`, day: 'Lunes', startTime: '15:00', duration: '60 min', room: 'SALÓN 201' });
                return { ...prog, schedules };
            }
            return prog;
        }));
    };

    const handleRemoveProgramSchedule = (progId: string, scheduleIndex: number) => {
        setSelectedPrograms(prev => prev.map(prog => {
            if (prog.id === progId) {
                const schedules = [...(prog.schedules || [])];
                schedules.splice(scheduleIndex, 1);
                return { ...prog, schedules };
            }
            return prog;
        }));
    };

    const handleUpdateProgramObservation = (progId: string, value: string) => {
        setSelectedPrograms(prev => prev.map(prog => {
            if (prog.id === progId) {
                return { ...prog, observations: value };
            }
            return prog;
        }));
    };

    useEffect(() => {
        setCurrentPhotoUrl(enrollment.student?.photo_url);
    }, [enrollment.student?.photo_url]);

    const handlePhotoClick = () => {
        if (isUploading) return;
        fileInputRef.current?.click();
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        await uploadPhoto(file);
    };

    const uploadPhoto = async (file: File) => {
        if (!enrollment.student?.id) return;

        // --- VALIDACIÓN FRONTEND (Protocolo de Seguridad) ---
        // 1. Validar Tipo de Archivo
        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
            alert('❌ Solo se permiten imágenes (JPG, PNG o WebP)');
            return;
        }

        // 2. Validar Tamaño (Escudo 1MB)
        const MAX_SIZE = 1 * 1024 * 1024; // 1MB
        if (file.size > MAX_SIZE) {
            alert('⚠️ El archivo es muy pesado. El límite es de 1MB para descarga rápida.');
            return;
        }

        startUploadTransition(async () => {
            const formData = new FormData();
            formData.append('photo', file);

            const result = await uploadStudentPhoto(enrollment.student.id, formData);
            if (result?.error) {
                alert(result.error);
            } else if (result?.success && result.newPhotoUrl) {
                setCurrentPhotoUrl(result.newPhotoUrl);
            }
        });
    };

    const onDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        if (isUploading) return;
        setIsDragging(true);
    };

    const onDragLeave = () => {
        setIsDragging(false);
    };

    const onDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        if (isUploading) return;

        const file = e.dataTransfer.files?.[0];
        if (file) await uploadPhoto(file);
    };

    const formatCurrency = (val: number) => {
        const n = Math.round(Number(val) || 0);
        return '$ ' + n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    };

    const [paymentPlan, setPaymentPlan] = useState<any>(null);
    const [showReceipt, setShowReceipt] = useState(false);
    const [isSealing, setIsSealing] = useState(false);
    const [activeRow, setActiveRow] = useState<number | null>(null);
    const [isPending, startTransition] = useTransition();

    const statementRef = useRef<HTMLDivElement>(null);

    const handlePrint = () => {
        if (!statementRef.current) return;

        // Limpieza de portales previos
        const oldPortal = document.getElementById('print-portal');
        if (oldPortal) oldPortal.remove();

        // Creación del Portal Nuclear
        const portal = document.createElement('div');
        portal.id = 'print-portal';
        portal.innerHTML = statementRef.current.innerHTML;
        document.body.appendChild(portal);

        // Disparo de impresión
        setTimeout(() => {
            window.print();
        }, 100);
    };

    const [instruments, setInstruments] = useState<any[]>([]);
    const [groupClasses, setGroupClasses] = useState<any[]>([]);
    const [teachers, setTeachers] = useState<any[]>([]);

    const [instrumentSelections, setInstrumentSelections] = useState<Record<string, string>>({});
    const [groupClassSelections, setGroupClassSelections] = useState<Record<string, string>>({});
    const [teacherSelections, setTeacherSelections] = useState<Record<string, string>>({});

    const [globalFees, setGlobalFees] = useState<{ enrollment_fee: number; tshirt_fee: number }>({
        enrollment_fee: 0,
        tshirt_fee: 0
    });
    const [paymentPlanError, setPaymentPlanError] = useState<string | null>(null);

    const [includeEnrollmentFee, setIncludeEnrollmentFee] = useState(true);
    const [includeUniformFee, setIncludeUniformFee] = useState(true);
    const [paymentMethod, setPaymentMethod] = useState('Efectivo');
    const [referenceCode, setReferenceCode] = useState('');
    const [financialEntity, setFinancialEntity] = useState('');
    const [installmentsDetails, setInstallmentsDetails] = useState<any[]>([]);
    const [programPrices, setProgramPrices] = useState<
        Record<string, { cash: number; increment: number; financed: number; installments?: Record<string, { total?: number }> }>
    >({});
    const [programOptions, setProgramOptions] = useState<Array<{ key: string; label: string }>>([]);
    const [programLabelMap, setProgramLabelMap] = useState<Record<string, string>>({});
    const [programSelection, setProgramSelection] = useState<Record<string, string>>({});
    const [programStatus, setProgramStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
    const [programError, setProgramError] = useState<string | null>(null);
    const [programRetryKey, setProgramRetryKey] = useState(0);
    const [selectedPrograms, setSelectedPrograms] = useState<any[]>(() => {
        return (enrollment?.programs || []).map((prog: any) => {
            // Reconstruir horarios desde columnas DB (day_1..3, time_1..3, room_1..3, duration_1..3)
            const dbSchedules: any[] = [];
            for (let i = 1; i <= 3; i++) {
                const day = prog[`day_${i}`];
                if (day) {
                    dbSchedules.push({
                        id: `sch-db-${prog.id}-${i}`,
                        day,
                        startTime: prog[`time_${i}`] || '15:00',
                        duration: prog[`duration_${i}`] || '60 min',
                        room: prog[`room_${i}`] || 'SALÓN 201'
                    });
                }
            }
            const schedules = dbSchedules.length > 0
                ? dbSchedules
                : [{ id: `sch-init-${prog.id}`, day: 'Lunes', startTime: '15:00', duration: '60 min', room: 'SALÓN 201' }];

            return {
                ...prog,
                schedules,
                observations: prog.observations || '',
                installmentsCount: 1,
                firstPaymentDate: format(new Date(), 'yyyy-MM-dd'),
                discount: 0
            };
        });
    });
    const [deletedPrograms, setDeletedPrograms] = useState<Set<string>>(new Set());
    const programRequestIdRef = useRef(0);

    useEffect(() => {
        if (!enrollment?.id) return;

        startTransition(async () => {
            setPaymentPlanError(null);
            const result = await initializePaymentPlan(enrollment.id);
            if (result?.success) {
                setPaymentPlan(result.data);
            } else if (result?.error) {
                console.error('[FINANCE UI] Error inicializando plan:', result.error);
                setPaymentPlanError(result.error);
            }
        });
    }, [enrollment?.id]);

    // Sincronizar estado con el plan de pago cargado
    useEffect(() => {
        if (paymentPlan && selectedPrograms.length > 0) {
            setSelectedPrograms(prev => prev.map(prog => ({
                ...prog,
                discount: paymentPlan.discount_percentage ? Number(paymentPlan.discount_percentage) : prog.discount,
                installmentsCount: paymentPlan.number_of_installments ? Number(paymentPlan.number_of_installments) : prog.installmentsCount,
                firstPaymentDate: paymentPlan.start_date ? paymentPlan.start_date : prog.firstPaymentDate
            })));
        }
    }, [paymentPlan]);

    useEffect(() => {
        startTransition(async () => {
            const [instList, groupList, teachersList] = await Promise.all([
                getInstruments(),
                getGroupClassesBySemester(enrollment?.semester),
                getTeachers()
            ]);
            setInstruments(instList);
            setGroupClasses(groupList);
            setTeachers(teachersList);
        });
    }, [enrollment?.semester]);

    useEffect(() => {
        if (!selectedPrograms) return;
        const nextSelections: Record<string, string> = { ...instrumentSelections };
        const nextGroupSelections: Record<string, string> = { ...groupClassSelections };
        const nextTeacherSelections: Record<string, string> = { ...teacherSelections };
        for (const program of selectedPrograms) {
            if (program?.instrument_id && !nextSelections[program.id]) {
                nextSelections[program.id] = program.instrument_id;
            }
            if (program?.group_class_id && !nextGroupSelections[program.id]) {
                nextGroupSelections[program.id] = program.group_class_id;
            }
            if (program?.teacher_id && !nextTeacherSelections[program.id]) {
                nextTeacherSelections[program.id] = program.teacher_id;
            }
        }
        setInstrumentSelections(nextSelections);
        setGroupClassSelections(nextGroupSelections);
        setTeacherSelections(nextTeacherSelections);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedPrograms, groupClasses, teachers]);

    const normalizeProgramKey = (value: string) =>
        String(value || '')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/\s+/g, ' ')
            .trim()
            .toLowerCase();

    const groupPrograms = new Set([
        'aprestamiento',
        'piano iniciacion',
        'piano ukelele',
        'danza y expresion',
        'taller coral',
        'danza'
    ]);

    const oneToOnePrograms = new Set([
        'semestre personalizado',
        'semestre semipersonalizado',
        'curso libre - instrumento',
        'curso libre de instrumento',
        'curso libre - artes',
        'curso libre de artes'
    ]);

    const getProgramCategory = (programName: string) => {
        const normalized = normalizeProgramKey(programName);
        if (groupPrograms.has(normalized)) return 'group';
        if (oneToOnePrograms.has(normalized)) return '1a1';
        return 'unknown';
    };

    useEffect(() => {
        if (!enrollment?.semester) return;
        let active = true;
        const requestId = ++programRequestIdRef.current;
        let timedOut = false;

        setProgramStatus('loading');
        setProgramError(null);
        setProgramPrices((prev) => prev);
        setProgramOptions((prev) => prev);
        setProgramLabelMap((prev) => prev);

        const timeoutId = setTimeout(() => {
            if (!active) return;
            if (programRequestIdRef.current !== requestId) return;
            timedOut = true;
            setProgramStatus('error');
            setProgramError('Error al cargar programas');
        }, 10000);

        startTransition(async () => {
            const nextPrices: Record<string, { cash: number; increment: number; financed: number; installments?: Record<string, { total?: number }> }> = {};
            const nextOptions: Array<{ key: string; label: string }> = [];
            const nextLabelMap: Record<string, string> = {};
            const result = await getProgramPricesBySemester(enrollment.semester);

            if (!active) return;
            if (programRequestIdRef.current !== requestId) return;
            if (timedOut) return;

            clearTimeout(timeoutId);

            const prices = result?.data || [];

            (prices || []).forEach((row: any) => {
                const name = String(row.program_name || '').trim();
                const key = normalizeProgramKey(name);
                const cash = Number(row.valor_contado || row.cash_price || 0);
                const increment = Number(row.increment_percentage || 0);
                const financed = Number(row.total_financed || 0);
                if (name) {
                    nextOptions.push({ key, label: name });
                    nextLabelMap[key] = name;
                    nextPrices[key] = {
                        cash,
                        increment,
                        financed,
                        installments: row.installments || undefined
                    };
                }
            });

            if (nextOptions.length === 0) {
                setProgramStatus('error');
                setProgramError(result?.error || 'Error al cargar programas');
                return;
            }

            setProgramPrices(nextPrices);
            setProgramOptions(nextOptions.sort((a, b) => a.label.localeCompare(b.label)));
            setProgramLabelMap(nextLabelMap);
            setProgramStatus('ready');
            setProgramError(null);
        });

        return () => {
            active = false;
            clearTimeout(timeoutId);
        };
    }, [enrollment?.semester, programRetryKey]);

    useEffect(() => {
        if (!selectedPrograms || programOptions.length === 0) return;
        setProgramSelection((prev) => {
            const next = { ...prev };
            for (const program of selectedPrograms) {
                const key = normalizeProgramKey(program.program_name || '');
                if (!next[program.id] && key) {
                    next[program.id] = key;
                }
            }
            return next;
        });
    }, [selectedPrograms, programOptions.length]);

    useEffect(() => {
        if (!enrollment?.semester) return;
        startTransition(async () => {
            const settings = await getGlobalSettings(enrollment.semester);
            if (settings) {
                setGlobalFees({
                    enrollment_fee: Number(settings.enrollment_fee || 0),
                    tshirt_fee: Number(settings.tshirt_fee || 0)
                });
            }
        });
    }, [enrollment?.semester]);

    useEffect(() => {
        if (!paymentPlan) return;
        setIncludeEnrollmentFee(Number(paymentPlan.enrollment_fee || 0) > 0);
        setIncludeUniformFee(Number(paymentPlan.uniform_fee || 0) > 0);
    }, [paymentPlan]);

    const studentData =
        enrollment?.student ||
        enrollment?.student_data ||
        enrollment?.studentData;

    console.log("🔥 [SUPABASE PAYLOAD] studentData:", studentData);

    const calculateAge = (data: any) => {
        if (!data) return "N/A";

        // Priorizar birth_date (nombre real en tabla students de Supabase)
        const rawDate =
            data?.birth_date ||
            data?.fecha_nacimiento ||
            data?.fecha_de_nacimiento ||
            data?.['Fecha de nacimiento'] ||
            (typeof data === 'string' ? data : null);

        if (!rawDate) return "N/A";

        const birth = new Date(rawDate);
        if (isNaN(birth.getTime())) return "N/A";

        // Cálculo preciso basado en año actual (2026)
        const today = new Date();
        let age = today.getFullYear() - birth.getFullYear();
        const monthDiff = today.getMonth() - birth.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
            age--;
        }

        return Math.max(1, age);
    };

    const ageValue = calculateAge(studentData);
    const ageIsNumber = typeof ageValue === 'number' && !Number.isNaN(ageValue);
    const ageBadgeLabel = ageIsNumber ? `${ageValue} AÑOS` : ageValue;
    const isMinor = ageIsNumber ? ageValue < 18 : false;


    const baseCashAmount = (() => {
        if (!selectedPrograms) return Number(paymentPlan?.base_amount || 0);
        return selectedPrograms.reduce((sum: number, program: any) => {
            const selectedKey = programSelection[program.id];
            const key = selectedKey || normalizeProgramKey(program.program_name || '');
            const price = programPrices[key]?.cash || 0;
            return sum + price;
        }, 0);
    })();

    const programBaseAmount = (() => {
        if (!selectedPrograms) return baseCashAmount;

        return selectedPrograms.reduce((sum: number, program: any) => {
            const selectedKey = programSelection[program.id];
            const key = selectedKey || normalizeProgramKey(program.program_name || '');
            const pricing = programPrices[key];
            const cash = pricing?.cash || 0;
            const increment = (pricing?.increment !== undefined && pricing?.increment !== null) ? pricing.increment : 0;
            const discountFactor = 1 - (program.discount / 100);
            const discountedCash = cash * discountFactor;
            const n = clampInstallments(program.installmentsCount);

            let price = discountedCash;
            if (n > 1) {
                price = roundup10k(discountedCash * (1 + (increment / 100)));
            } else {
                price = Math.ceil(discountedCash / 1000) * 1000;
            }
            return sum + price;
        }, 0);
    })();

    const calculatedTotalFinanced = (() => {
        if (!selectedPrograms) return 0;

        const normalizeStr = (str: string) =>
            String(str || "")
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "")
                .trim()
                .toLowerCase();

        return selectedPrograms.reduce((sum: number, program: any) => {
            const rawName = programSelection[program.id] || program.program_name || '';
            const key = normalizeStr(rawName);
            const pricing = programPrices[key];

            if (!pricing) return sum;

            const cashPrice = pricing.cash || 0;
            const incrementPercentage = pricing.increment || 0;

            let financedAmount = pricing.financed || 0;

            if (financedAmount <= 0) {
                if (incrementPercentage > 0) {
                    const calculated = cashPrice * (1 + (incrementPercentage / 100));
                    const roundup10k = (val: number) => Math.ceil(val / 10000) * 10000;
                    financedAmount = roundup10k(calculated);
                } else {
                    financedAmount = cashPrice;
                }
            }

            return sum + financedAmount;
        }, 0);
    })();

    const scholarshipAmount = (() => {
        return selectedPrograms.reduce((sum: number, p: any) => {
            const key = programSelection[p.id] || normalizeProgramKey(p.program_name || '');
            return sum + ((programPrices[key]?.cash || 0) * (p.discount / 100));
        }, 0);
    })();
    const enrollmentFeeValue = includeEnrollmentFee ? globalFees.enrollment_fee : 0;
    const uniformFeeValue = includeUniformFee ? globalFees.tshirt_fee : 0;
    const totalAmount = programBaseAmount + enrollmentFeeValue + uniformFeeValue;
    const additionalDisplay = enrollmentFeeValue + uniformFeeValue;

    // Monitor de Cartera en Tiempo Real (Soporte Beca 100%)
    const totalPaid = installmentsDetails.reduce((sum, inst) => sum + (Number(inst.amount_paid) || 0), 0);
    const remainingBalance = Math.max(0, totalAmount - totalPaid);

    // Es Paz y Salvo si hay programas y lo pagado iguala (o supera) lo acordado (incluye $0)
    const isPazYSalvo = selectedPrograms.length > 0 && totalPaid >= totalAmount;
    const isFullCash = selectedPrograms.every(p => p.installmentsCount === 1);



    const handleReconcile = async () => {
        if (!enrollment?.id) return;
        
        const confirmMsg = "¿Deseas sincronizar los pagos registrados en Auditoría con este Plan de Pago? Esto actualizará el cronograma basándose en las transacciones reales encontradas.";
        if (!confirm(confirmMsg)) return;

        setIsReconciling(true);
        try {
            const result = await reconcileTransactionsToPaymentPlan(enrollment.id);
            if (result.success && result.data) {
                alert(`¡Sincronización Exitosa! Se han reconciliado ${result.data.installmentsReconciled} cuotas.`);
                // Forzar recarga ligera o mensaje para que el usuario sepa que debe refrescar
                window.location.reload();
            } else {
                alert('Error al reconciliar: ' + (result.error || 'No se recibieron datos de confirmación.'));
            }
        } catch (err: any) {
            alert('Error inesperado: ' + err.message);
        } finally {
            setIsReconciling(false);
        }
    };

    const programNeedsInstrument = (programName: string) => getProgramCategory(programName) === '1a1';

    const handleProgramChange = async (programId: string, programKey: string) => {
        // Optimistic local update for maximum fluency
        setProgramSelection((prev) => ({
            ...prev,
            [programId]: programKey
        }));

        if (!enrollment?.semester) return;
        const targetName = programLabelMap[programKey] || programKey;
        const formData = new FormData();
        formData.append('programId', programId);
        formData.append('targetName', targetName);
        formData.append('semester', enrollment.semester);

        try {
            const result = await syncProgramNames(formData);
            if (result?.success) {
                setProgramError(null);
            } else if (result?.error) {
                console.error('[PROGRAM SYNC] Error persistiendo programa:', result.error);
            }
        } catch (err) {
            console.error('[PROGRAM SYNC] Critical exception during sync:', err);
        }
    };

    // Motor Matemático Descentralizado por Programa
    useEffect(() => {
        if (!selectedPrograms) return;

        setInstallmentsDetails((prevDetails) => {
            let isFirstProgramOverall = true;
            const newDetails: any[] = [];

            selectedPrograms.forEach((prog: any) => {
                const key = programSelection[prog.id] || normalizeProgramKey(prog.program_name || '');
                const pricing = programPrices[key];
                const cash = pricing?.cash || 0;
                const increment = pricing?.increment || 0;
                const n = clampInstallments(prog.installmentsCount);
                // Validación robusta de fecha de inicio
                const firstDateRaw = String(prog.firstPaymentDate || '').trim() || format(new Date(), 'yyyy-MM-dd');
                const dateParts = firstDateRaw.split('-');
                const year = Number(dateParts[0]) || 2026;
                const month = Number(dateParts[1]) || 1;
                const day = Number(dateParts[2]) || 1;
                
                let baseDate = new Date(year, month - 1, day, 12, 0, 0);
                if (isNaN(baseDate.getTime())) {
                    baseDate = new Date();
                    baseDate.setHours(12, 0, 0, 0);
                }
                const discountFactor = 1 - (prog.discount / 100);

                const discountedCash = cash * discountFactor;
                let programAmount = n > 1 
                    ? roundup10k(discountedCash * (1 + (increment / 100)))
                    : Math.ceil(discountedCash / 1000) * 1000;

                const academicBase = n > 1 ? roundup10k(programAmount / n) : programAmount;

                for (let i = 0; i < n; i++) {
                    const existing = prevDetails.find((d: any) => d.program_id === prog.id && d.installment_number === i + 1) || {};
                    const projectedDate = addMonths(baseDate, i);

                    let academicPart = academicBase;
                    if (i === n - 1 && n > 1) {
                        academicPart = programAmount - (academicBase * (n - 1));
                    }

                    let amount_due = academicPart;
                    let concept = n === 1 ? 'Contado' : `Cuota ${i+1}/${n}`;
                    const breakdown: any[] = [{ label: 'Cuota Académica', value: academicPart }];

                    if (i === 0 && isFirstProgramOverall) {
                        if (enrollmentFeeValue > 0) {
                            amount_due += enrollmentFeeValue;
                            breakdown.push({ label: 'Inscripción', value: enrollmentFeeValue });
                        }
                        if (uniformFeeValue > 0) {
                            amount_due += uniformFeeValue;
                            breakdown.push({ label: 'Camiseta', value: uniformFeeValue });
                        }
                    }

                    newDetails.push({
                        program_id: prog.id,
                        installment_number: i + 1,
                        projected_date: format(projectedDate, 'yyyy-MM-dd'),
                        amount_due,
                        amount_paid: existing.amount_paid || 0,
                        payment_date: existing.payment_date || null,
                        reference: existing.reference || '',
                        entity: existing.entity || '',
                        concept: i === 0 && isFirstProgramOverall && (enrollmentFeeValue > 0 || uniformFeeValue > 0) 
                            ? `${concept} + Cargos` 
                            : concept,
                        evidence_url: existing.evidence_url || null,
                        breakdown
                    });
                }
                isFirstProgramOverall = false;
            });
            return newDetails;
        });
    }, [selectedPrograms, programSelection, programPrices, enrollmentFeeValue, uniformFeeValue]);

    useEffect(() => {
        if (paymentPlan?.installments_details && paymentPlan.installments_details.length > 0) {
            setInstallmentsDetails(paymentPlan.installments_details);
        }
    }, [paymentPlan]);

    const handleInstallmentUpdate = (index: number, field: string, value: any) => {
        const next = [...installmentsDetails];
        next[index] = { ...next[index], [field]: value };
        setInstallmentsDetails(next);
    };

    const handleProgramRetry = () => {
        setProgramRetryKey((prev) => prev + 1);
    };

    const handleSeal = async () => {
        if (!paymentPlan?.id) return;
        setIsSealing(true);

        const notes = financialEntity ? `Entidad: ${financialEntity}` : undefined;
        const programInstruments = Object.entries(instrumentSelections)
            .filter(([program_id]) => {
                const pName = programLabelMap[programSelection[program_id]] || selectedPrograms.find(p => p.id === program_id)?.program_name || '';
                return requiresInstrumentConfig(pName);
            })
            .map(([program_id, instrument_id]) => ({
                program_id,
                instrument_id: instrument_id ? instrument_id : null
            }));
        const programUpdates = Object.entries(programSelection)
            .map(([program_id, program_key]) => {
                const progObj = selectedPrograms.find(p => p.id === program_id);
                return {
                    program_id,
                    program_name: programLabelMap[program_key] || program_key,
                    group_class_id: groupClassSelections[program_id] || null,
                    teacher_id: teacherSelections[program_id] || null,
                    schedules: progObj?.schedules || [],
                    observations: progObj?.observations || '',
                    isNew: program_id.startsWith('new-')
                };
            })
            .filter((entry) => entry.program_name && entry.program_name.trim().length > 0);

        deletedPrograms.forEach(id => {
            programUpdates.push({
                program_id: id,
                program_name: 'deleted',
                group_class_id: null,
                isNew: false,
                isDeleted: true
            } as any);
        });

        const result = await sealPaymentPlan({
            payment_plan_id: paymentPlan.id,
            base_amount: baseCashAmount,
            enrollment_fee: enrollmentFeeValue,
            uniform_fee: uniformFeeValue,
            total_amount: totalAmount,
            plan_type: selectedPrograms[0]?.installmentsCount > 1 ? 'cuotas' : 'contado',
            initial_payment: 0,
            payment_method: 'N/A',
            reference_code: '',
            notes,
            start_date: selectedPrograms[0]?.firstPaymentDate,
            installments_details: installmentsDetails,
            program_instruments: programInstruments,
            program_updates: programUpdates,
            discount_percentage: selectedPrograms[0]?.discount // Trazabilidad de Auditoría
        });

        if (result?.success) {
            setPaymentPlan(result.data?.plan || paymentPlan);
        } else if (result?.error) {
            console.error('[FINANCE UI] Error sellando plan:', result.error);
        }

        setIsSealing(false);
    };

    return (
        <div className="animate-in fade-in slide-in-from-top-4 duration-500 mt-6 overflow-visible">
            <GlassCard className="p-8 border border-white/10 bg-black/60 relative overflow-visible group shadow-2xl">
                <div className="absolute right-[-5%] top-[-5%] w-[300px] h-[300px] bg-primary/10 rounded-full blur-[80px] pointer-events-none group-hover:scale-110 transition-transform duration-700 opacity-50 dark:opacity-100" />

                <div className="relative z-10 space-y-8">
                    <div className="flex justify-between items-start">
                        <div className="flex gap-6 items-center">
                            <div
                                className={`relative group/photo cursor-pointer transition-all duration-300 ${isDragging ? 'scale-110' : ''}`}
                                onClick={handlePhotoClick}
                                onDragOver={onDragOver}
                                onDragLeave={onDragLeave}
                                onDrop={onDrop}
                            >
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handleFileChange}
                                    className="hidden"
                                    accept="image/jpeg,image/png,image/webp"
                                    disabled={isUploading}
                                />

                                <div className={`relative w-32 h-32 rounded-full border-2 transition-all duration-500 overflow-hidden ${isDragging || (isUploading) ? 'border-primary ring-4 ring-primary/20 shadow-[0_0_30px_rgba(var(--primary-rgb),0.5)]' : 'border-primary/40 ring-2 ring-primary/10 shadow-2xl shadow-black/60'}`}>
                                    {isUploading && (
                                        <div className="absolute inset-0 z-20 bg-black/70 backdrop-blur-md flex flex-col items-center justify-center">
                                            <div className="w-10 h-10 border-[3px] border-primary border-t-transparent rounded-full animate-spin mb-1" />
                                            <span className="text-[8px] font-black uppercase text-primary tracking-tighter">Subiendo</span>
                                        </div>
                                    )}

                                    {currentPhotoUrl ? (
                                        <Image
                                            src={currentPhotoUrl}
                                            alt={enrollment.student.first_name}
                                            width={128}
                                            height={128}
                                            className={`w-full h-full object-cover transition-transform duration-700 ${isUploading ? 'scale-110 blur-sm' : 'group-hover/photo:scale-110'}`}
                                        />
                                    ) : (
                                        <div className="w-full h-full bg-[#0a0a0a] flex flex-col items-center justify-center text-white/20 group-hover:bg-primary/5 transition-colors">
                                            <svg className={`w-10 h-10 mb-1 transition-colors ${isDragging ? 'text-primary' : 'group-hover/photo:text-primary/40'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                            </svg>
                                            <span className="text-[7px] font-black uppercase tracking-tighter text-center px-4 leading-tight opacity-40 group-hover/photo:opacity-80">Drag and drop file here</span>
                                            <span className="text-[6px] font-bold text-white/10 mt-1">MAX 1MB (JPG, PNG)</span>
                                        </div>
                                    )}

                                    {/* Overlay Hover */}
                                    {currentPhotoUrl && !isUploading && (
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/photo:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[1px] z-10">
                                            <div className="flex flex-col items-center gap-1">
                                                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                                                </svg>
                                                <span className="text-[8px] font-black text-white uppercase tracking-widest bg-primary/80 px-2 py-0.5 rounded shadow-lg">Actualizar</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <div className={`absolute bottom-1 right-1 w-8 h-8 bg-primary rounded-full border-2 border-black flex items-center justify-center text-[10px] font-black text-black z-30 transition-transform duration-300 ${isUploading ? 'scale-110 rotate-12' : ''}`}>
                                    {isUploading ? '⌛' : 'ID'}
                                </div>
                            </div>

                            <div>
                                <h3 className="text-[10px] font-black uppercase text-primary tracking-widest mb-1">
                                    Auditoria de Matricula Migrada
                                </h3>
                                <p className="text-3xl font-black tracking-tighter text-white uppercase italic flex items-center gap-3">
                                    {enrollment.student.first_name} {enrollment.student.last_name}
                                    <span className={`text-base not-italic font-black px-3 py-1 rounded-lg ${isMinor
                                        ? 'bg-orange-500/20 text-orange-600 dark:text-orange-400 border border-orange-500/30'
                                        : 'bg-slate-100 dark:bg-white/5 text-slate-400 dark:text-white/40'
                                        }`}>
                                        ({ageBadgeLabel})
                                    </span>
                                </p>
                                <p className="text-[10px] font-mono text-slate-500 dark:text-white/40 mt-1 uppercase tracking-widest">
                                    Documento: {enrollment.student.document_number} | Semestre: {enrollment.semester}
                                </p>
                            </div>
                        </div>
                        <div
                            className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${enrollment.status === 'Activa'
                                ? 'bg-green-500/10 border-green-500/20 text-green-400'
                                : 'bg-white/5 border-white/10 text-white/40'
                                }`}
                        >
                            {enrollment.status}
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h4 className="text-[10px] font-black uppercase text-slate-500 dark:text-white/30 tracking-widest border-b border-slate-200 dark:border-white/5 pb-2">
                            Programas y Horarios (Carga Academica)
                        </h4>

                        {programStatus === 'error' && programOptions.length === 0 && (
                            <div className="flex items-center justify-between gap-3 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2">
                                <p className="text-[10px] font-bold text-red-300 uppercase tracking-widest">
                                    {programError || 'Error al cargar programas'}
                                </p>
                                <button
                                    type="button"
                                    onClick={handleProgramRetry}
                                    className="text-[10px] font-black uppercase tracking-widest text-white/80 hover:text-white"
                                >
                                    Reintentar
                                </button>
                            </div>
                        )}

                        <div className="grid grid-cols-1 gap-6">
                            {(!selectedPrograms || selectedPrograms.length === 0) && (
                                <div className="col-span-1 p-6 bg-slate-50 dark:bg-black/40 backdrop-blur-md border border-amber-500/20 rounded-2xl flex flex-col items-center justify-center gap-3 text-center">
                                    <svg className="w-10 h-10 text-amber-500/60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                                    </svg>
                                    <p className="text-[11px] font-black uppercase tracking-widest text-amber-600 dark:text-amber-300">
                                        Alumno sin programa asignado
                                    </p>
                                    <p className="text-[10px] text-slate-500 dark:text-white/40 max-w-md">
                                        Seleccione "Añadir Programa Adicional" para configurar los planes académicos de este estudiante.
                                    </p>
                                </div>
                            )}
                            {selectedPrograms &&
                                selectedPrograms.map((prog: any, progIdx: number) => (
                                    <div
                                        key={prog.id}
                                        className="p-4 glass-panel border border-white/5 rounded-2xl space-y-3 group/item hover:border-primary/30 transition-colors overflow-visible relative z-10 shadow-lg shadow-black/40 w-full"
                                    >
                                        {progIdx > 0 && (
                                            <button
                                                onClick={() => {
                                                    setDeletedPrograms(prev => new Set(prev).add(prog.id));
                                                    setSelectedPrograms(prev => prev.filter(p => p.id !== prog.id));
                                                }}
                                                className="absolute top-4 right-4 text-red-500/50 hover:text-red-500 transition-colors bg-red-500/10 p-1.5 rounded-full z-20"
                                                title="Eliminar Programa"
                                            >
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                </svg>
                                            </button>
                                        )}
                                        {isIndividualProgram(programLabelMap[programSelection[prog.id]] || prog.program_name || '') ? (
                                            <div className="px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-[9px] font-black uppercase tracking-widest text-cyan-500 dark:text-cyan-300 w-fit">
                                                Modalidad Individual (Personalizada)
                                            </div>
                                        ) : (
                                            <div className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-[9px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-300 w-fit">
                                                Categoria Grupal (sin asignación individual libre)
                                            </div>
                                        )}
                                        <div className="flex flex-col gap-2">
                                            <FloatingSelect
                                                value={programSelection[prog.id] || normalizeProgramKey(prog.program_name || '')}
                                                options={programOptions}
                                                disabled={programStatus === 'loading'}
                                                onChange={(value) => handleProgramChange(prog.id, value)}
                                                placeholder="Seleccionar programa"
                                                loadingLabel={programStatus === 'error' ? 'Sin programas disponibles' : 'Cargando...'}
                                            />
                                            <p className="text-[9px] font-mono text-slate-400 dark:text-white/20 uppercase tracking-tighter">
                                                ID: {prog.id.split('-')[0]}
                                            </p>
                                            {(() => {
                                                const key = programSelection[prog.id] || normalizeProgramKey(prog.program_name || '');
                                                const hasPrice = programPrices[key]?.cash > 0 || programPrices[key]?.financed > 0;
                                                if (!hasPrice && programStatus === 'ready') {
                                                    return (
                                                        <p className="text-[10px] font-black text-red-500 bg-red-500/10 border border-red-500/20 px-2 py-1 rounded-lg uppercase tracking-tight flex items-center gap-2">
                                                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                                            </svg>
                                                            Programa sin precio en Bóveda {enrollment.semester}
                                                        </p>
                                                    );
                                                }
                                                return null;
                                            })()}
                                        </div>

                                        {isIndividualProgram(programLabelMap[programSelection[prog.id]] || prog.program_name || '') ? (
                                            <div className="space-y-6 pt-4 border-t border-white/5">
                                                <div className={`grid grid-cols-1 ${requiresInstrumentConfig(programLabelMap[programSelection[prog.id]] || prog.program_name || '') ? 'md:grid-cols-2' : ''} gap-4`}>
                                                    {requiresInstrumentConfig(programLabelMap[programSelection[prog.id]] || prog.program_name || '') && (
                                                        <div className="space-y-2">
                                                            <p className="text-[9px] font-black text-white/50 uppercase tracking-widest">
                                                                Instrumento asignado
                                                            </p>
                                                            <FloatingSelect
                                                                value={instrumentSelections[prog.id] || ''}
                                                                options={instruments.map((instrument) => ({
                                                                    key: instrument.id,
                                                                    label: instrument.name
                                                                }))}
                                                                onChange={(value) =>
                                                                    setInstrumentSelections((prev) => ({
                                                                        ...prev,
                                                                        [prog.id]: value
                                                                    }))
                                                                }
                                                                placeholder="Seleccionar instrumento"
                                                                loadingLabel="Cargando instrumentos..."
                                                            />
                                                        </div>
                                                    )}
                                                    <div className="space-y-2">
                                                        <p className="text-[9px] font-black text-white/50 uppercase tracking-widest">
                                                            Maestro Asignado
                                                        </p>
                                                        <FloatingSelect
                                                            value={teacherSelections[prog.id] || ''}
                                                            options={teachers.map((t) => ({
                                                                key: t.id,
                                                                label: t.name
                                                            }))}
                                                            onChange={(value) =>
                                                                setTeacherSelections((prev) => ({
                                                                    ...prev,
                                                                    [prog.id]: value
                                                                }))
                                                            }
                                                            placeholder="Vincular maestro..."
                                                            loadingLabel="Cargando..."
                                                        />
                                                    </div>
                                                </div>

                                                <div className="space-y-4">
                                                    <h5 className="text-[10px] font-black uppercase text-cyan-400 tracking-widest flex items-center gap-2">
                                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                        </svg>
                                                        Horario de Clases
                                                    </h5>
                                                    <div className="space-y-3">
                                                        {(prog.schedules || []).map((sch: any, sIdx: number) => (
                                                            <div key={sch.id} className="grid grid-cols-1 md:grid-cols-5 gap-3 border border-white/5 bg-black/40 p-3 rounded-xl items-end relative shadow-inner">
                                                                {sIdx > 0 && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleRemoveProgramSchedule(prog.id, sIdx)}
                                                                        className="absolute -top-2 -right-2 bg-red-500/20 text-red-500 rounded-full p-1 border border-red-500/30 hover:bg-red-500 hover:text-white transition-colors"
                                                                    >
                                                                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
                                                                    </button>
                                                                )}
                                                                <div className="space-y-1">
                                                                    <p className="text-[8px] uppercase tracking-widest text-white/40 font-black">Día</p>
                                                                    <select value={sch.day} onChange={e => handleUpdateProgramSchedule(prog.id, sIdx, 'day', e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-2 text-[11px] text-white focus:outline-none focus:border-cyan-500 font-bold uppercase">
                                                                        {DAY_OPTIONS.map(d => <option key={d} value={d} className="bg-[#0a0a0a]">{d}</option>)}
                                                                    </select>
                                                                </div>
                                                                <div className="space-y-1">
                                                                    <p className="text-[8px] uppercase tracking-widest text-white/40 font-black">Hora (Inicio)</p>
                                                                    <input type="time" value={sch.startTime} onChange={e => handleUpdateProgramSchedule(prog.id, sIdx, 'startTime', e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-[11px] text-white focus:outline-none focus:border-cyan-500 font-bold" />
                                                                </div>
                                                                <div className="space-y-1">
                                                                    <p className="text-[8px] uppercase tracking-widest text-white/40 font-black">Duración</p>
                                                                    <select value={sch.duration} onChange={e => handleUpdateProgramSchedule(prog.id, sIdx, 'duration', e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-2 text-[11px] text-white focus:outline-none focus:border-cyan-500 font-bold uppercase">
                                                                        {DURATION_OPTIONS.map(d => <option key={d} value={d} className="bg-[#0a0a0a]">{d}</option>)}
                                                                    </select>
                                                                </div>
                                                                <div className="space-y-1 md:col-span-2">
                                                                    <p className="text-[8px] uppercase tracking-widest text-white/40 font-black">Salón</p>
                                                                    <select value={sch.room} onChange={e => handleUpdateProgramSchedule(prog.id, sIdx, 'room', e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-2 text-[11px] text-white focus:outline-none focus:border-cyan-500 font-bold uppercase">
                                                                        {ROOM_OPTIONS.map(r => <option key={r} value={r} className="bg-[#0a0a0a]">{r}</option>)}
                                                                    </select>
                                                                </div>
                                                            </div>
                                                        ))}
                                                        <button
                                                            onClick={() => handleAddProgramSchedule(prog.id)}
                                                            className="text-[10px] font-black uppercase text-cyan-400 border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 rounded-xl hover:bg-cyan-400/20 transition-colors w-full tracking-widest"
                                                        >
                                                            + Añadir Día Adicional
                                                        </button>
                                                    </div>
                                                </div>
                                                <div className="space-y-2">
                                                    <h5 className="text-[10px] font-black uppercase text-white/30 tracking-widest">Observaciones de Programación</h5>
                                                    <textarea
                                                        value={prog.observations}
                                                        onChange={e => handleUpdateProgramObservation(prog.id, e.target.value)}
                                                        placeholder="Instrucciones especiales para el maestro, consideraciones..."
                                                        className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-primary font-mono min-h-[80px]"
                                                    />
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="space-y-4 pt-4 border-t border-white/5">
                                                <div className="space-y-2">
                                                    <p className="text-[9px] font-black text-white/50 uppercase tracking-widest">
                                                        Clase Grupal Existente
                                                    </p>
                                                    <FloatingSelect
                                                        value={groupClassSelections[prog.id] || ''}
                                                        options={groupClasses.map((cls) => ({
                                                            key: cls.id,
                                                            label: `${cls.name} - ${cls.schedule_day} ${cls.schedule_time} (${cls.teacher_name || 'Sin maestro'})`
                                                        }))}
                                                        onChange={(value) =>
                                                            setGroupClassSelections((prev) => ({
                                                                ...prev,
                                                                [prog.id]: value
                                                            }))
                                                        }
                                                        placeholder="Seleccionar clase grupal"
                                                        loadingLabel="Cargando clases grupales..."
                                                    />
                                                </div>
                                            </div>
                                        )}

                                        {/* ── EXCEPCIONES Y CUOTAS (por programa) ── */}
                                        <div className="pt-3 mt-1 border-t border-white/5 space-y-3">
                                            <h5 className="text-[10px] font-black uppercase text-white/30 tracking-widest">
                                                Excepciones y Cuotas
                                            </h5>

                                            {progIdx === 0 && (
                                                <>
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-[11px] font-bold text-white/70">Cobrar Inscripcion</span>
                                                        <input
                                                            type="checkbox"
                                                            checked={includeEnrollmentFee}
                                                            onChange={(e) => setIncludeEnrollmentFee(e.target.checked)}
                                                            className="h-4 w-4 accent-primary"
                                                        />
                                                    </div>
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-[11px] font-bold text-white/70">Cobrar Camiseta</span>
                                                        <input
                                                            type="checkbox"
                                                            checked={includeUniformFee}
                                                            onChange={(e) => setIncludeUniformFee(e.target.checked)}
                                                            className="h-4 w-4 accent-primary"
                                                        />
                                                    </div>
                                                </>
                                            )}

                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black uppercase text-white/30 tracking-widest">
                                                    Fecha Primera Cuota
                                                </label>
                                                <input
                                                    type="date"
                                                    value={prog.firstPaymentDate}
                                                    onChange={(e) => setSelectedPrograms(prev => prev.map(p => p.id === prog.id ? { ...p, firstPaymentDate: e.target.value } : p))}
                                                    className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:border-primary focus:outline-none"
                                                />
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black uppercase text-white/30 tracking-widest">
                                                    Numero de Cuotas
                                                </label>
                                                <select
                                                    value={clampInstallments(prog.installmentsCount)}
                                                    onChange={(e) => setSelectedPrograms(prev => prev.map(p => p.id === prog.id ? { ...p, installmentsCount: Number(e.target.value) } : p))}
                                                    className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:ring-1 focus:ring-primary focus:outline-none"
                                                >
                                                    {[1, 2, 3, 4, 5, 6].map((n) => (
                                                        <option key={n} value={n}>
                                                            {n} {n === 1 ? '(Contado)' : 'Cuotas'}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>

                                            <div className="space-y-3 pt-2">
                                                <div className="flex justify-between items-center">
                                                    <label className="text-[10px] font-black uppercase text-primary tracking-widest">
                                                        Beca / Descuento Hum.
                                                    </label>
                                                    <span className="bg-primary/20 text-primary px-2 py-0.5 rounded text-[10px] font-black">
                                                        {prog.discount}%
                                                    </span>
                                                </div>
                                                <input
                                                    type="range"
                                                    min="0"
                                                    max="100"
                                                    step="5"
                                                    value={prog.discount}
                                                    onChange={(e) => setSelectedPrograms(prev => prev.map(p => p.id === prog.id ? { ...p, discount: Number(e.target.value) } : p))}
                                                    className="w-full h-1.5 bg-white/5 rounded-lg appearance-none cursor-pointer accent-primary"
                                                />
                                                <div className="flex justify-between text-[8px] text-white/20 uppercase font-black">
                                                    <span>0%</span>
                                                    <span>Beneficio Social</span>
                                                    <span>100%</span>
                                                </div>
                                            </div>
                                        </div>

                                    </div>
                                ))}

                            {selectedPrograms && selectedPrograms.length < 8 && (
                                <button
                                    onClick={() => setSelectedPrograms(prev => [...prev, { id: `new-${Date.now()}`, program_name: '', schedules: [{ id: `sch-${Date.now()}`, day: 'Lunes', startTime: '15:00', duration: '60 min', room: 'SALÓN 201' }], observations: '', installmentsCount: 1, firstPaymentDate: format(new Date(), 'yyyy-MM-dd'), discount: 0 }])}
                                    className="w-full py-4 rounded-xl border-2 border-dashed border-primary/40 bg-primary/10 text-primary font-black uppercase tracking-widest hover:bg-primary/20 hover:border-primary/80 transition-all flex items-center justify-center gap-2 mt-2 shadow-[0_0_15px_rgba(var(--primary-rgb),0.3)]"
                                >
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" />
                                    </svg>
                                    Añadir Programa Adicional
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                        <div className="glass-panel p-6 rounded-2xl flex flex-col gap-4 relative overflow-hidden border border-white/5 shadow-xl">
                            <h4 className="text-[10px] font-black uppercase text-slate-500 dark:text-white/30 tracking-widest flex items-center gap-2">
                                <svg className="w-4 h-4 text-emerald-500/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                </svg>
                                Auditoría de Precios
                            </h4>
                            <div className="flex flex-col h-full justify-center divide-y divide-black/10 dark:divide-white/10">
                                <div className="pb-4 space-y-1">
                                    <p className="text-[11px] font-black uppercase tracking-widest text-slate-600 dark:text-gray-400">
                                        Matrícula de Contado
                                    </p>
                                    <p className="text-3xl font-black tracking-tighter text-slate-900 dark:text-white">
                                        {formatCurrency(baseCashAmount || 0)}
                                    </p>
                                </div>
                                <div className="pt-4 space-y-1">
                                    <p className="text-[11px] font-black uppercase tracking-widest text-slate-600 dark:text-gray-400">
                                        Total Financiado (Proyectado)
                                    </p>
                                    <p className="text-3xl font-black tracking-tighter text-emerald-600 dark:text-emerald-400">
                                        {formatCurrency(calculatedTotalFinanced || 0)}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-6 lg:col-span-2">
                            {selectedPrograms?.map((prog: any, pIdx: number) => {
                                const programInstallments = installmentsDetails.filter((d: any) => d.program_id === prog.id);
                                if (programInstallments.length === 0) return null;

                                return (
                                    <div key={prog.id} className="p-4 bg-black/40 backdrop-blur-md border border-white/5 rounded-2xl space-y-4 shadow-lg shadow-black/40">
                                        <h4 className="text-[10px] font-black uppercase tracking-widest text-[#00E5FF] border-b border-white/10 pb-2">
                                            Cronograma: {programLabelMap[programSelection[prog.id]] || prog.program_name} {getProgramCategory(programLabelMap[programSelection[prog.id]] || prog.program_name || '') === 'group' ? '(Clase Grupal)' : ''}
                                        </h4>
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-[11px] text-white/70 border-collapse">
                                                <thead>
                                                    <tr className="border-b border-primary/20 uppercase text-[12px] font-black tracking-[0.15em] text-white/50">
                                                        <th className="p-3 text-left">#</th>
                                                        <th className="p-3 text-left">Vencimiento</th>
                                                        <th className="p-3 text-left">Valor Cuota</th>
                                                        <th className="p-3 text-left">Valor Pagado</th>
                                                        <th className="p-3 text-left">Referencia / Detalle</th>
                                                        <th className="p-3 text-left">Fecha Real</th>
                                                        <th className="p-3 text-center">Soporte</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-white/5">
                                                    {programInstallments.map((inst, idx) => {
                                                        const globalIndex = installmentsDetails.findIndex((d: any) => d.program_id === prog.id && d.installment_number === inst.installment_number);
                                                        return (
                                                            <tr key={idx} className="hover:bg-white/5 transition-colors">
                                                                <td className="p-3 font-black">
                                                                    <div className="flex flex-col">
                                                                        <span className="text-sm text-white">{inst.installment_number}</span>
                                                                        {inst.concept && (
                                                                            <span className="text-[9px] text-primary/60 uppercase font-black tracking-widest truncate max-w-[80px]">
                                                                                {inst.concept}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </td>
                                                                <td className="p-3 text-[13px] text-white/80 font-bold">{inst.projected_date}</td>
                                                                <td className="p-3 font-mono">
                                                                    <div className="flex flex-col">
                                                                        <span className="text-white text-[1.15rem] font-black tracking-tight">{formatCurrency(inst.amount_due)}</span>
                                                                        {(inst.breakdown?.length > 1) && (
                                                                            <div className="mt-2 space-y-1.5 border-t border-white/10 pt-2 bg-white/5 p-2 rounded-lg">
                                                                                {inst.breakdown.map((b: any, bi: number) => (
                                                                                    <div key={bi} className="flex justify-between text-[11px] uppercase font-bold text-white/60 leading-relaxed min-w-[120px]">
                                                                                        <span className="opacity-60">{b.label}</span>
                                                                                        <span className="text-white font-mono ml-4">{formatCurrency(b.value)}</span>
                                                                                    </div>
                                                                                ))}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </td>
                                                                <td className="p-2 min-w-[120px]">
                                                                    <MaskedCurrencyInput
                                                                        value={inst.amount_paid}
                                                                        onChange={(val) => handleInstallmentUpdate(globalIndex, 'amount_paid', val)}
                                                                        className="!py-1 !text-[12px]"
                                                                    />
                                                                </td>
                                                                <td className="p-2">
                                                                    <input
                                                                        type="text"
                                                                        value={inst.reference || inst.entity || ''}
                                                                        onChange={(e) => handleInstallmentUpdate(globalIndex, 'reference', e.target.value)}
                                                                        placeholder="Nequi..."
                                                                        className="w-full max-w-[120px] bg-black/40 border border-white/10 rounded-xl px-2 py-1 text-white text-[11px] font-bold focus:ring-1 focus:ring-primary focus:outline-none transition-all"
                                                                    />
                                                                </td>
                                                                <td className="p-2">
                                                                    <input
                                                                        type="date"
                                                                        value={inst.payment_date || ''}
                                                                        onChange={(e) => handleInstallmentUpdate(globalIndex, 'payment_date', e.target.value)}
                                                                        className="w-[110px] bg-black/40 border border-white/10 rounded-xl px-2 py-1 text-[10px] text-white font-black uppercase focus:ring-1 focus:ring-primary focus:outline-none transition-all [&::-webkit-calendar-picker-indicator]:filter [&::-webkit-calendar-picker-indicator]:invert"
                                                                    />
                                                                </td>
                                                                <td className="p-2">
                                                                    <FileUploaderCell
                                                                        value={inst.evidence_url}
                                                                        onChange={(url) => handleInstallmentUpdate(globalIndex, 'evidence_url', url)}
                                                                        studentName={`${enrollment?.student?.first_name} ${enrollment?.student?.last_name}`}
                                                                        studentDocument={enrollment?.student?.document_number || ''}
                                                                        semester={enrollment?.semester}
                                                                        paymentTitle={`${prog.program_name} - Cuota ${inst.installment_number}`}
                                                                    />
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className={`p-5 rounded-[2rem] border transition-all duration-500 flex flex-col md:flex-row items-center justify-between gap-6 ${isPazYSalvo ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-yellow-500/5 border-yellow-500/10'}`}>
                        <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-transform duration-500 ${isPazYSalvo ? 'bg-emerald-500/20 text-emerald-400 scale-110 shadow-[0_0_20px_rgba(52,211,153,0.3)]' : 'bg-yellow-500/10 text-yellow-500'}`}>
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isPazYSalvo ? "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" : "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"} />
                                </svg>
                            </div>
                            <div className="space-y-1">
                                {isPazYSalvo ? (
                                    <div className="bg-emerald-500 text-black font-black text-[11px] px-3 py-1 rounded-full animate-bounce tracking-widest shadow-[0_0_15px_rgba(52,211,153,0.5)]">
                                        ✓ ESTUDIANTE A PAZ Y SALVO
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-4">
                                        <p className="text-[10px] font-black text-yellow-500/50 uppercase tracking-[0.2em]">Monitor de Cartera</p>
                                        <button
                                            onClick={handleReconcile}
                                            disabled={isReconciling}
                                            className="px-3 py-1 bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-400 text-[9px] font-black uppercase tracking-tighter rounded-full border border-emerald-500/30 flex items-center gap-2 transition-all disabled:opacity-50"
                                            title="Sincronizar pagos desde Auditoría de Pagos Históricos"
                                        >
                                            <svg className={`w-3 h-3 ${isReconciling ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                            </svg>
                                            {isReconciling ? 'Sincronizando...' : 'Sincronizar Pagos'}
                                        </button>
                                    </div>
                                )}
                                <p className="text-[11px] font-bold text-white/70">
                                    {isPending ? 'Procesando auditoría...' : isPazYSalvo ? 'Operación liquidada correctamente.' : 'Pendiente de recaudo para cierre.'}
                                </p>
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-8 text-center md:text-right">
                            <div className="space-y-1">
                                <p className="text-[9px] font-black text-cyan-400/50 uppercase tracking-widest">Valor Recaudado</p>
                                <p className="text-2xl font-black text-cyan-400 font-mono tracking-tighter">
                                    {formatCurrency(totalPaid)}
                                </p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-[9px] font-black text-white/30 uppercase tracking-widest">Saldo Pendiente</p>
                                <p className={`text-2xl font-black font-mono tracking-tighter transition-colors ${remainingBalance > 0 ? 'text-red-500 animate-pulse' : 'text-white'}`}>
                                    {formatCurrency(remainingBalance)}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="text-right space-y-2">
                        <div className="flex flex-col items-end">
                            <p className="text-[10px] font-black text-slate-400 dark:text-white/20 uppercase tracking-widest flex items-center gap-2">
                                Total Calculado
                                <span className="bg-yellow-500/10 text-yellow-600 dark:text-yellow-500 px-1.5 py-0.5 rounded text-[8px] font-black border border-yellow-500/20">
                                    Liquidación Final {enrollment.semester}
                                </span>
                            </p>
                            <p className="text-3xl font-black text-yellow-600 dark:text-yellow-500/90 leading-none">
                                {formatCurrency(totalAmount || 0)}
                            </p>
                        </div>

                        <div className="bg-black/40 p-3 rounded-xl border border-white/5 space-y-1.5 min-w-[240px] shadow-inner">
                            <div className="flex justify-between text-[11px] font-bold text-white/40">
                                <span>VALOR COMERCIAL MATRÍCULA</span>
                                <span className="line-through">{formatCurrency(baseCashAmount || 0)}</span>
                            </div>
                            {scholarshipAmount > 0 && (
                                <div className="flex justify-between text-[11px] font-black text-emerald-400">
                                    <span>BECA / BENEFICIO SOCIAL ACUMULADO</span>
                                    <span>-{formatCurrency(scholarshipAmount)}</span>
                                </div>
                            )}
                            {additionalDisplay > 0 && (
                                <div className="flex justify-between text-[11px] font-bold text-white/40">
                                    <span>INSCRIPCIÓN + CAMISETA</span>
                                    <span>{formatCurrency(additionalDisplay || 0)}</span>
                                </div>
                            )}
                            <div className="border-t border-white/10 pt-1.5 flex justify-between text-[12px] font-black text-yellow-500 uppercase tracking-tight">
                                <span>TOTAL ACORDADO</span>
                                <span>{formatCurrency(totalAmount || 0)}</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-4">
                        <button
                            onClick={() => setShowReceipt(!showReceipt)}
                            className="px-6 py-2 bg-white/5 border border-white/10 rounded-xl text-white font-black uppercase tracking-widest hover:bg-white/10 transition-all text-[11px]"
                        >
                            {showReceipt ? 'Ocultar Resumen' : 'Ver Comprobante'}
                        </button>
                        <button
                            onClick={handlePrint}
                            className="px-6 py-2 bg-purple-500 text-white border border-purple-600 rounded-xl font-black uppercase tracking-widest hover:bg-purple-600 transition-all text-[11px] flex items-center gap-2 shadow-lg shadow-purple-500/20"
                        >
                            <span className="text-lg">🖨️</span> IMPRIMIR DOCUMENTO OFICIAL
                        </button>
                        <button
                            onClick={handleSeal}
                            disabled={isSealing || isPending || (isFullCash && remainingBalance > 0)}
                            className="px-8 py-3 bg-primary text-black border border-primary rounded-2xl font-black uppercase tracking-widest hover:bg-primary/90 transition-all flex items-center gap-3 active:scale-95 disabled:opacity-50"
                        >
                            {isSealing ? (
                                <>
                                    <span className="animate-spin text-xl leading-none">⚙️</span> Procesando...
                                </>
                            ) : (
                                <>
                                    <span>🏦</span> {paymentPlan?.status === 'pending' || !paymentPlan ? 'SELLAR ACUERDO' : 'ACTUALIZAR ACUERDO'}
                                </>
                            )}
                        </button>
                    </div>

                    {/* LÓGICA DE AISLAMIENTO NUCLEAR PARA IMPRESIÓN */}
                    <style dangerouslySetInnerHTML={{
                        __html: `
                        @media print {
                            /* Ocultar absolutamente todo en el body */
                            body > *:not(#print-portal) { 
                                display: none !important; 
                                height: 0 !important;
                                padding: 0 !important;
                                margin: 0 !important;
                                overflow: hidden !important;
                            }
                            
                            /* Mostrar solo el portal en la raíz */
                            #print-portal { 
                                display: block !important;
                                position: absolute !important; 
                                left: 0 !important; 
                                top: 0 !important; 
                                width: 215.9mm !important; /* Ancho real Carta */
                                min-height: 279.4mm !important;
                                margin: 0 !important;
                                padding: 15mm 15mm 15mm 25mm !important; /* Gutter izquierdo para legajado */
                                background: #FFFFFF !important;
                                color: #000000 !important;
                                visibility: visible !important;
                                z-index: 9999999 !important;
                                box-sizing: border-box !important;
                                overflow: visible !important;
                            }

                            #print-portal .printable-content {
                                max-width: 175mm !important;
                                margin: 0 !important;
                                box-sizing: border-box !important;
                            }

                            #print-portal * {
                                visibility: visible !important;
                                color: #000000 !important;
                                -webkit-print-color-adjust: exact !important;
                                print-color-adjust: exact !important;
                                box-sizing: border-box !important;
                            }

                            @page { 
                                size: 215.9mm 279.4mm; /* Carta exacto */
                                margin: 0; 
                            }
                            
                            /* Forzar contrastes */
                            .border-purple-900 { border-color: #581c87 !important; border-width: 2px !important; }
                            .bg-purple-900 { background-color: #581c87 !important; }
                            .text-purple-900 { color: #581c87 !important; }
                        }
                    `}} />

                    {/* VISTA DE ORIGEN (OCULTA, SIRVE COMO TEMPLATE PARA EL PORTAL) */}
                    <div ref={statementRef} className="hidden">
                        <div className="w-[21.59cm] min-h-[27.94cm] mx-auto bg-white text-[#000000] font-sans printable-content">

                            {/* BLOQUE 1: ENCABEZADO INSTITUCIONAL */}
                            <div className="flex justify-between items-start border-b-[3px] border-purple-900 pb-8 mb-8 printable-content">
                                <div className="flex gap-6 items-start">
                                    <img
                                        src={`${window.location.origin}/logos/dyt-logo-light.png`}
                                        alt="DONES Y TALENTOS"
                                        className="h-24 w-auto object-contain mt-1"
                                        style={{ maxWidth: '4.5cm' }}
                                        crossOrigin="anonymous"
                                    />
                                    <div className="space-y-0.5">
                                        <h1 className="text-base font-black text-[#000000] leading-[1] uppercase tracking-tighter">DONES Y TALENTOS</h1>
                                        <p className="text-[14px] font-normal text-gray-800 leading-tight">Escuela de Música y Artes</p>
                                        <div className="pt-2">
                                            <p className="text-[11px] font-black text-purple-900">NIT: 9005606124</p>
                                            <p className="text-[10px] font-bold text-gray-800 uppercase tracking-tighter">Calle 95 #49A-08, Piso 2 • WhatsApp: +57 313 816 1285</p>
                                            <p className="text-[10px] font-bold text-gray-800 uppercase tracking-tighter italic">info@donesytalentos.org • www.donesytalentos.org</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right bg-[#f3e8ff] p-4 rounded-2xl border-2 border-purple-900/20 min-w-[220px]">
                                    <h2 className="text-[10px] font-black text-purple-900 uppercase tracking-widest mb-1">Estado de Cuenta Oficial</h2>
                                    <div className="space-y-0.5">
                                        <p className="text-[13px] font-black text-[#000000]">Folio: Ac-#{paymentPlan?.id?.split('-')[0].toUpperCase()}</p>
                                        <p className="text-[10px] font-bold text-gray-900 uppercase">Emisión: {format(new Date(), 'dd / MM / yyyy')}</p>
                                        <p className="text-[10px] font-bold text-gray-900 uppercase italic">Semestre {enrollment.semester}</p>
                                    </div>
                                </div>
                            </div>

                            {/* BLOQUE 2: INFORMACIÓN DEL ESTUDIANTE Y ACUDIENTE */}
                            <div className="grid grid-cols-2 gap-10 border-b-2 border-purple-100 pb-8 mb-8 printable-content">
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-[10px] font-black text-purple-900 uppercase tracking-[0.2em] block mb-2">Información del Alumno</label>
                                        <p className="text-2xl font-black text-[#000000] uppercase tracking-tighter italic">
                                            {enrollment.student.first_name} {enrollment.student.last_name}
                                        </p>
                                        <p className="text-[12px] font-bold text-gray-900 uppercase mt-1">
                                            Documento: {enrollment.student.document_type || 'ID'} {enrollment.student.document_number}
                                        </p>
                                    </div>
                                    <div className="flex gap-8">
                                        <div>
                                            <p className="text-[9px] font-bold text-gray-400 uppercase">Correo Electrónico</p>
                                            <p className="text-[11px] font-black text-[#000000]">{enrollment.student.email}</p>
                                        </div>
                                        <div>
                                            <p className="text-[9px] font-bold text-gray-400 uppercase">Contacto</p>
                                            <p className="text-[12px] font-black text-[#000000]">{enrollment.student.phone}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-[#faf5ff] p-6 rounded-2xl border border-purple-100">
                                    {Number(enrollment.student.age) < 18 ? (
                                        <div className="space-y-3">
                                            <label className="text-[10px] font-black text-purple-900 uppercase tracking-widest block border-b-2 border-purple-200 pb-2 mb-2">Responsable Financiero / Acudiente</label>
                                            {(() => {
                                                const f = enrollment.student.father_info;
                                                const m = enrollment.student.mother_info;
                                                const a = f?.full_name ? f : (m?.full_name ? m : null);
                                                return a ? (
                                                    <div className="space-y-1">
                                                        <p className="text-[14px] font-black text-[#000000] uppercase italic">{a.full_name}</p>
                                                        <p className="text-[11px] font-bold text-gray-900">Celular: {a.mobile || a.phone}</p>
                                                        <p className="text-[11px] font-bold text-gray-900">Email: {a.email || 'No registrado'}</p>
                                                    </div>
                                                ) : <p className="text-[11px] italic text-gray-500">Información de acudiente por completar</p>;
                                            })()}
                                        </div>
                                    ) : (
                                        <div className="flex items-center justify-center h-full text-center p-4">
                                            <p className="text-[11px] font-black text-purple-900/40 uppercase italic tracking-widest leading-relaxed">
                                                Perfil de Estudiante Adulto<br />
                                                <span className="text-[8px] font-normal not-italic">El alumno asume la responsabilidad total de sus compromisos académicos y financieros</span>
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* BLOQUE 3: TABLA DE CUOTAS (PRECISIÓN CONTABLE) */}
                            <div className="space-y-6 mb-8 printable-content">
                                <div className="flex items-center justify-between mb-2">
                                    <h3 className="text-[12px] font-black uppercase text-purple-900 tracking-widest flex items-center gap-3">
                                        <div className="h-[2px] w-8 bg-purple-900"></div>
                                        Cronograma de Pagos y Liquidación del Semestre
                                    </h3>
                                    <button
                                        onClick={handleReconcile}
                                        disabled={isReconciling}
                                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black uppercase tracking-tighter rounded-lg shadow-lg shadow-emerald-900/20 flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed border border-emerald-400/30"
                                    >
                                        <svg className={`w-3 h-3 ${isReconciling ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                        </svg>
                                        {isReconciling ? 'Sincronizando...' : 'Sincronizar Pagos desde Auditoría'}
                                    </button>
                                </div>

                                <table className="w-full text-left text-[12px] border-collapse" style={{ tableLayout: 'fixed' }}>
                                    <thead>
                                        <tr className="border-y-[2px] border-purple-900 text-[10px] font-black uppercase tracking-widest text-[#000000] bg-gray-50">
                                            <th className="p-4 w-[5%]">#</th>
                                            <th className="p-4 w-[20%]">Vencimiento</th>
                                            <th className="p-4 w-[35%]">Concepto Detallado</th>
                                            <th className="p-4 w-[13%] text-right">Pactado</th>
                                            <th className="p-4 w-[13%] text-right">Pagado</th>
                                            <th className="p-4 w-[14%] text-right">Saldo</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y-2 divide-gray-100">
                                        {installmentsDetails.map((inst, idx) => {
                                            const bal = Math.max(0, inst.amount_due - (inst.amount_paid || 0));
                                            return (
                                                <tr key={idx} className="text-[#000000]">
                                                    <td className="p-4 font-black text-purple-900/50">{idx + 1}</td>
                                                    <td className="p-4 font-bold whitespace-nowrap">{inst.projected_date}</td>
                                                    <td className="p-4 text-[9px] font-bold text-gray-600 uppercase leading-tight truncate">
                                                        {idx === 0 ? 'MATRÍCULA + CARGOS ADMIN.' : `CUOTA DE ENSEÑANZA #${idx + 1}`}
                                                    </td>
                                                    <td className="p-4 text-right font-mono font-bold whitespace-nowrap">{formatCurrency(inst.amount_due)}</td>
                                                    <td className="p-4 text-right font-mono text-emerald-800 font-black whitespace-nowrap">{formatCurrency(inst.amount_paid || 0)}</td>
                                                    <td className="p-4 text-right font-mono font-black whitespace-nowrap">{formatCurrency(bal)}</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            {/* BLOQUE 4: BALANCE CONSOLIDADO Y FIRMAS */}
                            <div className="grid grid-cols-2 gap-12 mt-12 printable-content">
                                <div className="space-y-6">
                                    <div className="p-6 bg-[#f9fafb] rounded-2xl border-2 border-gray-100">
                                        <h4 className="text-[11px] font-black text-purple-900 uppercase tracking-widest mb-2">Cláusula de Compromiso</h4>
                                        <p className="text-[9px] text-gray-900 leading-normal text-justify uppercase font-bold tracking-tight">
                                            El abajo firmante declara conocer y aceptar el reglamento financiero de la institución.
                                            Se compromete a realizar los pagos en las fechas estipuladas.
                                            Este documento oficial certifica su estado de cuenta a la fecha.
                                        </p>
                                    </div>
                                    <div className="grid grid-cols-2 gap-12 pt-24">
                                        <div className="text-center">
                                            <div className="border-t-[1.5px] border-[#000000] pt-4">
                                                <p className="text-[11px] font-black text-[#000000] uppercase">Dones y Talentos</p>
                                                <p className="text-[8px] text-gray-500 uppercase tracking-widest font-bold">Sello de Tesorería / Autorización</p>
                                            </div>
                                        </div>
                                        <div className="text-center">
                                            <div className="border-t-[1.5px] border-[#000000] pt-4">
                                                <p className="text-[11px] font-black text-[#000000] uppercase">Titular / Acudiente</p>
                                                <p className="text-[8px] text-gray-500 uppercase tracking-widest font-bold">Firma de Aceptación de Saldos</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="bg-white text-[#000000] p-8 rounded-3xl border-[3px] border-purple-900 flex flex-col gap-4">
                                        <div className="flex justify-between items-center text-[12px] font-bold">
                                            <span className="uppercase tracking-widest">Valor Total Contrato:</span>
                                            <span className="font-mono">{formatCurrency(totalAmount)}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-[12px] font-bold">
                                            <span className="uppercase tracking-widest">Abonos Realizados:</span>
                                            <span className="font-mono">{formatCurrency(installmentsDetails.reduce((s, i) => s + (i.amount_paid || 0), 0))}</span>
                                        </div>
                                        <div className="h-[2px] bg-purple-100 my-2"></div>
                                        <div className="flex justify-between items-center pt-2">
                                            <span className="text-[14px] font-black uppercase tracking-[0.2em] text-purple-900">Saldo Pendiente a la Fecha:</span>
                                            <span className="text-2xl font-black font-mono text-[#000000]">
                                                {formatCurrency(totalAmount - installmentsDetails.reduce((s, i) => s + (i.amount_paid || 0), 0))}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="pt-8 text-right">
                                        <p className="text-[8px] text-gray-400 font-mono italic uppercase">
                                            Registro de Auditoría Digital: {paymentPlan?.id?.toUpperCase() || 'S/N'}<br />
                                            Generado por Sistema de Gestión SIA D&T - Versión 2026.1
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {showReceipt && (
                        <div className="mt-8 p-8 bg-black/70 backdrop-blur-2xl border-2 border-primary/20 rounded-[2rem] shadow-2xl animate-in zoom-in-95 fade-in duration-500">
                            <div className="max-w-md mx-auto space-y-6">
                                <div className="text-center space-y-2">
                                    <div className="w-16 h-1 bg-primary mx-auto rounded-full mb-4" />
                                    <h5 className="text-2xl font-black tracking-tighter text-white uppercase italic">Resumen de Acuerdo</h5>
                                    <p className="text-[10px] font-mono text-white/40 uppercase tracking-[0.2em]">{enrollment.semester}</p>
                                </div>
                                <div className="space-y-4 bg-black/40 p-6 rounded-2xl border border-white/5">
                                    <div className="flex justify-between border-b border-white/5 pb-2">
                                        <span className="text-white/40 uppercase text-[9px] font-bold tracking-widest">Estudiante</span>
                                        <span className="text-white text-[11px] font-black">{enrollment.student.first_name} {enrollment.student.last_name}</span>
                                    </div>
                                    <div className="space-y-1 py-1">
                                        <div className="flex justify-between text-[10px] text-white/40 font-bold border-b border-white/5 pb-1 mb-1">
                                            <span>CONCEPTO</span>
                                            <span>VALOR</span>
                                        </div>
                                        {enrollment.programs.map((p: any, pi: number) => {
                                            const key = programSelection[p.id] || normalizeProgramKey(p.program_name || '');
                                            const price = programPrices[key]?.cash || 0;
                                            return (
                                                <div key={pi} className="flex justify-between text-[10px]">
                                                    <span className="text-white/60">Programa: {p.program_name}</span>
                                                    <span className="text-white font-mono">{formatCurrency(price)}</span>
                                                </div>
                                            );
                                        })}
                                        {scholarshipAmount > 0 && (
                                            <div className="flex justify-between text-[10px] text-emerald-400 font-bold">
                                                <span>Beca / Beneficio Social</span>
                                                <span className="font-mono">-{formatCurrency(scholarshipAmount)}</span>
                                            </div>
                                        )}
                                        {enrollmentFeeValue > 0 && (
                                            <div className="flex justify-between text-[10px] text-white/40">
                                                <span>Inscripción</span>
                                                <span className="font-mono">{formatCurrency(enrollmentFeeValue)}</span>
                                            </div>
                                        )}
                                        {uniformFeeValue > 0 && (
                                            <div className="flex justify-between text-[10px] text-white/40">
                                                <span>Camiseta</span>
                                                <span className="font-mono">{formatCurrency(uniformFeeValue)}</span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex justify-between border-t border-white/10 pt-2 items-center">
                                        <div className="flex flex-col">
                                            <span className="text-white/40 uppercase text-[9px] font-bold tracking-widest">Total Plan</span>
                                            <span className="text-[7px] text-primary/40 font-black uppercase tracking-tighter">Liquidación Final {enrollment.semester}</span>
                                        </div>
                                        <span className="text-primary text-[16px] font-black">{formatCurrency(totalAmount)}</span>
                                    </div>
                                    <div className="space-y-3 pt-2">
                                        <p className="text-[9px] font-black text-white/20 uppercase tracking-widest">Cronograma Seleccionado</p>
                                        <div className="space-y-2">
                                            {installmentsDetails.map((inst, i) => (
                                                <div key={i} className="flex justify-between items-center bg-black/20 p-2 rounded-lg">
                                                    <div className="flex flex-col">
                                                        <span className="text-white font-bold text-[10px]">Pago #{i + 1}</span>
                                                        <span className="text-white/40 text-[9px]">{inst.projected_date}</span>
                                                    </div>
                                                    <div className="text-right">
                                                        <span className="text-white font-mono text-[11px] block">{formatCurrency(inst.amount_due)}</span>
                                                        <span className={`text-[8px] font-bold uppercase ${inst.amount_paid >= inst.amount_due ? 'text-green-400' : 'text-yellow-500'}`}>
                                                            {inst.amount_paid >= inst.amount_due ? 'PAGADO' : 'PENDIENTE'}
                                                        </span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                                <p className="text-center text-[8px] text-white/20 uppercase tracking-widest leading-relaxed">
                                    Este documento es un resumen informativo del acuerdo de pago pactado.
                                    Validez sujeta a los registros oficiales de tesoreria.
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </GlassCard>
        </div>
    );
}
