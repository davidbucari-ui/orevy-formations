-- ════════════════════════════════════════════════════════════════════════════
-- Orevy Formations — progression, résultats de quiz, structures, invitations
--
-- À exécuter après 001_auth_rls.sql. N'efface aucune donnée et peut être
-- relancé. L'ancienne version du site continue de fonctionner après ce
-- script : seul 003 coupe la lecture directe des réponses du quiz.
--
--   progression     : modules lus par chaque participant
--   resultats_quiz  : chaque tentative de quiz, notée par la base
--   structures      : crèches / clients auxquels rattacher les participants
--   envois          : historique des invitations et relances par email
-- ════════════════════════════════════════════════════════════════════════════

-- ── Petites corrections signalées par l'audit Supabase ──────────────────────
create or replace function public.email_connecte()
returns text language sql stable set search_path = public
as $$ select lower(coalesce(auth.jwt() ->> 'email', '')) $$;

-- Les fonctions d'aide ne servent qu'aux règles des utilisateurs connectés.
revoke execute on function public.is_admin() from public, anon;
revoke execute on function public.is_participant() from public, anon;
revoke execute on function public.a_acces(uuid) from public, anon;
grant execute on function public.is_admin(), public.is_participant(), public.a_acces(uuid) to authenticated;

create or replace function public.participant_courant()
returns uuid language sql stable security definer set search_path = public
as $$ select id from participants where lower(email) = email_connecte() limit 1 $$;
revoke execute on function public.participant_courant() from public, anon;
grant execute on function public.participant_courant() to authenticated;

-- ── Seuil de réussite propre à chaque formation ─────────────────────────────
alter table public.formations add column if not exists seuil_reussite integer not null default 70;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'formations_seuil_reussite_check') then
    alter table public.formations add constraint formations_seuil_reussite_check check (seuil_reussite between 0 and 100);
  end if;
end $$;

-- ── Structures ──────────────────────────────────────────────────────────────
create table if not exists public.structures (
  id uuid primary key default gen_random_uuid(),
  nom text not null unique,
  created_at timestamptz not null default now()
);
alter table public.participants add column if not exists structure_id uuid references public.structures(id) on delete set null;

-- ── Progression ─────────────────────────────────────────────────────────────
create table if not exists public.progression (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references public.participants(id) on delete cascade,
  formation_id uuid not null references public.formations(id) on delete cascade,
  module_num integer not null,
  lu_le timestamptz not null default now(),
  unique (participant_id, formation_id, module_num)
);

-- ── Résultats de quiz ───────────────────────────────────────────────────────
create table if not exists public.resultats_quiz (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references public.participants(id) on delete cascade,
  formation_id uuid not null references public.formations(id) on delete cascade,
  score integer not null,
  total integer not null,
  seuil integer not null,
  reussi boolean not null,
  reponses jsonb not null default '{}'::jsonb,
  passe_le timestamptz not null default now()
);
create index if not exists resultats_quiz_participant_idx on public.resultats_quiz (participant_id, formation_id);

-- ── Historique des envois ───────────────────────────────────────────────────
create table if not exists public.envois (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid references public.participants(id) on delete cascade,
  email text not null,
  type text not null check (type in ('invitation', 'relance')),
  statut text not null check (statut in ('envoye', 'echec')),
  erreur text,
  envoye_le timestamptz not null default now(),
  envoye_par text
);
create index if not exists envois_participant_idx on public.envois (participant_id, envoye_le desc);

-- ── Règles d'accès des nouvelles tables ─────────────────────────────────────
do $$
declare
  t text;
  pol record;
begin
  foreach t in array array['structures', 'progression', 'resultats_quiz', 'envois'] loop
    for pol in select policyname from pg_policies where schemaname = 'public' and tablename = t loop
      execute format('drop policy %I on public.%I', pol.policyname, t);
    end loop;
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format(
      'create policy admin_tout on public.%I for all to authenticated using (public.is_admin()) with check (public.is_admin())', t);
  end loop;
end $$;

-- Le participant lit sa progression et ses résultats ; il n'écrit que par les
-- fonctions ci-dessous, qui vérifient son accès et notent le quiz elles-mêmes.
create policy ma_progression on public.progression
  for select to authenticated using (participant_id = public.participant_courant());
create policy mes_resultats on public.resultats_quiz
  for select to authenticated using (participant_id = public.participant_courant());

-- ── Fonctions appelées par le site ──────────────────────────────────────────

create or replace function public.marquer_module_lu(fid uuid, module integer)
returns void language plpgsql volatile security definer set search_path = public
as $$
declare pid uuid := participant_courant();
begin
  if pid is null or not a_acces(fid) then return; end if;
  insert into progression (participant_id, formation_id, module_num)
  values (pid, fid, module)
  on conflict (participant_id, formation_id, module_num) do nothing;
end $$;

-- Questions du quiz sans la bonne réponse ni l'explication.
create or replace function public.quiz_questions(fid uuid)
returns table (id bigint, module_num integer, ordre integer, question text, choices jsonb)
language sql stable security definer set search_path = public
as $$
  select q.id, q.module_num, q.ordre, q.question, q.choices
  from formation_quiz q
  where q.formation_id = fid and (a_acces(fid) or is_admin())
  order by q.module_num, q.ordre, q.id
$$;

-- Note le quiz, enregistre la tentative et renvoie la correction.
-- reponses : {"<id question>": <index de la réponse choisie>, ...}
create or replace function public.quiz_soumettre(fid uuid, reponses jsonb)
returns jsonb language plpgsql volatile security definer set search_path = public
as $$
declare
  pid uuid := participant_courant();
  v_total integer;
  v_score integer;
  v_seuil integer;
  v_reussi boolean;
  v_passe timestamptz := now();
  v_correction jsonb;
begin
  if pid is null or not a_acces(fid) then
    raise exception 'acces_refuse' using errcode = '42501';
  end if;
  if jsonb_typeof(reponses) is distinct from 'object' then
    raise exception 'reponses_invalides' using errcode = '22023';
  end if;

  select count(*),
         count(*) filter (where jsonb_typeof(reponses -> q.id::text) = 'number'
                            and (reponses ->> q.id::text)::numeric = q.answer),
         coalesce(jsonb_agg(jsonb_build_object('id', q.id, 'answer', q.answer, 'feedback', q.feedback)), '[]'::jsonb)
    into v_total, v_score, v_correction
  from formation_quiz q where q.formation_id = fid;

  if v_total = 0 then raise exception 'quiz_vide' using errcode = '22023'; end if;

  select seuil_reussite into v_seuil from formations where id = fid;
  v_reussi := v_score * 100 >= v_seuil * v_total;

  insert into resultats_quiz (participant_id, formation_id, score, total, seuil, reussi, reponses, passe_le)
  values (pid, fid, v_score, v_total, v_seuil, v_reussi, reponses, v_passe);

  return jsonb_build_object('score', v_score, 'total', v_total, 'seuil', v_seuil,
                            'reussi', v_reussi, 'passe_le', v_passe, 'correction', v_correction);
end $$;

revoke execute on function public.marquer_module_lu(uuid, integer) from public, anon;
revoke execute on function public.quiz_questions(uuid) from public, anon;
revoke execute on function public.quiz_soumettre(uuid, jsonb) from public, anon;
grant execute on function public.marquer_module_lu(uuid, integer), public.quiz_questions(uuid),
                          public.quiz_soumettre(uuid, jsonb) to authenticated;
