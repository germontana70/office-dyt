'use client';

import { GlassCard } from '@/ui/components/modules/layout/GlassCard';

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

function InfoRow({ label, value }: { label: string; value?: string | number | null }) {
    if (!value) return null;
    return (
        <div className="flex justify-between items-start py-2 border-b border-white/5 gap-4">
            <span className="text-[9px] font-black uppercase tracking-widest text-white/30 shrink-0">{label}</span>
            <span className="text-xs font-bold text-white/80 text-right">{String(value)}</span>
        </div>
    );
}

function FamilyMemberCard({ title, member, color }: { title: string; member?: FamilyMember; color: 'violet' | 'cyan' | 'pink' }) {
    if (!member?.full_name) return null;

    const borderColor = color === 'violet' ? 'border-violet-500/20' : color === 'cyan' ? 'border-cyan-500/20' : 'border-pink-500/20';
    const textColor = color === 'violet' ? 'text-violet-400' : color === 'cyan' ? 'text-cyan-400' : 'text-pink-400';

    return (
        <div className={`p-4 bg-black/40 border ${borderColor} rounded-2xl space-y-1`}>
            <p className={`text-[10px] font-black uppercase tracking-widest ${textColor} mb-2`}>{title}</p>
            <InfoRow label="Nombre" value={member.full_name} />
            <InfoRow label="Celular" value={member.mobile} />
            {member.landline && <InfoRow label="Fijo" value={member.landline} />}
            <InfoRow label="Email" value={member.email} />
            <InfoRow label="Doc." value={member.document_number} />
            {member.address && <InfoRow label="Dirección" value={member.address} />}
        </div>
    );
}

export function StudentVitalsPanel({ student }: StudentVitalsPanelProps) {
    const hasFamilyData = student.father_info?.full_name || student.mother_info?.full_name || student.guardian_info_detailed?.full_name;
    const hasMedicalData = student.blood_type || student.rh_factor || student.health_insurance;

    return (
        <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-500">
            {/* ── Ficha Académica / Personal ── */}
            <GlassCard className="p-5 border-violet-500/10">
                <div className="space-y-3">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-violet-400">Ficha Personal</h4>
                    <div className="grid grid-cols-2 gap-x-6">
                        <div>
                            <InfoRow label="Documento" value={student.document_number} />
                            <InfoRow label="Tipo Doc." value={student.document_type} />
                            <InfoRow label="Género" value={student.gender} />
                            <InfoRow label="Nació" value={student.birth_date} />
                            <InfoRow label="Edad" value={student.age} />
                        </div>
                        <div>
                            <InfoRow label="Teléfono" value={student.phone} />
                            <InfoRow label="Email" value={student.email} />
                            <InfoRow label="Dirección" value={student.address} />
                            <InfoRow label="Barrio" value={student.neighborhood} />
                        </div>
                    </div>
                    {(student.current_school || student.current_grade) && (
                        <div className="pt-2 border-t border-white/5">
                            <InfoRow label="Colegio" value={student.current_school} />
                            <InfoRow label="Grado" value={student.current_grade} />
                        </div>
                    )}
                </div>
            </GlassCard>

            {/* ── Ficha Médica ── */}
            {hasMedicalData && (
                <GlassCard className="p-5 border-red-500/10">
                    <div className="space-y-3">
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-red-400">Ficha Médica</h4>
                        <div className="flex gap-6">
                            {student.blood_type && (
                                <div className="px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl text-center">
                                    <p className="text-[8px] font-black uppercase tracking-widest text-red-400/50">Grupo</p>
                                    <p className="text-2xl font-black text-red-400">{student.blood_type}</p>
                                    {student.rh_factor && (
                                        <p className="text-xs font-bold text-red-300">{student.rh_factor}</p>
                                    )}
                                </div>
                            )}
                            <div className="flex-1">
                                <InfoRow label="EPS / Medicina" value={student.health_insurance} />
                            </div>
                        </div>
                    </div>
                </GlassCard>
            )}

            {/* ── Ficha Familiar ── */}
            {hasFamilyData && (
                <GlassCard className="p-5 border-cyan-500/10">
                    <div className="space-y-4">
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-cyan-400">Ficha Familiar</h4>
                        <div className="space-y-3">
                            <FamilyMemberCard title="Padre" member={student.father_info} color="violet" />
                            <FamilyMemberCard title="Madre" member={student.mother_info} color="pink" />
                            <FamilyMemberCard title="Acudiente" member={student.guardian_info_detailed} color="cyan" />
                        </div>
                    </div>
                </GlassCard>
            )}
        </div>
    );
}
