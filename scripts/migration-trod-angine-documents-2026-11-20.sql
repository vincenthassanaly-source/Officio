-- Module « TROD angine » : section Documents (bons de prise en charge, compte
-- rendu, fiche mémo HAS…). PDF de référence que l'équipe ouvre, imprime, ajoute
-- ou supprime depuis /trod-angine.
--
-- Table dédiée + bucket Storage privé dédié, même pattern que « entretiens » :
-- dossier racine = officine_id, droits via est_membre(). Aucun lien avec la table
-- `documents` : ces PDF n'apparaissent pas dans le module Documents général.
--
-- À exécuter dans l'éditeur SQL de Supabase (projet officio), en une transaction.
-- Annulation : drop table public.trod_angine_documents; puis supprimer les
-- policies « … documents TROD angine … » de storage.objects et le bucket
-- trod-angine (la suppression d'un bucket passe par l'API Storage).

begin;

create table public.trod_angine_documents (
  id uuid primary key default gen_random_uuid(),
  officine_id uuid not null references public.officines(id),
  nom text not null,
  chemin_stockage text not null unique,
  taille_octets integer,
  ajoute_par_id uuid references public.profils(id),
  created_at timestamptz not null default now(),
  constraint trod_angine_documents_nom check (char_length(btrim(nom)) between 1 and 150)
);

create index trod_angine_documents_officine_idx
  on public.trod_angine_documents (officine_id, created_at);

alter table public.trod_angine_documents enable row level security;

create policy "voir les documents TROD angine de mes officines"
  on public.trod_angine_documents for select using (est_membre(officine_id));

create policy "ajouter un document TROD angine dans une de mes officines"
  on public.trod_angine_documents for insert with check (est_membre(officine_id));

create policy "supprimer un document TROD angine de mes officines"
  on public.trod_angine_documents for delete using (est_membre(officine_id));

-- Bucket privé, PDF uniquement, 10 Mo maximum par fichier.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('trod-angine', 'trod-angine', false, 10485760, array['application/pdf']);

create policy "deposer des documents TROD angine dans mes officines" on storage.objects
  for insert with check (bucket_id = 'trod-angine' and est_membre(((storage.foldername(name))[1])::uuid));

create policy "voir les documents TROD angine de mes officines" on storage.objects
  for select using (bucket_id = 'trod-angine' and est_membre(((storage.foldername(name))[1])::uuid));

create policy "supprimer les documents TROD angine de mes officines" on storage.objects
  for delete using (bucket_id = 'trod-angine' and est_membre(((storage.foldername(name))[1])::uuid));

commit;
