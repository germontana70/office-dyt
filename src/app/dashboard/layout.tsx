import { Inter } from "next/font/google";
import Image from "next/image";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
    title: "Office DYT - Dones y Talentos",
    description: "Premium Management Dashboard for Dones y Talentos",
};

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="dark min-h-screen antialiased bg-background text-foreground bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-background to-background dark:from-primary/20">
            {/* Background elements for depth */}
            <div className="fixed inset-0 z-[-1] bg-background">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary/20 blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-primary/30 blur-[150px]" />
            </div>

            <div className="flex min-h-screen">
                {/* Main Sidebar Placeholder */}
                <aside className="hidden w-64 flex-col border-r border-white/10 bg-black/20 backdrop-blur-xl md:flex">
                    <div className="flex h-14 items-center justify-center border-b border-white/10 px-6 py-2">
                        <div className="relative w-full h-full max-w-[160px]">
                            <Image
                                src="/logos/dyt-logo-dark.png"
                                alt="Dones y Talentos Logo"
                                fill
                                className="object-contain"
                                priority
                                sizes="160px"
                            />
                        </div>
                    </div>
                    <nav className="flex-1 space-y-1 p-4">
                        <a href="/dashboard" className="flex items-center gap-3 rounded-lg bg-primary/20 px-3 py-2 text-primary-foreground transition-all">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
                            Dashboard
                        </a>
                        <a href="/dashboard/students" className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground hover:bg-white/5 hover:text-white transition-all">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                            Estudiantes
                        </a>
                        <a href="/dashboard/payments" className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground hover:bg-white/5 hover:text-white transition-all">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            Pagos a Maestros
                        </a>
                    </nav>
                </aside>

                {/* Main Content Area */}
                <main className="flex-1 flex flex-col">
                    <header className="flex h-14 items-center gap-4 border-b border-white/10 bg-black/10 backdrop-blur-md px-6">
                        <div className="flex-1" />
                        <div className="flex items-center gap-4">
                            <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-primary to-secondary ring-2 ring-background cursor-pointer hover:ring-primary transition-all shadow-[0_0_15px_rgba(181,0,255,0.5)]" />
                        </div>
                    </header>
                    <div className="flex-1 p-6 md:p-8 overflow-y-auto">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}
