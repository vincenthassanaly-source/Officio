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
export function LigneItem({
  item,
  coche,
  onBasculer,
  variante = 'liste',
}: {
  item: ItemEntretien
  coche: boolean
  onBasculer: () => void
  variante?: 'liste' | 'pas-a-pas'
}) {
  const id = useId()
  const type = item.type_item
  const grand = variante === 'pas-a-pas'

  return (
    <label
      className={`flex cursor-pointer items-start rounded-xl ${grand ? 'min-h-14 gap-3.5 p-3.5' : 'min-h-12 gap-3 p-2.5'} motion-safe:transition-colors ${grand ? 'motion-safe:active:scale-[0.99]' : 'motion-safe:active:bg-neutral-soft'} has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-primary ${classesLigneItem(type, coche, variante)}`}
    >
      <input
        type="checkbox"
        checked={coche}
        onChange={onBasculer}
        aria-labelledby={`${id}-action ${id}-texte`}
        aria-describedby={type ? `${id}-type` : undefined}
        className={`shrink-0 cursor-pointer ${grand ? 'mt-0 size-8 accent-green' : 'mt-0.5 size-6 accent-primary'}`}
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
            className={`whitespace-pre-wrap break-words ${grand ? 'text-[17px] leading-snug' : 'text-[15px] leading-normal'} ${coche && !grand ? 'text-muted' : 'text-ink'}`}
          >
            {item.contenu}
          </span>
        </span>
      </span>
    </label>
  )
}
