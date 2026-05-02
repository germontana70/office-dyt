DO $$
BEGIN
  UPDATE calendar_events
  SET 
    teacher_name = REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(teacher_name, '├í', 'á'), '├⌐', 'é'), '├®', 'é'), '├¡', 'í'), '├│', 'ó'), '├║', 'ú'), '├ü', 'Á'), '├ë', 'É'), '├ì', 'Í'), '├ô', 'Ó'), '├Ü', 'Ú'), '├æ', 'Ñ'), '├▒', 'ñ'),
    program_name = REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(program_name, '├í', 'á'), '├⌐', 'é'), '├®', 'é'), '├¡', 'í'), '├│', 'ó'), '├║', 'ú'), '├ü', 'Á'), '├ë', 'É'), '├ì', 'Í'), '├ô', 'Ó'), '├Ü', 'Ú'), '├æ', 'Ñ'), '├▒', 'ñ'),
    notes = REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(notes, '├í', 'á'), '├⌐', 'é'), '├®', 'é'), '├¡', 'í'), '├│', 'ó'), '├║', 'ú'), '├ü', 'Á'), '├ë', 'É'), '├ì', 'Í'), '├ô', 'Ó'), '├Ü', 'Ú'), '├æ', 'Ñ'), '├▒', 'ñ');

  UPDATE group_calendar_events
  SET 
    day_of_week = REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(day_of_week, '├í', 'á'), '├⌐', 'é'), '├®', 'é'), '├¡', 'í'), '├│', 'ó'), '├║', 'ú'), '├ü', 'Á'), '├ë', 'É'), '├ì', 'Í'), '├ô', 'Ó'), '├Ü', 'Ú'), '├æ', 'Ñ'), '├▒', 'ñ'),
    notes = REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(notes, '├í', 'á'), '├⌐', 'é'), '├®', 'é'), '├¡', 'í'), '├│', 'ó'), '├║', 'ú'), '├ü', 'Á'), '├ë', 'É'), '├ì', 'Í'), '├ô', 'Ó'), '├Ü', 'Ú'), '├æ', 'Ñ'), '├▒', 'ñ');
END $$;
