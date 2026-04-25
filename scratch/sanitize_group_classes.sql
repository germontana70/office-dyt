DO $$ 
BEGIN
    -- 1. Limpieza de Nombres de Grupos (EXPRESIÓN, INICIACIÓN, SALÓN)
    UPDATE dyt_group_classes SET name = REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(name, 
        '|Ô', 'Ó'), 
        '├ö', 'Ó'), 
        '|Ì', 'Í'), 
        '|Í', 'Á'), 
        '|æ', 'Ñ'),
        '|ë', 'É'),
        '|í', 'í');

    -- 2. Limpieza de Días de la Semana (SÁBADO)
    UPDATE dyt_group_classes SET day_of_week = REPLACE(REPLACE(REPLACE(day_of_week, 
        '|Í', 'Á'), 
        'S├¡bado', 'Sábado'),
        'Mi├®rcoles', 'Miércoles');

    -- 3. Limpieza de Salones (Si existe la columna o está en el nombre)
    UPDATE dyt_group_classes SET name = REPLACE(name, 'SAL|ÔN', 'SALÓN');
END $$;
