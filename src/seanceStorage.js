// Sauvegarde de la séance en cours sur l'appareil (localStorage),
// pour pouvoir la reprendre après une fermeture de l'app ou un rechargement.
// Une clé par utilisateur : deux comptes sur le même navigateur ne se mélangent pas.

const cle = (userId) => `seance-en-cours:${userId}`;

export function chargerSeance(userId) {
  try {
    const brut = localStorage.getItem(cle(userId));
    return brut ? JSON.parse(brut) : null;
  } catch {
    return null;
  }
}

export function sauvegarderSeance(userId, donnees) {
  try {
    localStorage.setItem(cle(userId), JSON.stringify(donnees));
  } catch {
    /* stockage indisponible ou plein : la séance continue sans sauvegarde */
  }
}

export function effacerSeance(userId) {
  try {
    localStorage.removeItem(cle(userId));
  } catch {
    /* rien à faire */
  }
}
