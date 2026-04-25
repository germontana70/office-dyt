ALTER TABLE IF EXISTS program_prices RENAME TO program_prices_legacy;

CREATE OR REPLACE VIEW program_prices AS
SELECT 
    id,
    program_name,
    valor_contado AS cash_price,   -- Compatibilidad implícita NextJS
    valor_contado,                 -- CORE Requirement
    total_financed AS valor_financiado,
    increment_percentage,          -- CORE Requirement
    installments,                  -- CORE Requirement
    semester,
    created_at,
    updated_at
FROM dyt_program_prices;
