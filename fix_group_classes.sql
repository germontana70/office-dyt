UPDATE group_classes
SET 
  teacher_name = REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(teacher_name, '├í', 'á'), '├⌐', 'é'), '├®', 'é'), '├¡', 'í'), '├│', 'ó'), '├║', 'ú'), '├ü', 'Á'), '├ë', 'É'), '├ì', 'Í'), '├ô', 'Ó'), '├Ü', 'Ú'), '├æ', 'Ñ'), '├▒', 'ñ'),
  schedule_day = REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(schedule_day, '├í', 'á'), '├⌐', 'é'), '├®', 'é'), '├¡', 'í'), '├│', 'ó'), '├║', 'ú'), '├ü', 'Á'), '├ë', 'É'), '├ì', 'Í'), '├ô', 'Ó'), '├Ü', 'Ú'), '├æ', 'Ñ'), '├▒', 'ñ'),
  classroom = REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(classroom, '├í', 'á'), '├⌐', 'é'), '├®', 'é'), '├¡', 'í'), '├│', 'ó'), '├║', 'ú'), '├ü', 'Á'), '├ë', 'É'), '├ì', 'Í'), '├ô', 'Ó'), '├Ü', 'Ú'), '├æ', 'Ñ'), '├▒', 'ñ');
