-- ════════════════════════════════════════════════════════════════════════════
-- Orevy Formations — passage à Supabase Auth + règles d'accès (RLS)
--
-- À exécuter UNE fois dans Supabase : SQL Editor → New query → coller → Run.
-- Le script ne supprime aucune donnée : il remplace seulement les règles
-- d'accès des tables. Il peut être relancé sans risque.
--
-- Principe : chaque personne se connecte avec son email (Supabase Auth).
-- Son email est rapproché de la table participants :
--   - participants.is_admin = true  → droits d'administration complets
--   - sinon                         → lecture du catalogue, et du contenu
--                                     des seules formations ouvertes dans
--                                     acces_formations
--   - email inconnu de participants → aucun accès
-- ════════════════════════════════════════════════════════════════════════════

-- ── Fonctions d'aide ────────────────────────────────────────────────────────
-- SECURITY DEFINER : elles lisent participants sans repasser par ses propres
-- règles (sinon les règles de participants s'appelleraient elles-mêmes).

create or replace function public.email_connecte()
returns text language sql stable
as $$ select lower(coalesce(auth.jwt() ->> 'email', '')) $$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from participants
    where lower(email) = email_connecte() and is_admin is true
  )
$$;

create or replace function public.is_participant()
returns boolean language sql stable security definer set search_path = public
as $$
  select exists (select 1 from participants where lower(email) = email_connecte())
$$;

create or replace function public.a_acces(fid public.formations.id%type)
returns boolean language sql stable security definer set search_path = public
as $$
  select exists (
    select 1
    from acces_formations a
    join participants p on p.id = a.participant_id
    where a.formation_id = fid and lower(p.email) = email_connecte()
  )
$$;

-- Le participant marque une formation comme vue sans avoir le droit
-- de modifier le reste de la ligne d'accès.
create or replace function public.marquer_vu(acces_id public.acces_formations.id%type)
returns void language sql volatile security definer set search_path = public
as $$
  update acces_formations a
  set vu = true, date_visionnage = coalesce(a.date_visionnage, now())
  from participants p
  where a.id = acces_id
    and p.id = a.participant_id
    and lower(p.email) = email_connecte()
$$;

revoke all on function public.marquer_vu(public.acces_formations.id%type) from public, anon;
grant execute on function public.marquer_vu(public.acces_formations.id%type) to authenticated;

-- L'ancien code d'accès n'est plus utilisé pour se connecter.
do $$ begin
  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'participants' and column_name = 'code_acces') then
    alter table public.participants alter column code_acces drop not null;
  end if;
end $$;

create index if not exists participants_email_lower_idx on public.participants (lower(email));

-- ── Remise à zéro des anciennes règles ──────────────────────────────────────
do $$
declare
  t text;
  pol record;
begin
  foreach t in array array['participants', 'formations', 'acces_formations', 'chapitres',
                           'ressources', 'slides', 'formation_quiz', 'formation_blocs'] loop
    if to_regclass('public.' || t) is not null then
      for pol in select policyname from pg_policies where schemaname = 'public' and tablename = t loop
        execute format('drop policy %I on public.%I', pol.policyname, t);
      end loop;
      execute format('alter table public.%I enable row level security', t);
      -- Les administrateurs peuvent tout faire sur toutes les tables.
      execute format(
        'create policy admin_tout on public.%I for all to authenticated using (public.is_admin()) with check (public.is_admin())',
        t);
    end if;
  end loop;
end $$;

-- ── Lecture côté participant ────────────────────────────────────────────────

create policy participant_soi on public.participants
  for select to authenticated
  using (lower(email) = public.email_connecte());

-- Le catalogue est visible de tout participant connu.
create policy catalogue on public.formations
  for select to authenticated
  using (public.is_participant());

create policy mes_acces on public.acces_formations
  for select to authenticated
  using (participant_id in (select id from public.participants where lower(email) = public.email_connecte()));

create policy contenu_ouvert on public.chapitres
  for select to authenticated using (public.a_acces(formation_id));

create policy contenu_ouvert on public.ressources
  for select to authenticated using (public.a_acces(formation_id));

create policy contenu_ouvert on public.slides
  for select to authenticated using (public.a_acces(formation_id));

create policy contenu_ouvert on public.formation_quiz
  for select to authenticated using (public.a_acces(formation_id));

create policy contenu_ouvert on public.formation_blocs
  for select to authenticated using (public.a_acces(formation_id));
