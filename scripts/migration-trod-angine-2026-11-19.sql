-- Module « TROD angine » : fiche de prise en charge de l'angine à l'officine
-- (compte rendu de l'Assurance Maladie + bon de prise en charge des antibiotiques).
--
-- Une table dédiée, sans lien avec les types d'entretien : le module a sa propre
-- entrée de menu. Données nominatives de santé (nom, âge, poids, n° de sécurité
-- sociale, réponses) dans `donnees`, validées côté serveur par
-- normaliserTrodAngine() (src/lib/trod-angine.ts). RLS par est_membre(officine_id),
-- calquée sur entretien_fiches ; aucune policy anonyme.
--
-- À exécuter dans l'éditeur SQL de Supabase (projet officio), en une transaction.
-- Annulation : drop table public.trod_angine_fiches;

begin;

create table public.trod_angine_fiches (
  id uuid primary key default gen_random_uuid(),
  officine_id uuid not null references public.officines(id),
  -- Dénormalisés depuis donnees pour la liste, sans lire tout le JSON.
  patient_nom text not null default '',
  patient_prenom text not null default '',
  date_entretien date not null default current_date,
  donnees jsonb not null default '{}'::jsonb,
  cree_par_id uuid references public.profils(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint trod_angine_fiches_donnees_objet check (jsonb_typeof(donnees) = 'object'),
  constraint trod_angine_fiches_donnees_taille check (pg_column_size(donnees) < 100000)
);

create index trod_angine_fiches_officine_idx
  on public.trod_angine_fiches (officine_id, updated_at desc);

alter table public.trod_angine_fiches enable row level security;

create policy "voir les TROD angine de mes officines"
  on public.trod_angine_fiches for select using (est_membre(officine_id));

create policy "creer un TROD angine dans une de mes officines"
  on public.trod_angine_fiches for insert with check (est_membre(officine_id));

create policy "modifier un TROD angine de mes officines"
  on public.trod_angine_fiches for update using (est_membre(officine_id)) with check (est_membre(officine_id));

create policy "supprimer un TROD angine de mes officines"
  on public.trod_angine_fiches for delete using (est_membre(officine_id));

commit;
