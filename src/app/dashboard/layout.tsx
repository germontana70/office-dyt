import Image from "next/image";
import { SidebarNav } from "@/ui/components/modules/layout/SidebarNav";
import { ThemeToggle } from "@/ui/components/modules/layout/ThemeToggle";
import { ParticleBackground } from "@/ui/components/modules/layout/ParticleBackground";


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
        <div className="min-h-screen antialiased transition-colors duration-500 overflow-hidden relative">
            {/* Fondo cinematográfico global */}
            <ParticleBackground />

            {/* Background elements for depth - DYT Brand Version */}
            <div className="fixed inset-0 z-[-1]">
                <div className="absolute top-[-5%] left-[-5%] w-[30%] h-[30%] rounded-full bg-primary/10 blur-[100px]" />
                <div className="absolute bottom-[-5%] right-[-5%] w-[40%] h-[40%] rounded-full bg-accent/5 blur-[130px]" />
            </div>

            <div className="flex min-h-screen relative z-10">
                {/* Main Sidebar - Glass DYT */}
                <aside className="hidden w-64 flex-col border-r border-primary/10 bg-black/10 dark:bg-black/40 backdrop-blur-3xl md:flex">
                    <div className="flex w-full items-center justify-center border-b border-primary/5 px-4 py-8">
                        <Image
                            src="/logos/dyt-logo-dark.png"
                            alt="Dones y Talentos Logo"
                            width={240}
                            height={80}
                            className="w-full h-auto object-contain drop-shadow-[0_0_15px_rgba(var(--primary),0.3)]"
                            priority
                        />
                    </div>
                    <SidebarNav />
                </aside>

                {/* Main Content Area */}
                <main className="flex-1 flex flex-col bg-background/20 backdrop-blur-[4px]">
                    <header className="flex h-16 items-center gap-4 border-b border-primary/5 bg-background/20 backdrop-blur-md px-6">
                        <div className="flex-1" />
                        <div className="flex items-center gap-4">
                            <ThemeToggle />
                            <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-primary to-accent ring-2 ring-primary/20 cursor-pointer hover:ring-accent transition-all shadow-[0_0_20px_hsl(var(--primary)/0.2)] hover:shadow-[0_0_25px_hsl(var(--accent)/0.4)]" />
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
