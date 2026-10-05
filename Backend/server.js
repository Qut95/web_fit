const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
const port = 3000;

// --- MIDDLEWARES ---
app.use(cors());
app.use(express.json());

// Log de chaque requête reçue (pour vérifier que le site atteint bien le serveur)
app.use((req, res, next) => {
  console.log(`➡️  ${req.method} ${req.url}`);
  next();
});

// --- CONNEXION POSTGRESQL ---
const pool = new Pool({
  user: 'admin_fit',
  host: 'localhost',
  database: 'projet_fit_db',
  password: 'password123',
  port: 5432,
});

// Sans ce handler, une erreur sur une connexion inactive fait planter tout le serveur
pool.on('error', (err) => {
  console.error('❌ Erreur inattendue sur le pool PostgreSQL :', err.message);
});

// Diagnostics : on affiche pourquoi le processus s'arrête, au lieu de mourir en silence
process.on('uncaughtException', (err) => {
  console.error('💥 uncaughtException :', err);
});
process.on('unhandledRejection', (reason) => {
  console.error('💥 unhandledRejection :', reason);
});
process.on('SIGINT', () => { console.log('⛔ Signal SIGINT reçu (Ctrl+C)'); process.exit(0); });
process.on('SIGTERM', () => { console.log('⛔ Signal SIGTERM reçu (le processus a été tué)'); process.exit(0); });
process.on('exit', (code) => console.log(`🔚 Processus terminé (code ${code})`));

// Test de connexion (pool.query au lieu de pool.connect pour ne pas "fuir" un client)
pool.query('SELECT NOW()')
  .then(() => console.log('✅ Connecté à la base de données PostgreSQL'))
  .catch(err => console.error('❌ Erreur de connexion à la base de données', err.stack));


// ==========================================
// UTILISATEURS
// ==========================================
app.post('/api/utilisateurs/sync', async (req, res) => {
  const { id, pseudo, email } = req.body;

  // L'email est optionnel : un utilisateur créé à la main dans Keycloak peut ne pas en avoir.
  if (!id || !pseudo) {
    console.error('❌ Échec Sync : id ou pseudo manquant', { id, pseudo, email });
    return res.status(400).json({ erreur: 'Données utilisateur manquantes (id ou pseudo)' });
  }

  try {
    const query = `
      INSERT INTO utilisateurs (id, pseudo, email)
      VALUES ($1, $2, $3)
      ON CONFLICT (id) DO UPDATE
      SET pseudo = EXCLUDED.pseudo,
          email = EXCLUDED.email
      RETURNING *;
    `;
    const result = await pool.query(query, [id, pseudo, email || null]);

    console.log('✅ Utilisateur synchronisé :', result.rows[0].pseudo);
    res.status(200).json({
      message: 'Utilisateur synchronisé avec succès',
      utilisateur: result.rows[0]
    });

  } catch (erreur) {
    // 23505 = violation d'unicité : un AUTRE id existe déjà avec ce pseudo / cet email
    // (typique quand on supprime puis recrée un utilisateur dans Keycloak : nouvel id, même pseudo)
    if (erreur.code === '23505') {
      console.error('❌ Sync : conflit pseudo/email avec une ligne existante ->', erreur.detail);
      return res.status(409).json({
        erreur: 'Un utilisateur avec ce pseudo ou cet email existe déjà dans la base (ancien id).'
      });
    }
    console.error('❌ Erreur SQL lors de la synchronisation :', erreur.message, '| code:', erreur.code);
    res.status(500).json({ erreur: 'Erreur serveur lors de la synchronisation' });
  }
});


// ==========================================
// EXERCICES
// ==========================================
app.get('/api/exercices', async (req, res) => {
  const { utilisateur_id } = req.query;
  if (!utilisateur_id) {
    return res.status(400).json({ erreur: 'utilisateur_id manquant' });
  }
  try {
    const result = await pool.query(
      'SELECT * FROM exercices WHERE utilisateur_id = $1 ORDER BY nom ASC',
      [utilisateur_id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('❌ Erreur GET /api/exercices :', err.message, '| code:', err.code);
    res.status(500).json({ erreur: 'Erreur lors de la récupération des exercices' });
  }
});

app.post('/api/exercices', async (req, res) => {
  const { utilisateur_id, nom, description } = req.body;
  if (!utilisateur_id || !nom) {
    return res.status(400).json({ erreur: 'utilisateur_id et nom sont obligatoires' });
  }
  try {
    const result = await pool.query(
      'INSERT INTO exercices (utilisateur_id, nom, description) VALUES ($1, $2, $3) RETURNING *',
      [utilisateur_id, nom, description || '']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    // 23503 = clé étrangère : l'utilisateur n'existe pas dans la table utilisateurs (sync ratée)
    if (err.code === '23503') {
      console.error('❌ POST /api/exercices : utilisateur absent de la BD (sync non faite) ->', utilisateur_id);
      return res.status(409).json({ erreur: "Utilisateur non synchronisé avec la base de données" });
    }
    console.error('❌ Erreur POST /api/exercices :', err.message, '| code:', err.code);
    res.status(500).json({ erreur: "Erreur lors de la création de l'exercice" });
  }
});


// ==========================================
// ENTRAÎNEMENTS
// ==========================================
app.post('/api/entrainements', async (req, res) => {
  const { utilisateur_id, titre, description, exercices } = req.body;

  if (!utilisateur_id || !titre || !Array.isArray(exercices) || exercices.length === 0) {
    return res.status(400).json({ erreur: 'Champs obligatoires manquants' });
  }

  let client;
  try {
    client = await pool.connect();
  } catch (err) {
    console.error('❌ Impossible d\'obtenir une connexion à la BD :', err.message);
    return res.status(500).json({ erreur: 'Base de données indisponible' });
  }
  try {
    await client.query('BEGIN');

    const entrainementRes = await client.query(
      'INSERT INTO entrainements (utilisateur_id, titre, description) VALUES ($1, $2, $3) RETURNING id',
      [utilisateur_id, titre, description || '']
    );
    const entrainementId = entrainementRes.rows[0].id;

    for (let i = 0; i < exercices.length; i++) {
      const exo = exercices[i];
      await client.query(
        `INSERT INTO entrainement_exercices
         (entrainement_id, exercice_id, ordre, nombre_series, repetitions, poids_kg, repos_secondes, difficulte_percue)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          entrainementId,
          exo.exercice_id,
          i + 1,
          exo.nombre_series || 1,
          String(exo.repetitions || '10'),
          exo.poids_kg || null,
          exo.repos_secondes || 0,
          exo.difficulte_percue || null
        ]
      );
    }

    await client.query('COMMIT');
    res.status(201).json({ message: 'Entraînement créé avec succès !', id: entrainementId });
  } catch (erreur) {
    await client.query('ROLLBACK');
    console.error("❌ Erreur SQL création entraînement :", erreur.message, '| code:', erreur.code);
    res.status(500).json({ erreur: "Erreur serveur lors de la création de l'entraînement" });
  } finally {
    client.release();
  }
});


// GET : Récupérer tous les entraînements d'un utilisateur
app.get('/api/entrainements', async (req, res) => {
  const { utilisateur_id } = req.query;
  
  if (!utilisateur_id) {
    return res.status(400).json({ erreur: 'utilisateur_id manquant' });
  }

  try {
    // On récupère les entraînements du plus récent au plus ancien
    const result = await pool.query(
      'SELECT * FROM entrainements WHERE utilisateur_id = $1 ORDER BY cree_le DESC',
      [utilisateur_id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('❌ Erreur GET /api/entrainements :', err.message);
    res.status(500).json({ erreur: 'Erreur lors de la récupération des entraînements' });
  }
});

// DELETE : Supprimer un entraînement spécifique
app.delete('/api/entrainements/:id', async (req, res) => {
  const { id } = req.params;
  
  try {
    const result = await pool.query('DELETE FROM entrainements WHERE id = $1 RETURNING id', [id]);
    
    if (result.rowCount === 0) {
      return res.status(404).json({ erreur: "L'entraînement n'existe pas." });
    }
    
    res.status(200).json({ message: 'Entraînement supprimé avec succès' });
  } catch (err) {
    console.error('❌ Erreur DELETE /api/entrainements :', err.message);
    res.status(500).json({ erreur: 'Erreur lors de la suppression' });
  }
});


// GET : Récupérer les détails d'un entraînement spécifique (avec ses exercices)
app.get('/api/entrainements/:id/details', async (req, res) => {
  const { id } = req.params;
  
  try {
    // 1. Récupérer les infos de base de l'entraînement
    const entrainementRes = await pool.query('SELECT * FROM entrainements WHERE id = $1', [id]);
    if (entrainementRes.rowCount === 0) {
      return res.status(404).json({ erreur: "Entraînement introuvable." });
    }
    
    // 2. Récupérer les exercices associés, triés par leur ordre d'exécution
    const exosRes = await pool.query(`
      SELECT ee.*, e.nom 
      FROM entrainement_exercices ee 
      JOIN exercices e ON ee.exercice_id = e.id 
      WHERE ee.entrainement_id = $1 
      ORDER BY ee.ordre ASC
    `, [id]);
    
    // On renvoie l'entraînement avec un tableau "exercices" inclus
    res.json({ 
      ...entrainementRes.rows[0], 
      exercices: exosRes.rows 
    });
  } catch (err) {
    console.error('❌ Erreur GET détails entraînement :', err.message);
    res.status(500).json({ erreur: 'Erreur lors de la récupération des détails' });
  }
});

// PUT : Modifier un entraînement existant
app.put('/api/entrainements/:id', async (req, res) => {
  const { id } = req.params;
  const { titre, description, exercices } = req.body;

  let client;
  try {
    client = await pool.connect();
    await client.query('BEGIN');

    // 1. Mettre à jour le titre et la description
    await client.query(
      'UPDATE entrainements SET titre = $1, description = $2 WHERE id = $3',
      [titre, description, id]
    );

    // 2. Supprimer les anciens exercices de cet entraînement
    await client.query('DELETE FROM entrainement_exercices WHERE entrainement_id = $1', [id]);

    // 3. Insérer les nouveaux exercices avec leurs paramètres mis à jour
    for (let i = 0; i < exercices.length; i++) {
      const exo = exercices[i];
      await client.query(
        `INSERT INTO entrainement_exercices
         (entrainement_id, exercice_id, ordre, nombre_series, repetitions, poids_kg, repos_secondes, difficulte_percue)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          id, 
          exo.exercice_id, 
          i + 1, 
          exo.nombre_series || 1, 
          String(exo.repetitions || '10'), 
          exo.poids_kg || null, 
          exo.repos_secondes || 0, 
          exo.difficulte_percue || null
        ]
      );
    }

    await client.query('COMMIT');
    res.status(200).json({ message: 'Entraînement mis à jour avec succès !' });
  } catch (err) {
    if (client) await client.query('ROLLBACK');
    console.error("❌ Erreur SQL modification entraînement :", err.message);
    res.status(500).json({ erreur: "Erreur serveur lors de la modification" });
  } finally {
    if (client) client.release();
  }
});

// ==========================================
// HISTORIQUE DES SÉANCES
// ==========================================

// POST : Sauvegarder une séance terminée
app.post('/api/historique', async (req, res) => {
  const { utilisateur_id, titre, duree_secondes, details } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO historique_sessions (utilisateur_id, titre, duree_secondes, details) 
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [utilisateur_id, titre, duree_secondes, JSON.stringify(details)]
    );
    res.status(201).json({ message: 'Séance enregistrée !', session: result.rows[0] });
  } catch (err) {
    console.error('❌ Erreur POST /api/historique :', err.message);
    res.status(500).json({ erreur: 'Erreur lors de la sauvegarde de la séance' });
  }
});

// GET : Récupérer l'historique d'un utilisateur
app.get('/api/historique', async (req, res) => {
  const { utilisateur_id } = req.query;
  try {
    const result = await pool.query(
      'SELECT * FROM historique_sessions WHERE utilisateur_id = $1 ORDER BY date_seance DESC',
      [utilisateur_id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('❌ Erreur GET /api/historique :', err.message);
    res.status(500).json({ erreur: 'Erreur lors de la récupération de l\'historique' });
  }
});

// --- DÉMARRAGE DU SERVEUR ---
const server = app.listen(port, () => {
  console.log(`🚀 Serveur Backend démarré sur http://localhost:${port}`);
});
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ Le port ${port} est déjà utilisé par un autre processus.`);
    console.error(`   Trouve-le avec : lsof -i :${port}   puis arrête-le avec : kill <PID>`);
  } else {
    console.error('❌ Erreur du serveur HTTP :', err.code, err.message);
  }
  process.exit(1);
});