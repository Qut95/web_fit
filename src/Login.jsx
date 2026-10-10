// ==========================================
// COMPOSANT REACT : Login.jsx
// ==========================================
import { useState } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile
} from 'firebase/auth';
import { auth } from './firebase';
import Icon from './Icon';

const MESSAGES_ERREUR = {
  'auth/invalid-credential': 'E-mail ou mot de passe incorrect.',
  'auth/user-not-found': 'E-mail ou mot de passe incorrect.',
  'auth/wrong-password': 'E-mail ou mot de passe incorrect.',
  'auth/invalid-email': "L'adresse e-mail n'est pas valide.",
  'auth/email-already-in-use': 'Un compte existe déjà avec cet e-mail.',
  'auth/weak-password': 'Mot de passe trop court (6 caractères minimum).',
  'auth/too-many-requests': 'Trop de tentatives. Réessaie dans quelques minutes.',
  'auth/network-request-failed': 'Problème de connexion réseau.'
};

function Login({ debutInscription, finInscription }) {
  const [mode, setMode] = useState('connexion');
  const [pseudo, setPseudo] = useState('');
  const [email, setEmail] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const [erreur, setErreur] = useState('');
  const [enCours, setEnCours] = useState(false);

  const estInscription = mode === 'inscription';

  const changerMode = (nouveauMode) => {
    setMode(nouveauMode);
    setErreur('');
  };

  const soumettre = async (e) => {
    e.preventDefault();
    setErreur('');
    setEnCours(true);

    try {
      if (!estInscription) {
        await signInWithEmailAndPassword(auth, email.trim(), motDePasse);
      } else {
        debutInscription();
        try {
          const compte = await createUserWithEmailAndPassword(auth, email.trim(), motDePasse);
          await updateProfile(compte.user, { displayName: pseudo.trim() });
        } finally {
          await finInscription();
        }
      }
    } catch (err) {
      console.error('Erreur authentification :', err);
      setErreur(MESSAGES_ERREUR[err.code] || 'Une erreur est survenue. Réessaie.');
    } finally {
      setEnCours(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-brand">
        <span className="login-logo">
          <Icon name="dumbbell" size={26} />
        </span>
        <h1>Projet Fit</h1>
        <p>Suis tes séances, bats tes records.</p>
      </div>

      <div className="login-card">
        <div className="theme-switch" role="tablist" aria-label="Connexion ou inscription">
          <button
            type="button"
            role="tab"
            aria-selected={!estInscription}
            className={`theme-option ${!estInscription ? 'active' : ''}`}
            onClick={() => changerMode('connexion')}
          >
            Connexion
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={estInscription}
            className={`theme-option ${estInscription ? 'active' : ''}`}
            onClick={() => changerMode('inscription')}
          >
            Inscription
          </button>
        </div>

        <form onSubmit={soumettre}>
          {estInscription && (
            <div className="form-group">
              <label htmlFor="pseudo">Pseudo</label>
              <input
                id="pseudo"
                type="text"
                value={pseudo}
                onChange={(e) => setPseudo(e.target.value)}
                autoComplete="nickname"
                minLength={2}
                maxLength={30}
                required
              />
            </div>
          )}

          <div className="form-group">
            <label htmlFor="email">E-mail</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="mot-de-passe">Mot de passe</label>
            <input
              id="mot-de-passe"
              type="password"
              value={motDePasse}
              onChange={(e) => setMotDePasse(e.target.value)}
              autoComplete={estInscription ? 'new-password' : 'current-password'}
              minLength={6}
              required
            />
          </div>

          {erreur && (
            <p className="form-erreur" role="alert">
              {erreur}
            </p>
          )}

          <button type="submit" className="btn-action btn-create" disabled={enCours}>
            {enCours ? 'Patiente…' : estInscription ? 'Créer mon compte' : 'Se connecter'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default Login;
