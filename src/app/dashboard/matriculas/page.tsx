import { CurrentStudentRepository } from '@/modules/matriculas/repository/current-student-repo';
import { EnrollmentStats } from '@/modules/matriculas/components/EnrollmentStats';
import { MatriculasClientView } from '@/modules/matriculas/components/MatriculasClientView';
import { WithdrawStudentModal } from '@/modules/matriculas/components/WithdrawStudentModal';
import { GlassCard } from '@/ui/components/modules/layout/GlassCard';
import { GradientText } from "@/ui/components/modules/typography/GradientText";
export const dynamic = 'force-dynamic';

export default async function MatriculasPage() {
    const SEMESTER = '2026-1'; 

    // Consumo estricto de repositorios Zod-hybrated
    const students = await CurrentStudentRepository.getAllBySemester(SEMESTER);

    return (
        <div className="relative min-h-screen w-full overflow-hidden p-6 md:p-10">
            {/* Gradientes y resplandores base (Glassmorphism Environment) */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 dark:bg-primary/10 blur-[150px] rounded-full pointer-events-none" />
            <div className="absolute bottom-1/4 left-1/4 w-[400px] h-[400px] bg-secondary/5 dark:bg-secondary/10 blur-[150px] rounded-full pointer-events-none" />

            <main className="relative z-10 max-w-5xl mx-auto space-y-10">

                {/* Cabecera Premium */}
                <header className="space-y-4 animate-in slide-in-from-top-6 fade-in duration-700">
                    <div className="flex items-center gap-3">
                        <div className="w-1.5 h-8 bg-primary rounded-full shadow-sm dark:shadow-[0_0_15px_hsl(var(--primary))]" />
                        <GradientText as="h1" className="text-3xl font-extrabold tracking-tighter uppercase italic pr-2">
                            Gestión de Matrículas
                        </GradientText>
                    </div>
                    <p className="text-slate-600 dark:text-muted-foreground text-sm max-w-xl leading-relaxed font-medium">
                        Busque un estudiante existente para asignar o modificar su matrícula. Todo cambio aquí se sincroniza con Central Engine.
                    </p>
                </header>

                {/* Módulo de Estadísticas Central */}
                <EnrollmentStats totalStudents={students.filter(s => s.enrollment_status === 'Activo').length} semester={SEMESTER} />

                {/* Buscador Principal y Visor de Auditoría */}
                <section>
                    <MatriculasClientView students={students} semester={SEMESTER} />
                </section>

            </main>
        </div>
    );
}
