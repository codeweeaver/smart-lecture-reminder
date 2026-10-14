-- Fix: deleting a user fails with "Database error deleting user" if they are
-- referenced as a lecture's facilitator_id, because that FK had no ON DELETE
-- action (defaults to RESTRICT). Use SET NULL instead of CASCADE so the
-- lecture itself survives the lecturer's account being deleted.
do $$
declare
  fk_name text;
begin
  select tc.constraint_name into fk_name
  from information_schema.table_constraints tc
  join information_schema.key_column_usage kcu
    on tc.constraint_name = kcu.constraint_name
   and tc.table_schema = kcu.table_schema
  where tc.table_schema = 'public'
    and tc.table_name = 'lectures'
    and tc.constraint_type = 'FOREIGN KEY'
    and kcu.column_name = 'facilitator_id';

  if fk_name is not null then
    execute format('alter table public.lectures drop constraint %I', fk_name);
  end if;
end $$;

alter table public.lectures
  add constraint lectures_facilitator_id_fkey
  foreign key (facilitator_id) references public.users(id)
  on delete set null;
