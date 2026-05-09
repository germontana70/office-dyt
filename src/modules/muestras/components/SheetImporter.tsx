'use client';

import { useState, useTransition } from 'react';
import { listSheetFiles, importFilesToPool, type DriveFile } from '@/app/actions/muestras';
import { toast } from 'sonner';
import { FolderSearch, Download, Loader2, TableProperties, CheckSquare, Square, ChevronRight } from 'lucide-react';

interface Props {
    activeSemester: string;
    onImportSuccess: () => void;
}

export function SheetImporter({ activeSemester, onImportSuccess }: Props) {
    const [files, setFiles] = useState<DriveFile[]>([]);
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [importResults, setImportResults] = useState<any[]>([]);
    const [isPending, startTransition] = useTransition();
    const [step, setStep] = useState<'idle' | 'scanned' | 'imported'>('idle');

    const handleScan = () => {
        startTransition(async () => {
            const res = await listSheetFiles(activeSemester);
            if (res.success && res.files) {
                setFiles(res.files);
                setStep('scanned');
                toast.success(`${res.files.length} archivos Sheets encontrados para el semestre ${activeSemester}`);
            } else {
                toast.error(res.error ?? 'Error al escanear Google Drive');
            }
        });
    };

    const toggleFile = (id: string) => {
        setSelected((prev) => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    const toggleAll = () => {
        if (selected.size === files.length) {
            setSelected(new Set());
        } else {
            setSelected(new Set(files.map((f) => f.id)));
        }
    };

    const handleImport = () => {
        if (selected.size === 0) return;
        const selectedFiles = files.filter(f => selected.has(f.id)).map(f => ({ id: f.id, name: f.name }));
        
        startTransition(async () => {
            const res = await importFilesToPool(selectedFiles, activeSemester);
            if (res.success && res.results) {
                setImportResults(res.results);
                setStep('imported');
                const totalInserted = res.results.reduce((a, r) => a + r.rowsInserted, 0);
                toast.success(`✅ Importación completada: ${totalInserted} presentaciones añadidas al Pool`);
                onImportSuccess();
            } else {
                toast.error(res.error ?? 'Error en la importación masiva');
            }
        });
    };

    return (
        <div className="bg-black/60 backdrop-blur-2xl border border-white/10 rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-white/10">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-accent/10 rounded-xl border border-accent/20">
                        <TableProperties className="w-4 h-4 text-accent" />
                    </div>
                    <div>
                        <h3 className="text-sm font-black text-foreground uppercase tracking-wider">
                            Escáner de Drive
                        </h3>
                        <p className="text-xs text-muted-foreground truncate max-w-[200px]">Semestre: {activeSemester}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleScan}
                        disabled={isPending}
                        className="flex items-center gap-2 px-3 py-1.5 bg-accent/10 hover:bg-accent/20 border border-accent/30 text-accent rounded-xl text-xs font-bold uppercase tracking-wider transition-all"
                    >
                        {isPending && step === 'idle'
                            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            : <FolderSearch className="w-3.5 h-3.5" />}
                        Escanear
                    </button>
                    {selected.size > 0 && (
                        <button
                            onClick={handleImport}
                            disabled={isPending}
                            className="flex items-center gap-2 px-3 py-1.5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-[0_0_15px_hsl(var(--primary)/0.3)]"
                        >
                            {isPending && step === 'scanned'
                                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                : <Download className="w-3.5 h-3.5" />}
                            Importar ({selected.size})
                        </button>
                    )}
                </div>
            </div>

            {step !== 'idle' && files.length > 0 && (
                <div className="p-3">
                    <button
                        onClick={toggleAll}
                        className="w-full flex items-center gap-2 px-3 py-2 mb-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 transition-all text-xs font-bold text-muted-foreground uppercase tracking-wider"
                    >
                        {selected.size === files.length
                            ? <CheckSquare className="w-3.5 h-3.5 text-primary" />
                            : <Square className="w-3.5 h-3.5" />}
                        {selected.size === files.length ? 'Deseleccionar todo' : 'Seleccionar todo'}
                    </button>

                    <ul className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                        {files.map((file) => {
                            const isSelected = selected.has(file.id);
                            return (
                                <li
                                    key={file.id}
                                    onClick={() => toggleFile(file.id)}
                                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border cursor-pointer transition-all ${
                                        isSelected
                                            ? 'bg-primary/15 border-primary/40 shadow-[0_0_10px_hsl(var(--primary)/0.1)]'
                                            : 'bg-white/3 border-white/8 hover:bg-white/8 hover:border-white/15'
                                    }`}
                                >
                                    <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-all ${
                                        isSelected ? 'bg-primary border-primary' : 'border-white/20'
                                    }`}>
                                        {isSelected && (
                                            <svg className="w-2.5 h-2.5 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                            </svg>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-foreground truncate">{file.name}</p>
                                        <p className="text-[10px] text-muted-foreground">{new Date(file.createdTime).toLocaleDateString()}</p>
                                    </div>
                                    <ChevronRight className="w-3 h-3 text-muted-foreground/50" />
                                </li>
                            );
                        })}
                    </ul>
                </div>
            )}

            {step === 'imported' && importResults.length > 0 && (
                <div className="p-3 border-t border-white/10 space-y-2">
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">Reporte de Importación</p>
                    {importResults.map((r) => (
                        <div key={r.fileName} className="flex items-center justify-between px-3 py-2 bg-white/5 rounded-xl border border-white/8">
                            <span className="text-xs font-medium text-foreground truncate max-w-[140px]">{r.fileName}</span>
                            <div className="flex items-center gap-3 text-xs">
                                <span className="text-emerald-400 font-bold">{r.rowsInserted} OK</span>
                                {r.errors.length > 0 && (
                                    <span className="text-rose-400 font-bold">{r.errors.length} err</span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {step === 'idle' && (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                    <div className="p-4 bg-accent/5 rounded-2xl border border-accent/10 mb-4">
                        <FolderSearch className="w-6 h-6 text-accent/60" />
                    </div>
                    <p className="text-xs text-muted-foreground font-medium max-w-[200px]">
                        Presiona <span className="text-accent font-bold">Escanear</span> para buscar archivos Sheets del semestre <span className="font-bold">{activeSemester}</span>.
                    </p>
                </div>
            )}
        </div>
    );
}
