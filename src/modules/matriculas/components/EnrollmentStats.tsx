import { GlassCard } from '@/ui/components/modules/layout/GlassCard';

interface EnrollmentStatsProps {
    totalStudents: number;
    semester: string;
}

export function EnrollmentStats({ totalStudents, semester }: EnrollmentStatsProps) {
    return (
        <GlassCard className="p-8 relative overflow-hidden group animate-in slide-in-from-bottom-4 fade-in duration-700 border-primary/10">
            {/* Resplandor neón sutil en el fondo que reacciona al hover */}
            <div className="absolute -inset-1 bg-gradient-to-r from-primary/10 via-accent/5 to-transparent rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition duration-1000 group-hover:duration-200" />

            <div className="relative flex flex-col items-center justify-center space-y-4 text-center">
                <h2 className="text-[10px] font-black text-muted-foreground tracking-[0.2em] uppercase">
                    Total Estudiantes Matriculados
                </h2>

                <div className="flex items-baseline justify-center gap-2">
                    {/* Número con brillo intenso */}
                    <span className="text-6xl sm:text-7xl font-black text-foreground drop-shadow-[0_0_15px_hsl(var(--primary)/0.3)] italic tracking-tighter">
                        {totalStudents}
                    </span>
                </div>

                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/5 border border-primary/10 text-[10px] font-bold uppercase tracking-widest text-muted-foreground shadow-inner">
                    <span className="w-2 h-2 rounded-full bg-accent neon-pulse shadow-[0_0_10px_hsl(var(--accent))]" />
                    Semestre Activo: {semester}
                </div>
            </div>
        </GlassCard>
    );
}
