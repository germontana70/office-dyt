'use client';

import { useState } from 'react';
import { PersonalDataTab } from './PersonalDataTab';
import { ProgramsAndSchedulesTab } from './ProgramsAndSchedulesTab';
import { FinancialTab } from './FinancialTab';
import { CurrentStudent } from '../../models/student.schema';

interface StudentProfileTabsProps {
    student: CurrentStudent;
}

type TabType = 'personal' | 'programs' | 'finances';

export function StudentProfileTabs({ student }: StudentProfileTabsProps) {
    const [activeTab, setActiveTab] = useState<TabType>('personal');

    const tabs = [
        { id: 'personal', label: '👤 Datos Personales' },
        { id: 'programs', label: '🎵 Programas y Horarios' },
        { id: 'finances', label: '💰 Finanzas' },
    ] as const;

    return (
        <div className="w-full max-w-5xl mx-auto space-y-8 animate-in slide-in-from-bottom-8 duration-700">

            {/* Navegación Glassmorphism Pills */}
            <nav className="flex items-center justify-center p-2 rounded-2xl bg-black/40 backdrop-blur-3xl border border-white/10 shadow-xl overflow-x-auto custom-scrollbar">
                <ul className="flex space-x-2">
                    {tabs.map((t) => {
                        const isActive = activeTab === t.id;
                        return (
                            <li key={t.id}>
                                <button
                                    onClick={() => setActiveTab(t.id as TabType)}
                                    className={`
                     px-6 py-3 rounded-xl text-sm font-bold tracking-wide transition-all duration-300
                     ${isActive
                                            ? 'bg-primary text-primary-foreground shadow-[0_0_20px_hsl(var(--primary)/0.4)] scale-105'
                                            : 'text-white/60 hover:text-white hover:bg-white/10'}
                   `}
                                >
                                    {t.label}
                                </button>
                            </li>
                        );
                    })}
                </ul>
            </nav>

            {/* Contenido Dinámico */}
            <div className="mt-8 transition-opacity duration-300">
                {activeTab === 'personal' && <PersonalDataTab student={student} />}
                {activeTab === 'programs' && <ProgramsAndSchedulesTab student={student} />}
                {activeTab === 'finances' && <FinancialTab student={student} />}
            </div>

        </div>
    );
}
