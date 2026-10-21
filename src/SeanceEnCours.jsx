// ==========================================
// COMPOSANT REACT : SeanceEnCours.jsx
// ==========================================
import React, { useState, useEffect } from 'react';
import Icon from './Icon';
import { apiFetch } from './api';
import { chargerSeance, sauvegarderSeance, effacerSeance } from './seanceStorage';

function construireSeance(entrainementBase) {
  const exercicesInitiaux = (entrainementBase.exercices || []).map((exo) => {
    const nbSeries = Number(exo.nombre_series) || 1;
    const series = Array.from({ length: nbSeries }, (_, i) => ({
      numero: i + 1,
      reps: exo.repetitions || '10',
      poids: exo.poids_kg !== null && exo.poids_kg !== undefined ? exo.poids_kg : 0,
      terminee: false
    }));

    return { ...exo, series };
  });

  return { ...entrainementBase, exercices: exercicesInitiaux };
}

const formaterTemps = (secondes) => {
  const h = Math.floor(secondes / 3600);
  const m = Math.floor((secondes % 3600) / 60).toString().padStart(2, '0');
  const s = (secondes % 60).toString().padStart(2, '0');
  return h > 0 ? `${h}:${m}:${s}` : `${m}:${s}`;
};

function SeanceEnCours({ entrainementBase, userId, terminerSeance, exercicesDisponibles }) {
  // Séance éventuellement sauvegardée sur cet appareil (reprise après fermeture)
  const [sauvegarde] = useState(() => {
    const s = chargerSeance(userId);
    return s && s.entrainementBase?.id === entrainementBase.id ? s : null;
  });

  const [seance, setSeance] = useState(() => sauvegarde?.seance ?? construireSeance(entrainementBase));

  // Les chronos ne comptent pas les secondes : on retient l'heure de début
  // et l'heure de fin du repos, et on calcule l'écart avec l'heure actuelle.
  // Ainsi, mise en veille ou app fermée n'ont aucun effet sur le temps affiché.
  const [debut] = useState(() => sauvegarde?.debut ?? Date.now());
  const [reposFin, setReposFin] = useState(() => sauvegarde?.reposFin ?? null);
  const [maintenant, setMaintenant] = useState(() => Date.now());

  // Rafraîchit l'affichage, et immédiatement au retour sur l'app
  useEffect(() => {
    const actualiser = () => setMaintenant(Date.now());
    const interval = setInterval(actualiser, 500);
    document.addEventListener('visibilitychange', actualiser);
    window.addEventListener('focus', actualiser);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', actualiser);
      window.removeEventListener('focus', actualiser);
    };
  }, []);

  const chronoGlobal = Math.max(0, Math.floor((maintenant - debut) / 1000));
  const chronoRepos = reposFin !== null ? Math.max(0, Math.ceil((reposFin - maintenant) / 1000)) : 0;
  const reposActif = reposFin !== null && chronoRepos > 0;

  // Fin du repos
  useEffect(() => {
    if (reposFin !== null && maintenant >= reposFin) {
      setReposFin(null);
      // On n'avertit que si le repos vient juste de se terminer
      if (maintenant - reposFin < 5000) {
        navigator.vibrate?.(200);
        alert("Repos terminé, c'est reparti !");
      }
    }
  }, [maintenant, reposFin]);

  // Sauvegarde automatique à chaque changement
  useEffect(() => {
    sauvegarderSeance(userId, { entrainementBase, seance, debut, reposFin });
  }, [userId, entrainementBase, seance, debut, reposFin]);

  const modifierSerie = (exoIndex, serieIndex, champ, valeur) => {
    const copieExercices = [...seance.exercices];
    copieExercices[exoIndex].series[serieIndex][champ] = valeur;
    setSeance({ ...seance, exercices: copieExercices });
  };

  const cocherSerie = (exoIndex, serieIndex, tempsRepos) => {
    const copieExercices = [...seance.exercices];
    const serie = copieExercices[exoIndex].series[serieIndex];
    const etaitCoche = serie.terminee;

    serie.terminee = !etaitCoche;
    setSeance({ ...seance, exercices: copieExercices });

    if (!etaitCoche && tempsRepos > 0) {
      setReposFin(Date.now() + tempsRepos * 1000);
    }
  };

  const remplacerExercice = (exoIndex, nouvelExoId) => {
    const exoDb = exercicesDisponibles.find((e) => e.id === parseInt(nouvelExoId));
    if (!exoDb) return;

    const copieExercices = [...seance.exercices];
    copieExercices[exoIndex] = {
      ...copieExercices[exoIndex],
      exercice_id: exoDb.id,
      nom: exoDb.nom
    };

    setSeance({ ...seance, exercices: copieExercices });
  };

  const validerSeance = async () => {
    if (!window.confirm("Avez-vous terminé votre séance ?")) return;

    const payload = {
      titre: seance.titre,
      duree_secondes: Math.max(0, Math.floor((Date.now() - debut) / 1000)),
      details: seance.exercices
    };

    try {
      const res = await apiFetch('/api/historique', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        alert("Séance terminée et enregistrée !");
        effacerSeance(userId);
        terminerSeance();
      } else {
        const erreur = await res.json();
        alert("Erreur côté serveur : " + (erreur.erreur || erreur.message));
        console.error("Détails serveur:", erreur);
      }
    } catch (err) {
      console.error("Erreur de sauvegarde :", err);
      alert("Problème de réseau. Vérifiez que votre backend tourne.");
    }
  };

  const annulerSeance = () => {
    if (window.confirm("Annuler la séance ? (Rien ne sera sauvegardé)")) {
      effacerSeance(userId);
      terminerSeance();
    }
  };

  return (
    <div className="page-content seance-en-cours">
      <div className="chrono-banner">
        <h3><Icon name="timer" size={20} />{formaterTemps(chronoGlobal)}</h3>
        {reposActif && (
          <h3 className="text-repos">Repos {formaterTemps(chronoRepos)}</h3>
        )}
      </div>

      <h2 className="seance-title">En cours : {seance.titre}</h2>

      {seance.exercices.map((exo, exoIndex) => (
        <div key={exoIndex} className="seance-exo-card">

          <div className="seance-exo-header">
            <h3>{exo.nom}</h3>

            <select
              onChange={(e) => remplacerExercice(exoIndex, e.target.value)}
              className="select-remplacement"
              title="Remplacer cet exercice"
            >
              <option value="">Remplacer</option>
              {exercicesDisponibles.map((e) => (
                <option key={e.id} value={e.id}>{e.nom}</option>
              ))}
            </select>
          </div>

          <p className="seance-exo-repos">
            Repos prévu : {exo.repos_secondes}s
          </p>

          <div className="series-list">
            {exo.series.map((serie, serieIndex) => (
              <div
                key={serieIndex}
                className={`serie-item ${serie.terminee ? 'serie-terminee' : 'serie-a-faire'}`}
              >
                <span className="serie-numero">Série {serie.numero}</span>

                <div className="serie-input-group">
                  <label>Reps:</label>
                  <input
                    type="text"
                    value={serie.reps}
                    onChange={(e) => modifierSerie(exoIndex, serieIndex, 'reps', e.target.value)}
                    className="input-reps"
                  />
                </div>

                <div className="serie-input-group">
                  <label>Poids (kg):</label>
                  <input
                    type="number"
                    step="0.5"
                    value={serie.poids}
                    onChange={(e) => modifierSerie(exoIndex, serieIndex, 'poids', parseFloat(e.target.value) || 0)}
                    className="input-poids"
                  />
                </div>

                <div className="serie-action-group">
                  <input
                    type="checkbox"
                    checked={serie.terminee}
                    onChange={() => cocherSerie(exoIndex, serieIndex, exo.repos_secondes)}
                    className="checkbox-serie"
                  />
                  <span className={`serie-status ${serie.terminee ? 'status-ok' : 'status-pending'}`}>
                    {serie.terminee ? 'Fait' : 'À faire'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      <button onClick={validerSeance} className="btn-action btn-terminer-seance">
        <Icon name="flag" size={18} /> Terminer la séance
      </button>

      <button onClick={annulerSeance} className="btn-action btn-annuler-seance">
        Annuler la séance
      </button>
    </div>
  );
}

export default SeanceEnCours;
