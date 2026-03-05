import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { TeacherPaymentInfo } from './payments';

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

        const tableData = p.sessions.map(s => [
            new Date(s.event_date).toLocaleDateString(),
            s.program_name,
            s.status || 'N/A',
            '1.0 h',
            `$ ${p.hourlyRate.toLocaleString()}`
        ]);

        autoTable(doc, {
            startY: (doc as any).lastAutoTable.finalY + 20,
            head: [['Fecha', 'Programa', 'Estado', 'Horas', 'Subtotal']],
            body: tableData,
            theme: 'grid',
            headStyles: { fillColor: [50, 50, 50], textColor: 255 },
            styles: { fontSize: 9 },
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
