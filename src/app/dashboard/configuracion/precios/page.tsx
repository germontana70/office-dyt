import { PricingRepository } from '@/modules/configuracion/repository/pricing-repo';
import { PricingTable } from '@/ui/components/modules/pricing/PricingTable';

export const dynamic = 'force-dynamic';

export default async function PreciosPage() {
    const SEMESTER = '2026-1'; // Semestre Activo de la institución

    // Consulta aislada por semestre
    const prices = await PricingRepository.getPricesBySemester(SEMESTER);

    return (
        <div className="relative min-h-screen w-full overflow-hidden p-6 md:p-10">
            {/* Gradientes y resplandores base (Glassmorphism Environment) */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/10 blur-[150px] rounded-full pointer-events-none" />
            <div className="absolute bottom-1/4 left-1/4 w-[400px] h-[400px] bg-secondary/10 blur-[150px] rounded-full pointer-events-none" />

            <main className="relative z-10 max-w-full mx-auto space-y-10">

                {/* Cabecera Premium */}
                <header className="space-y-4 animate-in slide-in-from-top-6 fade-in duration-700">
                    <div className="flex items-center gap-3">
                        <div className="w-1.5 h-8 bg-primary rounded-full shadow-[0_0_15px_hsl(var(--primary))]" />
                        <h1 className="text-3xl font-black tracking-tighter text-foreground drop-shadow-md uppercase italic">
                            Motor de Precios
                        </h1>
                    </div>
                    <p className="text-muted-foreground text-sm max-w-xl leading-relaxed font-medium">
                        Configuración global de precios de contado e incremento de cuotas. Esta bóveda matemática dicta el comportamiento de los cobros en el portal de matrículas, con persistencia histórica aislada por semestre.
                    </p>
                </header>

                {/* Tabla de Configuración (Client Component) */}
                <section className="animate-in slide-in-from-bottom-5 fade-in duration-700 delay-75 fill-mode-both">
                    <PricingTable prices={prices} semester={SEMESTER} />
                </section>

            </main>
        </div>
    );
}
