import { EventEditorView } from '@/ui/components/modules/event-editor/EventEditorView';

export const metadata = {
    title: 'Editor de Eventos | Office DYT',
    description: 'Gestión y actualización en lote de calendarios Google Workspace',
};

export default function EventEditorPage() {
    return (
        <div className="space-y-6">
            <header className="flex flex-col gap-1">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-xl">
                        <svg className="w-6 h-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                    </div>
                    <h1 className="text-3xl font-bold tracking-tight text-white drop-shadow-md">
                        Editor de Eventos
                    </h1>
                </div>
                <p className="text-muted-foreground ml-12">
                    Motor avanzado de inyección de texto para calendarios de clases y recursos físicos.
                </p>
            </header>

            <EventEditorView />
        </div>
    );
}
