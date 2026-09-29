'use client'

import { useId } from 'react'
import type { ItemEntretien } from '@/lib/data/entretiens'
import { BadgeTypeItem, EnteteAlerte, classesLigneItem, libelleActionItem } from '@/components/entretien-type-item'

// Toute la ligne est la zone de tap (≥ 48 px) : le <label> enveloppe la case
// et le texte. Le nom accessible de la case = libellé d'action adapté au type
// (« Question posée »…) + texte de l'item ; le badge de type est la
// description. Question et explication : badge compact devant le texte ;
// alerte : en-tête à part, plus marqué. Partagée par la vue liste et le
// mode pas à pas.
export function LigneItem({ item, coche, onBasculer }: { item: ItemEntretien; coche: boolean; onBasculer: () => void }) {
  const id = useId()
  const type = item.type_item

  return (
    <label
      className={`flex min-h-12 cursor-pointer items-start gap-3 rounded-xl p-2.5 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-primary ${classesLigneItem(type, coche)}`}
    >
      <input
        type="checkbox"
        checked={coche}
        onChange={onBasculer}
        aria-labelledby={`${id}-action ${id}-texte`}
        aria-describedby={type ? `${id}-type` : undefined}
        className="mt-0.5 size-6 shrink-0 cursor-pointer accent-primary"
      />
      <span className="flex min-w-0 flex-1 flex-col gap-1.5">
        {type === 'alerte' && (
          <span id={`${id}-type`} className="block">
            <EnteteAlerte />
          </span>
        )}
        <span id={`${id}-action`} className="sr-only">
          {libelleActionItem(type)} :
        </span>
        <span className="block">
          {(type === 'question' || type === 'explication') && (
            <span id={`${id}-type`}>
              <BadgeTypeItem type={type} variante="inline" />
            </span>
          )}
          <span
            id={`${id}-texte`}
            className={`whitespace-pre-wrap break-words text-[15px] leading-normal ${coche ? 'text-muted' : 'text-ink'}`}
          >
            {item.contenu}
          </span>
        </span>
      </span>
    </label>
  )
}
