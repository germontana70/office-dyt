'use client';

type LegalizeRow = {
    enrollmentId: string;
    programId: string | null;
    studentName: string;
    age: number | null;
    programName: string | null;
    semester: string | null;
};

type ProgramOption = {
    name: string;
};

type LegalizeConsoleProps = {
    rows: LegalizeRow[];
    programs: ProgramOption[];
    showAll: boolean;
    onToggleShowAll: (nextValue: boolean) => void;
    totalSinPrograma: number;
    totalElegibles: number;
    selections: Record<string, string>;
    onSelectionChange: (rowKey: string, value: string) => void;
    onLegalizeRow: (row: LegalizeRow) => void;
    pendingRowKeys: Set<string>;
    removingRowKeys: Set<string>;
};

const formatAge = (age: number | null) => {
    if (age === null || Number.isNaN(age)) return 'Sin edad';
    return `${age} anos`;
};

export function LegalizeConsole({
    rows,
    programs,
    showAll,
    onToggleShowAll,
    totalSinPrograma,
    totalElegibles,
    selections,
    onSelectionChange,
    onLegalizeRow,
    pendingRowKeys,
    removingRowKeys
}: LegalizeConsoleProps) {
    return (
        <section className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-4 shadow-[0_30px_120px_rgba(0,0,0,0.35)] backdrop-blur">
            <div className="flex flex-wrap items-center justify-between gap-4 pb-4">
                <div className="flex items-center gap-4 text-xs uppercase tracking-widest text-white/50">
                    <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.5)]" />
                        <span>Total Estudiantes sin programa: {totalSinPrograma}</span>
                    </div>
                </div>
                <div className="px-4 py-2 rounded-full border border-white/5 bg-white/5 text-[10px] font-bold text-white/40 uppercase tracking-widest">
                    Acceso Total al Catálogo Habilitado
                </div>
            </div>

            <div className="overflow-auto rounded-xl border border-white/10 bg-slate-950/80">
                <table className="min-w-[980px] w-full table-fixed border-collapse text-sm">
                    <thead className="sticky top-0 z-10 bg-slate-900/90 text-[11px] uppercase tracking-widest text-white/70 backdrop-blur">
                        <tr>
                            <th className="border border-white/10 px-3 py-3 text-left w-[260px]">Estudiante</th>
                            <th className="border border-white/10 px-3 py-3 text-center w-[140px]">Edad</th>
                            <th className="border border-white/10 px-3 py-3 text-left w-[360px]">Programa</th>
                            <th className="border border-white/10 px-3 py-3 text-center w-[220px]">Accion</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row, index) => {
                            const rowBg = index % 2 === 0 ? 'bg-white/[0.03]' : 'bg-transparent';
                            const rowKey = `${row.enrollmentId}:${row.programId || 'new'}`;
                            const selectedValue = selections[rowKey] || '';
                            const isPending = pendingRowKeys.has(rowKey);
                            const isRemoving = removingRowKeys.has(rowKey);

                            return (
                                <tr
                                    key={rowKey}
                                    className={`${rowBg} transition-all duration-500 ${isRemoving ? 'opacity-0 -translate-x-2' : ''}`}
                                >
                                    <td className="border border-white/10 px-3 py-3 font-semibold text-white/90">
                                        {row.studentName}
                                    </td>
                                    <td className="border border-white/10 px-3 py-3 text-center text-white/70">
                                        {formatAge(row.age)}
                                    </td>
                                    <td className="border border-white/10 px-3 py-3 text-white/70">
                                        <select
                                            name="programName"
                                            required
                                            value={selectedValue}
                                            onChange={(event) => onSelectionChange(rowKey, event.target.value)}
                                            className="w-full rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2 text-xs font-semibold uppercase tracking-widest text-white/80 focus:border-amber-400/60 focus:outline-none"
                                            disabled={isPending}
                                        >
                                            <option value="" disabled>
                                                Selecciona programa
                                            </option>
                                            {programs.map((program) => (
                                                <option key={program.name} value={program.name}>
                                                    {program.name}
                                                </option>
                                            ))}
                                        </select>
                                    </td>
                                    <td className="border border-white/10 px-3 py-3 text-center">
                                        <button
                                            type="button"
                                            onClick={() => onLegalizeRow(row)}
                                            disabled={!selectedValue || isPending}
                                            className="rounded-lg border border-emerald-400/40 bg-emerald-400/10 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-emerald-200 hover:bg-emerald-400/20 disabled:opacity-40"
                                        >
                                            {isPending ? 'Legalizando...' : 'Legalizar Matricula'}
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                        {rows.length === 0 && (
                            <tr>
                                <td colSpan={4} className="border border-white/10 px-3 py-6 text-center text-white/40">
                                    No hay estudiantes sin programa para mostrar.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </section>
    );
}
