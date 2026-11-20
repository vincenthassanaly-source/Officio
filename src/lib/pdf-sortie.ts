// Sorties des PDF du TROD angine côté navigateur : téléchargement et impression
// directe. Le PDF est récupéré avec la session de l'utilisateur (même origine)
// puis traité en mémoire ; rien n'est stocké.

async function recupererPdf(url: string): Promise<{ blob: Blob; nom: string }> {
  const reponse = await fetch(url, { credentials: 'same-origin', cache: 'no-store' })
  if (!reponse.ok) {
    const message = (await reponse.text().catch(() => '')).trim()
    throw new Error(message && message.length < 200 ? message : 'Le document n’a pas pu être généré.')
  }
  const disposition = reponse.headers.get('Content-Disposition') ?? ''
  const nom = /filename="([^"]+)"/.exec(disposition)?.[1] ?? 'document.pdf'
  return { blob: await reponse.blob(), nom }
}

export async function telechargerPdf(url: string): Promise<void> {
  const { blob, nom } = await recupererPdf(url)
  const objet = URL.createObjectURL(blob)
  const lien = document.createElement('a')
  lien.href = objet
  lien.download = nom
  document.body.appendChild(lien)
  lien.click()
  lien.remove()
  setTimeout(() => URL.revokeObjectURL(objet), 60_000)
}

// Impression directe via un cadre masqué. Si le navigateur ne sait pas imprimer
// un PDF dans un cadre (certains mobiles), le document s'ouvre dans un onglet.
export async function imprimerPdf(url: string): Promise<void> {
  const { blob } = await recupererPdf(url)
  const objet = URL.createObjectURL(blob)
  const cadre = document.createElement('iframe')
  cadre.setAttribute('aria-hidden', 'true')
  cadre.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden'
  const nettoyer = () => {
    cadre.remove()
    URL.revokeObjectURL(objet)
  }
  cadre.onload = () => {
    try {
      cadre.contentWindow?.focus()
      cadre.contentWindow?.print()
      setTimeout(nettoyer, 60_000)
    } catch {
      window.open(objet, '_blank')
      setTimeout(nettoyer, 60_000)
    }
  }
  cadre.src = objet
  document.body.appendChild(cadre)
}
