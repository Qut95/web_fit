require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const { createRemoteJWKSet, jwtVerify } = require('jose');

const app = express();
const port = process.env.PORT || 3000;

// ==========================================
// CONFIGURATION (variables d'environnement)
// ==========================================
const FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID;
if (!FIREBASE_PROJECT_ID) {
  console.error('❌ Variable FIREBASE_PROJECT_ID manquante');
  process.exit(1);
}
if (!process.env.DATABASE_URL) {
  console.error('❌ Variable DATABASE_URL manquante');
  process.exit(1);
}

// Plusieurs origines possibles, séparées par des virgules
const originesAutorisees = (process.env.CORS_ORIGINS || 'http://localhost:5173')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

// --- MIDDLEWARES ---
app.use(cors({ origin: originesAutorisees }));
app.use(express.json());

app.use((req, res, next) => {
  console.log(`➡️  ${req.method} ${req.url}`);
  next();
});

// --- CONNEXION POSTGRESQL ---
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 5,
  idleTimeoutMillis: 30000
});

pool.on('error', (err) => {
  console.error('❌ Erreur inattendue sur le pool PostgreSQL :', err.message);
});

process.on('uncaughtException', (err) => console.error('💥 uncaughtException :', err));
process.on('unhandledRejection', (reason) => console.error('💥 unhandledRejection :', reason));

pool.query('SELECT NOW()')
  .then(() => console.log('✅ Connecté à la base de données PostgreSQL'))
  .catch((err) => console.error('❌ Erreur de connexion à la base de données', err.message));

// ==========================================
// AUTHENTIFICATION (token Firebase)
// ==========================================
const JWKS = createRemoteJWKSet(
  new URL('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com')
);

async function authentifier(req, res, next) {
  const entete = req.headers.authorization || '';
  const token = entete.startsWith('Bearer ') ? entete.slice(7) : null;

  if (!token) {
    return res.status(401).json({ erreur: 'Authentification requise' });
  }

  try {
    const { payload } = await jwtVerify(token, JWKS, {
      issuer: `https://securetoken.google.com/${FIREBASE_PROJECT_ID}`,
      audience: FIREBASE_PROJECT_ID
    });
    // L'identité vient du token vérifié, jamais du corps de la requête
    req.user = { id: payload.sub, email: payload.email || null };
    next();
  } catch (err) {
    console.error('❌ Token refusé :', err.message);
    res.status(401).json({ erreur: 'Session invalide ou expirée' });
  }
}

// Route publique (utile pour vérifier que le serveur tourne)
app.get('/health', (req, res) => res.json({ ok: true }));

// Tout ce qui est sous /api nécessite d'être connecté
app.use('/api', authentifier);

// ==========================================
// OUTILS
// ==========================================
const idEntier = (valeur) => {
  const n = Number(valeur);
  return Number.isInteger(n) && n > 0 ? n : null;
};

// Vérifie que tous les exercices envoyés appartiennent bien à l'utilisateur
async function exercicesAppartiennent(db, exercices, utilisateurId) {
  const ids = [...new Set(exercices.map((e) => Number(e.exercice_id)))];
  if (ids.some((i) => !Number.isInteger(i))) return false;
  const result = await db.query(
    'SELECT id FROM exercices WHERE id = ANY($1::int[]) AND utilisateur_id = $2',
    [ids, utilisateurId]
  );
  return result.rowCount === ids.length;
}

async function insererExercices(client, entrainementId, exercices) {
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
}

// ==========================================
// UTILISATEURS
// ==========================================
app.post('/api/utilisateurs/sync', async (req, res) => {
  const id = req.user.id;
  const email = req.user.email;
  const pseudo = String(req.body.pseudo || '').trim().slice(0, 50);

  if (!pseudo) {
    return res.status(400).json({ erreur: 'Pseudo manquant' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO utilisateurs (id, pseudo, email)
       VALUES ($1, $2, $3)
       ON CONFLICT (id) DO UPDATE
       SET pseudo = EXCLUDED.pseudo,
           email = EXCLUDED.email
       RETURNING *`,
      [id, pseudo, email]
    );
    res.status(200).json({ message: 'Utilisateur synchronisé avec succès', utilisateur: result.rows[0] });
  } catch (erreur) {
    if (erreur.code === '23505') {
      console.error('❌ Sync : conflit pseudo/email ->', erreur.detail);
      return res.status(409).json({ erreur: 'Un utilisateur avec ce pseudo ou cet email existe déjà.' });
    }
    console.error('❌ Erreur SQL lors de la synchronisation :', erreur.message, '| code:', erreur.code);
    res.status(500).json({ erreur: 'Erreur serveur lors de la synchronisation' });
  }
});

// ==========================================
// EXERCICES
// ==========================================
app.get('/api/exercices', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM exercices WHERE utilisateur_id = $1 ORDER BY nom ASC',
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('❌ Erreur GET /api/exercices :', err.message, '| code:', err.code);
    res.status(500).json({ erreur: 'Erreur lors de la récupération des exercices' });
  }
});

app.post('/api/exercices', async (req, res) => {
  const nom = String(req.body.nom || '').trim();
  const description = req.body.description || '';

  if (!nom) {
    return res.status(400).json({ erreur: 'Le nom est obligatoire' });
  }

  try {
    const result = await pool.query(
      'INSERT INTO exercices (utilisateur_id, nom, description) VALUES ($1, $2, $3) RETURNING *',
      [req.user.id, nom, description]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23503') {
      console.error('❌ POST /api/exercices : utilisateur absent de la BD (sync non faite)');
      return res.status(409).json({ erreur: 'Utilisateur non synchronisé avec la base de données' });
    }
    console.error('❌ Erreur POST /api/exercices :', err.message, '| code:', err.code);
    res.status(500).json({ erreur: "Erreur lors de la création de l'exercice" });
  }
});

// ==========================================
// ENTRAÎNEMENTS
// ==========================================
app.post('/api/entrainements', async (req, res) => {
  const { titre, description, exercices } = req.body;

  if (!titre || !Array.isArray(exercices) || exercices.length === 0) {
    return res.status(400).json({ erreur: 'Champs obligatoires manquants' });
  }

  let client;
  try {
    if (!(await exercicesAppartiennent(pool, exercices, req.user.id))) {
      return res.status(400).json({ erreur: 'Exercice invalide' });
    }
    client = await pool.connect();
    await client.query('BEGIN');

    const entrainementRes = await client.query(
      'INSERT INTO entrainements (utilisateur_id, titre, description) VALUES ($1, $2, $3) RETURNING id',
      [req.user.id, titre, description || '']
    );
    const entrainementId = entrainementRes.rows[0].id;

    await insererExercices(client, entrainementId, exercices);

    await client.query('COMMIT');
    res.status(201).json({ message: 'Entraînement créé avec succès !', id: entrainementId });
  } catch (erreur) {
    if (client) await client.query('ROLLBACK').catch(() => {});
    console.error('❌ Erreur SQL création entraînement :', erreur.message, '| code:', erreur.code);
    res.status(500).json({ erreur: "Erreur serveur lors de la création de l'entraînement" });
  } finally {
    if (client) client.release();
  }
});

app.get('/api/entrainements', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM entrainements WHERE utilisateur_id = $1 ORDER BY cree_le DESC',
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('❌ Erreur GET /api/entrainements :', err.message);
    res.status(500).json({ erreur: 'Erreur lors de la récupération des entraînements' });
  }
});

app.delete('/api/entrainements/:id', async (req, res) => {
  const id = idEntier(req.params.id);
  if (!id) return res.status(400).json({ erreur: 'Identifiant invalide' });

  try {
    const result = await pool.query(
      'DELETE FROM entrainements WHERE id = $1 AND utilisateur_id = $2 RETURNING id',
      [id, req.user.id]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ erreur: "L'entraînement n'existe pas." });
    }
    res.status(200).json({ message: 'Entraînement supprimé avec succès' });
  } catch (err) {
    console.error('❌ Erreur DELETE /api/entrainements :', err.message);
    res.status(500).json({ erreur: 'Erreur lors de la suppression' });
  }
});

app.get('/api/entrainements/:id/details', async (req, res) => {
  const id = idEntier(req.params.id);
  if (!id) return res.status(400).json({ erreur: 'Identifiant invalide' });

  try {
    const entrainementRes = await pool.query(
      'SELECT * FROM entrainements WHERE id = $1 AND utilisateur_id = $2',
      [id, req.user.id]
    );
    if (entrainementRes.rowCount === 0) {
      return res.status(404).json({ erreur: 'Entraînement introuvable.' });
    }

    const exosRes = await pool.query(
      `SELECT ee.*, e.nom
       FROM entrainement_exercices ee
       JOIN exercices e ON ee.exercice_id = e.id
       WHERE ee.entrainement_id = $1
       ORDER BY ee.ordre ASC`,
      [id]
    );

    res.json({ ...entrainementRes.rows[0], exercices: exosRes.rows });
  } catch (err) {
    console.error('❌ Erreur GET détails entraînement :', err.message);
    res.status(500).json({ erreur: 'Erreur lors de la récupération des détails' });
  }
});

app.put('/api/entrainements/:id', async (req, res) => {
  const id = idEntier(req.params.id);
  if (!id) return res.status(400).json({ erreur: 'Identifiant invalide' });

  const { titre, description, exercices } = req.body;
  if (!titre || !Array.isArray(exercices) || exercices.length === 0) {
    return res.status(400).json({ erreur: 'Champs obligatoires manquants' });
  }

  let client;
  try {
    if (!(await exercicesAppartiennent(pool, exercices, req.user.id))) {
      return res.status(400).json({ erreur: 'Exercice invalide' });
    }
    client = await pool.connect();
    await client.query('BEGIN');

    const maj = await client.query(
      'UPDATE entrainements SET titre = $1, description = $2 WHERE id = $3 AND utilisateur_id = $4',
      [titre, description || '', id, req.user.id]
    );
    if (maj.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ erreur: 'Entraînement introuvable.' });
    }

    await client.query('DELETE FROM entrainement_exercices WHERE entrainement_id = $1', [id]);
    await insererExercices(client, id, exercices);

    await client.query('COMMIT');
    res.status(200).json({ message: 'Entraînement mis à jour avec succès !' });
  } catch (err) {
    if (client) await client.query('ROLLBACK').catch(() => {});
    console.error('❌ Erreur SQL modification entraînement :', err.message);
    res.status(500).json({ erreur: 'Erreur serveur lors de la modification' });
  } finally {
    if (client) client.release();
  }
});

// ==========================================
// HISTORIQUE DES SÉANCES
// ==========================================
app.post('/api/historique', async (req, res) => {
  const { titre, duree_secondes, details } = req.body;

  if (!titre || !Array.isArray(details)) {
    return res.status(400).json({ erreur: 'Champs obligatoires manquants' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO historique_sessions (utilisateur_id, titre, duree_secondes, details)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [req.user.id, titre, Number(duree_secondes) || 0, JSON.stringify(details)]
    );
    res.status(201).json({ message: 'Séance enregistrée !', session: result.rows[0] });
  } catch (err) {
    console.error('❌ Erreur POST /api/historique :', err.message);
    res.status(500).json({ erreur: 'Erreur lors de la sauvegarde de la séance' });
  }
});

app.get('/api/historique', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM historique_sessions WHERE utilisateur_id = $1 ORDER BY date_seance DESC',
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('❌ Erreur GET /api/historique :', err.message);
    res.status(500).json({ erreur: "Erreur lors de la récupération de l'historique" });
  }
});

// --- DÉMARRAGE DU SERVEUR ---
const server = app.listen(port, () => {
  console.log(`🚀 Serveur Backend démarré sur le port ${port}`);
});
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ Le port ${port} est déjà utilisé par un autre processus.`);
  } else {
    console.error('❌ Erreur du serveur HTTP :', err.code, err.message);
  }
  process.exit(1);
});