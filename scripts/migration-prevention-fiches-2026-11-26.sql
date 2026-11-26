-- Migration : fiche « Bilan de prévention » (réponses, thèmes, plan imprimé)
-- Date : 2026-11-26
-- Contexte : le type d'entretien « Bilan de prévention » n'avait qu'un script
-- à cocher. Il passe en mode « fiche » (comme Opioïdes) : identité, réponses
-- aux 12 questions, thèmes à travailler, actions et objectifs, puis plan
-- personnalisé imprimable. Les données sont stockées dans entretien_fiches
-- (migration-opioides-fiches-2026-10-03.sql), protégées par la RLS
-- est_membre(officine_id).
--
--  1. types_entretien.modele et entretien_fiches.modele acceptent 'prevention'.
--  2. Le type « Bilan de prévention » passe en modele = 'prevention'.
--
-- Le script existant (entretien_items) n'est PAS supprimé : il reste en base,
-- simplement masqué tant que le type est en mode fiche.
-- Retour arrière : update types_entretien set modele = null
--                   where modele = 'prevention';
-- (les fiches déjà saisies restent dans entretien_fiches).

begin;

alter table public.types_entretien drop constraint types_entretien_modele_valeurs;
alter table public.types_entretien
  add constraint types_entretien_modele_valeurs
  check (modele is null or modele in ('bpm', 'opioides', 'prevention'));

alter table public.entretien_fiches drop constraint entretien_fiches_modele_valeurs;
alter table public.entretien_fiches
  add constraint entretien_fiches_modele_valeurs
  check (modele in ('opioides', 'prevention'));

update public.types_entretien
   set modele = 'prevention'
 where nom = 'Bilan de prévention'
   and modele is null;

commit;
