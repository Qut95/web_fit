// ==========================================
// COMPOSANT REACT : SeanceEnCours.jsx
// ==========================================
import React, { useState, useEffect } from 'react';

function SeanceEnCours({ entrainementBase, userId, terminerSeance, exercicesDisponibles }) {
  // Copie de l'entraînement pour pouvoir le modifier (remplacer un exo) sans toucher à la base
  const [seance, setSeance] = useState({ ...entrainementBase });
  
  // Chronomètres
  const [chronoGlobal, setChronoGlobal] = useState(0);
  const [chronoRepos, setChronoRepos] = useState(0);
  const [reposActif, setReposActif] = useState(false);

  // État des séries (ex: { "0-1": true } signifie Exo index 0, Série index 1 est cochée)
  const [seriesCochees, setSeriesCochees] = useState({});

  // Timer Global
  useEffect(() => {
    const interval = setInterval(() => setChronoGlobal((prev) => prev + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  // Timer de Repos
  useEffect(() => {
    let interval;
    if (reposActif && chronoRepos > 0) {
      interval = setInterval(() => setChronoRepos((prev) => prev - 1), 1000);
    } else if (chronoRepos === 0 && reposActif) {
      setReposActif(false);
      alert("⏱️ Repos terminé ! C'est reparti !");
    }
    return () => clearInterval(interval);
  }, [reposActif, chronoRepos]);

  // Formater les secondes en MM:SS
  const formaterTemps = (secondes) => {
    const m = Math.floor(secondes / 60).toString().padStart(2, '0');
    const s = (secondes % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const cocherSerie = (exoIndex, serieIndex, tempsRepos) => {
    const key = `${exoIndex}-${serieIndex}`;
    const estDejaCoche = seriesCochees[key];

    setSeriesCochees({ ...seriesCochees, [key]: !estDejaCoche });

    // Si on vient de cocher (terminer) la série, on lance le repos
    if (!estDejaCoche && tempsRepos > 0) {
      setChronoRepos(tempsRepos);
      setReposActif(true);
    }
  };

  const remplacerExercice = (exoIndex, nouvelExoId) => {
    const exoDb = exercicesDisponibles.find(e => e.id === parseInt(nouvelExoId));
    if (!exoDb) return;

    const copieExercices = [...seance.exercices];
    // On conserve les séries/reps prévues mais on change le nom et l'ID
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
        alert("🎉 Séance terminée et enregistrée !");
        terminerSeance(); // Retourne à PageEntrainement
      } else {
        const erreur = await res.json();
        alert("❌ Erreur côté serveur : " + (erreur.erreur || erreur.message));
        console.error("Détails serveur:", erreur);
      }
    } catch (err) {
      console.error("Erreur de sauvegarde :", err);
      alert("Problème de réseau. Vérifiez que votre backend tourne.");
    }
  };

  return (
    <div className="page-content" style={{ position: 'relative' }}>
      {/* BANDEAU CHRONO FIXE EN HAUT */}
      <div style={{ position: 'sticky', top: 0, backgroundColor: '#333', color: 'white', padding: '15px', borderRadius: '8px', zIndex: 100, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0 }}>⏱️ Global : {formaterTemps(chronoGlobal)}</h3>
        {reposActif && (
          <h3 style={{ margin: 0, color: '#4CAF50' }}>💤 Repos : {formaterTemps(chronoRepos)}</h3>
        )}
      </div>

      <h2 style={{ marginTop: '20px' }}>🔥 En cours : {seance.titre}</h2>

      {seance.exercices.map((exo, exoIndex) => (
        <div key={exoIndex} style={{ border: '2px solid #2196F3', padding: '15px', margin: '20px 0', borderRadius: '8px', backgroundColor: 'white' }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <h3 style={{ margin: 0 }}>{exo.nom}</h3>
            
            {/* REMPLACER L'EXERCICE À LA VOLÉE */}
            <select 
              onChange={(e) => remplacerExercice(exoIndex, e.target.value)} 
              style={{ padding: '5px', borderRadius: '5px' }}
              title="Remplacer cet exercice"
            >
              <option value="">🔄 Remplacer</option>
              {exercicesDisponibles.map(e => (
                <option key={e.id} value={e.id}>{e.nom}</option>
              ))}
            </select>
          </div>

          <p style={{ color: '#666', fontSize: '0.9em' }}>Objectif : {exo.repetitions} reps | {exo.poids_kg} kg | Repos : {exo.repos_secondes}s</p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {Array.from({ length: exo.nombre_series }).map((_, serieIndex) => {
              const estCoche = seriesCochees[`${exoIndex}-${serieIndex}`];
              return (
                <div key={serieIndex} style={{ display: 'flex', alignItems: 'center', gap: '15px', padding: '10px', backgroundColor: estCoche ? '#e8f5e9' : '#f5f5f5', borderRadius: '5px' }}>
                  <span style={{ fontWeight: 'bold', width: '70px' }}>Série {serieIndex + 1}</span>
                  <input 
                    type="checkbox" 
                    checked={!!estCoche}
                    onChange={() => cocherSerie(exoIndex, serieIndex, exo.repos_secondes)}
                    style={{ width: '25px', height: '25px', cursor: 'pointer' }}
                  />
                  <span style={{ color: estCoche ? '#4CAF50' : '#888' }}>
                    {estCoche ? 'Terminée ✅' : 'À faire'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      <button onClick={validerSeance} className="btn-action" style={{ width: '100%', backgroundColor: '#4CAF50', marginTop: '20px', padding: '15px', fontSize: '1.2em' }}>
        🏁 Terminer la séance
      </button>
      
      <button onClick={() => { if(window.confirm("Annuler la séance ? (Rien ne sera sauvegardé)")) terminerSeance(); }} className="btn-action" style={{ width: '100%', backgroundColor: '#f44336', marginTop: '10px' }}>
        ❌ Annuler la séance
      </button>
    </div>
  );
}

export default SeanceEnCours;