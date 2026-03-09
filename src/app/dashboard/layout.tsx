import { Inter } from "next/font/google";
import Image from "next/image";
import { SidebarNav } from "@/ui/components/modules/layout/SidebarNav";

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
                    <div className="flex w-full items-center justify-center border-b border-white/10 px-4 py-6">
                        <Image
                            src="/logos/dyt-logo-dark.png"
                            alt="Dones y Talentos Logo"
                            width={240}
                            height={80}
                            className="w-full h-auto object-contain"
                            priority
                        />
                    </div>
                    <SidebarNav />
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
