import { useState, useEffect } from 'react';
import keycloak from './keycloack';
import './App.css';
import PageEntrainement from './PageEntrainement'

// --- COMPOSANTS DES PAGES ---
// Ces fonctions simulent tes futures pages. Plus tard, tu pourras les mettre dans des fichiers séparés.

function Calendrier({ historique = [] }) {
  const [dateActuelle, setDateActuelle] = useState(new Date());

  const moisCourant = dateActuelle.getMonth();
  const anneeCourante = dateActuelle.getFullYear();

  const nomsDesMois = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
  const joursDeLaSemaine = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

  const nombreDeJours = new Date(anneeCourante, moisCourant + 1, 0).getDate();
  let premierJourDuMois = new Date(anneeCourante, moisCourant, 1).getDay();
  premierJourDuMois = premierJourDuMois === 0 ? 6 : premierJourDuMois - 1;

  const moisPrecedent = () => setDateActuelle(new Date(anneeCourante, moisCourant - 1, 1));
  const moisSuivant = () => setDateActuelle(new Date(anneeCourante, moisCourant + 1, 1));

  // NOUVEAU : Trouver quels jours de ce mois contiennent une séance
  const joursAvecEntrainement = historique
    .map(session => new Date(session.date_seance))
    .filter(date => date.getFullYear() === anneeCourante && date.getMonth() === moisCourant)
    .map(date => date.getDate());

  return (
    <div className="calendrier-container">
      <div className="calendrier-header">
        <button onClick={moisPrecedent} className="btn-nav">◀</button>
        <h3>{nomsDesMois[moisCourant]} {anneeCourante}</h3>
        <button onClick={moisSuivant} className="btn-nav">▶</button>
      </div>

      <div className="calendrier-grille">
        {joursDeLaSemaine.map((jour) => <div key={jour} className="jour-nom">{jour}</div>)}
        {Array.from({ length: premierJourDuMois }).map((_, i) => <div key={`vide-${i}`} className="jour-case vide"></div>)}

        {Array.from({ length: nombreDeJours }).map((_, index) => {
          const jourNumero = index + 1;
          const aFaitSport = joursAvecEntrainement.includes(jourNumero); // Vérifie si ce jour est dans l'historique

          return (
            <div
              key={jourNumero}
              className="jour-case"
              style={{ backgroundColor: aFaitSport ? '#4CAF50' : 'transparent', color: aFaitSport ? 'white' : 'inherit', fontWeight: aFaitSport ? 'bold' : 'normal' }}
            >
              {jourNumero}
              {aFaitSport && <span style={{ fontSize: '10px', display: 'block' }}>🔥</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}



function PageHistorique({ keycloak, isVisible }) {
  const [historique, setHistorique] = useState([]);
  const [chargement, setChargement] = useState(true);

  const [sessionOuverte, setSessionOuverte] = useState(null);
  const toggleDetails = (id) => {
    setSessionOuverte(sessionOuverte === id ? null : id);
  };

  const userId = keycloak?.tokenParsed?.sub;

  useEffect(() => {
    const chargerHistorique = async () => {
      if (!userId) return;
      setChargement(true); // On remet le chargement pendant le fetch
      try {
        const res = await fetch(`http://localhost:3000/api/historique?utilisateur_id=${userId}`);
        if (res.ok) {
          const data = await res.json();
          setHistorique(data);
        }
      } catch (err) {
        console.error("Erreur réseau :", err);
      } finally {
        setChargement(false);
      }
    };

    // 🔴 NOUVEAU : On recharge les données uniquement si l'onglet est visible
    if (isVisible) {
      chargerHistorique();
    }
  }, [userId, isVisible]); // Dépendance à isVisible ajoutée

  return (
    <div className="page-content">
      <h2>📅 Historique</h2>
      <p>Retrouve tes anciennes performances ici.</p>

      <Calendrier historique={historique} />

      <h3 style={{ marginTop: '30px' }}>Dernières séances :</h3>
      {chargement ? (
        <p>Chargement...</p>
      ) : historique.length === 0 ? (
        <p>Aucun entraînement enregistré pour le moment.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          {historique.map((session) => {
            // Selon le driver pg et le type SQL, session.details peut être une string ou déjà un objet/array
            let details = [];
            try {
              details = typeof session.details === 'string' ? JSON.parse(session.details) : (session.details || []);
            } catch (e) {
              details = [];
            }

            const estDeplie = sessionOuverte === session.id;

            return (
              <div key={session.id} style={{ border: '1px solid #ddd', padding: '15px', borderRadius: '8px', backgroundColor: 'white' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h4 style={{ margin: '0 0 5px 0' }}>{session.titre}</h4>
                    <p style={{ margin: 0, color: '#555', fontSize: '0.9em' }}>
                      Le {new Date(session.date_seance).toLocaleDateString('fr-FR')}
                      &nbsp;•&nbsp; ⏱️ {Math.floor(session.duree_secondes / 60)}m {session.duree_secondes % 60}s
                    </p>
                  </div>
                  <button
                    onClick={() => toggleDetails(session.id)}
                    style={{ padding: '6px 10px', cursor: 'pointer', borderRadius: '5px', border: '1px solid #ccc', backgroundColor: '#f9f9f9' }}
                  >
                    {estDeplie ? 'Masquer ▲' : 'Détails ▼'}
                  </button>
                </div>

                {/* DÉTAIL DES EXERCICES ET SÉRIES */}
                {estDeplie && (
                  <div style={{ marginTop: '15px', paddingTop: '15px', borderTop: '1px dashed #eee' }}>
                    {details.length === 0 ? (
                      <p style={{ fontStyle: 'italic', color: '#888' }}>Aucun détail disponible pour cette séance.</p>
                    ) : (
                      details.map((exo, i) => (
                        <div key={i} style={{ marginBottom: '12px' }}>
                          <strong style={{ color: '#2196F3' }}>{exo.nom}</strong>

                          {Array.isArray(exo.series) ? (
                            <ul style={{ margin: '5px 0 0 15px', padding: 0, listStyle: 'disc' }}>
                              {exo.series.map((s, idx) => (
                                <li key={idx} style={{ color: '#444', fontSize: '0.9em' }}>
                                  Série {s.numero || idx + 1} : <strong>{s.reps} reps</strong> @ <strong>{s.poids} kg</strong> {s.terminee ? '✅' : '❌'}
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p style={{ margin: '4px 0 0 15px', fontSize: '0.85em', color: '#666' }}>
                              {exo.nombre_series} séries × {exo.repetitions} reps ({exo.poids_kg} kg)
                            </p>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
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







  return (
    <div className="app-container">
      {/* On peut même afficher le nom de l'utilisateur ! */}
      <header >
        Bonjour, {keycloak.tokenParsed?.preferred_username} 👋
        <button
          onClick={() => keycloak.logout()}
          style={{ marginLeft: '15px', color: 'red', cursor: 'pointer', border: 'none', background: 'none' }}
        >
          Se déconnecter
        </button>
      </header>

      <main className="main-content">
        <div style={{ display: activeTab === 'entrainement' ? 'block' : 'none', height: '100%' }}>
          <PageEntrainement keycloak={keycloak} />
        </div>

        <div style={{ display: activeTab === 'historique' ? 'block' : 'none', height: '100%' }}>
          {/* On passe isVisible pour qu'il recharge les données quand on l'ouvre */}
          <PageHistorique keycloak={keycloak} isVisible={activeTab === 'historique'} />
        </div>

        <div style={{ display: activeTab === 'parametre' ? 'block' : 'none', height: '100%' }}>
          <PageParametre />
        </div>
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