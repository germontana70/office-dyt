"use client";

import { useState } from 'react';
import { StudentSearchSelect } from './StudentSearchSelect';
import { EnrollmentAuditCard } from './EnrollmentAuditCard';
import { getEnrollmentAudit } from '@/app/actions/migration';
import { CurrentStudent } from '../models/student.schema';

interface MatriculasClientViewProps {
    students: CurrentStudent[];
    semester: string;
}

export function MatriculasClientView({ students, semester }: MatriculasClientViewProps) {
    const [auditData, setAuditData] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    const handleStudentSelect = async (student: CurrentStudent) => {
        setLoading(true);
        try {
            const data = await getEnrollmentAudit(student.id || '', semester);
            setAuditData(data);
        } catch (error) {
            console.error('Error fetching audit:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <StudentSearchSelect 
                students={students} 
                onSelect={handleStudentSelect} 
                onSearchFocus={() => setAuditData(null)}
            />

            {loading && (
                <div className="w-full h-32 flex flex-col items-center justify-center gap-4 animate-pulse">
                    <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                    <p className="text-[10px] font-black uppercase tracking-widest text-primary/40">Auditando Bóveda...</p>
                </div>
            )}

            {!loading && auditData && (
                <EnrollmentAuditCard enrollment={auditData} />
            )}

            {!loading && !auditData && searchTermActive() && (
                 <div className="p-10 border-2 border-dashed border-white/10 rounded-[32px] text-center bg-[#0a0a0a]">
                    <p className="text-xs font-bold uppercase tracking-widest text-white/40">No hay registros en la nueva bóveda para este alumno</p>
                 </div>
            )}
        </div>
    );

    function searchTermActive() {
        // Simple logic for UI state
        return auditData === null && loading === false;
    }
}
