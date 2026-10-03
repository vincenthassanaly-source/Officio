-- Migration : fiches BPM (recueil / Girerd / analyse) remplies pas à pas
-- Date : 2026-10-03
-- Contexte : le script « Bilan partagé de médication » (45 étapes cochables,
-- section méthodologie) est remplacé par la fiche papier USPO « Le bilan partagé
-- de médication chez le patient âgé polymédiqué » saisie dans l'app et imprimable.
--
--  1. types_entretien.modele : marque un type comme BPM ('bpm'). L'app s'y fie
--     plutôt qu'au nom du type, qui reste modifiable par l'équipe.
--  2. bpm_fiches : une fiche par patient et par entretien. Données patient et de
--     santé (identité, traitements, réponses) : accès réservé aux membres de
--     l'officine par RLS, aucune policy anonyme.
--  3. L'ancien script BPM (entretien_items, section methodologie) est copié dans
--     entretien_items_sauvegarde_bpm_20261003 (RLS activée, aucune policy) puis
--     supprimé. La facturation n'est pas touchée.
--
-- Restauration du script : insert into entretien_items select … from
-- entretien_items_sauvegarde_bpm_20261003 ; update types_entretien set modele = null.
-- Aucun état de « mode entretien » n'était persisté (cases cochées en mémoire
-- seulement) : il n'y a pas d'entretien en cours à migrer.

alter table public.types_entretien
  add column modele text
  constraint types_entretien_modele_valeurs check (modele is null or modele in ('bpm'));

update public.types_entretien
   set modele = 'bpm'
 where nom like 'Bilan partagé de médication%';

create table public.entretien_items_sauvegarde_bpm_20261003 as
  select i.*
    from public.entretien_items i
    join public.types_entretien t on t.id = i.type_entretien_id
   where t.modele = 'bpm'
     and i.section = 'methodologie';

alter table public.entretien_items_sauvegarde_bpm_20261003 enable row level security;

delete from public.entretien_items i
 using public.types_entretien t
 where t.id = i.type_entretien_id
   and t.modele = 'bpm'
   and i.section = 'methodologie';

create table public.bpm_fiches (
  id uuid primary key default gen_random_uuid(),
  officine_id uuid not null references public.officines(id),
  type_entretien_id uuid not null references public.types_entretien(id) on delete cascade,
  -- Dénormalisés depuis donnees.entete pour la liste, sans lire tout le JSON.
  patient_nom text not null default '',
  patient_prenom text not null default '',
  date_entretien date not null default current_date,
  donnees jsonb not null default '{}'::jsonb,
  cree_par_id uuid references public.profils(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint bpm_fiches_donnees_objet check (jsonb_typeof(donnees) = 'object'),
  constraint bpm_fiches_donnees_taille check (pg_column_size(donnees) < 300000)
);

create index bpm_fiches_type_idx on public.bpm_fiches (type_entretien_id, updated_at desc);

alter table public.bpm_fiches enable row level security;

create policy "voir les fiches BPM de mes officines"
  on public.bpm_fiches
  for select
  using (est_membre(officine_id));

create policy "creer une fiche BPM dans une de mes officines"
  on public.bpm_fiches
  for insert
  with check (est_membre(officine_id));

create policy "modifier une fiche BPM de mes officines"
  on public.bpm_fiches
  for update
  using (est_membre(officine_id))
  with check (est_membre(officine_id));

create policy "supprimer une fiche BPM de mes officines"
  on public.bpm_fiches
  for delete
  using (est_membre(officine_id));
