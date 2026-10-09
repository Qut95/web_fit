import { useState, useEffect } from 'react';
import keycloak from './keycloack';
import './App.css';
import PageEntrainement from './PageEntrainement'
import Icon from './Icon';

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

  const joursAvecEntrainement = historique
    .map(session => new Date(session.date_seance))
    .filter(date => date.getFullYear() === anneeCourante && date.getMonth() === moisCourant)
    .map(date => date.getDate());

  return (
    <div className="calendrier-container">
      <div className="calendrier-header">
        <button onClick={moisPrecedent} className="btn-nav" aria-label="Mois précédent"><Icon name="chevron-left" size={18} /></button>
        <h3>{nomsDesMois[moisCourant]} {anneeCourante}</h3>
        <button onClick={moisSuivant} className="btn-nav" aria-label="Mois suivant"><Icon name="chevron-right" size={18} /></button>
      </div>

      <div className="calendrier-grille">
        {joursDeLaSemaine.map((jour) => <div key={jour} className="jour-nom">{jour}</div>)}
        {Array.from({ length: premierJourDuMois }).map((_, i) => <div key={`vide-${i}`} className="jour-case vide"></div>)}

        {Array.from({ length: nombreDeJours }).map((_, index) => {
          const jourNumero = index + 1;
          const aFaitSport = joursAvecEntrainement.includes(jourNumero);

          return (
            <div
              key={jourNumero}
              className={`jour-case ${aFaitSport ? 'jour-sport' : ''}`}
            >
              {jourNumero}
              {aFaitSport && <span className="icon-sport" />}
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
      setChargement(true);
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

    if (isVisible) {
      chargerHistorique();
    }
  }, [userId, isVisible]);

  return (
    <div className="page-content">
      <h2>Historique</h2>
      <p>Retrouve tes anciennes performances ici.</p>

      <Calendrier historique={historique} />

      <h3 className="historique-title">Dernières séances :</h3>
      {chargement ? (
        <p>Chargement...</p>
      ) : historique.length === 0 ? (
        <p>Aucun entraînement enregistré pour le moment.</p>
      ) : (
        <div className="historique-list">
          {historique.map((session) => {
            let details = [];
            try {
              details = typeof session.details === 'string' ? JSON.parse(session.details) : (session.details || []);
            } catch (e) {
              details = [];
            }

            const estDeplie = sessionOuverte === session.id;

            return (
              <div key={session.id} className="historique-item">
                <div className="historique-item-header">
                  <div>
                    <h4>{session.titre}</h4>
                    <p className="historique-date">
                      <span>Le {new Date(session.date_seance).toLocaleDateString('fr-FR')}</span>
                      <span className="historique-duree"><Icon name="timer" size={14} />{Math.floor(session.duree_secondes / 60)}m {session.duree_secondes % 60}s</span>
                    </p>
                  </div>
                  <button onClick={() => toggleDetails(session.id)} className="btn-details">
                    {estDeplie ? 'Masquer' : 'Détails'}
                    <Icon name={estDeplie ? 'chevron-up' : 'chevron-down'} size={14} />
                  </button>
                </div>

                {estDeplie && (
                  <div className="historique-details">
                    {details.length === 0 ? (
                      <p className="empty-details">Aucun détail disponible pour cette séance.</p>
                    ) : (
                      details.map((exo, i) => (
                        <div key={i} className="detail-exo">
                          <strong className="exo-nom">{exo.nom}</strong>

                          {Array.isArray(exo.series) ? (
                            <ul className="serie-list">
                              {exo.series.map((s, idx) => (
                                <li key={idx} className="serie-item">
                                  Série {s.numero || idx + 1} : <strong>{s.reps} reps</strong> @ <strong>{s.poids} kg</strong> {s.terminee ? <Icon name="check" size={14} className="icon-ok" /> : <Icon name="x" size={14} className="icon-ko" />}
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="exo-summary">
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

function PageParametre({ keycloak, theme, onChangeTheme }) {
  const themes = [
    { id: 'light', label: 'Clair', icon: 'sun' },
    { id: 'dark', label: 'Sombre', icon: 'moon' }
  ];

  return (
    <div className="page-content">
      <h2>Paramètres</h2>
      <p>Gère ton profil et tes préférences.</p>

      <section className="parametre-section">
        <h3>Apparence</h3>
        <div className="theme-switch" role="radiogroup" aria-label="Thème de l'application">
          {themes.map((t) => (
            <button
              key={t.id}
              type="button"
              role="radio"
              aria-checked={theme === t.id}
              className={`theme-option ${theme === t.id ? 'active' : ''}`}
              onClick={() => onChangeTheme(t.id)}
            >
              <Icon name={t.icon} size={18} />
              {t.label}
            </button>
          ))}
        </div>
      </section>

      <section className="parametre-section">
        <h3>Compte</h3>
        <dl className="parametre-infos">
          <div>
            <dt>Pseudo</dt>
            <dd>{keycloak?.tokenParsed?.preferred_username}</dd>
          </div>
          <div>
            <dt>E-mail</dt>
            <dd>{keycloak?.tokenParsed?.email || 'Non renseigné'}</dd>
          </div>
        </dl>
      </section>
    </div>
  );
}

export default function App() {
  const [activeTab, setActiveTab] = useState('entrainement');
  const [estConnecte, setEstConnecte] = useState(false);

  // Thème : préférence enregistrée, sinon celle du système
  const [theme, setTheme] = useState(() => {
    try {
      const enregistre = localStorage.getItem('theme');
      if (enregistre === 'light' || enregistre === 'dark') return enregistre;
    } catch {
      /* stockage indisponible */
    }
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  const changerTheme = (nouveauTheme) => {
    setTheme(nouveauTheme);
    try {
      localStorage.setItem('theme', nouveauTheme);
    } catch {
      /* stockage indisponible */
    }
  };

  const synchroniserUtilisateur = async () => {
    try {
      const token = keycloak.token;
      const infosUtilisateur = {
        id: keycloak.tokenParsed?.sub,
        pseudo: keycloak.tokenParsed?.preferred_username,
        email: keycloak.tokenParsed?.email
      };

      const reponse = await fetch('http://localhost:3000/api/utilisateurs/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
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
    keycloak.init({ onLoad: 'login-required' }).then((authenticated) => {
      setEstConnecte(authenticated);
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
      <header className="app-header">
        <span>Bonjour, {keycloak.tokenParsed?.preferred_username}</span>
        <button onClick={() => keycloak.logout()} className="btn-logout">
          <Icon name="log-out" size={15} />
          Se déconnecter
        </button>
      </header>

      <main className="main-content">
        <div className={activeTab === 'entrainement' ? 'tab-active' : 'tab-hidden'}>
          <PageEntrainement keycloak={keycloak} />
        </div>

        <div className={activeTab === 'historique' ? 'tab-active' : 'tab-hidden'}>
          <PageHistorique keycloak={keycloak} isVisible={activeTab === 'historique'} />
        </div>

        <div className={activeTab === 'parametre' ? 'tab-active' : 'tab-hidden'}>
          <PageParametre keycloak={keycloak} theme={theme} onChangeTheme={changerTheme} />
        </div>
      </main>

      <nav className="bottom-nav">
        <button
          className={activeTab === 'entrainement' ? 'active' : ''}
          onClick={() => setActiveTab('entrainement')}
        >
          <Icon name="dumbbell" size={22} />
          <span>Entraînement</span>
        </button>

        <button
          className={activeTab === 'historique' ? 'active' : ''}
          onClick={() => setActiveTab('historique')}
        >
          <Icon name="history" size={22} />
          <span>Historique</span>
        </button>

        <button
          className={activeTab === 'parametre' ? 'active' : ''}
          onClick={() => setActiveTab('parametre')}
        >
          <Icon name="sliders" size={22} />
          <span>Paramètres</span>
        </button>
      </nav>
    </div>
  );
}