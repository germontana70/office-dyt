export default function AuditLegalizeLoading() {
    return (
        <div className="relative min-h-screen w-full overflow-hidden bg-slate-950 text-white">
            <div className="absolute inset-0">
                <div className="absolute -left-40 top-10 h-80 w-80 rounded-full bg-emerald-500/10 blur-[120px]" />
                <div className="absolute right-0 top-1/3 h-96 w-96 rounded-full bg-amber-500/10 blur-[140px]" />
                <div className="absolute bottom-0 left-1/3 h-96 w-96 rounded-full bg-cyan-500/10 blur-[140px]" />
            </div>

            <main className="relative z-10 px-6 py-10 md:px-12 animate-pulse">
                <header className="flex flex-col gap-4">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-1.5 rounded-full bg-emerald-400/40" />
                            <div>
                                <div className="h-3 w-64 rounded bg-white/10" />
                                <div className="mt-3 h-8 w-72 rounded bg-white/10" />
                            </div>
                        </div>
                        <div className="h-11 w-60 rounded-full bg-white/10" />
                    </div>
                    <div className="h-4 w-3/5 rounded bg-white/10" />
                </header>

                <section className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-4 pb-4">
                        <div className="h-4 w-56 rounded bg-white/10" />
                        <div className="h-10 w-64 rounded-full bg-emerald-400/15" />
                    </div>
                    <div className="overflow-hidden rounded-xl border border-white/10">
                        <div className="h-12 bg-white/10" />
                        <div className="space-y-2 p-4">
                            {Array.from({ length: 6 }).map((_, index) => (
                                <div key={index} className="h-10 rounded bg-white/5" />
                            ))}
                        </div>
                    </div>
                </section>
            </main>
        </div>
    );
}
