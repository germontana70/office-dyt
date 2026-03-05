import { createClient } from '@/infra/services/server';
import { redirect } from 'next/navigation';
import { dataService } from '@/infra/services/data';
import { paymentService, TeacherPaymentInfo, ClassSession } from '@/infra/services/payments';
import PaymentClientWrapper from '@/ui/components/modules/payments/PaymentClientWrapper';

// Helper de fechas: Rango de pago (26 del mes anterior al 25 del actual)
const getDefaultDateRange = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();

    // 26 del mes anterior (ISO string format for direct comparison)
    const start = new Date(year, month - 1, 26);
    // 25 del mes actual
    const end = new Date(year, month, 25);

    return {
        start: start.toISOString().split('T')[0],
        end: end.toISOString().split('T')[0]
    };
};

export default async function PaymentsDashboardPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect('/auth');
    }

    const { start, end } = getDefaultDateRange();

    // Obtener docentes y sus cálculos iniciales
    let teacherPayments: TeacherPaymentInfo[] = [];

    try {
        const teachers = await dataService.getTeachers();

        // Mapear pagos para cada docente (esto es pesado para un Server Component si hay muchos,
        // pero ideal para el MVP si la cantidad de profesores es manejable < 100)
        // En un escenario real, esto se haría bajo demanda o paginado.
        const paymentData = await Promise.all(
            teachers.slice(0, 15).map(async (t) => { // Aumentamos un poco el límite para el MVP
                const classes = await paymentService.getTeacherClasses(t.name, start, end);
                return paymentService.calculatePayment(t.name, Number(t.hourly_rate) || 0, classes);
            })
        );
        teacherPayments = paymentData;
    } catch (err) {
        console.error('Error al cargar pagos en servidor:', err);
    }

    return (
        <div style={{ padding: '2rem', maxWidth: '1400px', marginInline: 'auto' }}>
            <PaymentClientWrapper
                initialPayments={teacherPayments}
                startDate={start}
                endDate={end}
            />
        </div>
    );
}
