/**
 * Parseur SSE (Server-Sent Events).
 *
 * `EventSource` ne sait faire ni `POST` ni `Authorization` : il faut lire le
 * `ReadableStream` d'un `fetch` et découper le flux soi-même. C'est là que se
 * cachent les bugs — un chunk réseau ne s'arrête jamais sur une frontière utile :
 * il coupe au milieu d'une ligne, ou entre les deux `\n` d'un séparateur.
 *
 * Le découpage est volontairement séparé de la lecture du flux : la logique
 * délicate se teste sans réseau ni `ReadableStream` (voir test/unit/chat/sse.test.ts).
 */

export interface SseEvent {
  /** Nom d'événement (`event:`). `message` par défaut, comme le veut la spécification. */
  event: string;
  /** Champs `data:` concaténés, séparés par des `\n`. */
  data: string;
}

export interface SseDecoder {
  /** Consomme un fragment de flux et rend les événements COMPLETS qu'il contient. */
  push(chunk: string): SseEvent[];
  /** Signale la fin du flux. Rend l'éventuel événement non terminé par une ligne vide. */
  flush(): SseEvent[];
}

export function createSseDecoder(): SseDecoder {
  let tampon = '';
  let nomEvenement = '';
  let donnees: string[] = [];

  function terminer(): SseEvent | null {
    // Spécification SSE : sans aucun champ `data`, il n'y a rien à distribuer.
    if (!donnees.length) {
      nomEvenement = '';
      return null;
    }
    const evenement: SseEvent = {
      event: nomEvenement || 'message',
      data: donnees.join('\n'),
    };
    nomEvenement = '';
    donnees = [];
    return evenement;
  }

  function traiterLigne(ligne: string, sortie: SseEvent[]) {
    // Ligne vide = fin d'événement.
    if (ligne === '') {
      const evenement = terminer();
      if (evenement) sortie.push(evenement);
      return;
    }

    // Commentaire — c'est la forme du keep-alive (`: keep-alive`) que Cloudflare
    // impose sur les flux lents. Un parseur naïf le prendrait pour de la donnée.
    if (ligne.startsWith(':')) return;

    const separateur = ligne.indexOf(':');
    const champ = separateur === -1 ? ligne : ligne.slice(0, separateur);
    let valeur = separateur === -1 ? '' : ligne.slice(separateur + 1);
    // Un unique espace après le deux-points fait partie de la syntaxe, pas de la valeur.
    if (valeur.startsWith(' ')) valeur = valeur.slice(1);

    if (champ === 'event') nomEvenement = valeur;
    else if (champ === 'data') donnees.push(valeur);
    // `id` et `retry` ne servent qu'à la reconnexion automatique d'EventSource :
    // sans objet ici, mais ils ne doivent pas polluer les données.
  }

  return {
    push(chunk) {
      tampon += chunk;
      const sortie: SseEvent[] = [];

      // On ne traite QUE les lignes complètes : le reste du tampon (ligne
      // tronquée par la fin du chunk) attend le fragment suivant.
      let index = tampon.search(/\r\n|\n|\r/);
      while (index !== -1) {
        const ligne = tampon.slice(0, index);
        const longueurSaut = tampon.startsWith('\r\n', index) ? 2 : 1;
        tampon = tampon.slice(index + longueurSaut);
        traiterLigne(ligne, sortie);
        index = tampon.search(/\r\n|\n|\r/);
      }

      return sortie;
    },

    flush() {
      const sortie: SseEvent[] = [];
      if (tampon) {
        const reste = tampon;
        tampon = '';
        traiterLigne(reste, sortie);
      }
      const evenement = terminer();
      if (evenement) sortie.push(evenement);
      return sortie;
    },
  };
}

/**
 * Lit un corps de réponse `fetch` et rend les événements SSE au fil de l'eau.
 */
export async function* lireFluxSse(
  body: ReadableStream<Uint8Array>,
  signal?: AbortSignal,
): AsyncGenerator<SseEvent> {
  const lecteur = body.getReader();
  const decodeurTexte = new TextDecoder();
  const decodeur = createSseDecoder();

  try {
    for (;;) {
      const { done, value } = await lecteur.read();
      if (done) break;
      // `stream: true` : un caractère UTF-8 peut être coupé entre deux chunks.
      for (const evenement of decodeur.push(decodeurTexte.decode(value, { stream: true }))) {
        yield evenement;
      }
      if (signal?.aborted) return;
    }
    for (const evenement of decodeur.flush()) yield evenement;
  } finally {
    lecteur.releaseLock();
  }
}
