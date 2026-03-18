'use client';

import { GlassCard } from '@/ui/components/modules/layout/GlassCard';
import { User, Phone, Mail, MapPin, Activity, Heart, Droplets, ShieldPlus, Users, Smartphone, FileText, CalendarDays, Hash } from 'lucide-react';
import { ReactNode } from 'react';

interface FamilyMember {
    full_name?: string;
    mobile?: string;
    email?: string | null;
    document_number?: string;
    document_type?: string;
    landline?: string;
    address?: string;
}

interface StudentVitalsPanelProps {
    student: {
        id: string;
        first_name: string;
        last_name: string;
        document_number?: string;
        document_type?: string;
        birth_date?: string | null;
        age?: number | null;
        gender?: string | null;
        phone?: string | null;
        email?: string | null;
        address?: string | null;
        neighborhood?: string | null;
        blood_type?: string | null;
        rh_factor?: string | null;
        health_insurance?: string | null;
        current_school?: string | null;
        current_grade?: string | null;
        father_info?: FamilyMember;
        mother_info?: FamilyMember;
        guardian_info_detailed?: FamilyMember;
    };
}

// Helper para Fechas Legibles
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

// Componente para Fila de Información Anti-Overflow
function InfoRow({ label, value, icon }: { label: string; value?: string | number | null; icon?: ReactNode }) {
    const hasValue = value !== null && value !== undefined && value !== '';
    return (
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center py-2 border-b border-white/5 gap-2 px-1">
            <div className="flex items-center gap-1.5 shrink-0">
                {icon && <span className="text-white/40">{icon}</span>}
                <span className="text-[9px] font-black uppercase tracking-widest text-white/40">{label}</span>
            </div>
            {hasValue ? (
                <span className="text-xs font-bold text-white/90 text-left sm:text-right break-words break-all sm:break-normal max-w-full">
                    {String(value)}
                </span>
            ) : (
                <span className="text-xs font-semibold text-gray-500 italic text-left sm:text-right">No registrado</span>
            )}
        </div>
    );
}

// Tarjeta Exclusiva para la Familia encapsulada en un Details
function FamilyMemberCard({ title, member, color }: { title: string; member?: FamilyMember; color: 'violet' | 'cyan' | 'pink' }) {
    if (!member || (!member.full_name && !member.document_number && !member.mobile)) return null;

    const borderColor = color === 'violet' ? 'border-violet-500/30' : color === 'cyan' ? 'border-cyan-500/30' : 'border-pink-500/30';
    const textColor = color === 'violet' ? 'text-violet-400' : color === 'cyan' ? 'text-cyan-400' : 'text-pink-400';
    const bgColor = color === 'violet' ? 'bg-violet-500/5' : color === 'cyan' ? 'bg-cyan-500/5' : 'bg-pink-500/5';

    return (
        <details className="group border border-white/10 rounded-2xl overflow-hidden bg-black/40 hover:bg-black/60 transition-colors">
            <summary className={`flex items-center justify-between p-4 cursor-pointer list-none ${bgColor}`}>
                <div className="flex items-center gap-2">
                    <User className={`w-4 h-4 ${textColor}`} />
                    <span className={`text-[10px] font-black uppercase tracking-widest ${textColor}`}>{title}</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white/80 opacity-0 group-open:opacity-100 transition-opacity truncate max-w-[150px]">
                        {member.full_name || 'No registrado'}
                    </span>
                    <span className="text-white/40 transition-transform group-open:rotate-180">↓</span>
                </div>
            </summary>
            
            <div className={`p-4 border-t ${borderColor} space-y-1`}>
                <InfoRow label="Nombre Completo" value={member.full_name} icon={<FileText className="w-3 h-3" />} />
                <InfoRow label="Identificación" value={member.document_number} icon={<Hash className="w-3 h-3" />} />
                <InfoRow label="Móvil" value={member.mobile} icon={<Smartphone className="w-3 h-3" />} />
                <InfoRow label="Fijo" value={member.landline} icon={<Phone className="w-3 h-3" />} />
                <InfoRow label="Email" value={member.email} icon={<Mail className="w-3 h-3" />} />
                <InfoRow label="Dirección" value={member.address} icon={<MapPin className="w-3 h-3" />} />
            </div>
        </details>
    );
}

export function StudentVitalsPanel({ student }: StudentVitalsPanelProps) {
    const hasFamilyData = student.father_info || student.mother_info || student.guardian_info_detailed;
    
    // Contenedor principal con limitador de altura y scroll nativo estilizado para no empujar el footer
    return (
        <div className="flex flex-col gap-y-4 w-full max-h-[calc(100vh-12rem)] overflow-y-auto custom-scrollbar pr-2 animate-in fade-in slide-in-from-top-4 duration-500">
            
            {/* ── Header / Resumen ── */}
            <GlassCard className="p-5 border-primary/20 bg-gradient-to-br from-black/80 to-primary/5">
                <div className="flex flex-col gap-y-3">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(168,85,247,0.2)]">
                            <User className="w-5 h-5 text-primary" />
                        </div>
                        <div className="overflow-hidden">
                            <h3 className="text-sm font-black text-white truncate break-words">{student.first_name} {student.last_name}</h3>
                            <p className="text-[10px] font-bold text-primary tracking-widest uppercase truncate">{student.document_type || 'DOC'} {student.document_number || 'S/N'}</p>
                        </div>
                    </div>
                </div>
            </GlassCard>

            {/* ── Ficha Personal ── */}
            <GlassCard className="p-5 border-violet-500/10 hover:border-violet-500/30 transition-colors">
                <div className="space-y-3">
                    <div className="flex items-center gap-2 mb-4">
                        <User className="w-4 h-4 text-violet-400" />
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-violet-400">Ficha Personal</h4>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1">
                        <div className="space-y-1">
                            <InfoRow label="Nació" value={formatIsoDate(student.birth_date)} icon={<CalendarDays className="w-3 h-3" />} />
                            <InfoRow label="Edad" value={student.age ? `${student.age} Años` : null} icon={<Activity className="w-3 h-3" />} />
                            <InfoRow label="Género" value={student.gender} icon={<User className="w-3 h-3" />} />
                        </div>
                        <div className="space-y-1">
                            <InfoRow label="Teléfono" value={student.phone} icon={<Smartphone className="w-3 h-3" />} />
                            <InfoRow label="Email" value={student.email} icon={<Mail className="w-3 h-3" />} />
                            <InfoRow label="Dirección" value={student.address} icon={<MapPin className="w-3 h-3" />} />
                        </div>
                    </div>
                </div>
            </GlassCard>

            {/* ── Ficha Médica ── */}
            <GlassCard className="p-5 border-cyan-500/10 hover:border-cyan-500/30 transition-colors">
                <div className="space-y-3">
                    <div className="flex items-center gap-2 mb-4">
                        <Heart className="w-4 h-4 text-cyan-400" />
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-cyan-400">Ficha Médica & Aseguradora</h4>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row gap-6">
                        {/* Grupo Sanguíneo Badge */}
                        <div className="px-6 py-4 bg-cyan-500/10 border border-cyan-500/20 rounded-2xl flex flex-col items-center justify-center shrink-0 shadow-inner">
                            <Droplets className="w-5 h-5 text-cyan-400/50 mb-1" />
                            {student.blood_type ? (
                                <p className="text-3xl font-black text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]">
                                    {student.blood_type}{student.rh_factor || ''}
                                </p>
                            ) : (
                                <p className="text-xs font-semibold text-gray-500 italic mt-2">No registrado</p>
                            )}
                        </div>
                        
                        {/* Datos de Salud */}
                        <div className="flex-1 flex flex-col justify-center space-y-1">
                            <InfoRow label="EPS / Medicina Prep." value={student.health_insurance} icon={<ShieldPlus className="w-3 h-3" />} />
                        </div>
                    </div>
                </div>
            </GlassCard>

            {/* ── Ficha Familiar (JSONB) ── */}
            {hasFamilyData && (
                <GlassCard className="p-5 border-pink-500/10 hover:border-pink-500/30 transition-colors">
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 mb-2">
                            <Users className="w-4 h-4 text-pink-400" />
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-pink-400">Ficha de Acudientes</h4>
                        </div>
                        
                        <div className="space-y-3 flex flex-col w-full">
                            <FamilyMemberCard title="Información del Padre" member={student.father_info} color="violet" />
                            <FamilyMemberCard title="Información de la Madre" member={student.mother_info} color="pink" />
                            <FamilyMemberCard title="Acudiente Registrado" member={student.guardian_info_detailed} color="cyan" />
                        </div>
                    </div>
                </GlassCard>
            )}
            
            {/* Espaciador final para evitar que el scroll corte el último elemento */}
            <div className="h-4 w-full shrink-0"></div>
        </div>
    );
}
