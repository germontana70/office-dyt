'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export function SidebarNav() {
    const pathname = usePathname();

    const navItems = [
        {
            name: 'Dashboard',
            href: '/dashboard',
            icon: (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
            ),
        },
        {
            name: 'Matrículas',
            href: '/dashboard/matriculas',
            icon: (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
            ),
        },
        {
            name: 'Pagos a Maestros',
            href: '/dashboard/payments',
            icon: (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            ),
        },
    ];

    return (
        <nav className="flex-1 space-y-1 p-4">
            {navItems.map((item) => {
                // Highlighting logic: active if exact match or if it's a sub-route (for matriculas)
                const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));

                return (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                            "group flex items-center gap-3 rounded-lg px-3 py-2.5 transition-all duration-500 relative overflow-hidden",
                            isActive
                                ? "bg-primary/10 text-primary border border-primary/20 shadow-[0_0_20px_hsl(var(--primary)/0.15)]"
                                : "text-muted-foreground hover:bg-primary/5 hover:text-foreground hover:translate-x-1"
                        )}
                    >
                        {isActive && (
                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-accent/50 via-accent to-accent/50 shadow-[0_0_10px_hsl(var(--accent))]" />
                        )}
                        <div className={cn(
                            "transition-colors duration-300",
                            isActive ? "text-primary" : "text-muted-foreground"
                        )}>
                            {item.icon}
                        </div>
                        <span className="font-medium tracking-wide">{item.name}</span>
                    </Link>
                );
            })}
        </nav>
    );
}
