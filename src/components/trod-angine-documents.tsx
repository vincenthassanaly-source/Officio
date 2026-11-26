'use client'

import { useRef, useState, useTransition } from 'react'
import {
  ajouterTrodAngineDocument,
  chargerDocumentsOfficiels,
  obtenirUrlTrodAngineDocument,
  supprimerTrodAngineDocument,
} from '@/app/actions/trod-angine-documents'
import type { TrodAngineDocument } from '@/lib/data/trod-angine-documents'
import { TAILLE_MAX_OCTETS, formaterTaille } from '@/lib/trod-angine-documents'
import { ouvrirDocumentDansOnglet } from '@/lib/ouvrir-document-onglet'
import { ModaleConfirmation } from '@/components/ui/modale-confirmation'
import { useToast } from '@/components/ui/toast-provider'
import {
  CLASSE_BOUTON_PRIMAIRE,
  CLASSE_BOUTON_SECONDAIRE,
  CLASSE_CHAMP,
  CLASSE_FOCUS,
  Icone,
} from '@/components/entretien-ui'

function dateCourte(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Europe/Paris',
  })
}

const CLASSE_ACTION = `flex size-11 shrink-0 items-center justify-center rounded-xl text-muted hover:bg-neutral-soft hover:text-ink ${CLASSE_FOCUS}`

// Section « Documents » du module TROD angine : PDF de référence (bons, compte
// rendu, fiche mémo HAS…) que l'équipe ouvre dans un nouvel onglet, ajoute ou
// supprime. Section vide : un bouton charge les PDF officiels fournis avec l'app.
export function TrodAngineDocuments({ documents }: { documents: TrodAngineDocument[] }) {
  const toast = useToast()
  const [isPending, startTransition] = useTransition()
  const [formOuvert, setFormOuvert] = useState(false)
  const [ouvertureId, setOuvertureId] = useState<string | null>(null)
  const [aSupprimer, setASupprimer] = useState<TrodAngineDocument | null>(null)
  const formulaire = useRef<HTMLFormElement>(null)

  async function ouvrir(doc: TrodAngineDocument) {
    if (ouvertureId) return
    setOuvertureId(doc.id)
    try {
      const resultat = await ouvrirDocumentDansOnglet(() => obtenirUrlTrodAngineDocument(doc.id))
      if (!resultat.succes) toast({ type: 'erreur', message: resultat.message })
    } finally {
      setOuvertureId(null)
    }
  }

  function executer(action: () => Promise<void>, succes: string, erreur: string, apres?: () => void) {
    startTransition(async () => {
      try {
        await action()
        apres?.()
        toast({ type: 'succes', message: succes })
      } catch (err) {
        toast({ type: 'erreur', message: err instanceof Error ? err.message : erreur })
      }
    })
  }

  function ajouter(formData: FormData) {
    if (isPending) return
    const fichier = formData.get('fichier')
    if (fichier instanceof File && fichier.size > TAILLE_MAX_OCTETS) {
      toast({ type: 'erreur', message: 'Fichier trop volumineux (4 Mo maximum).' })
      return
    }
    executer(
      () => ajouterTrodAngineDocument(formData),
      'Document ajouté.',
      "Échec de l'ajout du document.",
      () => {
        setFormOuvert(false)
        formulaire.current?.reset()
      }
    )
  }

  function supprimer(doc: TrodAngineDocument) {
    setASupprimer(null)
    executer(() => supprimerTrodAngineDocument(doc.id), 'Document supprimé.', 'Suppression impossible.')
  }

  return (
    <section aria-labelledby="trod-angine-documents-titre" className="mt-8 flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <h2 id="trod-angine-documents-titre" className="font-heading text-xl text-ink">
          Documents
        </h2>
        <button
          type="button"
          onClick={() => setFormOuvert((v) => !v)}
          aria-expanded={formOuvert}
          aria-controls="trod-angine-documents-formulaire"
          className={`${CLASSE_BOUTON_SECONDAIRE} text-[13.5px]`}
        >
          <Icone nom="plus" taille={16} />
          Ajouter
        </button>
      </div>

      {formOuvert && (
        <form
          id="trod-angine-documents-formulaire"
          ref={formulaire}
          action={ajouter}
          className="flex flex-col gap-2 rounded-[20px] bg-surface p-3 shadow-card"
        >
          <label htmlFor="trod-angine-documents-fichier" className="text-[12px] font-semibold uppercase tracking-wide text-muted">
            Fichier PDF (4 Mo maximum)
          </label>
          <input
            id="trod-angine-documents-fichier"
            type="file"
            name="fichier"
            accept=".pdf,application/pdf"
            required
            className={`flex min-h-11 items-center text-[13px] text-ink file:mr-3 file:rounded-lg file:border-0 file:bg-primary-soft file:px-3 file:py-3 file:text-[12px] file:font-semibold file:text-primary ${CLASSE_FOCUS}`}
          />
          <input
            name="nom"
            maxLength={150}
            placeholder="Nom du document (optionnel)"
            aria-label="Nom du document"
            className={CLASSE_CHAMP}
          />
          <button
            type="submit"
            aria-disabled={isPending}
            // Envoi déjà en cours : le second appui ne soumet pas le formulaire.
            onClick={(e) => {
              if (isPending) e.preventDefault()
            }}
            className={`${CLASSE_BOUTON_PRIMAIRE} aria-disabled:opacity-50`}
          >
            {isPending ? 'Envoi…' : 'Ajouter le document'}
          </button>
        </form>
      )}

      {documents.length === 0 ? (
        <div className="flex flex-col gap-3 rounded-[20px] bg-surface p-4 shadow-card">
          <p className="text-[13.5px] leading-relaxed text-muted">
            Aucun document pour l’instant. Chargez les documents officiels : bons de prise en charge (adulte et enfant),
            compte rendu et fiche mémo HAS.
          </p>
          <button
            type="button"
            aria-disabled={isPending}
            onClick={() => {
              if (isPending) return
              executer(chargerDocumentsOfficiels, 'Documents officiels ajoutés.', 'Chargement impossible.')
            }}
            className={`${CLASSE_BOUTON_PRIMAIRE} aria-disabled:opacity-50`}
          >
            {isPending ? 'Un instant…' : 'Charger les documents officiels'}
          </button>
        </div>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {documents.map((d) => (
            <li key={d.id} className="flex items-center gap-1 rounded-[20px] bg-surface p-2 pl-3 shadow-card">
              <button
                type="button"
                onClick={() => ouvrir(d)}
                aria-busy={ouvertureId === d.id}
                className={`flex min-h-12 min-w-0 flex-1 items-center gap-3 rounded-xl text-left ${
                  ouvertureId === d.id ? 'opacity-60' : ''
                } ${CLASSE_FOCUS}`}
              >
                <span
                  aria-hidden="true"
                  className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-[12px] font-bold text-primary"
                >
                  PDF
                </span>
                <span className="min-w-0 flex-1">
                  <span className="line-clamp-2 wrap-anywhere block text-[14.5px] font-semibold text-ink">{d.nom}</span>
                  <span className="block text-[12.5px] text-muted">
                    {ouvertureId === d.id ? (
                      <span role="status" className="font-semibold text-primary">
                        Ouverture…
                      </span>
                    ) : (
                      <>
                        {[formaterTaille(d.taille_octets), `ajouté le ${dateCourte(d.created_at)}`]
                          .filter(Boolean)
                          .join(' · ')}
                      </>
                    )}
                  </span>
                </span>
              </button>
              <button
                type="button"
                onClick={() => setASupprimer(d)}
                aria-label={`Supprimer le document ${d.nom}`}
                title="Supprimer"
                className={CLASSE_ACTION}
              >
                <Icone nom="corbeille" taille={18} />
              </button>
            </li>
          ))}
        </ul>
      )}

      <ModaleConfirmation
        ouvert={aSupprimer !== null}
        titre="Supprimer ce document ?"
        description={aSupprimer ? `« ${aSupprimer.nom} » sera supprimé définitivement pour toute l’équipe.` : undefined}
        onConfirmer={() => aSupprimer && supprimer(aSupprimer)}
        onAnnuler={() => setASupprimer(null)}
      />
    </section>
  )
}
