# Audit UI/UX — méthode ui-ux-pro-max (2026-10-27)

**Périmètre :** toute l'app (154 fichiers `.tsx`), axes mobile/responsive, accessibilité WCAG, cohérence visuelle, clarté UX et textes. Identité de `DESIGN.md` respectée : tout ce qui la touche est une *recommandation à valider*, pas un correctif automatique. Dark mode hors périmètre.

**Méthode et limites**
- Lecture statique de tout `src/` (scripts AST TypeScript + greps), calcul des contrastes depuis les tokens `oklch` de `globals.css`, et rendu réel (Playwright, 320 / 375 / 1280 px) de `/login` et `/inscription`.
- Les pages internes exigent une session Supabase : **non rendues**, jugées sur le code uniquement. `/bienvenue`, `/rejoindre/*` et les URL inconnues redirigent vers `/login` sans session : non auditées visuellement.
- Les scripts sont heuristiques. Chaque constat ci-dessous a été relu à la main dans le code. Plusieurs signalements automatiques se sont révélés être des faux positifs et ont été écartés (par exemple les champs dont la taille 16 px vient d'une constante importée, ou dont le libellé passe par `proprietesChamp`).

**Verdict :** aucun problème critique. L'app est déjà solide ; les écarts restants sont des points précis.

## Ce qui est déjà bon (vérifié)
- Aucun débordement horizontal à 320, 375 et 1280 px sur les écrans rendus.
- Tous les champs à 16 px (pas de zoom iOS), libellés présents, `autoComplete` correct, `aria-describedby` sur l'aide du mot de passe.
- Anneaux de focus visibles, lien d'évitement vers `#contenu`, `aria-current` sur la navigation, 19 dialogues `aria-modal` avec piège à focus et retour du focus.
- `prefers-reduced-motion` respecté globalement, `lang="fr"`, `themeColor`, safe-areas, bottom nav ≤ 5 entrées, aucun zoom bloqué.
- Contrastes texte : tous les couples `ink`/`muted`/`primary`/sémantiques mesurés ≥ 4,5:1, sauf trois cas limites (voir M5).

## Majeur

### M1 — Contours de champs quasi invisibles (WCAG 1.4.11, contraste non textuel)
`border` (`oklch(91% 0.006 260)`) mesure **1,23:1 sur `bg` et 1,31:1 sur `surface`** ; il faut 3:1 pour délimiter un champ. Les champs (`bg-bg` + `border-border`) se distinguent à peine du fond, visible sur la capture de `/login`. Concerne tous les formulaires (`CLASSE_CHAMP_AUTH`, `CLASSE_CHAMP`, et environ 11 constantes `CHAMP_CLASS` dupliquées).
**Correctif proposé :** nouveau token `--color-champ-bord: oklch(62% 0.02 265)` (3,44:1 sur `bg`, 3,64:1 sur `surface`) utilisé *uniquement* par les champs de saisie ; `border` reste inchangé pour les cartes et séparateurs. Touche légèrement l'identité visuelle : **à valider**.

### M2 — Pas de « Mot de passe oublié »
Aucun parcours de réinitialisation n'existe (recherche exhaustive dans `src/`). Un membre d'équipe qui oublie son mot de passe est bloqué et dépend d'un admin.
**Correctif proposé :** lien sous le champ mot de passe de `/login`, page `/mot-de-passe-oublie` (`supabase.auth.resetPasswordForEmail`) et page de saisie du nouveau mot de passe. C'est une **fonctionnalité**, pas un ajustement : à décider, et le redirect Supabase doit être configuré côté projet.

### M3 — Pluriels français cassés sur l'accueil
`src/app/(app)/page.tsx` : 7 sous-titres de tuiles ne gèrent pas le singulier (« 1 nouveaux messages », « 0 nouveaux messages », « 1 contacts », « 1 notes », « 1 propositions », « 1 patients suivis », « 1 activités récentes », « 1 types actifs »). Lignes 228, 256, 308, 334, 387, 400, 426. Le reste de l'app gère déjà le pluriel au cas par cas.
**Correctif proposé :** petit helper `pluriel(n, 'note')` dans `lib/utilitaires-texte.ts` (avec test vitest) et usage sur ces lignes. Pour 0 et 1, le français met le singulier.

## Moyen

### M4 — Deux champs de texte sans nom accessible
`fab-creation-rapide-modal.tsx:331` (contenu de la note) et `fil-de-messages.tsx:867` (édition d'un message) n'ont qu'un `placeholder`. Un lecteur d'écran n'annonce pas leur rôle une fois le texte saisi.
**Correctif :** `aria-label` (« Contenu de la note », « Contenu du message »). Trivial et sans effet visuel.

### M5 — Cibles tactiles et contrastes limites
- Liens « En créer un » / « Se connecter » au pied des cartes d'authentification : **16 px de haut** mesurés (cible attendue ≥ 44 px par `DESIGN.md`). Correctif : `inline-flex min-h-11 items-center`.
- `muted` sur `rec-soft` = 4,34:1, sur `neutral-soft` et `track` = 4,48:1 : juste sous 4,5. À corriger seulement si ces couples portent du texte ; usage non vérifié, à contrôler avant d'agir.
- `text-muted/40` pour les jours hors mois dans les calendriers (`agenda-vue-globale-mois.tsx:129`, `planning-equipe-mois.tsx:121`) : contraste très faible. Passer à `text-muted` ou `text-neutral-text` et garder l'écart par la graisse.

### M6 — Micro-textes 7 à 10 px dans les calendriers
`planning-equipe.tsx:578` (7 px / 7,5 px / 8,5 px), `planning-equipe-mois.tsx:143` (8 px), `agenda-vue-globale-mois.tsx:143` (9 px), `regularisations-calendrier.tsx:158` (10 px). C'est une exception documentée dans `DESIGN.md` (l'info complète reste accessible au tap), mais 7 px est illisible en situation réelle de comptoir.
**Recommandation :** plancher à 10 px, ou remplacer le compteur par un point coloré et garder le détail au tap.

### M7 — Tuiles de l'accueil : 16 blocs copiés-collés et repli « — » muet
`src/app/(app)/page.tsx:217-430` répète 16 fois la même tuile (`Link` + pastille d'icône + titre + sous-titre). Quand un chargement échoue, le sous-titre devient « — », sans explication, et un lecteur d'écran lit « tiret ».
**Correctif proposé :** composant `TuileModule` (icône, titre, sous-titre, état d'erreur) ; en cas d'échec, afficher « Indisponible » plutôt que « — ». Réduit aussi le risque de dérive entre l'accueil et `menu-plus-panel.tsx`.

## Mineur

- **Échelle typographique éclatée :** 20 tailles arbitraires (`text-[12px]` 230×, `13px` 177×, `13.5px` 110×, `12.5px` 66×, `15px` 31×, `14px` 28×, `14.5px` 13×…) en plus de 6 tailles Tailwind. Sept paliers distants de moins de 2 px entre 12 et 15 px. `DESIGN.md` demande de ne pas « nettoyer » : **recommandation seulement**, consolider en 5 paliers nommés (`--text-meta`, `--text-corps`, etc.) si vous le souhaitez.
- **Corps à 13,5 px** : sous la base de 16 px recommandée par ui-ux-pro-max. Assumé par `DESIGN.md` (outil dense). À reconsidérer seulement pour les listes lues de loin.
- **Primitives UI absentes :** `CHAMP_CLASS` défini environ 11 fois, `CLASSE_FOCUS` 3 fois, piège à focus réécrit à la main dans 5 composants (`opioides-saisie`, `bpm-saisie`, `entretien-pas-a-pas`, `fenetre-aujourdhui`, `menu-plus-panel`) alors que `usePiegeFocus` existe. Cause racine des dérives : le correctif M1 devrait être appliqué à 11 endroits.
- **Mouvement :** `animate-pulse` (`vaccins-liste.tsx:280`, `entretien-detail.tsx:45`) et `animate-spin` (`recherche-globale.tsx:60`) sans variante `motion-reduce`.
- **Login :** l'exemple d'email « prenom@pharmacie-romevillage.fr » est tronqué à 375 px et lié à une officine précise ; pas de bouton afficher/masquer le mot de passe.
- **Manifest :** icônes sans variante `maskable`, pas de `id` ni de `lang`, nom « Pharmacie Rome Village » écrit en dur.

## Plan de correction proposé (à valider)

| Lot | Contenu | Risque |
|---|---|---|
| A (sûr) | M3 pluriels + test, M4 `aria-label`, M5 liens 44 px et `muted/40`, mouvement réduit, placeholder email | Très faible |
| B (identité) | M1 token `--color-champ-bord` appliqué aux champs, M6 plancher 10 px | Visuel, à valider |
| C (structurel) | M7 composant `TuileModule`, constante de champ unique, `usePiegeFocus` partagé | Refactor, vérifier par build/tests |
| D (fonctionnalité) | M2 mot de passe oublié | Config Supabase requise |

Chaque lot reste vérifié par `lint`, `typecheck`, `test` et `build`.
