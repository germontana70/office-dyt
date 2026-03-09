import { ParticleBackground } from '@/ui/components/modules/layout/ParticleBackground';
import { CurrentStudentRepository } from '@/modules/matriculas/repository/current-student-repo';
import { StudentProfileHeader } from '@/modules/matriculas/components/profile/StudentProfileHeader';
import { StudentProfileTabs } from '@/modules/matriculas/components/profile/StudentProfileTabs';
import { notFound } from 'next/navigation';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

interface PageProps {
    params: Promise<{
        studentId: string;
    }>;
}

export default async function StudentProfilePage({ params }: PageProps) {
    const { studentId } = await params;

    // Hidratación segura con Zod
    const student = await CurrentStudentRepository.getById(studentId);

    if (!student) {
        notFound();
    }

    return (
        <div className="relative min-h-screen w-full bg-background overflow-hidden p-4 sm:p-8 md:p-12">
            {/* Entorno Cinematográfico Premium */}
            <ParticleBackground />
            <div className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] bg-primary/10 blur-[150px] rounded-full pointer-events-none" />
            <div className="absolute bottom-[10%] left-[-5%] w-[500px] h-[500px] bg-secondary/15 blur-[180px] rounded-full pointer-events-none" />

            <main className="relative z-10 max-w-5xl mx-auto space-y-10">

                {/* Back Navigation */}
                <div className="animate-in slide-in-from-top-4 fade-in duration-500">
                    <Link
                        href="/dashboard/matriculas"
                        className="inline-flex items-center gap-2 text-white/50 hover:text-white transition-colors group px-4 py-2 bg-white/5 hover:bg-white/10 rounded-full border border-white/5 backdrop-blur-sm"
                    >
                        <svg className="w-4 h-4 group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        <span className="text-sm font-semibold tracking-wide">VOLVER A MATRÍCULAS</span>
                    </Link>
                </div>

                {/* Bloque Fijo: Header */}
                <StudentProfileHeader student={student} />

                {/* Bloque Navegable: Pestañas */}
                <StudentProfileTabs student={student} />

            </main>
        </div>
    );
}
