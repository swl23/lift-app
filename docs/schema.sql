-- Lift App schema (Phase 1 draft). Explained in docs/data-model.md.
-- Requires PostgreSQL 15+ (ON DELETE SET NULL with a column list).
-- In Phase 4, `users` is replaced by the auth provider's user table.
--
-- Links that refuse a delete (an exercise with logs, a track a slot uses)
-- are checked at the end of the transaction ("deferrable initially
-- deferred"). Checked immediately, they can fire before a cascade has
-- removed the rows behind them, which breaks deleting a whole account.

create table users (
  id    uuid primary key default gen_random_uuid(),
  email text not null unique
);

-- ---------------------------------------------------------------- shared

create table exercises (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references users on delete cascade,
  name             text not null check (btrim(name) <> ''),
  measurement_type text not null
                   check (measurement_type in ('reps', 'time', 'done')),
  -- floor for targets, not logged sets (009); empty = Bodyweight
  lowest_weight_lb numeric(6, 2) check (lowest_weight_lb > 0),
  created_at       timestamptz not null default now(),
  unique (id, user_id),
  unique (id, measurement_type),
  check (measurement_type = 'reps' or lowest_weight_lb is null)
);
-- "Chest press" and "chest press " are the same exercise.
create unique index exercises_name_per_user
  on exercises (user_id, lower(btrim(name)));

create table programs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references users on delete cascade,
  name        text not null check (btrim(name) <> ''),
  is_active   boolean not null default false,
  next_day_id uuid, -- empty = the first day by position; FK added below
  created_at  timestamptz not null default now(),
  unique (id, user_id)
);
create unique index programs_one_active_per_user
  on programs (user_id) where is_active;

create table days (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null,
  program_id uuid not null,
  name       text not null check (btrim(name) <> ''),
  position   integer not null check (position >= 1),
  unique (id, program_id, user_id),
  unique (id, program_id),
  unique (id, user_id),
  unique (program_id, position) deferrable initially deferred,
  foreign key (program_id, user_id)
    references programs (id, user_id) on delete cascade
);

alter table programs
  add foreign key (next_day_id, id)
  references days (id, program_id) on delete set null (next_day_id);

create table tracks (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null,
  program_id       uuid not null,
  exercise_id      uuid not null,
  measurement_type text not null,
  rule             text not null check (rule in ('single', 'double', 'none')),
  rep_min          integer check (rep_min >= 1),
  rep_max          integer,
  target_reps      integer check (target_reps between 1 and 200),
  weight_lb        numeric(6, 2) check (weight_lb > 0), -- empty = bodyweight
  target_seconds   integer check (target_seconds > 0), -- empty = open-ended
  increment_lb     numeric(6, 2) not null default 5 check (increment_lb > 0),
  unique (id, program_id, exercise_id),
  foreign key (program_id, user_id)
    references programs (id, user_id) on delete cascade,
  foreign key (exercise_id, user_id) references exercises (id, user_id)
    deferrable initially deferred,
  foreign key (exercise_id, measurement_type)
    references exercises (id, measurement_type) on update cascade
    deferrable initially deferred,
  check (rep_max >= rep_min),
  check (rule = 'none' or target_reps is not null),
  check (rule <> 'double' or (rep_min is not null and rep_max is not null)),
  check (rule <> 'single' or (rep_min is null and rep_max is null)),
  check (case measurement_type
    when 'reps' then target_seconds is null
    when 'time' then rule = 'none' and rep_min is null and rep_max is null
                     and target_reps is null and weight_lb is null
    when 'done' then rule = 'none' and rep_min is null and rep_max is null
                     and target_reps is null and weight_lb is null
                     and target_seconds is null
  end)
);

create table slots (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null,
  program_id  uuid not null,
  day_id      uuid not null,
  track_id    uuid not null,
  exercise_id uuid not null,
  position    integer not null check (position >= 1),
  set_count   integer not null check (set_count >= 1),
  unique (id, exercise_id),
  unique (day_id, position) deferrable initially deferred,
  foreign key (day_id, program_id, user_id)
    references days (id, program_id, user_id) on delete cascade,
  foreign key (track_id, program_id, exercise_id)
    references tracks (id, program_id, exercise_id)
    deferrable initially deferred
);

-- ------------------------------------------------------------------- log

create table workouts (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references users on delete cascade,
  kind         text not null
               check (kind in ('program', 'off_program_day', 'freeform')),
  status       text not null default 'open'
               check (status in ('open', 'submitted')),
  day_id       uuid, -- empty for freeform, or after the day is deleted
  started_at   timestamptz not null default now(),
  submitted_at timestamptz,
  unique (id, user_id),
  foreign key (day_id, user_id)
    references days (id, user_id) on delete set null (day_id),
  check (kind <> 'freeform' or day_id is null),
  check ((status = 'open') = (submitted_at is null))
);
create unique index workouts_one_open_per_user
  on workouts (user_id) where status = 'open';

create table workout_exercises (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null,
  workout_id       uuid not null,
  exercise_id      uuid not null,
  measurement_type text not null,
  slot_id          uuid, -- empty for freeform, or after the slot is deleted
  position         integer not null check (position >= 1),
  next_reps        integer check (next_reps between 1 and 200),
  next_weight_lb   numeric(6, 2) check (next_weight_lb > 0),
  confirmed_at     timestamptz,
  unique (id, user_id, measurement_type),
  unique (workout_id, position) deferrable initially deferred,
  foreign key (workout_id, user_id)
    references workouts (id, user_id) on delete cascade,
  foreign key (exercise_id, user_id) references exercises (id, user_id)
    deferrable initially deferred,
  -- No update action: an exercise's type is locked once it's logged (req 3).
  foreign key (exercise_id, measurement_type)
    references exercises (id, measurement_type)
    deferrable initially deferred,
  foreign key (slot_id, exercise_id)
    references slots (id, exercise_id) on delete set null (slot_id)
);

create table sets (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null,
  workout_exercise_id uuid not null,
  measurement_type    text not null,
  set_number          integer not null check (set_number >= 1),
  target_reps         integer check (target_reps >= 1),
  target_weight_lb    numeric(6, 2) check (target_weight_lb > 0),
  target_seconds      integer check (target_seconds > 0),
  reps                integer check (reps >= 0),
  weight_lb           numeric(6, 2) check (weight_lb > 0),
  seconds             integer check (seconds >= 0),
  done                boolean,
  logged_at           timestamptz not null default now(),
  unique (workout_exercise_id, set_number) deferrable initially deferred,
  foreign key (workout_exercise_id, user_id, measurement_type)
    references workout_exercises (id, user_id, measurement_type)
    on delete cascade,
  check (case measurement_type
    when 'reps' then reps is not null and seconds is null and done is null
                     and target_seconds is null
    when 'time' then seconds is not null and reps is null and done is null
                     and weight_lb is null and target_reps is null
                     and target_weight_lb is null
    when 'done' then done is not null and reps is null and seconds is null
                     and weight_lb is null and target_reps is null
                     and target_weight_lb is null and target_seconds is null
  end)
);

-- --------------------------------------------------------------- indexes
-- Postgres indexes primary keys and unique constraints, but not the
-- referencing side of a foreign key. Row-level security filters on user_id.

create index on exercises (user_id);
create index on programs (user_id);
create index on programs (next_day_id);
create index on days (user_id);
create index on tracks (user_id);
create index on tracks (program_id);
create index on tracks (exercise_id);
create index on slots (user_id);
create index on slots (track_id);
create index on slots (program_id);
create index on workouts (user_id, started_at desc);
create index on workouts (day_id);
create index on workout_exercises (user_id);
create index on workout_exercises (exercise_id);
create index on workout_exercises (slot_id);
create index on sets (user_id);
