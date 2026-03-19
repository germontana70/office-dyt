'use server';

import { createClient } from '@/infra/services/server';
import { revalidatePath } from 'next/cache';

export async function getTeachers() {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from('teachers')
        .select('*')
        .eq('is_active', true)
        .order('name', { ascending: true });

    if (error) {
        console.error('Error fetching teachers:', error);
        return [];
    }
    return data || [];
}

export async function getGlobalSettings(semester: string) {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from('dyt_global_settings')
        .select('*')
        .eq('semester', semester)
        .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 is "No rows found"
        console.error('Error fetching global settings:', error);
        return null;
    }
    return data;
}

export async function upsertGlobalSettings(settings: { semester: string, enrollment_fee: number, tshirt_fee: number }) {
    const supabase = await createClient();
    const { error } = await supabase
        .from('dyt_global_settings')
        .upsert({
            semester: settings.semester,
            enrollment_fee: Number(settings.enrollment_fee),
            tshirt_fee: Number(settings.tshirt_fee),
            updated_at: new Date().toISOString()
        });

    if (error) {
        console.error('Error upserting global settings:', error);
        return { success: false, error: 'No se pudo guardar la configuración global.' };
    }

    revalidatePath('/dashboard/configuracion');
    return { success: true };
}

export async function getInstruments() {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from('dyt_instruments')
        .select('*')
        .order('name', { ascending: true });

    if (error) {
        console.error('Error fetching instruments:', error);
        return [];
    }
    return data;
}

export async function getProgramPricesBySemester(semester: string) {
    const supabase = await createClient();

    console.log('[FINANCE] Semestre enviado a la query:', semester);

    try {
        const { data: dytPrices, error: dytPricesError } = await supabase
            .from('dyt_program_prices')
            .select('program_name, valor_contado, increment_percentage, total_financed, installments, semester')
            .eq('semester', semester);

        console.log('[FINANCE] Programas recibidos (dyt_program_prices):', dytPrices);
        if (dytPricesError) {
            console.error('Error fetching dyt program prices:', dytPricesError);
        }

        if (!dytPricesError && dytPrices && dytPrices.length > 0) {
            return { data: dytPrices, error: null, source: 'dyt_program_prices' };
        }
    } catch (error: any) {
        // Continue to legacy if dyt_program_prices fails
    }

    try {
        const { data: legacyPrices, error: legacyPricesError } = await supabase
            .from('program_prices')
            .select('program_name, cash_price, increment_percentage, installments, semester')
            .eq('semester', semester);

        console.log('[FINANCE] Programas recibidos (program_prices):', legacyPrices);

        if (legacyPricesError) {
            console.error('Error fetching program prices:', legacyPricesError);
            return { data: [], error: legacyPricesError.message, source: 'program_prices' };
        }

        return { data: legacyPrices || [], error: null, source: 'program_prices' };
    } catch (error: any) {
        const message = error?.message || 'Error desconocido consultando program_prices';
        console.error('Error fetching program prices (exception):', message);
        return { data: [], error: message, source: 'program_prices' };
    }
}

export async function upsertInstrument(instrument: { id?: string, name: string, is_active: boolean }) {
    const supabase = await createClient();
    const payload = {
        name: instrument.name.trim(),
        is_active: instrument.is_active,
        updated_at: new Date().toISOString()
    };

    const { error } = await supabase
        .from('dyt_instruments')
        .upsert(instrument.id ? { ...payload, id: instrument.id } : payload);

    if (error) {
        if (error.code === '23505') {
            return { success: false, error: 'Este instrumento ya existe en el catálogo.' };
        }
        console.error('Error upserting instrument:', error);
        return { success: false, error: 'No se pudo guardar el instrumento.' };
    }

    revalidatePath('/dashboard/configuracion');
    return { success: true };
}

export async function deleteInstrument(instrumentId: string) {
    const supabase = await createClient();

    const { error } = await supabase
        .from('dyt_instruments')
        .delete()
        .eq('id', instrumentId);

    if (error) {
        console.error('Error deleting instrument:', error);
        return { success: false, error: 'No se pudo eliminar el instrumento.' };
    }

    revalidatePath('/dashboard/configuracion');
    return { success: true };
}

export async function getGroupClassesBySemester(semester: string) {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from('group_classes')
        .select('*')
        .eq('semester', semester)
        .order('name', { ascending: true });

    if (error) {
        console.error('Error fetching group classes:', error);
        return [];
    }
    return data;
}
