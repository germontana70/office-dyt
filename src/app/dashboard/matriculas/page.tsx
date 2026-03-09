import { CurrentStudentRepository } from '@/modules/matriculas/repository/current-student-repo';
import { EnrollmentStats } from '@/modules/matriculas/components/EnrollmentStats';
import { StudentSearchSelect } from '@/modules/matriculas/components/StudentSearchSelect';
import { WithdrawStudentModal } from '@/modules/matriculas/components/WithdrawStudentModal';
import { GlassCard } from '@/ui/components/modules/layout/GlassCard';
export const dynamic = 'force-dynamic';

export default async function MatriculasPage() {
    const SEMESTER = '2026-1'; // TODO: Puede venir de una config global o params

    // Consumo estricto de repositorios Zod-hybrated
    const students = await CurrentStudentRepository.getAllBySemester(SEMESTER);

    return (
        <div className="relative min-h-screen w-full overflow-hidden p-6 md:p-10">
            {/* Gradientes y resplandores base (Glassmorphism Environment) */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/10 blur-[150px] rounded-full pointer-events-none" />
            <div className="absolute bottom-1/4 left-1/4 w-[400px] h-[400px] bg-secondary/10 blur-[150px] rounded-full pointer-events-none" />

            <main className="relative z-10 max-w-5xl mx-auto space-y-10">

                {/* Cabecera Premium */}
                <header className="space-y-4 animate-in slide-in-from-top-6 fade-in duration-700">
                    <div className="flex items-center gap-3">
                        <div className="w-1.5 h-8 bg-primary rounded-full shadow-[0_0_15px_hsl(var(--primary))]" />
                        <h1 className="text-3xl font-black tracking-tighter text-foreground drop-shadow-md uppercase italic">
                            Gestión de Matrículas
                        </h1>
                    </div>
                    <p className="text-muted-foreground text-sm max-w-xl leading-relaxed font-medium">
                        Busque un estudiante existente para asignar o modificar su matrícula. Todo cambio aquí se sincroniza con Central Engine.
                    </p>
                </header>

                {/* Módulo de Estadísticas Central */}
                <EnrollmentStats totalStudents={students.length} semester={SEMESTER} />

                {/* Acciones Rápidas con animaciones escenificadas */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in slide-in-from-bottom-5 fade-in duration-700 delay-75 fill-mode-both">
                    {/* Tarjeta Reintegrar */}
                    <GlassCard className="p-5 flex items-center justify-between group hover:border-primary/50 cursor-pointer transition-all duration-300">
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-xl bg-primary/10 text-primary group-hover:bg-primary/20 group-hover:shadow-[0_0_20px_hsl(var(--primary)/0.3)] transition-all">
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                            </div>
                            <span className="font-bold text-foreground/90 group-hover:text-primary transition-colors uppercase tracking-widest text-[11px]">Reintegrar Estudiante</span>
                        </div>
                        <span className="text-primary/70 group-hover:translate-x-1 transition-transform">→</span>
                    </GlassCard>

                    {/* Modal Retirar */}
                    <WithdrawStudentModal students={students} />
                </div>

                {/* Buscador Principal */}
                <section>
                    <StudentSearchSelect students={students} />
                </section>

            </main>
        </div>
    );
}
