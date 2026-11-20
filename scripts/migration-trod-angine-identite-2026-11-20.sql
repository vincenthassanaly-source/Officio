-- Module « TROD angine » : identité de l'officine imprimée sur le compte rendu
-- et le bon de prise en charge (nom de la structure, adresse, numéro AM).
--
-- Une ligne par officine, saisie une fois, modifiable par tout membre (même
-- modèle de droits que le reste du module : est_membre). Le nom du pharmacien
-- n'est pas ici : il est saisi sur chaque fiche.
--
-- À exécuter dans l'éditeur SQL de Supabase (projet officio).
-- Annulation : drop table public.trod_angine_officine;

begin;

create table public.trod_angine_officine (
  officine_id uuid primary key references public.officines(id),
  nom_structure text not null default '',
  adresse text not null default '',
  numero_am text not null default '',
  updated_at timestamptz not null default now(),
  constraint trod_angine_officine_longueurs check (
    char_length(nom_structure) <= 150 and char_length(adresse) <= 250 and char_length(numero_am) <= 40
  )
);

alter table public.trod_angine_officine enable row level security;

create policy "voir l'identite TROD angine de mes officines"
  on public.trod_angine_officine for select using (est_membre(officine_id));

create policy "creer l'identite TROD angine de mes officines"
  on public.trod_angine_officine for insert with check (est_membre(officine_id));

create policy "modifier l'identite TROD angine de mes officines"
  on public.trod_angine_officine for update using (est_membre(officine_id)) with check (est_membre(officine_id));

commit;
