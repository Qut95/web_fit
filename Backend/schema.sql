DROP TABLE IF EXISTS entrainement_exercices CASCADE;
DROP TABLE IF EXISTS entrainements CASCADE;
DROP TABLE IF EXISTS exercices CASCADE;
DROP TABLE IF EXISTS utilisateurs CASCADE;

-- Table des utilisateurs
CREATE TABLE utilisateurs (
    id UUID PRIMARY KEY,
    pseudo VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    cree_le TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table des exercices (liés à un utilisateur spécifique)
CREATE TABLE exercices (
    id SERIAL PRIMARY KEY,
    utilisateur_id UUID REFERENCES utilisateurs(id) ON DELETE CASCADE,
    nom VARCHAR(100) NOT NULL,
    description TEXT, -- Optionnel
    cree_le TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table des entraînements (les programmes créés par les utilisateurs)
CREATE TABLE entrainements (
    id SERIAL PRIMARY KEY,
    utilisateur_id UUID REFERENCES utilisateurs(id) ON DELETE CASCADE,
    titre VARCHAR(100) NOT NULL,
    description TEXT, -- Optionnel
    cree_le TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table de liaison : Le contenu de l'entraînement
CREATE TABLE entrainement_exercices (
    id SERIAL PRIMARY KEY,
    entrainement_id INT REFERENCES entrainements(id) ON DELETE CASCADE,
    exercice_id INT REFERENCES exercices(id) ON DELETE CASCADE,
    ordre INT NOT NULL, -- Pour trier les exercices dans l'entraînement
    nombre_series INT NOT NULL,
    repetitions VARCHAR(50) NOT NULL, -- VARCHAR permet de stocker "12" ou "12,10,8"
    poids_kg DECIMAL(5,2), -- Optionnel, pour la charge visée
    repos_secondes INT NOT NULL,
    UNIQUE (entrainement_id, ordre), -- Empêche d'avoir deux exercices à la même position
    difficulte_percue INT CHECK (difficulte_percue >= 1 AND difficulte_percue <= 10)
);