// ==========================================
// COMPOSANT REACT : PageEntrainement.jsx
// ==========================================
import AjouterEntrainement from './AjouterEntrainement'
import SeanceEnCours from './SeanceEnCours';
import React, { useState, useEffect } from 'react';

function PageEntrainement({ keycloak }) {
    const [afficherAjout, setAfficherAjout] = useState(false);
    const [entrainements, setEntrainements] = useState([]);
    const [chargement, setChargement] = useState(true);
    const [seanceActive, setSeanceActive] = useState(null);

    // États pour l'édition
    const [entrainementAEditer, setEntrainementAEditer] = useState(null);
    const [exercicesDisponibles, setExercicesDisponibles] = useState([]);

    // Nouvel état pour le nom du futur exercice créé à la volée
    const [nouveauNomExo, setNouveauNomExo] = useState('');

    const userId = keycloak?.tokenParsed?.sub;

    const chargerEntrainements = async () => {
        if (!userId) return;
        setChargement(true);
        try {
            const res = await fetch(`http://localhost:3000/api/entrainements?utilisateur_id=${userId}`);
            if (res.ok) {
                const data = await res.json();
                setEntrainements(data);
            }
        } catch (err) {
            console.error("Erreur réseau :", err);
        } finally {
            setChargement(false);
        }
    };

    const chargerExercicesDisponibles = async () => {
        if (!userId) return;
        try {
            const res = await fetch(`http://localhost:3000/api/exercices?utilisateur_id=${userId}`);
            if (res.ok) {
                const data = await res.json();
                setExercicesDisponibles(data);
            }
        } catch (err) {
            console.error("Erreur réseau exercices :", err);
        }
    };

    useEffect(() => {
        if (!afficherAjout && !entrainementAEditer) {
            chargerEntrainements();
        }
        if (entrainementAEditer) {
            chargerExercicesDisponibles();
        }
    }, [userId, afficherAjout, entrainementAEditer]);

    // --- ACTIONS SUR LES ENTRAÎNEMENTS ---

    const lancerEntrainement = async (id) => {
        try {
            const res = await fetch(`http://localhost:3000/api/entrainements/${id}/details`);
            if (res.ok) {
                const data = await res.json();
                setSeanceActive(data);
            }
        } catch (err) {
            console.error("Erreur lancement :", err);
        }
    };

    const supprimerEntrainement = async (id) => {
        if (!window.confirm("Êtes-vous sûr de vouloir supprimer cet entraînement ?")) return;
        try {
            const res = await fetch(`http://localhost:3000/api/entrainements/${id}`, { method: 'DELETE' });
            if (res.ok) setEntrainements(entrainements.filter((e) => e.id !== id));
        } catch (err) {
            console.error("Erreur réseau :", err);
        }
    };

    const voirEntrainement = async (id) => {
        try {
            const res = await fetch(`http://localhost:3000/api/entrainements/${id}/details`);
            if (res.ok) {
                const data = await res.json();
                setEntrainementAEditer(data);
            } else {
                alert("Impossible de charger les détails.");
            }
        } catch (err) {
            console.error("Erreur réseau :", err);
        }
    };

    // --- ACTIONS D'ÉDITION DES EXERCICES ---

    const majExerciceEnEdition = (index, champ, valeur) => {
        const copieExercices = [...entrainementAEditer.exercices];
        copieExercices[index][champ] = valeur;
        setEntrainementAEditer({ ...entrainementAEditer, exercices: copieExercices });
    };

    const deplacerExercice = (index, direction) => {
        const copieExercices = [...entrainementAEditer.exercices];
        if (direction === -1 && index > 0) {
            const temp = copieExercices[index];
            copieExercices[index] = copieExercices[index - 1];
            copieExercices[index - 1] = temp;
        } else if (direction === 1 && index < copieExercices.length - 1) {
            const temp = copieExercices[index];
            copieExercices[index] = copieExercices[index + 1];
            copieExercices[index + 1] = temp;
        }
        setEntrainementAEditer({ ...entrainementAEditer, exercices: copieExercices });
    };

    const retirerExerciceEnEdition = (index) => {
        const copieExercices = [...entrainementAEditer.exercices];
        copieExercices.splice(index, 1);
        setEntrainementAEditer({ ...entrainementAEditer, exercices: copieExercices });
    };

    // 1. Ajouter un exercice existant
    const ajouterExerciceEnEdition = (exerciceId) => {
        const exo = exercicesDisponibles.find((e) => e.id === parseInt(exerciceId));
        if (!exo) return;

        const nouvelExo = {
            exercice_id: exo.id,
            nom: exo.nom,
            nombre_series: 3,
            repetitions: '10',
            poids_kg: 0,
            repos_secondes: 90,
            difficulte_percue: 5
        };

        setEntrainementAEditer({
            ...entrainementAEditer,
            exercices: [...entrainementAEditer.exercices, nouvelExo]
        });
    };

    // 2. Créer un NOUVEL exercice et l'ajouter immédiatement à l'entraînement
    const creerEtAjouterExercice = async () => {
        if (!nouveauNomExo.trim()) return;
        try {
            const res = await fetch('http://localhost:3000/api/exercices', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ utilisateur_id: userId, nom: nouveauNomExo, description: '' })
            });

            if (!res.ok) throw new Error("Erreur serveur");

            const exoCree = await res.json();

            // On l'ajoute à la liste déroulante
            setExercicesDisponibles([...exercicesDisponibles, exoCree]);

            // On l'ajoute directement à la séance en cours d'édition
            ajouterExerciceEnEdition(exoCree.id);

            // On vide le champ texte
            setNouveauNomExo('');
        } catch (err) {
            console.error("Erreur lors de la création :", err);
            alert("Impossible de créer l'exercice.");
        }
    };

    // --- SAUVEGARDE ---
    const sauvegarderModifications = async (e) => {
        e.preventDefault();
        if (entrainementAEditer.exercices.length === 0) {
            alert("Votre entraînement doit contenir au moins un exercice !");
            return;
        }

        try {
            const res = await fetch(`http://localhost:3000/api/entrainements/${entrainementAEditer.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(entrainementAEditer)
            });

            if (res.ok) {
                alert("Modifications enregistrées ! ✅");
                setEntrainementAEditer(null); // Retour à la liste
            } else {
                alert("Erreur lors de la modification.");
            }
        } catch (err) {
            console.error("Erreur réseau :", err);
        }
    };


    // ==========================================
    // RENDU DES DIFFÉRENTES VUES
    // ==========================================
    if (seanceActive) {
        return (
            <SeanceEnCours
                entrainementBase={seanceActive}
                userId={userId}
                exercicesDisponibles={exercicesDisponibles}
                terminerSeance={() => setSeanceActive(null)}
            />
        );
    }
    if (afficherAjout) {
        return (
            <div className="page-content">
                <button onClick={() => setAfficherAjout(false)} className="btn-action" style={{ marginBottom: '15px', backgroundColor: 'gray' }}>
                    ⬅ Retour aux entraînements
                </button>
                <AjouterEntrainement keycloak={keycloak} />
            </div>
        );
    }

    if (entrainementAEditer) {
        return (
            <div className="page-content">
                <button onClick={() => setEntrainementAEditer(null)} className="btn-action" style={{ marginBottom: '15px', backgroundColor: 'gray' }}>
                    ⬅ Annuler et Retour
                </button>

                <h2>✏️ Modifier l'entraînement</h2>
                <form onSubmit={sauvegarderModifications}>
                    <div style={{ marginBottom: '10px' }}>
                        <label>Titre :</label>
                        <input type="text" value={entrainementAEditer.titre} onChange={(e) => setEntrainementAEditer({ ...entrainementAEditer, titre: e.target.value })} required />
                    </div>
                    <div style={{ marginBottom: '20px' }}>
                        <label>Description :</label>
                        <textarea value={entrainementAEditer.description || ''} onChange={(e) => setEntrainementAEditer({ ...entrainementAEditer, description: e.target.value })} />
                    </div>

                    <h3>Exercices de la séance :</h3>
                    {entrainementAEditer.exercices.map((exo, index) => (
                        <div key={index} style={{ border: '1px solid #ccc', padding: '10px', margin: '10px 0', borderRadius: '8px', position: 'relative' }}>

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                <h4 style={{ margin: 0, color: '#333' }}>{index + 1}. {exo.nom}</h4>
                                <div style={{ display: 'flex', gap: '5px' }}>
                                    <button type="button" onClick={() => deplacerExercice(index, -1)} disabled={index === 0} style={{ padding: '5px', cursor: 'pointer' }}>⬆️</button>
                                    <button type="button" onClick={() => deplacerExercice(index, 1)} disabled={index === entrainementAEditer.exercices.length - 1} style={{ padding: '5px', cursor: 'pointer' }}>⬇️</button>
                                    <button type="button" onClick={() => retirerExerciceEnEdition(index)} style={{ padding: '5px', color: 'red', cursor: 'pointer', marginLeft: '10px' }}>❌</button>
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                <div>
                                    <label>Séries : </label>
                                    <input type="number" value={exo.nombre_series} onChange={(e) => majExerciceEnEdition(index, 'nombre_series', parseInt(e.target.value))} />
                                </div>
                                <div>
                                    <label> Répétitions : </label>
                                    <input type="text" value={exo.repetitions} onChange={(e) => majExerciceEnEdition(index, 'repetitions', e.target.value)} />
                                </div>
                                <div>
                                    <label> Poids (kg) : </label>
                                    <input type="number" step="0.5" value={exo.poids_kg || 0} onChange={(e) => majExerciceEnEdition(index, 'poids_kg', parseFloat(e.target.value))} />
                                </div>
                                <div>
                                    <label> Repos (sec) : </label>
                                    <input type="number" value={exo.repos_secondes} onChange={(e) => majExerciceEnEdition(index, 'repos_secondes', parseInt(e.target.value))} />
                                </div>
                            </div>
                        </div>
                    ))}

                    {/* SECTION D'AJOUT ET CRÉATION D'EXERCICE */}
                    <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#e9ecef', borderRadius: '8px' }}>
                        <h4 style={{ margin: '0 0 10px 0' }}>➕ Ajouter un exercice à la séance</h4>

                        {/* Créer à la volée */}
                        <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                            <input
                                type="text"
                                placeholder="Nom du nouvel exercice (ex: Traction)"
                                value={nouveauNomExo}
                                onChange={(e) => setNouveauNomExo(e.target.value)}
                                style={{ flex: 1 }}
                            />
                            <button type="button" onClick={creerEtAjouterExercice} style={{ padding: '8px 15px', cursor: 'pointer' }}>
                                Créer & Ajouter
                            </button>
                        </div>

                        {/* Ou choisir existant */}
                        <select onChange={(e) => { if (e.target.value) ajouterExerciceEnEdition(e.target.value); e.target.value = ''; }} style={{ width: '100%', padding: '8px' }}>
                            <option value="">-- Ou choisir un exercice existant --</option>
                            {exercicesDisponibles.map((exo) => (
                                <option key={exo.id} value={exo.id}>{exo.nom}</option>
                            ))}
                        </select>
                    </div>

                    <button type="submit" className="btn-action" style={{ marginTop: '25px', width: '100%' }}>
                        💾 Sauvegarder les modifications
                    </button>
                </form>
            </div>
        );
    }

    // VUE 3 : LISTE PRINCIPALE DES ENTRAÎNEMENTS
    return (
        <div className="page-content">
            <h2>🏋️‍♂️ Mes Entraînements</h2>

            <button type="button" onClick={() => setAfficherAjout(true)} className="btn-action" style={{ marginBottom: '20px' }}>
                ➕ Créer un nouvel Entraînement
            </button>

            {chargement ? (
                <p>⏳ Chargement...</p>
            ) : entrainements.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '20px', background: '#f5f5f5', borderRadius: '8px' }}>
                    <p>Vous n'avez pas encore d'entraînement. 🥲</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    {entrainements.map((entrainement) => (
                        <div key={entrainement.id} style={{
                            border: '1px solid #ddd', padding: '15px', borderRadius: '8px', backgroundColor: 'white', boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                        }}>
                            <h3 style={{ marginTop: 0 }}>{entrainement.titre}</h3>
                            {entrainement.description && <p style={{ color: '#555', fontStyle: 'italic' }}>{entrainement.description}</p>}

                            <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
                                <button onClick={() => voirEntrainement(entrainement.id)} className="btn-action" style={{ backgroundColor: '#2196F3', padding: '10px 15px' }}>
                                    👁️ Voir
                                </button>
                                <button onClick={() => lancerEntrainement(entrainement.id)} className="btn-action" style={{ flex: 1, backgroundColor: '#4CAF50' }}>
                                    ▶️ Lancer
                                </button>
                                <button onClick={() => supprimerEntrainement(entrainement.id)} className="btn-action" style={{ backgroundColor: '#f44336', padding: '10px 15px' }}>
                                    🗑️
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

export default PageEntrainement;