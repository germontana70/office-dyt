import { createClient } from '@/infra/services/server';
import { redirect } from 'next/navigation';
import { dataService } from '@/infra/services/data';
import { paymentService, TeacherPaymentInfo, ClassSession } from '@/infra/services/payments';
import PaymentClientWrapper from '@/ui/components/modules/payments/PaymentClientWrapper';

// Helper de fechas: Rango de pago (26 del mes anterior al 25 del actual)
const getDefaultDateRange = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth(); // JS months 0-indexed

    // 26 del mes anterior (ISO string format for direct comparison)
    const start = new Date(year, month - 1, 26);
    // 25 del mes actual
    const end = new Date(year, month, 25);

    return {
        start: start.toISOString().split('T')[0],
        end: end.toISOString().split('T')[0]
    };
};

export default async function PaymentsDashboardPage({
    searchParams
}: {
    searchParams: { start?: string; end?: string }
}) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect('/auth');
    }

    const defaultRange = getDefaultDateRange();
    const start = searchParams?.start || defaultRange.start;
    const end = searchParams?.end || defaultRange.end;

    let teacherPayments: TeacherPaymentInfo[] = [];

    try {
        const teachers = await dataService.getTeachers();

        const paymentData = await Promise.all(
            teachers.map(async (t) => {
                const classes = await paymentService.getTeacherClasses(t.name, start, end);
                return paymentService.calculatePayment(t.name, Number(t.hourly_rate) || 0, classes, t.instrument || 'Docente');
            })
        );

        // Filtramos para mostrar solo a los profesores que tuvieron horas este mes
        teacherPayments = paymentData.filter(p => p.totalHours > 0);
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
