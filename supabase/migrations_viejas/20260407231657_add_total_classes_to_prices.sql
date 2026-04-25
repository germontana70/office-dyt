-- Add total_classes column to dyt_program_prices table
ALTER TABLE public.dyt_program_prices ADD COLUMN IF NOT EXISTS total_classes INTEGER DEFAULT 16;