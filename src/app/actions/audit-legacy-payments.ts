'use server';

import { google } from 'googleapis';
import path from 'path';
import fs from 'fs';
import { createClient } from '@/utils/supabase/server';

export interface AuditRecord {
    document: string;
    sheetName: string;
    dbName: string;
    isMatch: boolean;
    hasProgramMismatch: boolean;
    sheetPrograms?: string[];
    dbPrograms?: string[];
    hasInstallmentsMismatch?: boolean;
    sheetCuotas?: number;
    dbCuotas?: number;
    paymentPlanId?: string;
    enrollmentId?: string;
    baseDate: string;
    installments: Array<{
        cuota: number;
        amount: number;
        date: string;
        reference: string;
        method: string;
        bank?: string;
        isSynced?: boolean;
    }>;
}

const getSheetsClient = () => {
    try {
        const credentialsPath = path.join(process.cwd(), 'credenciales', 'credenciales_robot.json');

        if (!fs.existsSync(credentialsPath)) {
            throw new Error(`Error: No encontré el archivo en la ruta exacta: ${credentialsPath}`);
        }

        const credentialsData = fs.readFileSync(credentialsPath, 'utf8');
        const credentials = JSON.parse(credentialsData);

        if (!credentials.private_key || !credentials.client_email) {
            throw new Error(`El archivo ${path.basename(credentialsPath)} está vacío o mal configurado.`);
        }

        const auth = new google.auth.GoogleAuth({
            credentials: {
                client_email: credentials.client_email,
                private_key: credentials.private_key.replace(/\\n/g, '\n'),
            },
            scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
        });

        return google.sheets({ version: 'v4', auth });
    } catch (error: any) {
        console.error('[SHEETS SETUP] Fallo de inicialización de credenciales:', error);
        throw new Error(error.message || 'Google Sheets integration is not configured properly.');
    }
};

/**
 * Sanitiza números de documento eliminando puntos, espacios y guiones.
 */
const sanitizeDoc = (doc: any) => String(doc || '').replace(/[\.\s-]/g, '').trim();

/**
 * Extrae el número de cuota de un encabezado usando regex.
 */
const extractCuotaNumber = (header: string): number | null => {
    const match = header.match(/(\d+)/);
    return match ? parseInt(match[1], 10) : null;
};

/**
 * Parsea moneda en formato Latino (ej. $ 400.000,00 -> 400000).
 */
const parseLatinCurrency = (rawString: string): number => {
    if (!rawString) return 0;
    const sanitized = rawString
        .replace(/\$/g, '')
        .replace(/\s+/g, '')
        .replace(/\./g, '')
        .replace(/,/g, '.');
    const result = parseFloat(sanitized);
    return isNaN(result) ? 0 : result;
};

/**
 * Normaliza nombres eliminando tildes y pasando a minúsculas
 */
function normalizeName(s: string): string {
    return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

export async function fetchLegacyPaymentsAudit(): Promise<AuditRecord[]> {
    try {
        const { getActiveSemesterName } = await import('@/infra/services/semester-helper');
        const activeSemester = await getActiveSemesterName();
        const sheets = getSheetsClient();
        const spreadsheetId = '1T-JvH9bCj6v1rUcyxZw8uxjLkziZxw6YedwqlIHuEcI';
        
        // 1. Metadatos de la hoja
        const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
        const firstSheetName = spreadsheet.data.sheets?.[0]?.properties?.title || 'Respuestas de formulario 1';

        // 2. Obtener datos de Google Sheets
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: `${firstSheetName}!A:ZZ`,
        });

        const rows = response.data.values;
        if (!rows || rows.length === 0) {
            throw new Error('No se encontraron datos en la hoja de cálculo.');
        }

        const headers = rows[0];
        const dataRows = rows.slice(1);

        // Mapeo Dinámico de Encabezados
        let docIdx = -1, nameIdx = -1, dateIdx = -1, cuotasIdx = -1;
        let program1Idx = -1, program2Idx = -1;
        const installmentMap: Record<number, { amountIdx?: number, dateIdx?: number, refIdx?: number, methodIdx?: number, bankIdx?: number }> = {};

        headers.forEach((h: string, idx: number) => {
            const header = (h || '').toLowerCase().trim();
            if (header.includes('documento')) docIdx = idx;
            if (header.includes('nombre')) nameIdx = idx;
            
            // Proteger la columna 10 (K) de ser sobreescrita por columnas posteriores que contengan la palabra "cuotas" (ej. "Cuotas pagadas")
            if (idx === 10) {
                cuotasIdx = 10;
            } else if (header.includes('cuotas') && cuotasIdx !== 10) {
                // Solo asignar si no hemos asegurado la columna K
                cuotasIdx = idx;
            }

            if (header.includes('marca temporal')) dateIdx = idx;

            // Capturar Programa 1 y Programa 2 como índices separados
            if (header === 'programa 1' || header === 'programa1') program1Idx = idx;
            else if (header === 'programa 2' || header === 'programa2') program2Idx = idx;
            else if (header.includes('programa') && program1Idx === -1) program1Idx = idx; // fallback

            const cuotaNum = extractCuotaNumber(header);
            if (cuotaNum !== null) {
                if (!installmentMap[cuotaNum]) installmentMap[cuotaNum] = {};
                if (header.includes('pago efectuado')) installmentMap[cuotaNum].amountIdx = idx;
                if (header.includes('fecha efectuado')) installmentMap[cuotaNum].dateIdx = idx;
                if (header.includes('consecutivo pago')) installmentMap[cuotaNum].refIdx = idx;
                if (header.includes('forma de pago')) installmentMap[cuotaNum].methodIdx = idx;
                if (header.includes('banco') || header.includes('entidad')) installmentMap[cuotaNum].bankIdx = idx;
            }
        });

        // 3. Consulta Supabase Simplificada
        const supabase = await createClient();
        
        // Paso A: Buscar matrículas, programas y plan de pagos del semestre
        const { data: enrollments, error: enrollError } = await supabase
            .from('dyt_enrollments')
            .select(`
                id,
                student_id,
                semester,
                dyt_enrollment_programs (
                    id,
                    program_name
                ),
                dyt_payment_plans (
                    id,
                    plan_type,
                    installments_details
                )
            `)
            .eq('semester', activeSemester);

        if (enrollError) {
            console.error('[AUDIT] Supabase Enrollments Error:', enrollError?.message || JSON.stringify(enrollError));
            throw new Error('Error al consultar inscripciones de Supabase.');
        }

        const studentIds = enrollments?.map(e => e.student_id).filter(id => !!id) || [];

        // Paso B: Extraer estudiantes correspondientes por separado para evitar problemas de schema cache
        const { data: students, error: studentError } = await supabase
            .from('students')
            .select(`
                id,
                document_number,
                first_name,
                last_name
            `)
            .in('id', studentIds);

        if (studentError) {
            console.error('[AUDIT] Supabase Students Error:', studentError?.message || JSON.stringify(studentError));
            throw new Error('Error al consultar estudiantes de Supabase.');
        }

        // Mapa de búsqueda rápida en memoria cruzando ambas consultas
        const dbMap = new Map();
        
        // Indexamos estudiantes por ID
        const studentsById = new Map();
        students?.forEach(s => studentsById.set(s.id, s));

        enrollments?.forEach((enroll: any) => {
            const student = studentsById.get(enroll.student_id);
            if (student && student.document_number) {
                // Obtener nombres de programas en BD
                const dbPrograms = enroll.dyt_enrollment_programs ? enroll.dyt_enrollment_programs.map((p: any) => p.program_name) : [];
                
                // Obtener conteo de cuotas en BD y el ID del plan
                let dbCuotas = 0;
                let paymentPlanId = null;
                if (enroll.dyt_payment_plans && enroll.dyt_payment_plans.length > 0) {
                    const plan = enroll.dyt_payment_plans[0];
                    paymentPlanId = plan.id;
                    if (plan.plan_type === 'contado') {
                        dbCuotas = 1;
                    } else if (plan.installments_details) {
                        // El número de cuotas de financiación suele reflejarse en el length
                        dbCuotas = Array.isArray(plan.installments_details) ? plan.installments_details.length : 0;
                    }
                }

                dbMap.set(sanitizeDoc(student.document_number), {
                    fullName: `${student.first_name} ${student.last_name}`.trim(),
                    dbPrograms,
                    dbCuotas,
                    paymentPlanId,
                    enrollmentId: enroll.id
                });
            }
        });

        // Extraer todos los números de recibo parseados de la hoja para validar si ya existen
        const allReferenceCodes: string[] = [];
        dataRows.forEach(row => {
            Object.keys(installmentMap).forEach(key => {
                const config = installmentMap[parseInt(key, 10)];
                const ref = String(row[config.refIdx!] || '').trim();
                if (ref && ref !== 'N/A') {
                    allReferenceCodes.push(ref);
                }
            });
        });

        // Buscar transacciones que coincidan con estos códigos de referencia
        let syncedRefs = new Set<string>();
        if (allReferenceCodes.length > 0) {
             const { data: existingTxs, error: txError } = await supabase
                .from('dyt_transactions')
                .select('reference_number')
                .in('reference_number', allReferenceCodes);

             if (!txError && existingTxs) {
                 existingTxs.forEach(tx => {
                     if (tx.reference_number) syncedRefs.add(tx.reference_number);
                 });
             }
        }

        // 4. Cruce en Memoria
        const auditResults: AuditRecord[] = dataRows.map(row => {
            const rawDoc = row[docIdx] || '';
            const sanitizedDoc = sanitizeDoc(rawDoc);
            const sheetName = row[nameIdx] || 'N/A';
            const dbEntry = dbMap.get(sanitizedDoc);
            
            const installments: any[] = [];
            Object.keys(installmentMap).forEach(key => {
                const cuotaNum = parseInt(key, 10);
                const config = installmentMap[cuotaNum];
                if (config.amountIdx !== undefined) {
                    const amountRaw = row[config.amountIdx] || '0';
                    const amount = parseLatinCurrency(String(amountRaw)); // USANDO EL NUEVO PARSER
                    if (amount > 0) {
                        installments.push({
                            cuota: cuotaNum,
                            amount,
                            date: row[config.dateIdx!] || 'N/A',
                            reference: row[config.refIdx!] || 'N/A',
                            method: row[config.methodIdx!] || 'N/A',
                            bank: config.bankIdx !== undefined ? row[config.bankIdx] : 'N/A'
                        });
                    }
                }
            });

            // Alerta Académica: Combinar Programa 1 y Programa 2 de sus columnas separadas
            const prog1 = program1Idx !== -1 ? String(row[program1Idx] || '').trim() : '';
            const prog2 = program2Idx !== -1 ? String(row[program2Idx] || '').trim() : '';
            const sheetPrograms = [prog1, prog2].filter(p => p.length > 0);
            
            let hasProgramMismatch = false;
            let finalDbPrograms: string[] = [];
            
            if (dbEntry) {
                finalDbPrograms = dbEntry.dbPrograms || [];
                const normalizedDb = finalDbPrograms.map(normalizeName);
                
                // Verificar si todos los programas del Sheet existen en la BD (coincidencia parcial)
                for (const sheetProg of sheetPrograms) {
                    const normSheet = normalizeName(sheetProg);
                    if (!normalizedDb.some((dbP: string) => dbP.includes(normSheet) || normSheet.includes(dbP))) {
                        hasProgramMismatch = true;
                        break;
                    }
                }
                
                // Si la cantidad de programas difiere, asume mismatch
                if (sheetPrograms.length !== finalDbPrograms.length) {
                    hasProgramMismatch = true;
                }
            } else {
                hasProgramMismatch = true;
            }

            // Alerta de Cuotas
            const sheetCuotas = cuotasIdx !== -1 ? (parseInt(row[cuotasIdx], 10) || 0) : 0;
            const hasInstallmentsMismatch = dbEntry ? (dbEntry.dbCuotas !== sheetCuotas) : false;

            return {
                document: rawDoc,
                sheetName: sheetName,
                dbName: dbEntry ? dbEntry.fullName : 'NO ENCONTRADO EN BD',
                isMatch: !!dbEntry,
                hasProgramMismatch,
                sheetPrograms,
                dbPrograms: finalDbPrograms,
                hasInstallmentsMismatch,
                sheetCuotas,
                dbCuotas: dbEntry ? dbEntry.dbCuotas : 0,
                paymentPlanId: dbEntry ? dbEntry.paymentPlanId : undefined,
                enrollmentId: dbEntry ? dbEntry.enrollmentId : undefined,

                baseDate: row[dateIdx] || 'N/A',
                installments: installments.sort((a, b) => a.cuota - b.cuota).map(inst => ({
                    ...inst,
                    isSynced: syncedRefs.has(String(inst.reference).trim())
                }))
            };
        });

        return auditResults;

    } catch (error: any) {
        console.error('[AUDIT ACTION] Critical Error:', error);
        throw error;
    }
}
