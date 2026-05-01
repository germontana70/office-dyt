'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Users, Calendar } from 'lucide-react';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export function SidebarNav() {
    const pathname = usePathname();
    const isAuditRoute = pathname.startsWith('/dashboard/audit-finance') || pathname.startsWith('/dashboard/auditoria');
    const [isAuditOpen, setIsAuditOpen] = useState(isAuditRoute);

    useEffect(() => {
        if (isAuditRoute) {
            setIsAuditOpen(true);
        }
    }, [isAuditRoute]);

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
            name: 'Editor Eventos',
            href: '/dashboard/event-editor',
            icon: <Calendar className="w-5 h-5" />,
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
        /* {
            name: 'Programación',
            href: '/dashboard/programacion',
            icon: (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
            ),
        }, */
        {
            name: 'Clases Grupales',
            href: '/dashboard/clases-grupales',
            icon: <Users className="w-5 h-5" />,
        },
        {
            name: 'Maestros',
            href: '/dashboard/maestros',
            icon: (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
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
        {
            name: 'Configuración',
            href: '/dashboard/configuracion',
            icon: (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
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
            <div className="pt-2">
                <button
                    type="button"
                    onClick={() => setIsAuditOpen((prev) => !prev)}
                    className={cn(
                        "group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 transition-all duration-500 relative overflow-hidden",
                        isAuditRoute
                            ? "bg-emerald-500/10 text-emerald-200 border border-emerald-400/30 shadow-[0_0_20px_rgba(52,211,153,0.2)]"
                            : "text-muted-foreground hover:bg-emerald-400/5 hover:text-foreground hover:translate-x-1"
                    )}
                >
                    {isAuditRoute && (
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-emerald-300/50 via-emerald-300 to-emerald-300/50 shadow-[0_0_10px_rgba(52,211,153,0.8)]" />
                    )}
                    <div
                        className={cn(
                            "transition-colors duration-300",
                            isAuditRoute ? "text-emerald-200" : "text-muted-foreground"
                        )}
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3l7 4v5c0 5-3.5 7.5-7 9-3.5-1.5-7-4-7-9V7l7-4z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4" />
                        </svg>
                    </div>
                    <span className="font-medium tracking-wide">AUDITORIA</span>
                    <svg
                        className={cn("ml-auto h-4 w-4 transition-transform duration-300", isAuditOpen ? "rotate-180" : "")}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                </button>

                {isAuditOpen && (
                    <div className="mt-2 space-y-1 pl-10">
                        <Link
                            href="/dashboard/audit-finance"
                            className={cn(
                                "block rounded-lg px-3 py-2 text-sm transition-all duration-300",
                                pathname === '/dashboard/audit-finance'
                                    ? "bg-emerald-400/10 text-emerald-200 border border-emerald-400/20"
                                    : "text-muted-foreground hover:bg-emerald-400/5 hover:text-foreground"
                            )}
                        >
                            Alineacion de Programas
                        </Link>
                        <Link
                            href="/dashboard/auditoria/json-mapper"
                            className={cn(
                                "block rounded-lg px-3 py-2 text-sm transition-all duration-300",
                                pathname === '/dashboard/auditoria/json-mapper'
                                    ? "bg-emerald-400/10 text-emerald-200 border border-emerald-400/20"
                                    : "text-muted-foreground hover:bg-emerald-400/5 hover:text-foreground"
                            )}
                        >
                            Auditoría JSONB / Mapper
                        </Link>
                        <Link
                            href="/dashboard/auditoria/pagos-historicos"
                            className={cn(
                                "block rounded-lg px-3 py-2 text-sm transition-all duration-300",
                                pathname === '/dashboard/auditoria/pagos-historicos'
                                    ? "bg-emerald-400/10 text-emerald-200 border border-emerald-400/20"
                                    : "text-muted-foreground hover:bg-emerald-400/5 hover:text-foreground"
                            )}
                        >
                            Pagos Históricos
                        </Link>
                        <Link
                            href="/dashboard/auditoria/db-explorer"
                            className={cn(
                                "block rounded-lg px-3 py-2 text-sm transition-all duration-300",
                                pathname === '/dashboard/auditoria/db-explorer'
                                    ? "bg-emerald-400/10 text-emerald-200 border border-emerald-400/20"
                                    : "text-muted-foreground hover:bg-emerald-400/5 hover:text-foreground"
                            )}
                        >
                            Panóptico Global (BD)
                        </Link>
                    </div>
                )}
            </div>
        </nav>
    );
}
