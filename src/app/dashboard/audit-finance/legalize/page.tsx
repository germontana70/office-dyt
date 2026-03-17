import { createClient } from '@/infra/services/server';
import { LegalizeClientView, type LegalizeRow } from '@/modules/audit-finance/components/LegalizeClientView';

export const dynamic = 'force-dynamic';

const SEMESTER = '2026-1';

type EnrollmentRow = {
    id: string;
    student_id: string | null;
    semester: string | null;
};

type StudentRow = {
    id: string;
    first_name: string | null;
    last_name: string | null;
    birth_date: string | null;
    age: number | null;
};

type ProgramRow = {
    id: string;
    enrollment_id: string | null;
    program_name: string | null;
};

type ProgramPriceRow = {
    program_name: string | null;
};

const normalizeText = (value: string) => {
    return value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .trim();
};

const isMissingProgram = (programName: string | null | undefined) => {
    if (!programName) return true;
    const normalized = normalizeText(programName);
    return normalized.length === 0 || normalized === 'ningun instrumento';
};

const calculateAge = (student: StudentRow): number | null => {
    if (typeof student.age === 'number' && !Number.isNaN(student.age)) {
        return student.age;
    }
    if (!student.birth_date) return null;
    const birthDate = new Date(student.birth_date);
    if (Number.isNaN(birthDate.getTime())) return null;
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDelta = today.getMonth() - birthDate.getMonth();
    if (monthDelta < 0 || (monthDelta === 0 && today.getDate() < birthDate.getDate())) {
        age -= 1;
    }
    return age;
};

export default async function LegalizeAuditPage() {
    const supabase = await createClient();

    const { data: enrollments, error: enrollmentsError } = await supabase
        .from('dyt_enrollments')
        .select('id, student_id, semester')
        .eq('semester', SEMESTER);

    if (enrollmentsError) {
        return (
            <div className="min-h-screen w-full bg-slate-950 text-white p-8">
                <h1 className="text-2xl font-black uppercase tracking-widest">Consola de Legalizacion</h1>
                <p className="mt-4 text-sm text-red-300">Error cargando matriculas: {enrollmentsError.message}</p>
            </div>
        );
    }

    const enrollmentIds = (enrollments || []).map((row) => row.id).filter(Boolean);
    const studentIds = (enrollments || [])
        .map((row) => row.student_id)
        .filter((id): id is string => Boolean(id));

    const [
        { data: programs, error: programsError },
        { data: students, error: studentsError },
        { data: prices, error: pricesError }
    ] = await Promise.all([
        enrollmentIds.length > 0
            ? supabase
                .from('dyt_enrollment_programs')
                .select('id, enrollment_id, program_name')
                .in('enrollment_id', enrollmentIds)
            : Promise.resolve({ data: [], error: null }),
        studentIds.length > 0
            ? supabase
                .from('students')
                .select('id, first_name, last_name, birth_date, age')
                .in('id', studentIds)
            : Promise.resolve({ data: [], error: null }),
        supabase
            .from('program_prices')
            .select('program_name')
            .eq('semester', SEMESTER)
    ]);

    const firstError = programsError || studentsError || pricesError;

    if (firstError) {
        return (
            <div className="min-h-screen w-full bg-slate-950 text-white p-8">
                <h1 className="text-2xl font-black uppercase tracking-widest">Consola de Legalizacion</h1>
                <p className="mt-4 text-sm text-red-300">Error cargando datos: {firstError.message}</p>
            </div>
        );
    }

    const enrollmentRows = (enrollments || []) as EnrollmentRow[];
    const programRows = (programs || []) as ProgramRow[];
    const studentRows = (students || []) as StudentRow[];
    const priceRows = (prices || []) as ProgramPriceRow[];

    const studentMap = new Map(studentRows.map((student) => [student.id, student]));
    const programMap = new Map<string, ProgramRow[]>();

    programRows.forEach((program) => {
        if (!program.enrollment_id) return;
        const current = programMap.get(program.enrollment_id) || [];
        current.push(program);
        programMap.set(program.enrollment_id, current);
    });

    const missingRows = enrollmentRows.flatMap((enrollment): LegalizeRow[] => {
        const student = enrollment.student_id ? studentMap.get(enrollment.student_id) : null;
        const studentName = student
            ? `${student.first_name || ''} ${student.last_name || ''}`.trim()
            : enrollment.student_id || 'Sin estudiante';
        const age = student ? calculateAge(student) : null;

        const enrollmentPrograms = programMap.get(enrollment.id) || [];
        if (enrollmentPrograms.length === 0) {
            return [
                {
                    enrollmentId: enrollment.id,
                    programId: null,
                    programName: null,
                    studentName,
                    age,
                    semester: enrollment.semester
                }
            ];
        }

        return enrollmentPrograms
            .filter((program) => isMissingProgram(program.program_name))
            .map((program) => ({
                enrollmentId: enrollment.id,
                programId: program.id,
                programName: program.program_name,
                studentName,
                age,
                semester: enrollment.semester
            }));
    }) as LegalizeRow[];


    const programOptions = Array.from(
        new Set(
            priceRows
                .map((row) => String(row.program_name || '').trim())
                .filter((name) => name.length > 0)
        )
    )
        .sort((a, b) => a.localeCompare(b))
        .map((name) => ({ name }));

    return <LegalizeClientView rows={missingRows} programs={programOptions} semester={SEMESTER} />;
}
