DO $$ 
BEGIN
    -- 1. Limpieza en la Tabla de Maestros (Teachers)
    UPDATE teachers SET name = REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(name, 
        '\u00C1', 'Á'), 
        '\u00C9', 'É'), 
        '\u00CD', 'Í'), 
        '\u00D3', 'Ó'), 
        '\u00DA', 'Ú'),
        '\u00F1', 'ñ');

    -- 2. Limpieza en la Tabla de Clases Grupales (Nombres y Horarios)
    UPDATE dyt_group_classes SET 
        name = REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(name, 
            '\u00C1', 'Á'), 
            '\u00C9', 'É'), 
            '\u00CD', 'Í'), 
            '\u00D3', 'Ó'), 
            '\u00DA', 'Ú'),
            '\u00F1', 'ñ'),
        day_of_week = REPLACE(REPLACE(day_of_week, 
            '\u00E1', 'á'), -- Para Sábado (S\u00E1b)
            '\u00E9', 'é'); -- Para Miércoles
END $$;
