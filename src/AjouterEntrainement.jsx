// ==========================================
// COMPOSANT REACT : AjouterEntrainement.jsx
// ==========================================

import React, { useState, useEffect } from 'react';

function AjouterEntrainement({ keycloak }) {
  const [titre, setTitre] = useState('');
  const [description, setDescription] = useState('');
  const [exercicesDisponibles, setExercicesDisponibles] = useState([]);
  
  // Champ pour créer un nouvel exercice à la volée
  const [nouveauNomExo, setNouveauNomExo] = useState('');
  
  // Liste des exercices ajoutés à la séance en cours
  const [exercicesSeance, setExercicesSeance] = useState([]);

  const userId = keycloak?.tokenParsed?.sub; // ID Keycloak de l'utilisateur connecté

  // Charger la liste des exercices créés par l'utilisateur
  useEffect(() => {
    if (userId) {
      fetch(`http://localhost:3000/api/exercices?utilisateur_id=${userId}`)
        .then((res) => res.json())
        .then((data) => setExercicesDisponibles(data))
        .catch(console.error);
    }
  }, [userId]);

  // Ajouter un nouvel exercice dans la base globale de l'utilisateur
  // Ajouter un nouvel exercice dans la base globale de l'utilisateur
  const ajouterNouvelExercice = async () => {
    if (!nouveauNomExo.trim()) return;
    try {
      const res = await fetch('http://localhost:3000/api/exercices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ utilisateur_id: userId, nom: nouveauNomExo, description: '' })
      });
      
      // On s'assure que le serveur a répondu un succès (statut 200 ou 201)
      if (!res.ok) {
        throw new Error("Le serveur a refusé la création de l'exercice");
      }

      const data = await res.json();
      setExercicesDisponibles([...exercicesDisponibles, data]);
      setNouveauNomExo('');
    } catch (err) {
      console.error("Erreur lors de la création de l'exercice :", err);
      alert("Impossible de créer l'exercice. Vérifiez si vous êtes bien synchronisé.");
    }
  };

  // Ajouter une ligne d'exercice à l'entraînement
  const ajouterExerciceASeance = (exerciceId) => {
    const exo = exercicesDisponibles.find((e) => e.id === parseInt(exerciceId));
    if (!exo) return;
    setExercicesSeance([
      ...exercicesSeance,
      {
        exercice_id: exo.id,
        nom: exo.nom,
        nombre_series: 3,
        repetitions: '10',
        poids_kg: 0,
        repos_secondes: 90,
        difficulte_percue: 5
      }
    ]);
  };

  // Modifier un paramètre de l'exercice (séries, rép, poids, etc.)
  const mettreAJourExercice = (index, champ, valeur) => {
    const copie = [...exercicesSeance];
    copie[index][champ] = valeur;
    setExercicesSeance(copie);
  };

  // Soumettre l'entraînement au Backend
  const enregistrerEntrainement = async (e) => {
    e.preventDefault();
    if (!titre || exercicesSeance.length === 0) {
      alert("Veuillez donner un titre et ajouter au moins un exercice !");
      return;
    }

    const payload = {
      utilisateur_id: userId,
      titre,
      description,
      exercices: exercicesSeance
    };

    try {
      const res = await fetch('http://localhost:3000/api/entrainements', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${keycloak?.token}`
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        alert("Entraînement enregistré avec succès ! 🎉");
        setTitre('');
        setDescription('');
        setExercicesSeance([]);
      } else {
        alert("Erreur lors de l'enregistrement.");
      }
    } catch (err) {
      console.error("Erreur réseau :", err);
    }
  };

  return (
    <div className="page-content">
      <h2>🏋️‍♂️ Créer un entraînement</h2>

      <form onSubmit={enregistrerEntrainement}>
        <div>
          <label>Titre de l'entraînement :</label>
          <input 
            type="text" 
            placeholder="Ex: Push Day, Haut du corps" 
            value={titre} 
            onChange={(e) => setTitre(e.target.value)} 
            required 
          />
        </div>

        <div>
          <label>Description (optionnelle) :</label>
          <textarea 
            placeholder="Ex: Focus pectoraux et triceps" 
            value={description} 
            onChange={(e) => setDescription(e.target.value)} 
          />
        </div>

        <hr />

        <h3>1. Créer un exercice s'il n'existe pas</h3>
        <div style={{ display: 'flex', gap: '10px' }}>
          <input 
            type="text" 
            placeholder="Nom de l'exercice (Ex: Développé couché)" 
            value={nouveauNomExo} 
            onChange={(e) => setNouveauNomExo(e.target.value)} 
          />
          <button type="button" onClick={ajouterNouvelExercice}>+ Créer exercice</button>
        </div>

        <h3>2. Ajouter des exercices à la séance</h3>
        <select onChange={(e) => { if(e.target.value) ajouterExerciceASeance(e.target.value); e.target.value = ''; }}>
          <option value="">-- Choisir un exercice --</option>
          {exercicesDisponibles.map((exo) => (
            <option key={exo.id} value={exo.id}>{exo.nom}</option>
          ))}
        </select>

        {/* Liste des exercices ajoutés */}
        {exercicesSeance.map((item, index) => (
          <div key={index} style={{ border: '1px solid #ccc', padding: '10px', margin: '10px 0', borderRadius: '8px' }}>
            <h4>{index + 1}. {item.nom}</h4>
            
            <label>Séries : </label>
            <input 
              type="number" 
              value={item.nombre_series} 
              onChange={(e) => mettreAJourExercice(index, 'nombre_series', parseInt(e.target.value))} 
            />

            <label> Répétitions : </label>
            <input 
              type="text" 
              placeholder="Ex: 12 ou 12,10,8" 
              value={item.repetitions} 
              onChange={(e) => mettreAJourExercice(index, 'repetitions', e.target.value)} 
            />

            <label> Poids (kg) : </label>
            <input 
              type="number" 
              value={item.poids_kg} 
              onChange={(e) => mettreAJourExercice(index, 'poids_kg', parseFloat(e.target.value))} 
            />

            <label> Repos (sec) : </label>
            <input 
              type="number" 
              value={item.repos_secondes} 
              onChange={(e) => mettreAJourExercice(index, 'repos_secondes', parseInt(e.target.value))} 
            />

            <label> Difficulté (1-10) : </label>
            <input 
              type="number" 
              min="1" 
              max="10" 
              value={item.difficulte_percue} 
              onChange={(e) => mettreAJourExercice(index, 'difficulte_percue', parseInt(e.target.value))} 
            />
          </div>
        ))}

        <button type="submit" className="btn-action" style={{ marginTop: '15px' }}>
          💾 Enregistrer l'entraînement
        </button>
      </form>
    </div>
  );
}

export default AjouterEntrainement;
