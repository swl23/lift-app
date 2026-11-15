-- Use-case tests for docs/schema.sql. Run against an empty database:
--   psql -v ON_ERROR_STOP=1 -f docs/schema.sql -f docs/schema-tests.sql
-- Every check prints "ok"; any failure stops the run with an error.

\set QUIET on
\pset tuples_only on
set client_min_messages = notice;

create function must_fail(stmt text, label text) returns void
language plpgsql as $$
begin
  set constraints all immediate; -- check deferred rules now, not at commit
  execute stmt;
  raise exception 'FAILED (should have been refused): %', label;
exception
  when integrity_constraint_violation then
    raise notice 'ok (refused): %', label;
end $$;

create function must_equal(actual text, expected text, label text)
returns void language plpgsql as $$
begin
  if actual is distinct from expected then
    raise exception 'FAILED: % (got %, expected %)', label, actual, expected;
  end if;
  raise notice 'ok: %', label;
end $$;

-- Readable fixed ids. Hex digit prefixes: 0 user, e exercise, a program,
-- d day, c track, b slot, f workout, 9 workout exercise.
\set me     '''00000000-0000-0000-0000-00000000000a'''
\set friend '''00000000-0000-0000-0000-00000000000b'''
\set press  '''e0000000-0000-0000-0000-000000000001'''
\set lat    '''e0000000-0000-0000-0000-000000000002'''
\set dips   '''e0000000-0000-0000-0000-000000000003'''
\set plank  '''e0000000-0000-0000-0000-000000000004'''
\set fpress '''e0000000-0000-0000-0000-0000000000f1'''
\set ul     '''a0000000-0000-0000-0000-000000000001'''
\set summer '''a0000000-0000-0000-0000-000000000002'''
\set fprog  '''a0000000-0000-0000-0000-0000000000f1'''
\set up1    '''d0000000-0000-0000-0000-000000000001'''
\set lo1    '''d0000000-0000-0000-0000-000000000002'''
\set up2    '''d0000000-0000-0000-0000-000000000003'''
\set lo2    '''d0000000-0000-0000-0000-000000000004'''
\set sumA   '''d0000000-0000-0000-0000-000000000005'''
\set fday   '''d0000000-0000-0000-0000-0000000000f1'''
\set tpress '''c0000000-0000-0000-0000-000000000001'''
\set tlat   '''c0000000-0000-0000-0000-000000000002'''
\set tdips  '''c0000000-0000-0000-0000-000000000003'''
\set tplank '''c0000000-0000-0000-0000-000000000004'''
\set tsum   '''c0000000-0000-0000-0000-000000000005'''
\set ftrack '''c0000000-0000-0000-0000-0000000000f1'''
\set s_press '''b0000000-0000-0000-0000-000000000001'''
\set s_lat1  '''b0000000-0000-0000-0000-000000000002'''
\set s_lat2  '''b0000000-0000-0000-0000-000000000003'''
\set s_dips  '''b0000000-0000-0000-0000-000000000004'''
\set w1     '''f0000000-0000-0000-0000-000000000001'''
\set w2     '''f0000000-0000-0000-0000-000000000002'''
\set we1    '''90000000-0000-0000-0000-000000000001'''
\set we2    '''90000000-0000-0000-0000-000000000002'''
\set we3    '''90000000-0000-0000-0000-000000000003'''

insert into users values (:me, 'me@example.com'),
                         (:friend, 'friend@example.com');

-- ================================================== Build your split
insert into exercises (id, user_id, name, measurement_type) values
  (:press, :me, 'Chest press', 'reps'),
  (:lat, :me, 'Lateral raise machine', 'reps'),
  (:dips, :me, 'Dips', 'reps'),
  (:plank, :me, 'Plank', 'reps'), -- created with the wrong type on purpose
  (:fpress, :friend, 'Chest press', 'reps');
select must_equal('ok', 'ok', 'two users can each have "Chest press"');

select must_fail(format($$insert into exercises (user_id, name,
  measurement_type) values (%L, ' chest PRESS', 'reps')$$, :me),
  'duplicate exercise name, different case and spacing');

-- Insert order for the programs <-> days loop: program, days, next day.
insert into programs (id, user_id, name, is_active) values
  (:ul, :me, 'Upper/Lower 4-day', true),
  (:summer, :me, 'Summer 3-day', false),
  (:fprog, :friend, 'Friend split', true);
insert into days (id, user_id, program_id, name, position) values
  (:up1, :me, :ul, 'Upper 1', 1), (:lo1, :me, :ul, 'Lower 1', 2),
  (:up2, :me, :ul, 'Upper 2', 3), (:lo2, :me, :ul, 'Lower 2', 4),
  (:sumA, :me, :summer, 'Day A', 1),
  (:fday, :friend, :fprog, 'Friend day', 1);
update programs set next_day_id = :up1 where id = :ul;
select must_equal('ok', 'ok', 'program, then days, then next day');

select must_fail(format($$update programs set next_day_id = %L
  where id = %L$$, :sumA, :ul), 'next day from another program');
select must_fail(format($$insert into programs (user_id, name, is_active)
  values (%L, 'Second active', true)$$, :me), 'two active programs');

-- Switching the active program: deactivate first, then activate.
begin;
update programs set is_active = false where user_id = :me and is_active;
update programs set is_active = true where id = :summer;
update programs set is_active = false where id = :summer;
update programs set is_active = true where id = :ul;
commit;
select must_equal('ok', 'ok', 'switch active program in two steps');

insert into tracks (id, user_id, program_id, exercise_id, measurement_type,
                    rule, rep_min, rep_max, target_reps, weight_lb) values
  (:tpress, :me, :ul, :press, 'reps', 'double', 6, 8, 6, 110),
  (:tlat, :me, :ul, :lat, 'reps', 'double', 6, 8, 7, 70),
  (:tdips, :me, :ul, :dips, 'reps', 'none', null, null, null, null),
  (:tplank, :me, :ul, :plank, 'reps', 'none', null, null, null, null),
  (:tsum, :me, :summer, :press, 'reps', 'double', 8, 10, 8, 100),
  (:ftrack, :friend, :fprog, :fpress, 'reps', 'double', 5, 5, 5, 135);

select must_fail(format($$insert into tracks (user_id, program_id,
  exercise_id, measurement_type, rule) values (%L, %L, %L, 'reps',
  'double')$$, :me, :ul, :press), 'double progression without a rep range');
select must_fail(format($$insert into tracks (user_id, program_id,
  exercise_id, measurement_type, rule) values (%L, %L, %L, 'time',
  'none')$$, :me, :ul, :press), 'track type differs from its exercise');
select must_fail(format($$insert into tracks (user_id, program_id,
  exercise_id, measurement_type, rule) values (%L, %L, %L, 'reps',
  'none')$$, :me, :ul, :fpress), 'track using another user''s exercise');

insert into slots (id, user_id, program_id, day_id, track_id, exercise_id,
                   position, set_count) values
  (:s_press, :me, :ul, :up1, :tpress, :press, 1, 3),
  (:s_lat1, :me, :ul, :up1, :tlat, :lat, 5, 3),
  (:s_lat2, :me, :ul, :up2, :tlat, :lat, 5, 3), -- shares Upper 1's track
  (:s_dips, :me, :ul, :lo2, :tdips, :dips, 5, 3);
select must_equal('ok', 'ok', 'two slots share one track');

select must_fail(format($$insert into slots (user_id, program_id, day_id,
  track_id, exercise_id, position, set_count) values (%L, %L, %L, %L, %L,
  2, 3)$$, :me, :ul, :up1, :tsum, :press),
  'slot using a track from another program');
select must_fail(format($$insert into slots (user_id, program_id, day_id,
  track_id, exercise_id, position, set_count) values (%L, %L, %L, %L, %L,
  2, 3)$$, :me, :ul, :up1, :tpress, :lat),
  'slot exercise differs from its track''s exercise');
select must_fail(format($$insert into slots (user_id, program_id, day_id,
  track_id, exercise_id, position, set_count) values (%L, %L, %L, %L, %L,
  2, 3)$$, :me, :ul, :up1, :ftrack, :fpress),
  'slot using another user''s track');
select must_fail(format($$insert into slots (user_id, program_id, day_id,
  track_id, exercise_id, position, set_count) values (%L, %L, %L, %L, %L,
  1, 3)$$, :me, :ul, :up1, :tdips, :dips), 'two slots at position 1');
select must_fail(format($$insert into slots (user_id, program_id, day_id,
  track_id, exercise_id, position, set_count) values (%L, %L, %L, %L, %L,
  9, 0)$$, :me, :ul, :up1, :tdips, :dips), 'slot with 0 sets');

-- Reordering days swaps positions inside one transaction.
begin;
update days set position = 2 where id = :up1;
update days set position = 1 where id = :lo1;
commit;
begin;
update days set position = 1 where id = :up1;
update days set position = 2 where id = :lo1;
commit;
select must_equal('ok', 'ok', 'swap day positions in one transaction');

-- Fixing a wrongly typed exercise that has no logs: the track follows.
begin;
update exercises set measurement_type = 'time' where id = :plank;
commit;
select must_equal((select measurement_type from tracks where id = :tplank),
  'time', 'unlogged exercise changes type and its track follows');

-- ===================================================== Log Upper 1
insert into workouts (id, user_id, kind, day_id) values
  (:w1, :me, 'program', :up1);
insert into workout_exercises (id, user_id, workout_id, exercise_id,
                               measurement_type, slot_id, position) values
  (:we1, :me, :w1, :press, 'reps', :s_press, 1),
  (:we2, :me, :w1, :lat, 'reps', :s_lat1, 2);
insert into sets (user_id, workout_exercise_id, measurement_type, set_number,
                  target_reps, target_weight_lb, reps, weight_lb) values
  (:me, :we1, 'reps', 1, 6, 110, 6, 110),
  (:me, :we1, 'reps', 2, 6, 110, 6, 110),
  (:me, :we1, 'reps', 3, 6, 110, 6, 110),
  (:me, :we2, 'reps', 1, 7, 70, 7, 70);
select must_equal('ok', 'ok', 'log a program workout');

select must_fail(format($$insert into sets (user_id, workout_exercise_id,
  measurement_type, set_number, reps) values (%L, %L, 'reps', 3, 6)$$,
  :me, :we1), 'two sets numbered 3');
select must_fail(format($$insert into sets (user_id, workout_exercise_id,
  measurement_type, set_number, reps, seconds) values (%L, %L, 'reps', 4, 6,
  30)$$, :me, :we1), 'reps set that also has seconds');
select must_fail(format($$insert into sets (user_id, workout_exercise_id,
  measurement_type, set_number, seconds) values (%L, %L, 'time', 4, 30)$$,
  :me, :we1), 'timed set under a reps exercise');
select must_fail(format($$insert into sets (user_id, workout_exercise_id,
  measurement_type, set_number) values (%L, %L, 'reps', 4)$$, :me, :we1),
  'set with nothing logged');
select must_fail(format($$insert into workout_exercises (user_id,
  workout_id, exercise_id, measurement_type, slot_id, position) values
  (%L, %L, %L, 'reps', %L, 3)$$, :me, :w1, :dips, :s_press),
  'logged exercise differs from its slot''s exercise');
select must_fail(format($$insert into workouts (user_id, kind) values
  (%L, 'freeform')$$, :me), 'second open workout');
select must_fail(format($$insert into workouts (user_id, kind, day_id)
  values (%L, 'off_program_day', %L)$$, :friend, :up1),
  'workout on another user''s day');
select must_fail(format($$update exercises set measurement_type = 'time'
  where id = %L$$, :press), 'change type of a logged exercise (req 3)');
select must_fail(format($$delete from exercises where id = %L$$, :press),
  'delete an exercise that has logs');

-- Confirm screen: OK with 7 @ 110, then submit.
update workout_exercises set next_reps = 7, next_weight_lb = 110,
  confirmed_at = now() where id = :we1;
select must_fail(format($$update workout_exercises set next_weight_lb = 1
  where id = %L$$, :we1), 'confirmed weight below 2.5 lb');
update workouts set status = 'submitted', submitted_at = now()
  where id = :w1;
select must_fail(format($$update workouts set status = 'open'
  where id = %L$$, :w1), 'open workout with a submitted time');

-- =============================================== Freeform workout
insert into workouts (id, user_id, kind) values (:w2, :me, 'freeform');
insert into workout_exercises (id, user_id, workout_id, exercise_id,
                               measurement_type, position) values
  (:we3, :me, :w2, :dips, 'reps', 1);
insert into sets (user_id, workout_exercise_id, measurement_type, set_number,
                  reps) values (:me, :we3, 'reps', 1, 12);
select must_equal('ok', 'ok', 'freeform workout, bodyweight set');
select must_fail(format($$update workouts set day_id = %L where id = %L$$,
  :up1, :w2), 'freeform workout with a day');

-- ============================================== Discard a workout
delete from workouts where id = :w2;
select must_equal((select count(*)::text from sets
  where workout_exercise_id = :we3), '0', 'discard deletes its sets');

-- ========================================== Delete a slot (010)
select must_fail(format($$delete from tracks where id = %L$$, :tlat),
  'delete a track a slot still uses');
delete from slots where id = :s_lat1;
select must_equal((select slot_id::text from workout_exercises
  where id = :we2), null, 'deleted slot empties slot_id');
select must_equal((select exercise_id::text || ' ' || user_id::text
  from workout_exercises where id = :we2), :lat || ' ' || :me,
  'exercise and owner survive the slot delete');
select must_equal((select count(*)::text from sets
  where workout_exercise_id = :we2), '1', 'sets survive the slot delete');

-- ============================================ Delete the next day
update programs set next_day_id = :up2 where id = :ul;
delete from days where id = :up2;
select must_equal((select next_day_id::text from programs where id = :ul),
  null, 'deleted next day empties next_day_id (app uses first day)');
select must_equal((select count(*)::text from tracks where id = :tlat), '1',
  'orphaned track stays until the app deletes it (010)');

-- ================================== Delete a day with history
delete from days where id = :up1;
select must_equal((select coalesce(day_id::text, 'empty') || '|' ||
  user_id::text from workouts where id = :w1), 'empty|' || :me,
  'deleted day empties day_id, owner stays');

-- =============================================== Delete a program
delete from programs where id = :ul;
select must_equal((select count(*)::text from days where program_id = :ul),
  '0', 'program delete removes its days');
select must_equal((select count(*)::text from tracks where program_id = :ul),
  '0', 'program delete removes its tracks');
select must_equal((select count(*)::text from sets s
  join workout_exercises we on we.id = s.workout_exercise_id
  where we.workout_id = :w1), '4', 'logged sets survive the program delete');

-- ================================================ Delete account
delete from users where id = :me;
select must_equal((select count(*)::text from exercises
  where user_id = :me), '0', 'account delete removes everything');
select must_equal((select count(*)::text from exercises
  where user_id = :friend), '1', 'other user untouched');

\echo 'All schema tests passed.'
