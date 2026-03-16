import { SemesterRepository } from '@/modules/configuracion/repository/semester-repo';
import { getGlobalSettings, getInstruments } from '@/app/actions/settings';
import { PricingRepository } from '@/modules/configuracion/repository/pricing-repo';
import { StudentRepository } from '@/modules/matriculas/repository/student-repo';
import { EnrollmentForm } from '@/modules/matriculas/components/enrollment-vault/EnrollmentForm';

export const dynamic = 'force-dynamic';

export default async function NuevaMatriculaPage() {
    // 1. Obtener Semestre Activo
    const activeSemester = await SemesterRepository.getActive();
    const currentSemesterName = activeSemester?.name || '2026-1';

    // 2. Cargar datos base de configuración
    const globalSettings = await getGlobalSettings(currentSemesterName);
    const instruments = await getInstruments();
    const programs = await PricingRepository.getPricesBySemester(currentSemesterName);
    const students = await StudentRepository.getActiveBasic();

    // Fallback settings if not configured yet to avoid crash
    const safeSettings = globalSettings || {
        semester: currentSemesterName,
        enrollment_fee: 70000,
        tshirt_fee: 45000
    };

    return (
        <div className="relative min-h-screen w-full overflow-hidden p-6 md:p-10">
            {/* Ambient FX */}
            <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/5 blur-[150px] rounded-full pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-violet-600/5 blur-[150px] rounded-full pointer-events-none" />

            <main className="relative z-10 max-w-7xl mx-auto space-y-10">
                {/* Header Dinámico */}
                <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 animate-in fade-in slide-in-from-top-4 duration-1000">
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="w-1.5 h-10 bg-gradient-to-b from-primary to-pink-500 rounded-full shadow-[0_0_20px_rgba(var(--primary-rgb),0.5)]" />
                            <h1 className="text-4xl font-black tracking-tighter text-white uppercase italic drop-shadow-2xl">
                                Nueva Matrícula
                            </h1>
                        </div>
                        <p className="text-white/40 text-sm font-medium tracking-tight max-w-lg">
                            Registrando ingreso oficial para el semestre <span className="text-primary font-bold">{currentSemesterName}</span>. 
                            El motor financiero calculará automáticamente el plan de pagos.
                        </p>
                    </div>

                    <div className="flex items-center gap-4 bg-black/40 backdrop-blur-xl border border-white/5 p-4 rounded-3xl shadow-2xl">
                        <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                             <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                             </svg>
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase text-white/30 tracking-widest">Estado del Proceso</p>
                            <p className="text-sm font-black text-white italic">Fase de Reconocimiento</p>
                        </div>
                    </div>
                </header>

                {/* Formulario Core */}
                <EnrollmentForm 
                    students={students}
                    globalSettings={safeSettings}
                    instruments={instruments}
                    programs={programs}
                    currentSemester={currentSemesterName}
                />
            </main>
        </div>
    );
}
