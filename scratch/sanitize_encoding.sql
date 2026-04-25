-- Limpieza en Tabla de Profesores
UPDATE teachers SET name = REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(name, '├í', 'á'), '├®', 'é'), '├¡', 'í'), '├│', 'ó'), '├║', 'ú');
UPDATE teachers SET name = REPLACE(name, '├▒', 'ñ');
UPDATE teachers SET name = REPLACE(name, '├ae', 'ñ'); -- Caso específico visto en Wendy Tatiana

-- Limpieza en Tabla de Clases Grupales
UPDATE dyt_group_classes SET name = REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(name, '├í', 'á'), '├®', 'é'), '├¡', 'í'), '├│', 'ó'), '├║', 'ú');
UPDATE dyt_group_classes SET name = REPLACE(name, '├▒', 'ñ');

-- Limpieza de Metadatos de Horarios y Salones (Si son strings)
UPDATE dyt_group_classes SET day_of_week = REPLACE(day_of_week, 'S├¡bado', 'Sábado');
UPDATE dyt_group_classes SET day_of_week = REPLACE(day_of_week, 'Mi├®rcoles', 'Miércoles');
