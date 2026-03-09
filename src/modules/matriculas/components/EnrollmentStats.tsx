import { GlassCard } from '@/ui/components/modules/layout/GlassCard';

interface EnrollmentStatsProps {
    totalStudents: number;
    semester: string;
}

export function EnrollmentStats({ totalStudents, semester }: EnrollmentStatsProps) {
    return (
        <GlassCard className="p-8 relative overflow-hidden group animate-in slide-in-from-bottom-4 fade-in duration-700">
            {/* Resplandor neón sutil en el fondo que reacciona al hover */}
            <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 via-primary/5 to-transparent rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition duration-1000 group-hover:duration-200" />

            <div className="relative flex flex-col items-center justify-center space-y-4 text-center">
                <h2 className="text-lg font-medium text-white/70 tracking-wide uppercase">
                    Total Estudiantes Matriculados
                </h2>

                <div className="flex items-baseline justify-center gap-2">
                    {/* Número con brillo intenso */}
                    <span className="text-6xl sm:text-7xl font-bold text-transparent bg-clip-text bg-gradient-to-b from-white to-white/60 drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">
                        {totalStudents}
                    </span>
                </div>

                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-sm font-medium text-white/60">
                    <span className="w-2 h-2 rounded-full bg-primary shadow-[0_0_8px_hsl(var(--primary))] animate-pulse" />
                    Semestre Activo: {semester}
                </div>
            </div>
        </GlassCard>
    );
}
