# Projet Fit

Application web de suivi d'entraînements de musculation. On crée ses séances types, on les lance avec un chronomètre et un minuteur de repos, puis on retrouve ses performances dans un historique avec calendrier.

L'interface est pensée mobile d'abord (navigation en bas de l'écran) et propose un thème clair et un thème sombre.

## Fonctionnalités

- **Compte utilisateur** : inscription et connexion par e-mail et mot de passe, avec un pseudo.
- **Entraînements** : création, modification (ajout, retrait et réordonnancement des exercices), suppression.
- **Exercices personnalisés** : chaque utilisateur construit sa propre bibliothèque.
- **Séance en cours** : chronomètre global, minuteur de repos automatique, séries cochables, poids et répétitions modifiables, remplacement d'un exercice en cours de séance.
- **Historique** : liste des séances terminées avec le détail de chaque série, et calendrier des jours d'entraînement.
- **Thème clair / sombre** : réglage dans la page Paramètres, mémorisé sur l'appareil.

## Stack technique

| Couche | Technologie |
| --- | --- |
| Frontend | React, Vite |
| Authentification | Firebase Authentication |
| Backend | Node.js, Express |
| Base de données | PostgreSQL |
| Hébergement | Cloudflare (frontend), Render (API), Neon (base) |

Le backend vérifie à chaque requête le jeton Firebase de l'utilisateur (bibliothèque `jose`). L'identité de l'utilisateur provient uniquement de ce jeton, et chaque requête SQL filtre sur l'identifiant de l'utilisateur connecté.

## Structure du projet

```
.
├── index.html
├── package.json
├── vite.config.js
├── wrangler.jsonc            Configuration du déploiement Cloudflare
├── src/
│   ├── main.jsx
│   ├── App.jsx               Navigation, thème, session, historique, paramètres
│   ├── Login.jsx             Connexion et inscription
│   ├── PageEntrainement.jsx  Liste, lecture, modification et lancement
│   ├── AjouterEntrainement.jsx
│   ├── SeanceEnCours.jsx     Séance active (chronos, séries)
│   ├── Icon.jsx              Icônes SVG
│   ├── firebase.js           Initialisation de Firebase
│   ├── api.js                Appels au backend (URL et jeton automatiques)
│   ├── App.css
│   └── index.css             Palette, thèmes, éléments de formulaire
└── Backend/
    ├── server.js             API Express
    ├── schema.sql            Schéma de la base PostgreSQL
    └── package.json
```

## Prérequis

- Node.js 20 ou plus récent
- Un projet Firebase (plan gratuit Spark)
- Une base PostgreSQL (par exemple un projet Neon gratuit)

## Installation en local

### 1. Cloner le dépôt

```bash
git clone https://github.com/Qut95/web_fit.git
cd web_fit
```

### 2. Configurer Firebase

1. Créer un projet sur la [console Firebase](https://console.firebase.google.com).
2. Dans **Authentication**, onglet **Méthode de connexion**, activer **E-mail/Mot de passe**.
3. Dans **Paramètres du projet**, section **Vos applications**, ajouter une application web et noter `apiKey`, `authDomain`, `projectId` et `appId`.

### 3. Préparer la base de données

Créer une base PostgreSQL, puis exécuter le contenu de `Backend/schema.sql`. Les identifiants utilisateur y sont de type `TEXT`, car les identifiants Firebase ne sont pas des UUID.

### 4. Lancer le backend

```bash
cd Backend
npm install
```

Créer un fichier `Backend/.env` :

```env
DATABASE_URL=postgresql://utilisateur:motdepasse@hote:5432/base
FIREBASE_PROJECT_ID=votre-projet-firebase
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
PORT=3000
```

Puis :

```bash
node server.js
```

Le serveur répond sur `http://localhost:3000`. La route `GET /health` permet de vérifier qu'il tourne.

### 5. Lancer le frontend

À la racine du dépôt :

```bash
npm install
```

Créer un fichier `.env` :

```env
VITE_API_URL=http://localhost:3000
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_APP_ID=...
```

Puis :

```bash
npm run dev
```

L'application est disponible sur `http://localhost:5173`. Vite ne relit le fichier `.env` qu'au démarrage : il faut relancer le serveur après toute modification.

## Variables d'environnement

### Backend

| Variable | Description |
| --- | --- |
| `DATABASE_URL` | URL de connexion PostgreSQL |
| `FIREBASE_PROJECT_ID` | Identifiant du projet Firebase, utilisé pour valider les jetons |
| `CORS_ORIGINS` | Origines autorisées, séparées par des virgules, sans `/` final |
| `PORT` | Port d'écoute (défini automatiquement par Render) |

### Frontend

| Variable | Description |
| --- | --- |
| `VITE_API_URL` | URL de l'API backend |
| `VITE_FIREBASE_API_KEY` | Clé de l'application web Firebase |
| `VITE_FIREBASE_AUTH_DOMAIN` | Domaine d'authentification Firebase |
| `VITE_FIREBASE_PROJECT_ID` | Identifiant du projet Firebase |
| `VITE_FIREBASE_APP_ID` | Identifiant de l'application web Firebase |

Les variables `VITE_...` sont intégrées au site au moment du build : elles ne sont pas secrètes et ne doivent contenir aucun mot de passe. Les fichiers `.env` ne doivent jamais être envoyés sur Git.

## API

Toutes les routes `/api` exigent l'en-tête `Authorization: Bearer <jeton Firebase>`.

| Méthode | Route | Description |
| --- | --- | --- |
| `GET` | `/health` | Vérification du serveur (publique) |
| `POST` | `/api/utilisateurs/sync` | Crée ou met à jour l'utilisateur connecté |
| `GET` | `/api/exercices` | Liste les exercices de l'utilisateur |
| `POST` | `/api/exercices` | Crée un exercice |
| `GET` | `/api/entrainements` | Liste les entraînements |
| `POST` | `/api/entrainements` | Crée un entraînement avec ses exercices |
| `GET` | `/api/entrainements/:id/details` | Détail d'un entraînement et de ses exercices |
| `PUT` | `/api/entrainements/:id` | Modifie un entraînement |
| `DELETE` | `/api/entrainements/:id` | Supprime un entraînement |
| `GET` | `/api/historique` | Liste les séances terminées |
| `POST` | `/api/historique` | Enregistre une séance terminée |

## Déploiement

Le projet peut être hébergé gratuitement.

### Base de données : Neon

1. Créer un projet et exécuter `Backend/schema.sql` dans l'éditeur SQL.
2. Copier l'URL de connexion (avec le mot de passe affiché) dans `DATABASE_URL`.

### Backend : Render

Créer un **Web Service** relié au dépôt GitHub :

| Réglage | Valeur |
| --- | --- |
| Root Directory | `Backend` |
| Build Command | `npm install` |
| Start Command | `node server.js` |
| Instance Type | Free |
| Health Check Path | `/health` |

Renseigner `DATABASE_URL`, `FIREBASE_PROJECT_ID` et `CORS_ORIGINS` dans les variables d'environnement. Sur l'offre gratuite, le service s'endort après environ 15 minutes d'inactivité : la première requête suivante peut prendre près d'une minute.

### Frontend : Cloudflare

Créer un projet relié au dépôt GitHub :

| Réglage | Valeur |
| --- | --- |
| Build command | `npm run build` |
| Deploy command | `npx wrangler deploy` |
| Root directory | `/` |

Le fichier `wrangler.jsonc` à la racine indique le dossier à publier :

```json
{
  "name": "web-fit",
  "compatibility_date": "2026-10-01",
  "assets": {
    "directory": "./dist",
    "not_found_handling": "single-page-application"
  }
}
```

Les variables `VITE_...` doivent être déclarées comme **variables de build**, car Vite les lit au moment de la construction du site.

### Après le premier déploiement

Ajouter l'adresse du site publié à `CORS_ORIGINS` sur Render, sans `/` final :

```
http://localhost:5173,https://web-fit.muscu.workers.dev/
```

## Sécurité

- Les jetons Firebase sont vérifiés côté serveur (signature, émetteur, audience, expiration).
- Les routes ne lisent jamais l'identité de l'utilisateur dans le corps de la requête.
- Les entraînements, exercices et séances sont toujours filtrés par propriétaire.
- Les exercices rattachés à un entraînement sont contrôlés : on ne peut utiliser que les siens.
- Les secrets (`DATABASE_URL`) restent dans les variables d'environnement des hébergeurs.

## Licence

À définir.