import { describe, expect, it } from 'vitest'
import {
  CRITERES_EXCLUSION,
  SIGNES_GRAVITE,
  antibiotiquesProposes,
  basculerBloc,
  blocsEffectifs,
  bonDisponible,
  calculerDoseEnfant,
  changerAge,
  changerAllergie,
  changerBon,
  changerMesure,
  doseEnTexte,
  indicationMacIsaac,
  normaliserIdentite,
  normaliserTrodAngine,
  pointAgeMacIsaac,
  scoreMacIsaac,
  texteMacIsaac,
  trodAngineVide,
  typeBonEffectif,
} from '@/lib/trod-angine'

describe('fiche vide et validation', () => {
  it('reprend les 7 signes de gravité et les 14 critères d’exclusion du compte rendu', () => {
    expect(SIGNES_GRAVITE).toHaveLength(7)
    expect(CRITERES_EXCLUSION).toHaveLength(14)
  })

  it('reconstruit une fiche valide depuis une entrée quelconque', () => {
    const fiche = normaliserTrodAngine({
      patient: { nom: 'Dupont', age: '12 ans', secu: '1 23 45 abc 6789012345678', date: 'pas une date' },
      trod: 'peut-être',
      antibiotique: 'poison',
      allergie: 'penicillines',
      blocs: { b1: true, b9: true, b2: 'oui' },
      gravite: { trismus: true, inconnu: true },
    })
    expect(fiche.patient.nom).toBe('Dupont')
    expect(fiche.patient.age).toBe('12')
    expect(fiche.patient.secu).toBe('123456789012345')
    expect(fiche.patient.date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(fiche.trod).toBeNull()
    expect(fiche.antibiotique).toBeNull()
    expect(fiche.allergie).toBe('penicillines')
    expect(fiche.blocs).toEqual({ b1: true })
    expect(fiche.gravite.trismus).toBe(true)
    expect(Object.keys(fiche.gravite)).toHaveLength(7)
  })

  it('tolère null et les types inattendus', () => {
    expect(normaliserTrodAngine(null)).toEqual(trodAngineVide())
    expect(normaliserTrodAngine('texte').trod).toBeNull()
  })
})

describe('pré-cochage', () => {
  it('coche « âge < 10 ans » selon l’âge saisi', () => {
    let d = changerAge(trodAngineVide(), '8')
    expect(d.exclusions.age).toBe(true)
    d = changerAge(d, '10')
    expect(d.exclusions.age).toBe(false)
    d = changerAge(d, '')
    expect(d.exclusions.age).toBe(false)
  })

  it('coche la température > 39,5 °C et les constantes hors seuils', () => {
    let d = changerMesure(trodAngineVide(), 'temperature', '39,6')
    expect(d.gravite.temperature).toBe(true)
    d = changerMesure(d, 'temperature', '39,5')
    expect(d.gravite.temperature).toBe(false)
    d = changerMesure(d, 'fc', '111')
    expect(d.gravite.constantes).toBe(true)
    d = changerMesure(d, 'fc', '80')
    expect(d.gravite.constantes).toBe(false)
    d = changerMesure(d, 'pas', '89')
    expect(d.gravite.constantes).toBe(true)
    d = changerMesure(d, 'pas', '120')
    d = changerMesure(d, 'fr', '21')
    expect(d.gravite.constantes).toBe(true)
  })

  it('une mesure vide ne décoche pas une case cochée à la main', () => {
    let d = trodAngineVide()
    d = { ...d, gravite: { ...d.gravite, constantes: true } }
    d = changerMesure(d, 'fc', '')
    expect(d.gravite.constantes).toBe(true)
  })
})

describe('blocs du compte rendu', () => {
  it('TROD positif avec antibiotique : blocs 1 et 3', () => {
    const d = { ...trodAngineVide(), trod: 'positif' as const, antibiotique: 'amoxicilline' as const }
    expect(blocsEffectifs(d)).toEqual({ b1: true, b2: false, b3: true, b4: false, b5: false })
    expect(bonDisponible(d)).toBe(true)
  })

  it('TROD négatif : blocs 2 et 3, pas de bon', () => {
    const d = { ...trodAngineVide(), trod: 'negatif' as const }
    expect(blocsEffectifs(d)).toEqual({ b1: false, b2: true, b3: true, b4: false, b5: false })
    expect(bonDisponible(d)).toBe(false)
  })

  it('exclusion et gravité cochent les blocs 4 et 5', () => {
    const d = changerMesure(changerAge(trodAngineVide(), '7'), 'temperature', '40')
    const blocs = blocsEffectifs(d)
    expect(blocs.b4).toBe(true)
    expect(blocs.b5).toBe(true)
  })

  it('une correction manuelle l’emporte, dans les deux sens', () => {
    const d = { ...trodAngineVide(), trod: 'positif' as const, antibiotique: 'amoxicilline' as const }
    const sans = basculerBloc(d, 'b1')
    expect(blocsEffectifs(sans).b1).toBe(false)
    expect(bonDisponible(sans)).toBe(false)
    expect(blocsEffectifs(basculerBloc(sans, 'b1')).b1).toBe(true)
    expect(blocsEffectifs(basculerBloc(d, 'b4')).b4).toBe(true)
  })
})

describe('bon et antibiotique', () => {
  it('choisit enfant / adulte d’après l’âge, sauf correction manuelle', () => {
    expect(typeBonEffectif(changerAge(trodAngineVide(), '12'))).toBe('enfant')
    expect(typeBonEffectif(changerAge(trodAngineVide(), '15'))).toBe('adulte')
    expect(typeBonEffectif(trodAngineVide())).toBe('adulte')
    expect(typeBonEffectif(changerBon(changerAge(trodAngineVide(), '12'), 'adulte'))).toBe('adulte')
  })

  it('propose les antibiotiques du bon selon l’allergie', () => {
    expect(antibiotiquesProposes('aucune', 'adulte')).toEqual(['amoxicilline'])
    expect(antibiotiquesProposes('penicillines', 'adulte')).toEqual(['cefuroxime', 'cefpodoxime'])
    // Pas de céfuroxime sur le bon enfant.
    expect(antibiotiquesProposes('penicillines', 'enfant')).toEqual(['cefpodoxime'])
    expect(antibiotiquesProposes('betalactamines', 'enfant')).toEqual(['clarithromycine'])
  })

  it('préselectionne l’antibiotique à l’allergie et le revoit si le choix devient impossible', () => {
    let d = changerAge(trodAngineVide(), '30')
    d = changerAllergie(d, 'aucune')
    expect(d.antibiotique).toBe('amoxicilline')
    d = changerAllergie(d, 'penicillines')
    expect(d.antibiotique).toBe('cefpodoxime')
    d = { ...d, antibiotique: 'cefuroxime' }
    d = changerAllergie(d, 'penicillines')
    expect(d.antibiotique).toBe('cefuroxime')
    d = changerBon(d, 'enfant')
    expect(d.antibiotique).toBe('cefpodoxime')
  })
})

describe('doses enfant', () => {
  it('amoxicilline : 50 mg/kg/j en 2 prises, plafonné à 2 g/j', () => {
    expect(calculerDoseEnfant('amoxicilline', 24)).toMatchObject({ parJour: 1200, parPrise: 600, plafonne: false })
    expect(calculerDoseEnfant('amoxicilline', 45)).toMatchObject({ parJour: 2000, parPrise: 1000, plafonne: true })
  })

  it('cefpodoxime : 8 mg/kg/j, plafonné à 200 mg/j', () => {
    expect(calculerDoseEnfant('cefpodoxime', 20)).toMatchObject({ parJour: 160, parPrise: 80, plafonne: false })
    expect(calculerDoseEnfant('cefpodoxime', 30)).toMatchObject({ parJour: 200, parPrise: 100, plafonne: true })
  })

  it('clarithromycine : 15 mg/kg/j en 2 prises', () => {
    expect(calculerDoseEnfant('clarithromycine', 30)).toMatchObject({ parJour: 450, parPrise: 225, depasseAdulte: false })
  })

  it('pas de dose sans poids exploitable ni pour un antibiotique adulte seulement', () => {
    expect(calculerDoseEnfant('amoxicilline', null)).toBeNull()
    expect(calculerDoseEnfant('cefuroxime', 30)).toBeNull()
  })

  it('texte de dose uniquement sur le bon enfant', () => {
    let d = changerAge(trodAngineVide(), '8')
    d = { ...d, patient: { ...d.patient, poids: '24,5' } }
    expect(doseEnTexte(d, 'amoxicilline')).toBe(
      'Poids 24,5 kg : 1 225 mg/j en 2 prises par jour, soit 613 mg par prise, 6 jours'
    )
    expect(doseEnTexte(changerBon(d, 'adulte'), 'amoxicilline')).toBeNull()
    expect(doseEnTexte({ ...d, patient: { ...d.patient, poids: '' } }, 'amoxicilline')).toBeNull()
  })
})

describe('score de Mac Isaac', () => {
  function avec(age: string, criteres: Partial<Record<'temperature' | 'sans_toux' | 'adenopathie' | 'amygdales', boolean>>) {
    const d = changerAge(trodAngineVide(), age)
    return { ...d, macisaac: { ...d.macisaac, criteres: { ...d.macisaac.criteres, ...criteres } } }
  }

  it('point d’âge : 15-44 ans = 0, 45 ans et plus = −1', () => {
    expect(pointAgeMacIsaac(changerAge(trodAngineVide(), '15'))).toBe(0)
    expect(pointAgeMacIsaac(changerAge(trodAngineVide(), '44'))).toBe(0)
    expect(pointAgeMacIsaac(changerAge(trodAngineVide(), '45'))).toBe(-1)
    expect(pointAgeMacIsaac(changerAge(trodAngineVide(), '70'))).toBe(-1)
  })

  it('sous 15 ans : point d’âge à saisir, score incalculable tant qu’il ne l’est pas', () => {
    const d = avec('12', { temperature: true, sans_toux: true })
    expect(pointAgeMacIsaac(d)).toBeNull()
    expect(scoreMacIsaac(d)).toBeNull()
    expect(indicationMacIsaac(d)).toBeNull()
    expect(scoreMacIsaac({ ...d, macisaac: { ...d.macisaac, age_manuel: 1 } })).toBe(3)
    expect(scoreMacIsaac({ ...d, macisaac: { ...d.macisaac, age_manuel: 0 } })).toBe(2)
  })

  it('âge inconnu : pas de score', () => {
    expect(scoreMacIsaac(trodAngineVide())).toBeNull()
  })

  it('score < 2 : pas d’antibiotique ; score ≥ 2 : TROD indiqué', () => {
    expect(indicationMacIsaac(avec('30', { temperature: true }))).toBe('pas_antibiotique')
    expect(indicationMacIsaac(avec('30', { temperature: true, sans_toux: true }))).toBe('trod_indique')
    // 60 ans : −1 au point d’âge, 3 critères = 2.
    expect(scoreMacIsaac(avec('60', { temperature: true, sans_toux: true, adenopathie: true }))).toBe(2)
    expect(indicationMacIsaac(avec('60', { temperature: true, sans_toux: true }))).toBe('pas_antibiotique')
  })

  it('texte reporté sur le compte rendu', () => {
    const d = avec('30', { temperature: true, sans_toux: true })
    expect(texteMacIsaac(d)).toBe('Score de Mac Isaac : 2 (Température > 38 °C ; Absence de toux ; âge 0).')
    expect(texteMacIsaac(trodAngineVide())).toBe('')
  })

  it('la fiche reconstruite garde score, précision et pharmacien, et ignore le reste', () => {
    const f = normaliserTrodAngine({
      macisaac: { criteres: { temperature: true, inconnu: true }, age_manuel: 1 },
      pharmacien: 'Dr Martin',
      gravite_precision: 'amygdale déviée',
    })
    expect(f.macisaac.criteres.temperature).toBe(true)
    expect(f.macisaac.age_manuel).toBe(1)
    expect(f.pharmacien).toBe('Dr Martin')
    expect(f.gravite_precision).toBe('amygdale déviée')
    expect(normaliserTrodAngine({ macisaac: { age_manuel: 5 } }).macisaac.age_manuel).toBeNull()
  })

  it('identité de l’officine tronquée et nettoyée', () => {
    expect(normaliserIdentite({ nom_structure: '  Pharmacie du Centre ', numero_am: 42, adresse: 'x'.repeat(400) })).toEqual({
      nom_structure: 'Pharmacie du Centre',
      adresse: 'x'.repeat(250),
      numero_am: '',
    })
  })
})
