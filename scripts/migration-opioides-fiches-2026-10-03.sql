-- Migration : fiches « Opioïdes » (identité, bon usage, POMI, conclusions)
-- Date : 2026-10-03
-- Contexte : le script « Entretien opioïdes » (24 étapes cochables, section
-- méthodologie) est remplacé par la fiche pharmacien « Accompagnement
-- opioïdes » de l'Assurance Maladie, saisie dans l'app et imprimable. Même
-- principe que le BPM (migration-bpm-fiches-2026-10-03.sql), avec une table
-- générique pensée pour les futurs types à fiche :
--
--  1. types_entretien.modele accepte désormais 'opioides' (en plus de 'bpm').
--  2. entretien_fiches : une fiche par entretien (un patient revient à chaque
--     renouvellement). Données patient et de santé : accès réservé aux membres de
--     l'officine par RLS, aucune policy anonyme. Le modèle de chaque fiche est
--     validé côté serveur (lib/fiches.ts) ; la contrainte SQL liste les modèles
--     autorisés et se complète pour un nouveau modèle.
--  3. L'ancien script (entretien_items, section methodologie) est copié dans
--     entretien_items_sauvegarde_opioides_20261003 (RLS activée, aucune policy)
--     puis supprimé. La facturation n'est pas touchée.
--
-- Restauration du script : insert into entretien_items select … from
-- entretien_items_sauvegarde_opioides_20261003 ; update types_entretien set
-- modele = null where modele = 'opioides'.
-- Aucun état de « mode entretien » n'était persisté (cases cochées en mémoire
-- seulement) : il n'y a pas d'entretien en cours à migrer.

begin;

alter table public.types_entretien drop constraint types_entretien_modele_valeurs;
alter table public.types_entretien
  add constraint types_entretien_modele_valeurs
  check (modele is null or modele in ('bpm', 'opioides'));

update public.types_entretien
   set modele = 'opioides'
 where nom ilike 'Entretien opio%';

create table public.entretien_items_sauvegarde_opioides_20261003 as
  select i.*
    from public.entretien_items i
    join public.types_entretien t on t.id = i.type_entretien_id
   where t.modele = 'opioides'
     and i.section = 'methodologie';

alter table public.entretien_items_sauvegarde_opioides_20261003 enable row level security;

delete from public.entretien_items i
 using public.types_entretien t
 where t.id = i.type_entretien_id
   and t.modele = 'opioides'
   and i.section = 'methodologie';

create table public.entretien_fiches (
  id uuid primary key default gen_random_uuid(),
  officine_id uuid not null references public.officines(id),
  type_entretien_id uuid not null references public.types_entretien(id) on delete cascade,
  modele text not null,
  -- Dénormalisés depuis donnees pour la liste, sans lire tout le JSON.
  patient_nom text not null default '',
  patient_prenom text not null default '',
  date_entretien date not null default current_date,
  donnees jsonb not null default '{}'::jsonb,
  cree_par_id uuid references public.profils(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint entretien_fiches_modele_valeurs check (modele in ('opioides')),
  constraint entretien_fiches_donnees_objet check (jsonb_typeof(donnees) = 'object'),
  constraint entretien_fiches_donnees_taille check (pg_column_size(donnees) < 300000)
);

create index entretien_fiches_type_idx on public.entretien_fiches (type_entretien_id, updated_at desc);

alter table public.entretien_fiches enable row level security;

create policy "voir les fiches d'entretien de mes officines"
  on public.entretien_fiches for select using (est_membre(officine_id));

create policy "creer une fiche d'entretien dans une de mes officines"
  on public.entretien_fiches for insert with check (est_membre(officine_id));

create policy "modifier une fiche d'entretien de mes officines"
  on public.entretien_fiches for update using (est_membre(officine_id)) with check (est_membre(officine_id));

create policy "supprimer une fiche d'entretien de mes officines"
  on public.entretien_fiches for delete using (est_membre(officine_id));

commit;
