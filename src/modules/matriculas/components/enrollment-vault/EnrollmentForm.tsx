'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { StudentPicker } from './StudentPicker';
import { GlobalCostsSection } from './GlobalCostsSection';
import { ProgramPicker } from './ProgramPicker';
import { StudentVitalsPanel } from './StudentVitalsPanel';
import { saveNewEnrollment } from '@/app/actions/enrollment';
import type { HybridSearchResult } from '@/app/actions/students';

interface EnrollmentFormProps {
    students: any[];
    globalSettings: any;
    instruments: any[];
    programs: any[];
    currentSemester: string;
}

export function EnrollmentForm({ globalSettings, currentSemester, students, instruments, programs }: EnrollmentFormProps) {
    const router = useRouter();
    const [selectedStudent, setSelectedStudent] = useState<HybridSearchResult | null>(null);
    const [selectedPrograms, setSelectedPrograms] = useState<Array<{ id: string; name: string }>>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submissionError, setSubmissionError] = useState<string | null>(null);

    const [formValues, setFormValues] = useState({
        enrollment_fee_enabled: true,
        tshirt_quantity: 0,
        tshirt_size: 'N/A',
        global_observations: '',
        payment_date: new Date().toISOString().split('T')[0],
        payment_method: 'Efectivo',
        bank_entity: '',
        reference_number: ''
    });

    const handleFieldChange = (field: string, value: any) => {
        setFormValues(prev => ({ ...prev, [field]: value }));
    };

    const formatCurrency = (val: number) => {
        const n = Math.round(Number(val) || 0);
        return '$ ' + n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    };

    const totalGlobal = (formValues.enrollment_fee_enabled ? (globalSettings?.enrollment_fee || 0) : 0) + 
                        (formValues.tshirt_quantity * (globalSettings?.tshirt_fee || 0));

    // Función Polimórfica de motor financiero frontend
    const roundup10k = (val: number) => Math.ceil(val / 10000) * 10000;

    const totalPrograms = selectedPrograms.reduce((sum, progSelect) => {
        const progData = programs.find(p => p.id === progSelect.id);
        if (!progData) return sum;
        const cashValue = Number(progData.valor_contado || progData.cash_price || 0);
        const increment = Number(progData.increment_percentage || 0);
        return sum + roundup10k(cashValue * (1 + (increment / 100)));
    }, 0);

    const totalFinal = totalGlobal + totalPrograms;

    const handleSubmit = async () => {
        if (!selectedStudent || selectedPrograms.length === 0) return;
        setIsSubmitting(true);
        setSubmissionError(null);

        const payload = {
            student_id: selectedStudent.id,
            semester: currentSemester,
            enrollment_fee_enabled: formValues.enrollment_fee_enabled,
            tshirt_quantity: formValues.tshirt_quantity,
            tshirt_size: formValues.tshirt_size,
            global_observations: formValues.global_observations,
            payment_method: formValues.payment_method,
            bank_entity: formValues.bank_entity,
            reference_number: formValues.reference_number,
            programs: selectedPrograms
        };

        const res = await saveNewEnrollment(payload);
        if (res.success && res.data) {
             router.push(`/dashboard/matriculas/${selectedStudent.id}/edit`);
        } else {
             setSubmissionError(res.error || 'Error desconocido.');
             setIsSubmitting(false);
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* CABECERA RESUMEN FLOTANTE */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                 {/* Paso 1: Estudiante */}
                 <div className="lg:col-span-2">
                    <StudentPicker 
                        selectedStudent={selectedStudent}
                        onSelect={setSelectedStudent}
                    />
                 </div>

                 {/* Resumen Lateral de Totales */}
                 <div className="lg:col-span-1">
                    <div className="glass p-6 rounded-[24px] border border-white/10 bg-black/60 shadow-2xl h-full flex flex-col justify-between">
                        <div className="space-y-4">
                            <h3 className="text-[10px] font-black uppercase text-primary tracking-widest">Resumen de Matrícula</h3>
                            <div className="space-y-2">
                                <div className="flex justify-between text-xs">
                                    <span className="text-white/40">Costos Globales</span>
                                    <span className="text-white font-bold">{formatCurrency(totalGlobal)}</span>
                                </div>
                                <div className="flex justify-between text-xs">
                                    <span className="text-white/40">Programas</span>
                                    <span className="text-white font-bold">{formatCurrency(totalPrograms)}</span>
                                </div>
                                <div className="pt-4 border-t border-white/5 flex justify-between items-end">
                                    <span className="text-sm font-black uppercase tracking-tighter text-white">Total Final</span>
                                    <span className="text-3xl font-black text-primary drop-shadow-[0_0_15px_rgba(var(--primary-rgb),0.3)]">
                                        {formatCurrency(totalFinal)}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <button 
                            disabled={!selectedStudent || selectedPrograms.length === 0 || isSubmitting}
                            onClick={handleSubmit}
                            className={`w-full mt-6 py-4 rounded-2xl font-black uppercase tracking-widest transition-all shadow-lg active:scale-95 ${
                                selectedStudent && selectedPrograms.length > 0 && !isSubmitting
                                ? 'bg-primary text-black hover:bg-primary/90 shadow-primary/20' 
                                : 'bg-white/5 text-white/20 cursor-not-allowed border border-white/5'
                            }`}
                        >
                            {isSubmitting ? 'Procesando...' : selectedStudent && selectedPrograms.length > 0 ? '🚀 Procesar Matrícula' : 'Faltan Campos'}
                        </button>
                    </div>
                 </div>
            </div>

            {/* Datos Vitales del Estudiante (se muestra cuando hay estudiante seleccionado) */}
            {selectedStudent && (
                <StudentVitalsPanel student={selectedStudent as any} />
            )}

            {/* Paso 2: Costos Globales */}
            <GlobalCostsSection 
                settings={globalSettings}
                values={formValues}
                onChange={handleFieldChange}
            />

            {/* Paso 3: Programas Académicos */}
            <ProgramPicker 
                programs={programs}
                selectedPrograms={selectedPrograms}
                onChange={setSelectedPrograms}
            />

            {/* Error Mensaje Temporal */}
            {submissionError && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm font-bold text-center animate-pulse">
                    ⚠️ {submissionError}
                </div>
            )}
        </div>
    );
}


