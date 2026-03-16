import { createClient } from '@/infra/services/server';

type EnrollmentRow = {
    id: string;
    student_id: string | null;
    semester: string | null;
};

type StudentRow = {
    id: string;
    first_name: string | null;
    last_name: string | null;
};

type ProgramRow = {
    id: string;
    enrollment_id: string | null;
    program_name: string | null;
    day_1: string | null;
    time_1: string | null;
    instrument_id: string | null;
    teacher_id: string | null;
};

type InstrumentRow = {
    id: string;
    name: string | null;
};

type TeacherRow = {
    id: string;
    name: string | null;
};

export default async function DebugVaultPage() {
    const supabase = await createClient();

    const [
        { data: enrollments, error: enrollmentsError },
        { data: programs, error: programsError },
        { data: students, error: studentsError },
        { data: instruments, error: instrumentsError },
        { data: teachers, error: teachersError }
    ] = await Promise.all([
        supabase.from('dyt_enrollments').select('*'),
        supabase.from('dyt_enrollment_programs').select('*'),
        supabase.from('students').select('id, first_name, last_name'),
        supabase.from('dyt_instruments').select('id, name'),
        supabase.from('teachers').select('id, name')
    ]);

    const firstError =
        enrollmentsError || programsError || studentsError || instrumentsError || teachersError;

    if (firstError) {
        return (
            <div className="p-8 text-red-400">
                <h1 className="text-3xl font-black uppercase tracking-widest">VISTA DE RAYOS X - AUDITORÍA DE BÓVEDA</h1>
                <p className="mt-4 text-sm">Error al cargar datos: {firstError.message}</p>
            </div>
        );
    }

    const enrollmentRows = (enrollments || []) as EnrollmentRow[];
    const programRows = (programs || []) as ProgramRow[];
    const studentRows = (students || []) as StudentRow[];
    const instrumentRows = (instruments || []) as InstrumentRow[];
    const teacherRows = (teachers || []) as TeacherRow[];

    const studentMap = new Map(studentRows.map((student) => [student.id, student]));
    const instrumentMap = new Map(instrumentRows.map((instrument) => [instrument.id, instrument]));
    const teacherMap = new Map(teacherRows.map((teacher) => [teacher.id, teacher]));

    const rows = enrollmentRows.flatMap((enrollment) => {
        const student = enrollment.student_id ? studentMap.get(enrollment.student_id) : null;
        const studentName = student
            ? `${student.first_name || ''} ${student.last_name || ''}`.trim()
            : enrollment.student_id || 'Sin estudiante';

        const relatedPrograms = programRows.filter(
            (program) => program.enrollment_id === enrollment.id
        );
        const programsList = relatedPrograms.length > 0 ? relatedPrograms : [null];

        return programsList.map((program) => ({
            enrollmentId: enrollment.id,
            semester: enrollment.semester || '-',
            studentName,
            programName: program?.program_name || '-',
            instrumentName: program?.instrument_id
                ? instrumentMap.get(program.instrument_id)?.name || program.instrument_id
                : '-',
            teacherName: program?.teacher_id
                ? teacherMap.get(program.teacher_id)?.name || program.teacher_id
                : '-',
            schedule: program?.day_1 && program?.time_1 ? `${program.day_1} ${program.time_1}` : '-'
        }));
    });

    return (
        <div className="p-8 text-white">
            <h1 className="text-3xl md:text-5xl font-black uppercase tracking-widest text-white">
                VISTA DE RAYOS X - AUDITORÍA DE BÓVEDA
            </h1>

            <div className="mt-6 overflow-x-auto border border-white/20 rounded-lg">
                <table className="table-auto w-full border-collapse text-sm">
                    <thead className="bg-black/60 text-white/80">
                        <tr>
                            <th className="border border-white/10 px-3 py-2 text-left">ID Matrícula</th>
                            <th className="border border-white/10 px-3 py-2 text-left">Estudiante</th>
                            <th className="border border-white/10 px-3 py-2 text-left">Semestre</th>
                            <th className="border border-white/10 px-3 py-2 text-left">Programa</th>
                            <th className="border border-white/10 px-3 py-2 text-left">Instrumento</th>
                            <th className="border border-white/10 px-3 py-2 text-left">Profesor</th>
                            <th className="border border-white/10 px-3 py-2 text-left">Horario</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row, index) => (
                            <tr key={`${row.enrollmentId}-${index}`} className="odd:bg-white/5">
                                <td className="border border-white/10 px-3 py-2 font-mono">{row.enrollmentId}</td>
                                <td className="border border-white/10 px-3 py-2">{row.studentName}</td>
                                <td className="border border-white/10 px-3 py-2">{row.semester}</td>
                                <td className="border border-white/10 px-3 py-2">{row.programName}</td>
                                <td className="border border-white/10 px-3 py-2">{row.instrumentName}</td>
                                <td className="border border-white/10 px-3 py-2">{row.teacherName}</td>
                                <td className="border border-white/10 px-3 py-2">{row.schedule}</td>
                            </tr>
                        ))}
                        {rows.length === 0 && (
                            <tr>
                                <td colSpan={7} className="border border-white/10 px-3 py-6 text-center text-white/40">
                                    Sin datos en dyt_enrollments para mostrar.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
