import { createClient } from '@/infra/services/server';
import { syncProgramNames } from '@/app/actions/audit-finance';
import { AuditSyncButton } from '@/modules/audit-finance/components/AuditSyncButton';

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
};

type ProgramRow = {
    id: string;
    enrollment_id: string | null;
    program_name: string | null;
};

type ProgramPriceRow = {
    program_name: string | null;
    cash_price: number | null;
    increment_percentage: number | null;
};

const formatCurrency = (value: number) =>
    value.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });

const normalizeProgramName = (value: string) => {
    return value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .trim();
};

const calculateFinanced = (cash: number, increment: number) => {
    if (!cash) return 0;
    const financed = cash * (1 + increment / 100);
    return Math.round(financed / 1000) * 1000;
};

export default async function AuditFinancePage() {
    const supabase = await createClient();

    const { data: enrollments, error: enrollmentsError } = await supabase
        .from('dyt_enrollments')
        .select('id, student_id, semester')
        .eq('semester', SEMESTER);

    if (enrollmentsError) {
        return (
            <div className="min-h-screen w-full bg-slate-950 text-white p-8">
                <h1 className="text-2xl font-black uppercase tracking-widest">Consola de Auditoria Financiera</h1>
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
            ? supabase.from('students').select('id, first_name, last_name').in('id', studentIds)
            : Promise.resolve({ data: [], error: null }),
        supabase
            .from('program_prices')
            .select('program_name, cash_price, increment_percentage')
            .eq('semester', SEMESTER)
    ]);

    const firstError = programsError || studentsError || pricesError;

    if (firstError) {
        return (
            <div className="min-h-screen w-full bg-slate-950 text-white p-8">
                <h1 className="text-2xl font-black uppercase tracking-widest">Consola de Auditoria Financiera</h1>
                <p className="mt-4 text-sm text-red-300">Error cargando datos: {firstError.message}</p>
            </div>
        );
    }

    const enrollmentRows = (enrollments || []) as EnrollmentRow[];
    const programRows = (programs || []) as ProgramRow[];
    const studentRows = (students || []) as StudentRow[];
    const priceRows = (prices || []) as ProgramPriceRow[];

    const studentMap = new Map(studentRows.map((student) => [student.id, student]));
    const priceMap = new Map(
        priceRows.map((row) => [normalizeProgramName(String(row.program_name || '')), row])
    );

    const rows = enrollmentRows.flatMap((enrollment) => {
        const student = enrollment.student_id ? studentMap.get(enrollment.student_id) : null;
        const studentName = student
            ? `${student.first_name || ''} ${student.last_name || ''}`.trim()
            : enrollment.student_id || 'Sin estudiante';

        const relatedPrograms = programRows.filter((program) => program.enrollment_id === enrollment.id);
        const programsList = relatedPrograms.length > 0 ? relatedPrograms : [null];

        return programsList.map((program) => {
            const programName = String(program?.program_name || '').trim();
            const normalized = normalizeProgramName(programName);
            const vaultRow = normalized ? priceMap.get(normalized) : null;
            const vaultName = String(vaultRow?.program_name || '').trim();
            const isExactMatch = programName.length > 0 && vaultName.length > 0 && programName === vaultName;

            const cash = Number(vaultRow?.cash_price || 0);
            const increment = Number(vaultRow?.increment_percentage || 0);
            const financed = calculateFinanced(cash, increment);

            return {
                enrollmentId: enrollment.id,
                programId: program?.id || null,
                studentName,
                programName: programName || '-',
                vaultName: vaultName || 'No encontrado',
                isExactMatch,
                cash,
                increment,
                financed
            };
        });
    });

    return (
        <div className="relative min-h-screen w-full overflow-hidden bg-slate-950 text-white">
            <div className="absolute inset-0">
                <div className="absolute -left-40 top-10 h-80 w-80 rounded-full bg-amber-500/10 blur-[120px]" />
                <div className="absolute right-0 top-1/3 h-96 w-96 rounded-full bg-emerald-500/10 blur-[140px]" />
                <div className="absolute bottom-0 left-1/3 h-96 w-96 rounded-full bg-cyan-500/10 blur-[140px]" />
            </div>

            <main className="relative z-10 px-6 py-10 md:px-12">
                <header className="flex flex-col gap-4">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-1.5 rounded-full bg-amber-400 shadow-[0_0_20px_rgba(251,191,36,0.6)]" />
                            <div>
                                <p className="text-[11px] font-black uppercase tracking-[0.4em] text-amber-200/70">
                                    Consola de Auditoria Financiera
                                </p>
                                <h1 className="text-3xl font-black uppercase tracking-tight text-white">
                                    Alineacion de Programas - {SEMESTER}
                                </h1>
                            </div>
                        </div>
                        <AuditSyncButton path="/dashboard/audit-finance" />
                    </div>
                    <p className="text-sm text-white/60 max-w-3xl">
                        Vista tipo Excel para detectar discrepancias entre matriculas y la Boveda de precios.
                        Solo se muestran registros del semestre activo y la correccion respeta el aislamiento por semestre.
                    </p>
                </header>

                <section className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-4 shadow-[0_30px_120px_rgba(0,0,0,0.35)] backdrop-blur">
                    <div className="flex flex-wrap items-center justify-between gap-4 pb-4">
                        <div className="flex items-center gap-4 text-xs uppercase tracking-widest text-white/50">
                            <span>Estudiantes: {new Set(enrollmentRows.map((row) => row.student_id)).size}</span>
                            <span>Programas auditados: {rows.length}</span>
                        </div>
                        <div className="flex items-center gap-3 text-xs font-semibold uppercase tracking-widest">
                            <span className="inline-flex items-center gap-2 text-emerald-300">
                                <span className="h-2 w-2 rounded-full bg-emerald-300" />
                                Match exacto
                            </span>
                            <span className="inline-flex items-center gap-2 text-rose-300">
                                <span className="h-2 w-2 rounded-full bg-rose-300" />
                                Discrepancia
                            </span>
                        </div>
                    </div>

                    <div className="overflow-auto rounded-xl border border-white/10 bg-slate-950/80">
                        <table className="min-w-[1100px] w-full table-fixed border-collapse text-sm">
                            <thead className="sticky top-0 z-10 bg-slate-900/90 text-[11px] uppercase tracking-widest text-white/70 backdrop-blur">
                                <tr>
                                    <th className="border border-white/10 px-3 py-3 text-left w-[220px]">Estudiante</th>
                                    <th className="border border-white/10 px-3 py-3 text-left w-[240px]">Programa en Matricula</th>
                                    <th className="border border-white/10 px-3 py-3 text-left w-[240px]">Programa en Boveda</th>
                                    <th className="border border-white/10 px-3 py-3 text-center w-[120px]">Match</th>
                                    <th className="border border-white/10 px-3 py-3 text-right w-[160px]">Valor Contado</th>
                                    <th className="border border-white/10 px-3 py-3 text-right w-[160px]">Valor Financiado</th>
                                    <th className="border border-white/10 px-3 py-3 text-center w-[160px]">Accion</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map((row, index) => {
                                    const matchClass = row.isExactMatch ? 'text-emerald-300' : 'text-rose-300';
                                    const rowBg = index % 2 === 0 ? 'bg-white/[0.03]' : 'bg-transparent';

                                    return (
                                        <tr key={`${row.enrollmentId}-${row.programId}-${index}`} className={rowBg}>
                                            <td className="border border-white/10 px-3 py-3 font-semibold text-white/90">
                                                {row.studentName}
                                            </td>
                                            <td className="border border-white/10 px-3 py-3 text-white/70">
                                                {row.programName}
                                            </td>
                                            <td className="border border-white/10 px-3 py-3 text-white/70">
                                                {row.vaultName}
                                            </td>
                                            <td className={`border border-white/10 px-3 py-3 text-center text-lg ${matchClass}`}>
                                                {row.isExactMatch ? '✅' : '❌'}
                                            </td>
                                            <td className="border border-white/10 px-3 py-3 text-right font-mono text-white/80">
                                                {row.cash ? formatCurrency(row.cash) : '-'}
                                            </td>
                                            <td className="border border-white/10 px-3 py-3 text-right font-mono text-white/80">
                                                {row.cash ? formatCurrency(row.financed) : '-'}
                                            </td>
                                            <td className="border border-white/10 px-3 py-3 text-center">
                                                {row.programId && !row.isExactMatch && row.vaultName !== 'No encontrado' ? (
                                                    <form action={syncProgramNames} className="inline-flex">
                                                        <input type="hidden" name="programId" value={row.programId} />
                                                        <input type="hidden" name="targetName" value={row.vaultName} />
                                                        <input type="hidden" name="semester" value={SEMESTER} />
                                                        <button
                                                            type="submit"
                                                            className="rounded-lg border border-amber-400/40 bg-amber-400/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-amber-200 hover:bg-amber-400/20"
                                                        >
                                                            Sincronizar
                                                        </button>
                                                    </form>
                                                ) : (
                                                    <span className="text-[10px] uppercase tracking-widest text-white/30">-</span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                                {rows.length === 0 && (
                                    <tr>
                                        <td colSpan={7} className="border border-white/10 px-3 py-6 text-center text-white/40">
                                            Sin datos para auditar en este semestre.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </section>
            </main>
        </div>
    );
}
