# SmartShop

Application de gestion de magasin (caisse, stock, administration) et sa chaîne DevOps.

![CI](https://github.com/mzn17/SmartShop_devOps/actions/workflows/ci.yml/badge.svg)

- **Backend** : Node.js 20 / Express — API REST, route de santé `GET /api/health`
- **Base de données** : MongoDB 7
- **Frontend** : React / Vite, servi par Nginx
- **Conteneurs** : Docker + Docker Compose
- **CI/CD** : GitHub Actions, images publiées sur GHCR

## Architecture

```
Navigateur
   │  http://localhost:3000
   ▼
frontend (Nginx)  ──/api──►  api (Node/Express, :5000)  ──►  db (MongoDB 7)
                                                              volume dbdata
```

- Le frontend et l'API sont sur le réseau interne Compose : Nginx proxifie `/api` vers `http://api:5000`.
- La base n'est **pas exposée** sur l'hôte ; elle est joignable uniquement par son nom de service `db`.
- L'API attend que la base soit `healthy` avant de démarrer (`depends_on` + healthcheck).

## Démarrage en une commande

```bash
./scripts/up.sh
```

Le script installe et construit le frontend, lance `docker compose up -d --build`, puis attend que l'API et le frontend répondent.

- Frontend : <http://localhost:3000>
- Santé de l'API : <http://localhost:5000/api/health>

Démarrage manuel équivalent :

```bash
npm ci --prefix frontend
VITE_API_URL=/api npm run build --prefix frontend
docker compose up -d --build
```

## Tests et contrôles

```bash
npm test --prefix backend        # tests API (node:test, sans base de données)
./scripts/check-project.sh       # contrôles de la chaîne — code 0 = succès
```

## Variables d'environnement

Toutes les variables lues par le code (`grep process.env`) sont transmises par Compose. Les valeurs par défaut suffisent en local ; les secrets se mettent dans `.env` (non versionné).

| Variable | Rôle | Défaut Compose |
|---|---|---|
| `PORT` | Port de l'API | `5000` |
| `NODE_ENV` | Environnement | `production` |
| `MONGODB_URI` | Connexion Mongo | `mongodb://db:27017/smartstore` |
| `CLIENT_URL` | Origine CORS | `http://localhost:3000` |
| `JWT_SECRET` | Signature des jetons | valeur de dev (à remplacer) |
| `JWT_EXPIRES_IN` | Durée des jetons | `1d` |
| `STOCK_ALERT_THRESHOLD` | Seuil d'alerte stock | `8` |
| `CRON_SCHEDULE` | Planification des alertes | `0 16 * * *` |
| `ADMIN_EMAIL` / `MAIL_FROM` | Destinataire / expéditeur | valeurs d'exemple |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASSWORD` | Envoi d'e-mails (optionnel) | vides |

## Intégration continue

Workflow : [`.github/workflows/ci.yml`](.github/workflows/ci.yml)

| Job | Déclencheur | Rôle |
|---|---|---|
| `test` | PR, push `main`, tag | Matrice Node **20 et 22** : `npm ci`, vérification syntaxe, `npm test`, build frontend, script de contrôle, artefact `rapport-tests-nodeXX` |
| `docker-build` | après `test` (`needs`) | Construit l'image API (sans la pousser) |
| `publish` | tag `vX.Y.Z` | Pousse `ghcr.io/mzn17/smartshop-api:vX.Y.Z` |
| `deploy-staging` | tag (si `DEPLOY_ENABLED=true`) | Tire l'image publiée, met en service et vérifie la santé |

- Exécutions : <https://github.com/mzn17/SmartShop_devOps/actions>
- Le job `test` est **obligatoire** sur `main` (protection de branche) : un PR rouge ne peut pas être fusionné.

## Livraison (image publiée, jamais reconstruite)

```bash
git tag v1.2.0
git push origin v1.2.0
```

Le job `publish` construit et publie `ghcr.io/mzn17/smartshop-api:v1.2.0`.
L'environnement de test ne contient **aucun `build:`** : il tire cette image telle quelle.

## Mise en service (environnement de test)

```bash
cp .env.deploy.example .env.deploy   # une seule fois, puis adapter JWT_SECRET
./scripts/deploy.sh v1.2.0
```

Le script :

1. vérifie `.env.deploy` ;
2. tire `ghcr.io/mzn17/smartshop-api:v1.2.0` ;
3. démarre `compose.staging.yaml` (`--remove-orphans`) ;
4. attend `/api/health` et le frontend (`scripts/wait-healthy.sh`) ;
5. affiche le label `version` de l'image réellement en service.

## Retour arrière

Les images sont immuables et taguées : revenir en arrière = remettre l'ancien tag.

```bash
./scripts/rollback.sh v1.1.0     # remet en service la version précédente
./scripts/deploy.sh v1.2.0       # re-déploie la version courante
```

Même mécanisme manuel :

```bash
IMAGE_TAG=v1.1.0 docker compose -f compose.staging.yaml up -d
```

## Protection de `main` et démonstration du pipeline rouge

- La branche `main` exige une PR et les checks `test (20)`, `test (22)`, `docker-build`.
- La branche `demo/pipeline-rouge` contient volontairement une erreur de syntaxe : le job `test` échoue et la fusion est bloquée.

## Bonus

- **Matrice de versions** : `test` s'exécute sur Node 20 et Node 22.
- **Protection de `main`** : checks obligatoires (Settings → Branches).
- **Déploiement automatique sur tag** : job `deploy-staging`, activé par la variable de dépôt `DEPLOY_ENABLED=true` + un runner self-hosted + le secret `STAGING_JWT_SECRET`.

## Organisation Git

Une branche par étape, une merge request par étape :

```
main
├── feature/controle-projet   → scripts/check-project.sh
├── feature/docker-api        → Dockerfile + .dockerignore
├── feature/docker-compose    → compose.yaml + nginx.conf
├── feature/ci-pipeline       → .github/workflows/ci.yml
├── feature/staging           → compose.staging.yaml + wait-healthy.sh
└── release/1.2.0             → tag v1.2.0
```

Messages de commit : `type: action` (`feat:`, `fix:`, `ci:`, `docs:`, `chore:`).

## Dépannage

| Symptôme | Cause / solution |
|---|---|
| `frontend` répond 404 | `frontend/dist` absent : lancer `./scripts/up.sh` ou builder le frontend |
| `db` unhealthy | MongoDB pas encore prêt : attendre, vérifier `docker compose logs db` |
| `IMAGE_TAG manquant` | `.env.deploy` absent/incomplet : `cp .env.deploy.example .env.deploy` |
| `unauthorized` sur GHCR | Le package doit rester public, ou se connecter avec `docker login ghcr.io` |
| Port 3000/5000 occupé | Arrêter l'ancienne pile : `docker compose down` |
