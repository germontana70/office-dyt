'use client';

import { useState } from 'react';
import { StudentPicker } from './StudentPicker';
import { GlobalCostsSection } from './GlobalCostsSection';

interface EnrollmentFormProps {
    students: any[];
    globalSettings: any;
    instruments: any[];
    programs: any[];
    currentSemester: string;
}

export function EnrollmentForm({ globalSettings, currentSemester, students, instruments, programs }: EnrollmentFormProps) {
    const [selectedStudent, setSelectedStudent] = useState<any>(null);
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

    const formatCurrency = (val: number) => val.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });

    const totalGlobal = (formValues.enrollment_fee_enabled ? (globalSettings?.enrollment_fee || 0) : 0) + 
                        (formValues.tshirt_quantity * (globalSettings?.tshirt_fee || 0));

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
                                    <span className="text-white font-bold">{formatCurrency(0)}</span>
                                </div>
                                <div className="pt-4 border-t border-white/5 flex justify-between items-end">
                                    <span className="text-sm font-black uppercase tracking-tighter text-white">Total Final</span>
                                    <span className="text-3xl font-black text-primary drop-shadow-[0_0_15px_rgba(var(--primary-rgb),0.3)]">
                                        {formatCurrency(totalGlobal)}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <button 
                            disabled={!selectedStudent}
                            className={`w-full mt-6 py-4 rounded-2xl font-black uppercase tracking-widest transition-all shadow-lg active:scale-95 ${
                                selectedStudent 
                                ? 'bg-primary text-black hover:bg-primary/90 shadow-primary/20' 
                                : 'bg-white/5 text-white/20 cursor-not-allowed border border-white/5'
                            }`}
                        >
                            {selectedStudent ? '🚀 Procesar Matrícula' : 'Falta Estudiante'}
                        </button>
                    </div>
                 </div>
            </div>

            {/* Paso 2: Costos Globales */}
            <GlobalCostsSection 
                settings={globalSettings}
                values={formValues}
                onChange={handleFieldChange}
            />

            {/* PRÓXIMAMENTE: Paso 3 - Programas */}
            <div className="p-8 border-2 border-dashed border-white/5 rounded-[32px] flex flex-col items-center justify-center text-center opacity-40">
                <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
                    <svg className="w-8 h-8 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                </div>
                <h4 className="text-sm font-black uppercase tracking-[0.2em]">Programas y Horarios</h4>
                <p className="text-[10px] uppercase font-bold text-white/20 mt-2">Bloqueado hasta completar pasos anteriores</p>
            </div>
        </div>
    );
}


