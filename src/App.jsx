import { useState, useEffect } from 'react';
import keycloak from './keycloack';
import './App.css';
import PageEntrainement from './PageEntrainement'

// --- COMPOSANTS DES PAGES ---
// Ces fonctions simulent tes futures pages. Plus tard, tu pourras les mettre dans des fichiers séparés.

function Calendrier() {
  // On initialise la date sur aujourd'hui
  const [dateActuelle, setDateActuelle] = useState(new Date());

  const moisCourant = dateActuelle.getMonth(); // De 0 (Janvier) à 11 (Décembre)
  const anneeCourante = dateActuelle.getFullYear();

  const nomsDesMois = [
    "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
    "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
  ];
  const joursDeLaSemaine = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

  // 1. Calculer combien il y a de jours dans ce mois (ex: 28, 30, 31)
  const nombreDeJours = new Date(anneeCourante, moisCourant + 1, 0).getDate();

  // 2. Trouver quel jour de la semaine tombe le 1er du mois
  let premierJourDuMois = new Date(anneeCourante, moisCourant, 1).getDay();
  // On ajuste pour que la semaine commence le lundi (par défaut JS commence le dimanche)
  premierJourDuMois = premierJourDuMois === 0 ? 6 : premierJourDuMois - 1;

  // 3. Fonctions pour naviguer
  const moisPrecedent = () => {
    setDateActuelle(new Date(anneeCourante, moisCourant - 1, 1));
  };

  const moisSuivant = () => {
    setDateActuelle(new Date(anneeCourante, moisCourant + 1, 1));
  };

  return (
    <div className="calendrier-container">
      {/* En-tête avec les boutons de navigation */}
      <div className="calendrier-header">
        <button onClick={moisPrecedent} className="btn-nav">◀</button>
        <h3>{nomsDesMois[moisCourant]} {anneeCourante}</h3>
        <button onClick={moisSuivant} className="btn-nav">▶</button>
      </div>

      {/* Grille du calendrier */}
      <div className="calendrier-grille">
        {/* Affichage des jours de la semaine (Lun, Mar, Mer...) */}
        {joursDeLaSemaine.map((jour) => (
          <div key={jour} className="jour-nom">{jour}</div>
        ))}

        {/* Cases vides pour décaler le 1er du mois au bon jour */}
        {Array.from({ length: premierJourDuMois }).map((_, index) => (
          <div key={`vide-${index}`} className="jour-case vide"></div>
        ))}

        {/* Les cases des jours du mois */}
        {Array.from({ length: nombreDeJours }).map((_, index) => {
          const jourNumero = index + 1;
          return (
            <div key={jourNumero} className="jour-case">
              {jourNumero}
            </div>
          );
        })}
      </div>
    </div>
  );
}



function PageHistorique() {
  return (
    <div className="page-content">
      <h2>📅 Historique</h2>
      <p>Retrouve tes anciennes performances ici.</p>
      <Calendrier />

    </div>
  );
}

function PageParametre() {
  return (
    <div className="page-content">
      <h2>⚙️ Paramètres</h2>
      <p>Gère ton profil et tes préférences.</p>
      <button className="btn-action">Connecte toi</button>
    </div>
  );
}



// --- COMPOSANT PRINCIPAL ---
export default function App() {
  const [activeTab, setActiveTab] = useState('entrainement');
  const [estConnecte, setEstConnecte] = useState(false);

  // Fonction pour envoyer les infos de Keycloak à votre base de données
  const synchroniserUtilisateur = async () => {
    try {
      // On récupère le token d'accès brut généré par Keycloak
      const token = keycloak.token;
      
      // On extrait les informations décodées par Keycloak
      const infosUtilisateur = {
        id: keycloak.tokenParsed?.sub,
        pseudo: keycloak.tokenParsed?.preferred_username,
        email: keycloak.tokenParsed?.email
      };

      // Remplacez cette URL par l'adresse de votre propre Backend API
      const reponse = await fetch('http://localhost:3000/api/utilisateurs/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // TRÈS IMPORTANT : On envoie le token dans l'en-tête pour sécuriser l'API
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify(infosUtilisateur)
      });

      if (!reponse.ok) {
        console.error("Erreur lors de l'enregistrement dans la base de données");
      } else {
        console.log("Utilisateur synchronisé avec succès dans la BD !");
      }
    } catch (erreur) {
      console.error("Erreur réseau lors de la synchronisation :", erreur);
    }
  };

  useEffect(() => {
    // onLoad: 'login-required' force la redirection vers Keycloak si non connecté
    keycloak.init({ onLoad: 'login-required' }).then((authenticated) => {
      setEstConnecte(authenticated);
      
      // Si la connexion réussit, on synchronise l'utilisateur avec la base de données
      if (authenticated) {
        synchroniserUtilisateur();
      }
    }).catch(console.error);
  }, []);

  if (!estConnecte) {
    return <div>Chargement sécurisé en cours...</div>;
  }

  // Cette fonction choisit quelle page afficher en fonction de l'état
  const renderPage = () => {
    if (activeTab === 'entrainement') return <PageEntrainement keycloak={keycloak}/>;
    if (activeTab === 'historique') return <PageHistorique />;
    if (activeTab === 'parametre') return <PageParametre />;
  };





  return (
    <div className="app-container">
      {/* On peut même afficher le nom de l'utilisateur ! */}
      <header style={{ padding: '10px', textAlign: 'center', background: '#fff' }}>
        Bonjour, {keycloak.tokenParsed?.preferred_username} 👋
        <button
          onClick={() => keycloak.logout()}
          style={{ marginLeft: '15px', color: 'red', cursor: 'pointer', border: 'none', background: 'none' }}
        >
          Se déconnecter
        </button>
      </header>

      <main className="main-content">
        {renderPage()}
      </main>

      {/* ... (Gardez votre barre de navigation nav.bottom-nav ici) ... */}
      <nav className="bottom-nav">
        <button
          className={activeTab === 'entrainement' ? 'active' : ''}
          onClick={() => setActiveTab('entrainement')}
        >
          🏋️‍♂️<br />Entraînement
        </button>

        <button
          className={activeTab === 'historique' ? 'active' : ''}
          onClick={() => setActiveTab('historique')}
        >
          📜<br />Historique
        </button>

        <button
          className={activeTab === 'parametre' ? 'active' : ''}
          onClick={() => setActiveTab('parametre')}
        >
          ⚙️<br />Paramètres
        </button>
      </nav>
    </div>
  );
}