-- Migration : conditions d'éligibilité affichées sur la page d'un type d'entretien
-- Date : 2026-10-03
-- Contexte : un petit encadré en tête de la page de chaque type d'entretien
-- rappelle qui peut bénéficier de l'entretien (âge, traitements, molécules…).
-- Le texte est libre, un critère par ligne, modifiable dans l'app par tout
-- membre de l'officine.
--
--  1. types_entretien.eligibilite : texte (NULL = pas d'encadré), 2000
--     caractères au plus.
--  2. modifier_eligibilite_type_entretien() : même schéma que
--     renommer_type_entretien() (SECURITY DEFINER, réservé aux membres de
--     l'officine du type), appelable par les utilisateurs connectés seulement.
--  3. Textes de départ pour le BPM et les opioïdes (toutes les officines).
--     Sources : avenant 19 à la convention pharmaceutique (BPM) et Vidal /
--     Assurance Maladie (opioïdes) ; à recouper avec le formulaire d'adhésion
--     BPM. Les autres types restent sans texte.
--
-- Restauration : drop function public.modifier_eligibilite_type_entretien(uuid, text) ;
-- alter table public.types_entretien drop column eligibilite ;

begin;

alter table public.types_entretien
  add column eligibilite text
  constraint types_entretien_eligibilite_longueur check (eligibilite is null or char_length(eligibilite) <= 2000);

create function public.modifier_eligibilite_type_entretien(p_id uuid, p_texte text)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  update types_entretien
  set eligibilite = nullif(btrim(p_texte), ''), updated_at = now()
  where id = p_id and est_membre(officine_id);

  if not found then
    raise exception 'Type d''entretien introuvable ou non autorisé.';
  end if;
end;
$$;

revoke execute on function public.modifier_eligibilite_type_entretien(uuid, text) from public, anon;
grant execute on function public.modifier_eligibilite_type_entretien(uuid, text) to authenticated;

update public.types_entretien
   set eligibilite = E'Patient âgé de 65 ans ou plus (plus de condition d’ALD ni de seuil de 75 ans depuis l’avenant 19)\nPatient polymédiqué : au moins 5 principes actifs prescrits\nTraitement d’une durée d’au moins 6 mois'
 where modele = 'bpm' and eligibilite is null;

update public.types_entretien
   set eligibilite = E'Patient adulte (plus de 18 ans)\nAntalgique opioïde de palier II : tramadol, codéine, dihydrocodéine, poudre d’opium, nalbuphine\nAu premier renouvellement : seconde délivrance dans les 12 mois suivant la première\nUn seul entretien par patient sur une période de 12 mois'
 where modele = 'opioides' and eligibilite is null;

commit;
