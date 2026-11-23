# Fiche DevOps — SmartShop

**Étudiant :** Msadak med mezen — **Dépôt :** <https://github.com/mzn17/SmartShop_devOps>

## 1. Architecture

```
Navigateur ──► frontend Nginx (:3000) ──/api──► api Node/Express (:5000) ──► MongoDB 7
                                                                              volume staging_dbdata
```

- Trois services Compose : `frontend`, `api`, `db`. La base n'est pas publiée sur l'hôte, elle est jointe par le nom de service `db`.
- L'API ne démarre qu'après le healthcheck de MongoDB ; le frontend après celui de l'API.
- Images : API `ghcr.io/mzn17/smartshop-api:vX.Y.Z`, base `mongo:7.0`, frontend `nginx:alpine`.

## 2. Chaîne CI/CD

| Étape | Outil | Preuve |
|---|---|---|
| Contrôles locaux | `scripts/check-project.sh` (code 0/1) | exécuté aussi dans la CI |
| Tests | `node:test` sur `/api/health` et route inconnue (404) | job `test` |
| Matrice | Node 20 et Node 22 | 2 jobs verts |
| Image | `docker build` (non-root, HEALTHCHECK) | job `docker-build` |
| Publication | tag `vX.Y.Z` → GHCR | job `publish` |
| Mise en service | `compose.staging.yaml` + `wait-healthy.sh` | `scripts/deploy.sh` |
| Protection | checks obligatoires sur `main` | PR rouge bloquée |

## 3. Version mise en service

- **Version : `v1.2.1`** — image `ghcr.io/mzn17/smartshop-api:v1.2.1` (jamais reconstruite au déploiement).
- Mise en service : `./scripts/deploy.sh v1.2.1` → `docker compose --env-file .env.deploy -f compose.staging.yaml pull && up -d` → santé OK.
- Vérifications réelles :
  - `[OK] API saine : http://localhost:5000/api/health`
  - `[OK] Frontend sain : http://localhost:3000`
  - `[OK] version en service : v1.2.1 (label de l'image : 1.2.1)`

## 4. Retour arrière

1. Version précédente publiée : `v1.2.0`.
2. `./scripts/rollback.sh v1.2.0` (équivalent : `IMAGE_TAG=v1.2.0 docker compose --env-file .env.deploy -f compose.staging.yaml up -d`).
3. `scripts/wait-healthy.sh` vérifie `/api/health` et le frontend → OK.
4. Le label de l'image devient `1.2.0`, puis `./scripts/deploy.sh v1.2.1` restaure la version courante (label `1.2.1`).

Aucune reconstruction : on change uniquement le tag de l'image tirée de GHCR. Le volume de données est conservé.

## 5. Preuves

| Objet | URL |
|---|---|
| Pipeline vert (matrice + build) | <https://github.com/mzn17/SmartShop_devOps/actions/runs/45251974540> |
| Pipeline du tag `v1.2.1` (publication) | <https://github.com/mzn17/SmartShop_devOps/actions/runs/45254473223> |
| Pipeline rouge (PR #4 bloquée) | <https://github.com/mzn17/SmartShop_devOps/actions/runs/45254786805> |
| Protection de `main` | Settings → Branches (checks `test (20)`, `test (22)`, `docker-build`) |
| Images publiées | <https://github.com/mzn17/SmartShop_devOps/pkgs/container/smartshop-api> |

## 6. Bonus réalisés

- **Matrice de versions** : `test` exécuté sur Node 20 et Node 22.
- **Protection de la branche `main`** : PR obligatoire + checks obligatoires, appliqués aussi aux administrateurs.
- **Déploiement automatique sur tag** : job `deploy-staging` (désactivé par défaut via `DEPLOY_ENABLED`, runner self-hosted).
