/**
 * Normalización NFD absoluta.
 * Convierte a NFD, elimina diacríticos (tildes, etc.),
 * colapsa espacios y pasa a minúsculas.
 * @example "María José Gómez " → "maria jose gomez"
 */
export function normalizeNFD(text: string): string {
    if (!text) return '';
    return text
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim()
        .replace(/\s+/g, ' ');
}

/**
 * Genera tokens de búsqueda para un nombre completo.
 * Incluye el nombre completo y cada token de más de 2 caracteres.
 */
export function getNameSearchTokens(fullName: string): string[] {
    const normalized = normalizeNFD(fullName);
    const tokens = normalized.split(' ').filter((t) => t.length > 2);
    return [normalized, ...tokens];
}
