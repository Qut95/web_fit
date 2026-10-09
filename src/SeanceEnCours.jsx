// ==========================================
// COMPOSANT REACT : SeanceEnCours.jsx
// ==========================================
import React, { useState, useEffect } from 'react';
import Icon from './Icon';

function SeanceEnCours({ entrainementBase, userId, terminerSeance, exercicesDisponibles }) {
  const [seance, setSeance] = useState(() => {
    const exercicesInitiaux = (entrainementBase.exercices || []).map((exo) => {
      const nbSeries = Number(exo.nombre_series) || 1;
      const series = Array.from({ length: nbSeries }, (_, i) => ({
        numero: i + 1,
        reps: exo.repetitions || '10',
        poids: exo.poids_kg !== null && exo.poids_kg !== undefined ? exo.poids_kg : 0,
        terminee: false
      }));

      return {
        ...exo,
        series
      };
    });

    return {
      ...entrainementBase,
      exercices: exercicesInitiaux
    };
  });

  const [chronoGlobal, setChronoGlobal] = useState(0);
  const [chronoRepos, setChronoRepos] = useState(0);
  const [reposActif, setReposActif] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => setChronoGlobal((prev) => prev + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    let interval;
    if (reposActif && chronoRepos > 0) {
      interval = setInterval(() => setChronoRepos((prev) => prev - 1), 1000);
    } else if (chronoRepos === 0 && reposActif) {
      setReposActif(false);
      alert("Repos terminé, c'est reparti !");
    }
    return () => clearInterval(interval);
  }, [reposActif, chronoRepos]);

  const formaterTemps = (secondes) => {
    const m = Math.floor(secondes / 60).toString().padStart(2, '0');
    const s = (secondes % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

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
      setChronoRepos(tempsRepos);
      setReposActif(true);
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
      utilisateur_id: userId,
      titre: seance.titre,
      duree_secondes: chronoGlobal,
      details: seance.exercices
    };

    try {
      const res = await fetch('http://localhost:3000/api/historique', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        alert("Séance terminée et enregistrée !");
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
      
      <button onClick={() => { if (window.confirm("Annuler la séance ? (Rien ne sera sauvegardé)")) terminerSeance(); }} className="btn-action btn-annuler-seance">
        Annuler la séance
      </button>
    </div>
  );
}

export default SeanceEnCours;