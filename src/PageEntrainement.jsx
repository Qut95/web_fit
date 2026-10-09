// ==========================================
// COMPOSANT REACT : PageEntrainement.jsx
// ==========================================
import AjouterEntrainement from './AjouterEntrainement'
import Icon from './Icon';
import SeanceEnCours from './SeanceEnCours';
import React, { useState, useEffect } from 'react';

function PageEntrainement({ keycloak }) {
    const [afficherAjout, setAfficherAjout] = useState(false);
    const [entrainements, setEntrainements] = useState([]);
    const [chargement, setChargement] = useState(true);
    const [seanceActive, setSeanceActive] = useState(null);

    const [entrainementAEditer, setEntrainementAEditer] = useState(null);
    const [exercicesDisponibles, setExercicesDisponibles] = useState([]);

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
            setExercicesDisponibles([...exercicesDisponibles, exoCree]);
            ajouterExerciceEnEdition(exoCree.id);
            setNouveauNomExo('');
        } catch (err) {
            console.error("Erreur lors de la création :", err);
            alert("Impossible de créer l'exercice.");
        }
    };

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
                alert("Modifications enregistrées !");
                setEntrainementAEditer(null);
            } else {
                alert("Erreur lors de la modification.");
            }
        } catch (err) {
            console.error("Erreur réseau :", err);
        }
    };

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
                <button onClick={() => setAfficherAjout(false)} className="btn-action btn-retour">
                    <Icon name="arrow-left" size={18} /> Retour aux entraînements
                </button>
                <AjouterEntrainement keycloak={keycloak} />
            </div>
        );
    }

    if (entrainementAEditer) {
        return (
            <div className="page-content">
                <button onClick={() => setEntrainementAEditer(null)} className="btn-action btn-retour">
                    <Icon name="arrow-left" size={18} /> Annuler et Retour
                </button>

                <h2>Modifier l'entraînement</h2>
                <form onSubmit={sauvegarderModifications}>
                    <div className="form-group">
                        <label>Titre :</label>
                        <input type="text" value={entrainementAEditer.titre} onChange={(e) => setEntrainementAEditer({ ...entrainementAEditer, titre: e.target.value })} required />
                    </div>
                    <div className="form-group">
                        <label>Description :</label>
                        <textarea value={entrainementAEditer.description || ''} onChange={(e) => setEntrainementAEditer({ ...entrainementAEditer, description: e.target.value })} />
                    </div>

                    <h3>Exercices de la séance :</h3>
                    {entrainementAEditer.exercices.map((exo, index) => (
                        <div key={index} className="exercice-editer-item">
                            <div className="exercice-editer-header">
                                <h4>{index + 1}. {exo.nom}</h4>
                                <div className="exercice-actions">
                                    <button type="button" onClick={() => deplacerExercice(index, -1)} aria-label="Monter l'exercice" disabled={index === 0} className="btn-icon"><Icon name="chevron-up" size={18} /></button>
                                    <button type="button" onClick={() => deplacerExercice(index, 1)} aria-label="Descendre l'exercice" disabled={index === entrainementAEditer.exercices.length - 1} className="btn-icon"><Icon name="chevron-down" size={18} /></button>
                                    <button type="button" onClick={() => retirerExerciceEnEdition(index)} aria-label="Retirer l'exercice" className="btn-icon btn-delete"><Icon name="x" size={18} /></button>
                                </div>
                            </div>

                            <div className="exercice-inputs-grid">
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

                    <div className="ajouter-exercice-section">
                        <h4>Ajouter un exercice à la séance</h4>
                        <div className="creer-exercice-inline">
                            <input
                                type="text"
                                placeholder="Nom du nouvel exercice (ex: Traction)"
                                value={nouveauNomExo}
                                onChange={(e) => setNouveauNomExo(e.target.value)}
                            />
                            <button type="button" onClick={creerEtAjouterExercice} className="btn-creer-ajouter">
                                Créer & Ajouter
                            </button>
                        </div>

                        <select onChange={(e) => { if (e.target.value) ajouterExerciceEnEdition(e.target.value); e.target.value = ''; }} className="select-exercice">
                            <option value="">-- Ou choisir un exercice existant --</option>
                            {exercicesDisponibles.map((exo) => (
                                <option key={exo.id} value={exo.id}>{exo.nom}</option>
                            ))}
                        </select>
                    </div>

                    <button type="submit" className="btn-action btn-save-full">
                        <Icon name="check" size={18} /> Sauvegarder les modifications
                    </button>
                </form>
            </div>
        );
    }

    return (
        <div className="page-content">
            <h2>Mes Entraînements</h2>

            <button type="button" onClick={() => setAfficherAjout(true)} className="btn-action btn-create">
                <Icon name="plus" size={18} /> Créer un nouvel entraînement
            </button>

            {chargement ? (
                <p>Chargement...</p>
            ) : entrainements.length === 0 ? (
                <div className="empty-state">
                    <p>Vous n'avez pas encore d'entraînement.</p>
                </div>
            ) : (
                <div className="entrainements-list">
                    {entrainements.map((entrainement) => (
                        <div key={entrainement.id} className="entrainement-card">
                            <h3>{entrainement.titre}</h3>
                            {entrainement.description && <p className="entrainement-desc">{entrainement.description}</p>}

                            <div className="entrainement-card-actions">
                                <button onClick={() => voirEntrainement(entrainement.id)} className="btn-action btn-voir">
                                    <Icon name="eye" size={17} /> Voir
                                </button>
                                <button onClick={() => lancerEntrainement(entrainement.id)} className="btn-action btn-lancer">
                                    <Icon name="play" size={17} /> Lancer
                                </button>
                                <button onClick={() => supprimerEntrainement(entrainement.id)} className="btn-action btn-supprimer" aria-label="Supprimer l'entraînement" title="Supprimer"><Icon name="trash" size={18} /></button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

export default PageEntrainement;