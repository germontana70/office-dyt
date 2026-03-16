"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

interface SequentialNavigatorProps {
    currentIndex: number;
    total: number;
    onPrev: () => void;
    onNext: () => void;
    className?: string;
}

export function SequentialNavigator({ currentIndex, total, onPrev, onNext, className }: SequentialNavigatorProps) {
    const hasPrev = currentIndex > 0;
    const hasNext = currentIndex >= 0 && currentIndex < total - 1;

    return (
        <div className={`inline-flex items-center gap-1 glass-panel px-1.5 py-1.5 rounded-full border border-white/10 bg-black/60 shadow-lg shadow-black/40 ${className || ''}`}>
            <button
                type="button"
                onClick={onPrev}
                disabled={!hasPrev}
                className={`p-2 rounded-full flex items-center justify-center transition-all duration-300 ${
                    hasPrev 
                        ? "text-white/70 hover:text-white hover:bg-white/10 active:scale-95" 
                        : "opacity-30 cursor-not-allowed text-white/40"
                }`}
                aria-label="Estudiante anterior"
            >
                <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="px-3 min-w-[4.5rem] text-center pointer-events-none select-none">
                <span className="text-[11px] font-black uppercase tracking-widest text-primary/80">
                    <span className="text-white">{currentIndex + 1}</span> / {total}
                </span>
            </div>
            <button
                type="button"
                onClick={onNext}
                disabled={!hasNext}
                className={`p-2 rounded-full flex items-center justify-center transition-all duration-300 ${
                    hasNext 
                        ? "text-white/70 hover:text-white hover:bg-white/10 active:scale-95" 
                        : "opacity-30 cursor-not-allowed text-white/40"
                }`}
                aria-label="Siguiente estudiante"
            >
                <ChevronRight className="w-4 h-4" />
            </button>
        </div>
    );
}
