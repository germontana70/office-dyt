import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { TeacherPaymentInfo } from './payments';
import { resolveStudentLabel } from '@/core/utils/resolveStudentLabel';

export const reportService = {
    /**
     * Genera un reporte PDF de liquidación para un docente específico con formato institucional.
     */
    generateTeacherPDF(p: TeacherPaymentInfo, startDate: string, endDate: string) {
        const doc = new jsPDF({
            orientation: 'landscape',
            unit: 'mm',
            format: 'letter'
        });

        // --- Encabezado ---
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(22);
        doc.setTextColor(40, 40, 40);
        doc.text('DONES Y TALENTOS', 14, 20);

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 100, 100);
        doc.text('Sistema de Gestión Institucional (SIA 2.0)', 14, 26);
        doc.text(`Periodo: ${startDate} - ${endDate}`, 14, 31);

        // --- Título del Reporte ---
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text(`LIQUIDACIÓN DE HONORARIOS: ${p.teacherName}`, 14, 45);

        // --- Resumen Financiero ---
        autoTable(doc, {
            startY: 52,
            head: [['Concepto', 'Detalle']],
            body: [
                ['Total Horas', `${p.totalHours} h`],
                ['Tarifa por Hora', `$ ${p.hourlyRate.toLocaleString()} COP`],
                ['Total a Pagar', `$ ${p.totalPayment.toLocaleString()} COP`],
            ],
            theme: 'striped',
            headStyles: { fillColor: [200, 200, 200], textColor: 50 },
            styles: { fontSize: 11, cellPadding: 3 },
            columnStyles: { 0: { fontStyle: 'bold', cellWidth: 40 } }
        });

        // --- Detalle de Clases ---
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('DESGLOSE DE ACTIVIDADES', 14, (doc as any).lastAutoTable.finalY + 15);

        const tableData: any[][] = [];

        p.sessions.forEach(s => {
            const isCancelled = (s.status || '').toLowerCase() === 'cancelled';
            const rawHours = s.event_end_time 
                ? (new Date(s.event_end_time).getTime() - new Date(s.event_date).getTime()) / (1000 * 60 * 60)
                : 1;
            const hours = Math.round(rawHours * 100) / 100;
            const effHours = isCancelled ? 0 : hours;
            const subtotal = effHours * p.hourlyRate;

            // Resolución discriminada: 1a1 → nombre alumno | Grupal → nombre programa
            const studentName = resolveStudentLabel(s);

            // Format date forcing America/Bogota correctly from UTC
            let dateTimeGMT5 = s.event_date;
            try {
                const d = new Date(s.event_date);
                const datePart = new Intl.DateTimeFormat('es-CO', { timeZone: 'America/Bogota', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
                const timePart = new Intl.DateTimeFormat('es-CO', { timeZone: 'America/Bogota', hour: '2-digit', minute: '2-digit', hour12: true }).format(d);
                dateTimeGMT5 = `${datePart}\n${timePart}`;
            } catch {
                dateTimeGMT5 = new Date(s.event_date).toLocaleString();
            }

            const statusUpper = (s.status || '').toUpperCase();
            let badgeStatus = 'PROGRAMADA';
            if (statusUpper === 'CANCELLED' || statusUpper === 'CANCELADA') badgeStatus = 'CANCELADA';
            else if (statusUpper === 'MAKEUP' || statusUpper === 'REPOSICIÓN') badgeStatus = 'REPOSICIÓN';
            else if (statusUpper === 'COMPLETED' || statusUpper === 'COMPLETADA') badgeStatus = 'COMPLETADA';

            tableData.push([
                dateTimeGMT5,
                studentName,
                s.program_name,
                s.class_number ? `Clase ${s.class_number}` : 'N/A',
                badgeStatus,
                `${effHours} h`,
                `$ ${subtotal.toLocaleString()}`
            ]);


        });

        autoTable(doc, {
            startY: (doc as any).lastAutoTable.finalY + 20,
            head: [['Fecha / Hora', 'Estudiante', 'Programa', 'Altura', 'Estado', 'Horas', 'Subtotal']],
            body: tableData,
            theme: 'grid',
            headStyles: { fillColor: [50, 50, 50], textColor: 255 },
            styles: { fontSize: 8 },
        });

        // --- Firma y Pie de Página ---
        const finalY = (doc as any).lastAutoTable.finalY + 30;
        doc.line(14, finalY, 80, finalY);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.text('Firma Recibido Docente', 14, finalY + 5);
        doc.text(`Generado el: ${new Date().toLocaleString()}`, 14, 205);

        // Descarga el archivo
        doc.save(`Liquidacion_${p.teacherName.replace(/\s+/g, '_')}_${endDate}.pdf`);
    }
};
