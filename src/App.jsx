import { useState } from 'react';
import './App.css'; // N'oublie pas d'importer le CSS

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

function PageEntrainement() {
  return (
    <div className="page-content">
      <h2>💪 Entraînement</h2>
      <p>Prêt pour ta séance du jour ?</p>
      <button className="btn-action">Créer ta propre scéance</button>
    </div>
  );
}

function PageHistorique() {
  return (
    <div className="page-content">
      <h2>📅 Historique</h2>
      <p>Retrouve tes anciennes performances ici.</p>
      <Calendrier/>
      
    </div>
  );
}

function PageParametre() {
  return (
    <div className="page-content">
      <h2>⚙️ Paramètres</h2>
      <p>Gère ton profil et tes préférences.</p>
    </div>
  );
}

// --- COMPOSANT PRINCIPAL ---
export default function App() {
  // Le state 'activeTab' mémorise l'onglet actuellement sélectionné. 
  // Par défaut, on s'ouvre sur l'entraînement.
  const [activeTab, setActiveTab] = useState('entrainement');

  // Cette fonction choisit quelle page afficher en fonction de l'état
  const renderPage = () => {
    if (activeTab === 'entrainement') return <PageEntrainement />;
    if (activeTab === 'historique') return <PageHistorique />;
    if (activeTab === 'parametre') return <PageParametre />;
  };

  return (
    <div className="app-container">
      {/* Zone d'affichage dynamique (le contenu change) */}
      <main className="main-content">
        {renderPage()}
      </main>

      {/* Barre de navigation fixe en bas */}
      <nav className="bottom-nav">
        <button 
          className={activeTab === 'entrainement' ? 'active' : ''} 
          onClick={() => setActiveTab('entrainement')}
        >
          🏋️‍♂️<br/>Entraînement
        </button>
        
        <button 
          className={activeTab === 'historique' ? 'active' : ''} 
          onClick={() => setActiveTab('historique')}
        >
          📜<br/>Historique
        </button>
        
        <button 
          className={activeTab === 'parametre' ? 'active' : ''} 
          onClick={() => setActiveTab('parametre')}
        >
          ⚙️<br/>Paramètres
        </button>
      </nav>
    </div>
  );
}