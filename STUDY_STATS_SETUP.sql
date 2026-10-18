-- StudyTogether Study Stats
-- No new table is required.
-- Study Stats reads the existing study_sessions and study_goals tables.
-- Run DASHBOARD_SETUP.sql first if study_sessions does not exist.

select column_name, data_type
from information_schema.columns
where table_schema = 'public'
  and table_name = 'study_sessions'
order by ordinal_position;

notify pgrst, 'reload schema';
