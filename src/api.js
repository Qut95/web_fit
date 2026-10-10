// Un seul endroit pour appeler le backend :
// - l'URL de l'API vient de VITE_API_URL (plus de "localhost" en dur)
// - le token de l'utilisateur connecté est ajouté automatiquement
//   (Firebase le renouvelle tout seul quand il expire)
import { auth } from './firebase';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export async function apiFetch(chemin, options = {}) {
  const headers = { ...(options.headers || {}) };

  if (options.body && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const utilisateur = auth.currentUser;
  if (utilisateur) {
    headers.Authorization = `Bearer ${await utilisateur.getIdToken()}`;
  }

  return fetch(`${API_URL}${chemin}`, { ...options, headers });
}
