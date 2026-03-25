"use client";

import { useState, ReactNode } from 'react';
import { StudentSearchSelect } from './StudentSearchSelect';
import { EnrollmentAuditCard } from './EnrollmentAuditCard';
import { getEnrollmentAudit } from '@/app/actions/migration';
import { CurrentStudent } from '../models/student.schema';
import { SequentialNavigator } from './SequentialNavigator';
import { GlassCard } from '@/ui/components/modules/layout/GlassCard';
import {
    User, GraduationCap, Users, HeartPulse,
    Smartphone, Mail, MapPin, CalendarDays,
    Activity, FileText, Hash, Phone,
    Droplets, ShieldPlus, ChevronDown,
    AlertCircle, UserCheck, Save, UserPlus, Search, Loader2, X,
    RotateCw
} from 'lucide-react';
import { searchStudentsHybrid, reintegrateStudentFromHistory, HybridSearchResult } from '@/app/actions/reintegrate';
import { useRouter } from 'next/navigation';
import { WithdrawStudentModal } from './WithdrawStudentModal';
import { ReactivateStudentButton } from './ReactivateStudentButton';

interface MatriculasClientViewProps {
    students: CurrentStudent[];
    semester: string;
}

type TabId = 'academico' | 'familiar' | 'medica';

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS (copied from StudentVitalsPanel logic to be self-contained)
// ─────────────────────────────────────────────────────────────────────────────

function formatIsoDate(dateString?: string | null): string {
    if (!dateString) return '';
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return dateString;
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
    } catch {
        return dateString;
    }
}

function calcAge(dateString?: string | null): number | null {
    if (!dateString) return null;
    const birth = new Date(dateString);
    if (isNaN(birth.getTime())) return null;
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return Math.max(1, age);
}

function InfoField({
    label,
    value,
    icon,
}: {
    label: string;
    value?: string | number | null;
    icon?: ReactNode;
}) {
    const hasValue = value !== null && value !== undefined && value !== '';
    return (
        <div className="flex flex-col gap-1 p-3 rounded-xl bg-white/[0.03] border border-white/5 hover:border-white/10 transition-colors">
            <div className="flex items-center gap-1.5">
                {icon && <span className="text-white/30">{icon}</span>}
                <span className="text-[9px] font-black uppercase tracking-widest text-white/30">{label}</span>
            </div>
            {hasValue ? (
                <span className="text-sm font-bold text-white/90 break-words leading-snug">{String(value)}</span>
            ) : (
                <span className="text-sm font-semibold text-gray-500 italic">No registrado</span>
            )}
        </div>
    );
}

interface FamilyMember {
    full_name?: string;
    // El campo de teléfono puede venir como 'mobile' o 'phone' (variación SIA 2.0)
    mobile?: string;
    phone?: string;
    email?: string | null;
    document_number?: string;
    document_type?: string;
    landline?: string;
    address?: string;
}

/** Parseo seguro de JSONB: admite string o objeto ya parseado */
function safeParseJsonb(data: any): FamilyMember | null {
    if (!data) return null;
    try {
        const obj = typeof data === 'string' ? JSON.parse(data) : data;
        if (typeof obj !== 'object' || Array.isArray(obj)) return null;
        return obj as FamilyMember;
    } catch {
        return null;
    }
}

function FamilyCard({ title, rawData, accent }: { title: string; rawData?: any; accent: 'violet' | 'cyan' | 'pink' }) {
    const member = safeParseJsonb(rawData);
    // Fallback: el teléfono puede ser 'mobile' o 'phone' dependiendo del registro SIA
    const phone = member?.mobile || member?.phone;

    if (!member || (!member.full_name && !member.document_number && !phone)) return null;

    const colors = {
        violet: { border: 'border-violet-500/30', text: 'text-violet-400', bg: 'bg-violet-500/5' },
        cyan:   { border: 'border-cyan-500/30',   text: 'text-cyan-400',   bg: 'bg-cyan-500/5'   },
        pink:   { border: 'border-pink-500/30',   text: 'text-pink-400',   bg: 'bg-pink-500/5'   },
    }[accent];

    return (
        <details className={`group border ${colors.border} rounded-2xl overflow-hidden ${colors.bg} hover:brightness-125 transition-all`}>
            <summary className="flex items-center justify-between p-4 cursor-pointer list-none">
                <div className="flex items-center gap-2">
                    <User className={`w-4 h-4 ${colors.text}`} />
                    <span className={`text-[10px] font-black uppercase tracking-widest ${colors.text}`}>{title}</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white/60 truncate max-w-[140px] hidden group-open:hidden sm:block">
                        {member.full_name || '—'}
                    </span>
                    <ChevronDown className="w-4 h-4 text-white/30 transition-transform group-open:rotate-180" />
                </div>
            </summary>
            <div className={`px-4 pb-4 border-t ${colors.border} grid grid-cols-1 sm:grid-cols-2 gap-2 pt-4`}>
                <InfoField label="Nombre completo" value={member.full_name} icon={<FileText className="w-3 h-3" />} />
                <InfoField label="Tipo Doc." value={member.document_type} icon={<Hash className="w-3 h-3" />} />
                <InfoField label="Número Doc." value={member.document_number} icon={<Hash className="w-3 h-3" />} />
                <InfoField label="Móvil / Teléfono" value={phone} icon={<Smartphone className="w-3 h-3" />} />
                <InfoField label="Fijo" value={member.landline} icon={<Phone className="w-3 h-3" />} />
                <InfoField label="Email" value={member.email} icon={<Mail className="w-3 h-3" />} />
                <InfoField label="Dirección" value={member.address} icon={<MapPin className="w-3 h-3" />} />
            </div>
        </details>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB PANELS
// ─────────────────────────────────────────────────────────────────────────────

function TabFamiliarPanel({ student }: { student: CurrentStudent & { [key: string]: any } }) {
    return (
        <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* Datos Personales */}
            <GlassCard className="p-6 border-violet-500/10 hover:border-violet-500/20 transition-colors">
                <div className="flex items-center gap-2 mb-5">
                    <User className="w-4 h-4 text-violet-400" />
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-violet-400">Datos Personales & Contacto</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    <InfoField label="Fecha de Nacimiento" value={formatIsoDate(student.birth_date)} icon={<CalendarDays className="w-3 h-3" />} />
                    <InfoField label="Género" value={student.gender} icon={<User className="w-3 h-3" />} />
                    <InfoField label="Documento" value={`${student.document_type || ''} ${student.document_number || ''}`.trim()} icon={<Hash className="w-3 h-3" />} />
                    <InfoField label="Teléfono" value={student.phone} icon={<Smartphone className="w-3 h-3" />} />
                    <InfoField label="Email" value={student.email} icon={<Mail className="w-3 h-3" />} />
                    <InfoField label="Dirección" value={student.address} icon={<MapPin className="w-3 h-3" />} />
                    {student.neighborhood && <InfoField label="Barrio" value={student.neighborhood} icon={<MapPin className="w-3 h-3" />} />}
                    {student.current_school && <InfoField label="Colegio" value={student.current_school} icon={<GraduationCap className="w-3 h-3" />} />}
                    {student.current_grade && <InfoField label="Grado" value={student.current_grade} icon={<Activity className="w-3 h-3" />} />}
                </div>
            </GlassCard>

            {/* Acudientes — rawData pasa el JSONB crudo para parseo seguro interno */}
            {(student.father_info || student.mother_info || student.guardian_info_detailed) && (
                <GlassCard className="p-6 border-pink-500/10 hover:border-pink-500/20 transition-colors">
                    <div className="flex items-center gap-2 mb-5">
                        <Users className="w-4 h-4 text-pink-400" />
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-pink-400">Acudientes Registrados</h4>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                        <FamilyCard title="Padre" rawData={student.father_info} accent="violet" />
                        <FamilyCard title="Madre" rawData={student.mother_info} accent="pink" />
                        <FamilyCard title="Acudiente" rawData={student.guardian_info_detailed} accent="cyan" />
                    </div>
                </GlassCard>
            )}
        </div>
    );
}

function TabMedicaPanel({ student }: { student: CurrentStudent & { [key: string]: any } }) {
    // health_insurance es un STRING plano — NO parsear como JSON
    const eps = typeof student.health_insurance === 'string' ? student.health_insurance : null;

    return (
        <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300">

            {/* ── Bloque Base: Sangre + EPS ── */}
            <GlassCard className="p-6 border-cyan-500/10 hover:border-cyan-500/20 transition-colors">
                <div className="flex items-center gap-2 mb-6">
                    <HeartPulse className="w-4 h-4 text-cyan-400" />
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-cyan-400">Ficha Médica Base</h4>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
                    {/* Badge Grupo Sanguíneo */}
                    <div className="flex flex-col items-center justify-center gap-2 p-6 bg-cyan-500/5 border border-cyan-500/20 rounded-2xl shadow-inner">
                        <Droplets className="w-5 h-5 text-cyan-400/50" />
                        {student.blood_type ? (
                            <>
                                <p className="text-5xl font-black text-cyan-400 drop-shadow-[0_0_20px_rgba(34,211,238,0.6)] leading-none">
                                    {student.blood_type}
                                </p>
                                {student.rh_factor && (
                                    <span className="text-base font-black text-cyan-300/80">{student.rh_factor}</span>
                                )}
                                <span className="text-[9px] font-black uppercase tracking-widest text-cyan-400/40 mt-1">Grupo Sanguíneo</span>
                            </>
                        ) : (
                            <p className="text-xs font-semibold text-gray-500 italic text-center">No registrado</p>
                        )}
                    </div>

                    {/* EPS + placeholders para datos migrados */}
                    <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <InfoField
                            label="EPS / Medicina Prepagada"
                            value={eps}
                            icon={<ShieldPlus className="w-3 h-3" />}
                        />
                        {/* Espacio reservado para alergias/medicamentos futuros del record */}
                        <InfoField label="Factor RH" value={student.rh_factor} icon={<Droplets className="w-3 h-3" />} />
                    </div>
                </div>
            </GlassCard>

            {/* ── Formulario de Ficha Médica Ampliada ── */}
            <GlassCard className="p-6 border-rose-500/10 hover:border-rose-500/20 transition-colors">
                <div className="flex items-center gap-2 mb-6">
                    <AlertCircle className="w-4 h-4 text-rose-400" />
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-rose-400">Información Médica Ampliada</h4>
                    <span className="ml-auto px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-rose-500/10 border border-rose-500/20 text-rose-400">Editable</span>
                </div>

                <form className="grid grid-cols-1 md:grid-cols-2 gap-4">

                    {/* Textareas — Campo ancho ocupando 2 columnas */}
                    <div className="md:col-span-2 flex flex-col gap-1.5">
                        <label className="text-[9px] font-black uppercase tracking-widest text-white/30">Medicamentos Actuales</label>
                        <textarea
                            rows={3}
                            placeholder="Ej: Ritalín 10mg, Ventolin inhalador..."
                            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white/80 placeholder:text-white/20 focus:border-cyan-500/40 focus:outline-none resize-none transition-colors"
                        />
                    </div>

                    <div className="md:col-span-2 flex flex-col gap-1.5">
                        <label className="text-[9px] font-black uppercase tracking-widest text-white/30">Alergias Documentadas</label>
                        <textarea
                            rows={3}
                            placeholder="Ej: Penicilina, alergia a nueces, látex..."
                            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white/80 placeholder:text-white/20 focus:border-rose-500/40 focus:outline-none resize-none transition-colors"
                        />
                    </div>

                    <div className="md:col-span-2 flex flex-col gap-1.5">
                        <label className="text-[9px] font-black uppercase tracking-widest text-white/30">Condiciones Especiales / Diagnósticos</label>
                        <textarea
                            rows={3}
                            placeholder="Ej: TDAH, asma leve, hipoacusia izquierda..."
                            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white/80 placeholder:text-white/20 focus:border-purple-500/40 focus:outline-none resize-none transition-colors"
                        />
                    </div>

                    {/* Contacto de Emergencia */}
                    <div className="md:col-span-2">
                        <div className="flex items-center gap-2 py-3 border-t border-white/5 mb-3">
                            <UserCheck className="w-3.5 h-3.5 text-amber-400" />
                            <span className="text-[9px] font-black uppercase tracking-widest text-amber-400">Contacto de Emergencia</span>
                        </div>
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <label className="text-[9px] font-black uppercase tracking-widest text-white/30">Nombre Completo</label>
                        <input
                            type="text"
                            placeholder="Nombre del contacto de emergencia"
                            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white/80 placeholder:text-white/20 focus:border-amber-500/40 focus:outline-none transition-colors"
                        />
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <label className="text-[9px] font-black uppercase tracking-widest text-white/30">Teléfono de Emergencia</label>
                        <input
                            type="tel"
                            placeholder="Ej: 315 000 0000"
                            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white/80 placeholder:text-white/20 focus:border-amber-500/40 focus:outline-none transition-colors"
                        />
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <label className="text-[9px] font-black uppercase tracking-widest text-white/30">Parentesco</label>
                        <input
                            type="text"
                            placeholder="Ej: Madre, Tío, Abuelo..."
                            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white/80 placeholder:text-white/20 focus:border-amber-500/40 focus:outline-none transition-colors"
                        />
                    </div>

                    {/* Botón full-width */}
                    <div className="md:col-span-2 pt-2">
                        <button
                            type="button"
                            className="w-full flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl font-black text-sm uppercase tracking-widest text-white bg-gradient-to-r from-cyan-600/80 to-cyan-500/80 hover:from-cyan-500/80 hover:to-cyan-400/80 border border-cyan-500/30 shadow-[0_0_20px_rgba(34,211,238,0.15)] hover:shadow-[0_0_30px_rgba(34,211,238,0.3)] transition-all duration-300 active:scale-[0.98]"
                        >
                            <Save className="w-4 h-4" />
                            Guardar Ficha Médica
                        </button>
                    </div>
                </form>
            </GlassCard>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// REINTEGRATE MODAL
// ─────────────────────────────────────────────────────────────────────────────

function ReintegrateModal({ 
    isOpen, 
    onClose, 
    semester 
}: { 
    isOpen: boolean; 
    onClose: () => void; 
    semester: string;
}) {
    const router = useRouter();
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<HybridSearchResult[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);

    const handleSearch = async (val: string) => {
        setQuery(val);
        if (val.length < 3) {
            setResults([]);
            return;
        }
        setIsSearching(true);
        try {
            const data = await searchStudentsHybrid(val, semester);
            setResults(data);
        } catch (error) {
            console.error('Search error:', error);
        } finally {
            setIsSearching(false);
        }
    };

    const handleReintegrate = async (student: HybridSearchResult) => {
        if (student.source === 'current') {
            alert('Este estudiante ya está activo en el semestre actual.');
            return;
        }

        const confirmed = confirm(`¿Deseas reintegrar a ${student.first_name} ${student.last_name} al semestre ${semester}?`);
        if (!confirmed) return;

        setIsProcessing(true);
        try {
            const res = await reintegrateStudentFromHistory(student.id, semester);
            if (res.success) {
                alert('Estudiante reintegrado exitosamente.');
                router.refresh();
                onClose();
            } else {
                alert(`Error: ${res.error}`);
            }
        } catch (error) {
            console.error('Reintegration error:', error);
            alert('Ocurrió un error inesperado durante el reintegro.');
        } finally {
            setIsProcessing(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6">
            {/* Backdrop */}
            <div 
                className="absolute inset-0 bg-black/80 backdrop-blur-xl animate-in fade-in duration-300" 
                onClick={onClose} 
            />
            
            {/* Modal Content */}
            <GlassCard className="relative w-full max-w-2xl overflow-hidden border-primary/20 shadow-[0_0_50px_rgba(168,85,247,0.15)] animate-in zoom-in-95 fade-in duration-300">
                {/* Header */}
                <div className="p-6 border-b border-white/10 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-accent/10 border border-accent/20 text-accent">
                            <UserPlus className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-sm font-black uppercase tracking-widest text-white">Reintegrar Estudiante</h3>
                            <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Desde el histórico a {semester}</p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose}
                        className="p-2 rounded-lg hover:bg-white/5 text-white/30 hover:text-white/60 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Search Body */}
                <div className="p-6 space-y-6">
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                        <input 
                            autoFocus
                            type="text"
                            placeholder="Buscar por nombre o documento en el histórico..."
                            value={query}
                            onChange={(e) => handleSearch(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 focus:border-accent/40 rounded-xl pl-11 pr-4 py-4 text-sm text-white placeholder:text-white/20 outline-none transition-all"
                        />
                        {isSearching && (
                            <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-accent animate-spin" />
                        )}
                    </div>

                    {/* Results Area */}
                    <div className="max-h-60 overflow-y-auto pr-2 custom-scrollbar space-y-2">
                        {results.length > 0 ? (
                            results.map(student => (
                                <button
                                    key={student.id}
                                    onClick={() => handleReintegrate(student)}
                                    disabled={isProcessing}
                                    className="w-full flex items-center justify-between p-4 rounded-xl bg-white/[0.02] border border-white/5 hover:border-accent/30 hover:bg-accent/5 transition-all text-left group disabled:opacity-50"
                                >
                                    <div className="flex flex-col gap-1 text-left">
                                        <span className="text-xs font-black uppercase tracking-tight text-white group-hover:text-accent transition-colors">
                                            {student.name}
                                        </span>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">DOC: {student.document_number}</span>
                                            <span className="text-[10px] font-bold text-accent/60 uppercase tracking-widest bg-accent/5 px-1.5 py-0.5 rounded border border-accent/10 italic">
                                                Origen: {student.historical_semester || 'Histórico'}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        {student.source === 'historical' ? (
                                            <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest text-accent bg-white/5 border border-white/10 shadow-[0_0_10px_rgba(6,182,212,0.1)]">
                                                HISTÓRICO
                                            </span>
                                        ) : (
                                            <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest text-primary bg-white/5 border border-white/10 opacity-40">
                                                ACTIVO
                                            </span>
                                        )}
                                        <ChevronDown className="w-4 h-4 text-white/20 -rotate-90" />
                                    </div>
                                </button>
                            ))
                        ) : query.length >= 3 && !isSearching ? (
                            <div className="text-center py-8">
                                <p className="text-[10px] font-black uppercase tracking-widest text-white/20">No se encontraron resultados</p>
                            </div>
                        ) : query.length > 0 && query.length < 3 ? (
                            <div className="text-center py-8">
                                <p className="text-[10px] font-black uppercase tracking-widest text-white/20">Escribe al menos 3 caracteres...</p>
                            </div>
                        ) : null}
                    </div>
                </div>

                {/* Loading State Overlay */}
                {isProcessing && (
                    <div className="absolute inset-0 z-10 bg-black/40 backdrop-blur-sm flex flex-col items-center justify-center gap-3">
                        <Loader2 className="w-8 h-8 text-accent animate-spin" />
                        <p className="text-[10px] font-black uppercase tracking-widest text-accent">Procesando Reintegro...</p>
                    </div>
                )}
            </GlassCard>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export function MatriculasClientView({ students, semester }: MatriculasClientViewProps) {
    const [auditData, setAuditData] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [selectedStudent, setSelectedStudent] = useState<CurrentStudent | null>(null);
    const [activeTab, setActiveTab] = useState<TabId>('academico');
    const [isReintegrateModalOpen, setIsReintegrateModalOpen] = useState(false);

    const handleStudentSelect = async (student: CurrentStudent) => {
        setSelectedStudent(student);
        setActiveTab('academico');
        setLoading(true);
        try {
            const data = await getEnrollmentAudit(student.id || '', semester);
            setAuditData(data);
        } catch (error) {
            console.error('Error fetching audit:', error);
        } finally {
            setLoading(false);
        }
    };

    const currentIndex = selectedStudent ? students.findIndex(s => s.id === selectedStudent.id) : -1;

    const handlePrev = () => {
        if (currentIndex > 0) handleStudentSelect(students[currentIndex - 1]);
    };

    const handleNext = () => {
        if (currentIndex >= 0 && currentIndex < students.length - 1) handleStudentSelect(students[currentIndex + 1]);
    };

    // Cast to allow access to JSONB fields not in the strict CurrentStudent type
    const student = selectedStudent as any;

    const age = student ? calcAge(student.birth_date) : null;
    const isMinor = age !== null && age < 18;

    const TABS: { id: TabId; label: string; icon: ReactNode }[] = [
        { id: 'academico', label: 'Auditoría Académica', icon: <GraduationCap className="w-4 h-4" /> },
        { id: 'familiar',  label: 'Ficha Familiar',      icon: <Users         className="w-4 h-4" /> },
        { id: 'medica',    label: 'Ficha Médica',         icon: <HeartPulse    className="w-4 h-4" /> },
    ];

    return (
        <div className="w-full flex flex-col gap-6">
            {/* ── Acciones Rápidas (Transplanted from page.tsx for interactivity) ── */}
            {!selectedStudent && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in slide-in-from-bottom-5 fade-in duration-700 delay-75 fill-mode-both">
                    {/* Tarjeta Reintegrar */}
                    <GlassCard 
                        interactive 
                        onClick={() => setIsReintegrateModalOpen(true)}
                        className="p-5 flex items-center justify-between group transition-all duration-300 border-white/5 hover:border-accent/40 bg-black/40 cursor-pointer"
                    >
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-xl bg-accent/10 text-accent group-hover:bg-accent/20 transition-all">
                                <RotateCw className="w-6 h-6 group-hover:rotate-180 transition-transform duration-500" />
                            </div>
                            <span className="font-bold text-foreground/90 group-hover:text-accent transition-colors uppercase tracking-[0.2em] text-[11px]">Reintegrar Estudiante</span>
                        </div>
                        <span className="text-accent/70 group-hover:translate-x-1 transition-transform">→</span>
                    </GlassCard>

                    {/* Modal Retirar */}
                    <WithdrawStudentModal students={students} />
                </div>
            )}

            {/* ── Buscador ── */}
            <StudentSearchSelect
                students={students}
                onSelect={handleStudentSelect}
                onSearchFocus={() => {
                    setAuditData(null);
                    setSelectedStudent(null);
                }}
            />

            <ReintegrateModal 
                isOpen={isReintegrateModalOpen}
                onClose={() => setIsReintegrateModalOpen(false)}
                semester={semester}
            />

            {/* ── Spinner ── */}
            {loading && (
                <div className="w-full h-40 flex flex-col items-center justify-center gap-4 animate-pulse">
                    <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                    <p className="text-[10px] font-black uppercase tracking-widest text-primary/40">Auditando Bóveda...</p>
                </div>
            )}

            {/* ── Vista Principal (post-selección) ── */}
            {!loading && selectedStudent && (
                <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-top-4 duration-500">

                    {/* ── HERO SECTION ── */}
                    <GlassCard className="p-6 border-primary/20 bg-gradient-to-br from-black/80 via-primary/5 to-black/80">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                            {/* Identidad */}
                            <div className="flex items-center gap-5">
                                {/* Avatar */}
                                <div className="relative shrink-0">
                                    <div className="w-16 h-16 rounded-full bg-primary/20 border-2 border-primary/40 flex items-center justify-center shadow-[0_0_25px_rgba(168,85,247,0.25)]">
                                        <User className="w-8 h-8 text-primary" />
                                    </div>
                                    <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-green-500 border-2 border-black shadow-[0_0_8px_rgba(34,197,94,0.7)]" />
                                </div>

                                {/* Info */}
                                <div className="flex flex-col gap-1.5 min-w-0">
                                    <h2 className="text-xl font-black text-white leading-tight truncate">
                                        {student.first_name} {student.last_name}
                                    </h2>
                                    <p className="text-xs font-bold text-white/40 tracking-widest uppercase truncate">
                                        {student.document_type || 'CC'} {student.document_number || '—'}
                                    </p>
                                    <div className="flex flex-wrap items-center gap-2 mt-1">
                                        {/* Badge Edad */}
                                        {age !== null && (
                                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                                                isMinor
                                                    ? 'bg-orange-500/15 border-orange-500/30 text-orange-400'
                                                    : 'bg-white/5 border-white/10 text-white/60'
                                            }`}>
                                                {age} AÑO{age !== 1 ? 'S' : ''}{isMinor ? ' · MENOR' : ''}
                                            </span>
                                        )}
                                        {/* Badge Estado Matrícula — condicional */}
                                        {selectedStudent.enrollment_status === 'Retirado' ? (
                                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-destructive/15 border border-destructive/30 text-destructive shadow-[0_0_10px_rgba(239,68,68,0.2)]">
                                                RETIRADO · {semester}
                                            </span>
                                        ) : (
                                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-primary/15 border border-primary/30 text-primary shadow-[0_0_10px_rgba(168,85,247,0.2)]">
                                                ACTIVA · {semester}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Navegador Secuencial */}
                            <div className="shrink-0">
                                <SequentialNavigator
                                    currentIndex={currentIndex}
                                    total={students.length}
                                    onPrev={handlePrev}
                                    onNext={handleNext}
                                />
                            </div>
                            {/* Botón de Reactivar — solo visible si el estudiante está retirado */}
                            {selectedStudent.enrollment_status === 'Retirado' && (
                                <div className="mt-3">
                                    <ReactivateStudentButton
                                        studentId={selectedStudent.id!}
                                        studentName={`${student.first_name} ${student.last_name}`}
                                    />
                                </div>
                            )}
                        </div>
                    </GlassCard>

                    {/* ── TAB NAV BAR ── */}
                    <div className="flex gap-1 border-b border-white/10 overflow-x-auto pb-0 scrollbar-none">
                        {TABS.map((tab) => {
                            const isActive = activeTab === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`flex items-center gap-2 px-5 py-3 text-xs font-black uppercase tracking-widest whitespace-nowrap transition-all duration-200 border-b-2 -mb-px ${
                                        isActive
                                            ? 'border-primary text-primary'
                                            : 'border-transparent text-white/30 hover:text-white/60 hover:border-white/20'
                                    }`}
                                >
                                    {tab.icon}
                                    {tab.label}
                                </button>
                            );
                        })}
                    </div>

                    {/* ── TAB CONTENT ── */}
                    <div key={activeTab} className="animate-in fade-in slide-in-from-bottom-2 duration-300 fill-mode-both">
                        {activeTab === 'academico' && (
                            auditData
                                ? <EnrollmentAuditCard enrollment={auditData} />
                                : (
                                    <div className="p-12 border-2 border-dashed border-white/8 rounded-[28px] text-center bg-black/40">
                                        <GraduationCap className="w-8 h-8 text-white/20 mx-auto mb-3" />
                                        <p className="text-xs font-bold uppercase tracking-widest text-white/30">
                                            No hay matrícula registrada en la Bóveda para este alumno
                                        </p>
                                    </div>
                                )
                        )}

                        {activeTab === 'familiar' && (
                            <TabFamiliarPanel student={student} />
                        )}

                        {activeTab === 'medica' && (
                            <TabMedicaPanel student={student} />
                        )}
                    </div>

                </div>
            )}
        </div>
    );
}
