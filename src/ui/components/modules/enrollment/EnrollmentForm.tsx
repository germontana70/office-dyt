'use client';

import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { EnrollmentSchema, type EnrollmentFormData } from '@/core/schemas/enrollment';
import { Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';

// Acordeon Glassmórfico Componente
function ProgramAccordion({
    index,
    control,
    register,
    remove,
    errors,
}: {
    index: number;
    control: any;
    register: any;
    remove: () => void;
    errors: any;
}) {
    const [isOpen, setIsOpen] = useState(index === 0);

    // Sub-Field Arrays for nested arrays inside programs
    const { fields: schedules, append: appendSchedule, remove: removeSchedule } = useFieldArray({
        control,
        name: `programs.${index}.schedules`,
    });

    const { fields: payments, append: appendPayment, remove: removePayment } = useFieldArray({
        control,
        name: `programs.${index}.payments_made`,
    });

    return (
        <div className="mb-4 rounded-xl border border-white/10 bg-black/30 backdrop-blur-md overflow-hidden transition-all duration-300">
            <div
                className="flex justify-between items-center p-4 cursor-pointer hover:bg-white/5"
                onClick={() => setIsOpen(!isOpen)}
            >
                <h3 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-500">
                    Programa {index + 1}
                </h3>
                <div className="flex items-center gap-4">
                    <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); remove(); }}
                        className="text-red-400 hover:text-red-300 hover:bg-red-500/10 p-2 rounded-full transition"
                    >
                        <Trash2 size={18} />
                    </button>
                    {isOpen ? <ChevronUp className="text-white/50" /> : <ChevronDown className="text-white/50" />}
                </div>
            </div>

            {isOpen && (
                <div className="p-6 border-t border-white/10 space-y-6">
                    {/* Seccion 1: Config Académica */}
                    <div className="space-y-4">
                        <h4 className="text-sm uppercase tracking-widest text-primary/70 font-semibold border-b border-white/5 pb-2">1. Configuración Académica</h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-xs text-white/50 uppercase ml-2 mb-1">Programa</label>
                                <input
                                    type="text"
                                    {...register(`programs.${index}.name`)}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors"
                                    placeholder="Ej: Semestre Personalizado"
                                />
                                {errors?.programs?.[index]?.name && <span className="text-red-400 text-xs ml-2 mt-1 block">{errors.programs[index].name.message}</span>}
                            </div>
                            <div>
                                <label className="block text-xs text-white/50 uppercase ml-2 mb-1">Instrumento</label>
                                <input
                                    type="text"
                                    {...register(`programs.${index}.instrument`)}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors"
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-white/50 uppercase ml-2 mb-1">Docente Asignado</label>
                                <input
                                    type="text"
                                    {...register(`programs.${index}.teacher_assigned`)}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs text-white/50 uppercase ml-2 mb-1">Fecha de Inicio (YYYY-MM-DD)</label>
                                <input
                                    type="date"
                                    {...register(`programs.${index}.start_date`)}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors [&::-webkit-calendar-picker-indicator]:filter [&::-webkit-calendar-picker-indicator]:invert"
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-white/50 uppercase ml-2 mb-1">Observaciones</label>
                                <input
                                    type="text"
                                    {...register(`programs.${index}.observations`)}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Seccion 2: Horarios */}
                    <div className="space-y-4">
                        <div className="flex justify-between items-center border-b border-white/5 pb-2">
                            <h4 className="text-sm uppercase tracking-widest text-primary/70 font-semibold">2. Horarios de Clase</h4>
                            <button type="button" onClick={() => appendSchedule({ day: '', time: '' })} className="text-xs text-primary font-bold hover:text-white transition">
                                + Añadir Horario
                            </button>
                        </div>
                        {schedules.map((sch, sIdx) => (
                            <div key={sch.id} className="flex gap-4 items-center bg-white/5 p-3 rounded-xl border border-white/10">
                                <div className="flex-1">
                                    <input type="text" placeholder="Día (ej. Lunes)" {...register(`programs.${index}.schedules.${sIdx}.day`)} className="w-full bg-transparent border-none focus:outline-none text-white text-sm" />
                                </div>
                                <div className="flex-1 border-l border-white/10 pl-4">
                                    <input type="text" placeholder="Hora (ej. 3:00 PM)" {...register(`programs.${index}.schedules.${sIdx}.time`)} className="w-full bg-transparent border-none focus:outline-none text-white text-sm font-mono" />
                                </div>
                                <button type="button" onClick={() => removeSchedule(sIdx)} className="text-red-400 hover:text-red-300 transition">
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        ))}
                    </div>

                    {/* Seccion 3: Gestión Financiera */}
                    <div className="space-y-4">
                        <div className="flex justify-between items-center border-b border-white/5 pb-2">
                            <h4 className="text-sm uppercase tracking-widest text-primary/70 font-semibold">3. Gestión Financiera</h4>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-xs text-white/50 uppercase ml-2 mb-1">Método de Pago</label>
                                <select {...register(`programs.${index}.payment_method`)} className="w-full bg-[#1a1c24] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors">
                                    <option value="Contado">Contado</option>
                                    <option value="6 cuotas">6 cuotas</option>
                                    <option value="5 cuotas">5 cuotas</option>
                                    <option value="4 cuotas">4 cuotas</option>
                                    <option value="3 cuotas">3 cuotas</option>
                                    <option value="2 cuotas">2 cuotas</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs text-white/50 uppercase ml-2 mb-1">Valor Semestre (Tuition)</label>
                                <input
                                    type="number"
                                    {...register(`programs.${index}.tuition_value`)}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white font-mono focus:outline-none focus:border-primary transition-colors"
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-white/50 uppercase ml-2 mb-1">Descuento (%)</label>
                                <input
                                    type="number" step="0.1"
                                    {...register(`programs.${index}.discount_percentage`)}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white font-mono focus:outline-none focus:border-primary transition-colors"
                                />
                            </div>
                        </div>

                        {/* Sub-array de Pagos Realizados dentro del Programa */}
                        <div className="mt-4 bg-black/20 p-4 rounded-xl border border-white/5">
                            <div className="flex justify-between items-center mb-4">
                                <span className="text-xs uppercase tracking-widest text-white/60 font-semibold">Pagos Registrados (Programa)</span>
                                <button type="button" onClick={() => appendPayment({ date: '', amount: 0, method: 'Transferencia', entity: '', reference: '', observations: '' })} className="text-xs bg-green-500/20 text-green-400 px-3 py-1 rounded-full hover:bg-green-500/30 transition">
                                    + Registrar Pago
                                </button>
                            </div>

                            <div className="space-y-3">
                                {payments.map((pay, pIdx) => (
                                    <div key={pay.id} className="grid grid-cols-[1fr_1fr_1fr_2fr_auto] gap-3 items-center bg-white/5 p-3 rounded-lg border border-white/5">
                                        <input type="date" {...register(`programs.${index}.payments_made.${pIdx}.date`)} className="bg-transparent text-sm text-white focus:outline-none font-mono [&::-webkit-calendar-picker-indicator]:filter [&::-webkit-calendar-picker-indicator]:invert" />
                                        <input type="number" placeholder="Monto $" {...register(`programs.${index}.payments_made.${pIdx}.amount`)} className="bg-transparent text-sm text-white font-mono focus:outline-none" />
                                        <select {...register(`programs.${index}.payments_made.${pIdx}.method`)} className="bg-[#1a1c24] text-sm text-white border border-white/10 rounded p-1 focus:outline-none">
                                            <option value="Transferencia">Transfer</option>
                                            <option value="Efectivo">Efectivo</option>
                                            <option value="Datáfono">Datáfono</option>
                                        </select>
                                        <input type="text" placeholder="Ref / Entidad" {...register(`programs.${index}.payments_made.${pIdx}.reference`)} className="bg-transparent text-sm text-white focus:outline-none" />
                                        <button type="button" onClick={() => removePayment(pIdx)} className="text-red-400 hover:text-red-300">
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                ))}
                                {payments.length === 0 && <p className="text-xs text-white/30 italic text-center py-2">No hay pagos registrados para este programa.</p>}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default function EnrollmentForm({ initialData }: { initialData?: Partial<EnrollmentFormData> }) {
    const {
        register,
        control,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<EnrollmentFormData>({
        resolver: zodResolver(EnrollmentSchema) as any,
        defaultValues: initialData || {
            programs: [
                {
                    name: 'Semestre Personalizado',
                    instrument: 'Piano',
                    tuition_value: 0,
                    payment_method: 'Contado',
                    discount_percentage: 0,
                    schedules: [],
                    payments_made: [],
                    start_date: ''
                }
            ]
        }
    });

    const { fields: programs, append: appendProgram, remove: removeProgram } = useFieldArray({
        control,
        name: 'programs',
    });

    const onSubmit = async (data: EnrollmentFormData) => {
        console.log("Datos a upsert:", JSON.stringify(data, null, 2));
        alert('Formulario válido. Imprimiendo payload en consola (ver F12). El Upsert real se implementará luego.');
    };

    return (
        <div className="max-w-6xl mx-auto py-8">
            {/* Header Glassmorphism */}
            <div className="glass p-8 rounded-[24px] mb-8 border border-white/10 bg-black/40 backdrop-blur-xl">
                <h1 className="text-4xl md:text-5xl font-bold font-outfit bg-clip-text text-transparent bg-gradient-to-r from-white to-primary">
                    Control <span className="text-white">Matrículas</span>
                </h1>
                <p className="text-muted-foreground mt-2 tracking-widest text-sm font-semibold uppercase">
                    Motor de Soporte JSONB — {programs.length} Programas Activos
                </p>
            </div>

            <form onSubmit={handleSubmit(onSubmit as any)} className="space-y-8">

                {/* DATOS GLOBALES DEL ESTUDIANTE */}
                <div className="glass p-8 rounded-[24px] border border-white/10 bg-black/40 backdrop-blur-xl">
                    <h2 className="text-2xl font-bold text-white mb-6 border-b border-white/10 pb-4 flex items-center gap-3">
                        <span className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center text-primary text-sm">01</span>
                        Información Global Estudiante
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-xs tracking-widest text-white/50 uppercase ml-2 mb-2">Nombres</label>
                            <input
                                {...register('first_name')}
                                placeholder="Ej. Juan Carlos"
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-4 text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all shadow-inner"
                            />
                            {errors.first_name && <p className="text-red-400 text-xs ml-2 mt-1">{errors.first_name.message}</p>}
                        </div>
                        <div>
                            <label className="block text-xs tracking-widest text-white/50 uppercase ml-2 mb-2">Apellidos</label>
                            <input
                                {...register('last_name')}
                                placeholder="Ej. Pérez Gómez"
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-4 text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all shadow-inner"
                            />
                            {errors.last_name && <p className="text-red-400 text-xs ml-2 mt-1">{errors.last_name.message}</p>}
                        </div>
                        <div>
                            <label className="block text-xs tracking-widest text-white/50 uppercase ml-2 mb-2">Tipo de Documento</label>
                            <select
                                {...register('document_type')}
                                className="w-full bg-[#1a1c24] border border-white/10 rounded-xl px-4 py-4 text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all shadow-inner"
                            >
                                <option value="Registro Civil">Registro Civil</option>
                                <option value="Tarjeta de Identidad">Tarjeta de Identidad</option>
                                <option value="Cédula de Ciudadanía">Cédula de Ciudadanía</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs tracking-widest text-white/50 uppercase ml-2 mb-2">Número de Documento</label>
                            <input
                                {...register('document_number')}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-4 text-white font-mono focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all shadow-inner"
                            />
                            {errors.document_number && <p className="text-red-400 text-xs ml-2 mt-1">{errors.document_number.message}</p>}
                        </div>
                    </div>
                </div>

                {/* COSTOS GLOBALES */}
                <div className="glass p-8 rounded-[24px] border border-white/10 bg-black/40 backdrop-blur-xl">
                    <h2 className="text-2xl font-bold text-white mb-6 border-b border-white/10 pb-4 flex items-center gap-3">
                        <span className="w-8 h-8 rounded-lg bg-pink-500/20 flex items-center justify-center text-pink-400 text-sm">02</span>
                        Costos Globales Extra
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                            <label className="block text-xs tracking-widest text-white/50 uppercase ml-2 mb-2">Valor Inscripción</label>
                            <input
                                type="number"
                                {...register('inscription_value')}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-4 text-white font-mono focus:outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500 transition-all shadow-inner"
                            />
                        </div>
                        <div>
                            <label className="block text-xs tracking-widest text-white/50 uppercase ml-2 mb-2">Valor Camiseta</label>
                            <input
                                type="number"
                                {...register('shirt_value')}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-4 text-white font-mono focus:outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500 transition-all shadow-inner"
                            />
                        </div>
                        <div>
                            <label className="block text-xs tracking-widest text-white/50 uppercase ml-2 mb-2">Talla Camiseta</label>
                            <input
                                type="text"
                                {...register('shirt_size')}
                                placeholder="Ej. S, M, L, XL"
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-4 text-white focus:outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500 transition-all shadow-inner"
                            />
                        </div>
                    </div>
                    <div className="mt-6">
                        <label className="block text-xs tracking-widest text-white/50 uppercase ml-2 mb-2">Anotaciones Financieras Globales</label>
                        <textarea
                            {...register('financial_notes')}
                            rows={3}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-4 text-white focus:outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500 transition-all shadow-inner resize-none"
                        />
                    </div>
                </div>

                {/* NÚCLEO: ARRAY DE PROGRAMAS */}
                <div className="space-y-4">
                    <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-3">
                        <span className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-400 text-sm">03</span>
                        Programas Academicos ({programs.length}/8)
                    </h2>
                    <p className="text-muted-foreground text-sm mb-6 max-w-2xl">
                        Agregue múltiples programas debajo. Toda esta configuración será convertida y asegurada dentro de la columna JSONB que el sistema de Python lee iterativamente.
                    </p>

                    {programs.map((field, index) => (
                        <ProgramAccordion
                            key={field.id}
                            index={index}
                            control={control}
                            register={register}
                            errors={errors}
                            remove={() => removeProgram(index)}
                        />
                    ))}

                    {programs.length < 8 && (
                        <button
                            type="button"
                            onClick={() => appendProgram({ name: '', instrument: '', tuition_value: 0, payment_method: 'Contado', discount_percentage: 0, schedules: [], payments_made: [], start_date: '' })}
                            className="mt-4 flex items-center justify-center gap-2 w-full py-4 rounded-xl border-2 border-dashed border-white/20 text-white/50 hover:text-white hover:border-primary hover:bg-primary/10 transition-all font-bold tracking-widest uppercase text-sm"
                        >
                            <Plus size={18} /> Añadir Programa Adicional
                        </button>
                    )}
                </div>

                {/* GUARDAR */}
                <div className="pt-8">
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full py-5 rounded-2xl bg-gradient-to-r from-primary to-pink-500 text-white font-bold text-lg uppercase tracking-widest shadow-[0_0_30px_rgba(var(--primary-rgb),0.5)] hover:shadow-[0_0_50px_rgba(var(--primary-rgb),0.8)] transition-all hover:-translate-y-1 disabled:opacity-50"
                    >
                        {isSubmitting ? 'Validando Estructuras...' : '💾 ENSAMBLAR Y GUARDAR MATRÍCULA'}
                    </button>
                    <p className="text-center text-xs text-white/40 mt-4 uppercase tracking-widest">
                        La preservación y fusión de datos viejos y pagos se ejecutará a nivel de Servidor usando la ID de Estudiante.
                    </p>
                </div>

            </form>
        </div>
    );
}
