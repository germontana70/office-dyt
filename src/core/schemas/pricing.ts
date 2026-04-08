import { z } from 'zod';

export const ProgramPriceSchema = z.object({
  id: z.string().uuid().optional(),
  semester: z.string(),
  year: z.coerce.number().int().optional(),
  program_name: z.string(),
  cash_price: z.coerce.number().int().min(0).default(0),
  // ✅ DIRECTIVA: El % de incremento es específico por programa (definido en la Bóveda).
  // No se usa un porcentaje global genérico. Cada programa lo configura individualmente.
  increment_percentage: z.coerce.number().min(0).default(0),
  total_classes: z.coerce.number().int().default(16),
  total_financed: z.coerce.number().int().min(0).optional(),
  installments: z.record(z.string(), z.any()).optional() // JSONB
});

export type ProgramPrice = z.infer<typeof ProgramPriceSchema>;
