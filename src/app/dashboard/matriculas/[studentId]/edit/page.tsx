import EnrollmentForm from '@/ui/components/modules/enrollment/EnrollmentForm';
import { EnrollmentFormData } from '@/core/schemas/enrollment';
import { CurrentStudentRepository } from '@/modules/matriculas/repository/current-student-repo';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function EnrollmentPage({ params }: { params: Promise<{ studentId: string }> }) {
    const { studentId } = await params;

    const student = await CurrentStudentRepository.getById(studentId);
    
    if (!student) {
        notFound();
    }

    // Default program to prevent accordion break
    const DEFAULT_PROGRAM = {
        name: "",
        instrument: "",
        tuition_value: 0,
        payment_method: "Contado",
        discount_percentage: 0,
        teacher_assigned: "",
        observations: "",
        start_date: "",
        schedules: [],
        payments_made: []
    };

    // Map real database values to the form schema
    const initialData: Partial<EnrollmentFormData> = {
        first_name: student.first_name,
        last_name: student.last_name,
        document_type: student.document_type || "Tarjeta de Identidad",
        document_number: student.document_number,
        inscription_value: student.enrollment_fee || 0,
        shirt_value: student.shirt_fee || 0,
        shirt_size: student.shirt_size || "",
        financial_notes: student.financial_notes || "",
        programs: (student.programs && Array.isArray(student.programs) && student.programs.length > 0)
            ? student.programs
            : [DEFAULT_PROGRAM],
    };

    return (
        <div className="min-h-screen p-4 md:p-8 relative">
            {/* Background Particles (assuming tailwind handles it or we have a global background) */}
            <div className="absolute inset-0 bg-[#0e1117] -z-20" />
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-pink-500/10 -z-10" />

            <EnrollmentForm initialData={initialData} />
        </div>
    );
}
