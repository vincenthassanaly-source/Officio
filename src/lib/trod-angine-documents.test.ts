import { describe, expect, it } from 'vitest'
import { DOCUMENTS_OFFICIELS, formaterTaille, nomDepuisFichier, nomStockageSur } from './trod-angine-documents'
import { existsSync } from 'node:fs'
import path from 'node:path'

describe('trod-angine-documents', () => {
  it('fournit les 4 PDF officiels, présents sur le disque', () => {
    expect(DOCUMENTS_OFFICIELS).toHaveLength(4)
    for (const doc of DOCUMENTS_OFFICIELS) {
      expect(existsSync(path.join(process.cwd(), 'assets', 'trod-angine', 'documents', doc.fichier))).toBe(true)
    }
  })

  it('produit un nom de stockage ASCII sûr', () => {
    expect(nomStockageSur('Fiche mémo HAS – Angine.pdf')).toBe('fiche-memo-has-angine.pdf')
    expect(nomStockageSur('../../é')).toBe('e.pdf')
    expect(nomStockageSur('???')).toBe('document.pdf')
  })

  it('déduit un nom lisible du fichier', () => {
    expect(nomDepuisFichier('Bon_de_prise_en_charge.PDF')).toBe('Bon de prise en charge')
  })

  it('formate les tailles', () => {
    expect(formaterTaille(null)).toBe('')
    expect(formaterTaille(2048)).toBe('2 Ko')
    expect(formaterTaille(1.5 * 1024 * 1024)).toBe('1.5 Mo')
  })
})
