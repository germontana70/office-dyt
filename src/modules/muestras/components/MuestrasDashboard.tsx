'use client';

import { useState } from 'react';
import { SheetImporter } from './SheetImporter';
import { RecitalOrganizer } from './RecitalOrganizer';
import { CreateRecitalPanel } from './CreateRecitalPanel';
import { PoolView } from './PoolView';
import type { MuestraPresentacion, Recital, PresentacionPool } from '@/infra/types/muestras';
import { Music2, Upload, Calendar, Layers } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Props {
    initialRecitales: Recital[];
    initialItems: MuestraPresentacion[];
    initialPoolItems: PresentacionPool[];
    semester: string;
    teachers: string[];
    instruments: string[];
}

type Tab = 'pool' | 'organizer' | 'import' | 'create';

export function MuestrasDashboard({
    initialRecitales,
    initialItems,
    initialPoolItems,
    semester,
    teachers,
    instruments,
}: Props) {
    const router = useRouter();
    const [recitales, setRecitales] = useState<Recital[]>(initialRecitales);
    const [selectedRecital, setSelectedRecital] = useState<Recital | null>(recitales[0] ?? null);
    const [activeTab, setActiveTab] = useState<Tab>('pool');

    const handleRecitalCreated = (recital: Recital) => {
        setRecitales((prev) => [...prev, recital]);
        setSelectedRecital(recital);
        setActiveTab('pool');
        router.refresh();
    };

    const handleImportSuccess = () => {
        router.refresh();
    };

    const handleAssigned = () => {
        router.refresh();
        setActiveTab('organizer');
    };

    const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
        { id: 'pool', label: 'Pool de Presentaciones', icon: <Layers className="w-3.5 h-3.5" /> },
        { id: 'organizer', label: 'Cronograma', icon: <Music2 className="w-3.5 h-3.5" /> },
        { id: 'import', label: 'Escáner Drive', icon: <Upload className="w-3.5 h-3.5" /> },
        { id: 'create', label: 'Nuevo Recital', icon: <Calendar className="w-3.5 h-3.5" /> },
    ];

    return (
        <div className="space-y-6">
            {/* Tab Navigation */}
            <div className="flex gap-1 p-1 bg-black/30 backdrop-blur-xl border border-white/10 rounded-2xl w-fit overflow-x-auto">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex whitespace-nowrap items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                            activeTab === tab.id
                                ? 'bg-white/10 text-foreground shadow-sm'
                                : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
                        }`}
                    >
                        {tab.icon}
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Recital Selector (Only on Organizer) */}
            {activeTab === 'organizer' && recitales.length > 0 && (
                <div className="flex gap-2 overflow-x-auto pb-1">
                    {recitales.map((r) => (
                        <button
                            key={r.id}
                            onClick={() => setSelectedRecital(r)}
                            className={`flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-bold transition-all ${
                                selectedRecital?.id === r.id
                                    ? 'bg-primary/20 border-primary/50 text-primary shadow-[0_0_15px_hsl(var(--primary)/0.2)]'
                                    : 'bg-white/5 border-white/10 text-muted-foreground hover:bg-white/10'
                            }`}
                        >
                            <span className={`w-1.5 h-1.5 rounded-full ${selectedRecital?.id === r.id ? 'bg-accent animate-pulse' : 'bg-muted-foreground/30'}`} />
                            {r.name}
                        </button>
                    ))}
                </div>
            )}

            {/* Tab Content */}
            {activeTab === 'create' && (
                <div className="max-w-md">
                    <CreateRecitalPanel semester={semester} onCreated={handleRecitalCreated} />
                </div>
            )}

            {activeTab === 'import' && (
                <div className="max-w-2xl">
                    <SheetImporter
                        activeSemester={semester}
                        onImportSuccess={handleImportSuccess}
                    />
                </div>
            )}

            {activeTab === 'pool' && (
                <div className="w-full">
                    <PoolView 
                        items={initialPoolItems} 
                        recitales={recitales} 
                        onAssigned={handleAssigned} 
                    />
                </div>
            )}

            {activeTab === 'organizer' && selectedRecital && (
                <RecitalOrganizer
                    initialItems={initialItems.filter((i) => i.recital_id === selectedRecital.id)}
                    recitalId={selectedRecital.id}
                    recitalStartISO={selectedRecital.start_time}
                    teachers={teachers}
                    instruments={instruments}
                />
            )}

            {activeTab === 'organizer' && !selectedRecital && (
                <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-12 flex flex-col items-center text-center gap-4">
                    <div className="p-5 bg-primary/5 rounded-2xl border border-primary/10">
                        <Music2 className="w-8 h-8 text-primary/40" />
                    </div>
                    <div>
                        <h3 className="text-base font-black text-muted-foreground uppercase tracking-wider mb-1">Sin Recital Activo</h3>
                        <p className="text-xs text-muted-foreground/60 max-w-xs">
                            Crea un nuevo recital desde la pestaña <span className="text-primary font-bold">Nuevo Recital</span> o asigna presentaciones desde el <span className="text-primary font-bold">Pool</span>.
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}
