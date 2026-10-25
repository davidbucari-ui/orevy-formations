-- ════════════════════════════════════════════════════════════════════════════
-- Orevy Formations — réponses du quiz invisibles pour les participants
--
-- À exécuter juste après la mise en ligne de la version du site qui lit le
-- quiz par quiz_questions() (voir 002). Les participants ne lisent plus la
-- table formation_quiz, qui contient les bonnes réponses : la base leur sert
-- les questions sans réponse, puis note elle-même leurs choix.
-- Les administrateurs gardent leur accès complet (règle admin_tout).
-- ════════════════════════════════════════════════════════════════════════════

drop policy if exists contenu_ouvert on public.formation_quiz;
