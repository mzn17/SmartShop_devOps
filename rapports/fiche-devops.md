# Fiche DevOps — SmartShop

**Étudiant :** Msadak med mezen — **Dépôt :** <https://github.com/mzn17/SmartShop_devOps>

## 1. Architecture

```
Navigateur ──► frontend Nginx (:3000) ──/api──► api Node/Express (:5000) ──► MongoDB 7
                                                                              volume dbdata
```

- Trois services Compose : `frontend`, `api`, `db`. La base n'est pas publiée sur l'hôte, elle est jointe par le nom de service `db`.
- L'API ne démarre qu'après le healthcheck de MongoDB ; le frontend après celui de l'API.
- Images : API `ghcr.io/mzn17/smartshop-api:vX.Y.Z`, base `mongo:7.0`, frontend `nginx:alpine`.

## 2. Chaîne CI/CD

| Étape | Outil | Preuve |
|---|---|---|
| Contrôles locaux | `scripts/check-project.sh` (code 0/1) | exécuté aussi dans la CI |
| Tests | `node:test` sur `/api/health` et 404 | job `test` |
| Matrice | Node 20 et Node 22 | 2 jobs verts |
| Image | `docker build` (non-root, HEALTHCHECK) | job `docker-build` |
| Publication | tag `vX.Y.Z` → GHCR | job `publish` |
| Mise en service | `compose.staging.yaml` + `wait-healthy.sh` | job `deploy-staging` |
| Protection | checks obligatoires sur `main` | PR rouge bloquée |

## 3. Version mise en service

- **Version : `v1.2.0`** — image `ghcr.io/mzn17/smartshop-api:v1.2.0` (jamais reconstruite au déploiement).
- Mise en service : `./scripts/deploy.sh v1.2.0` → `docker compose -f compose.staging.yaml pull && up -d` → santé OK.
- Vérification : label `version=1.2.0` de l'image en service.

## 4. Retour arrière

1. Version précédente publiée : `v1.1.0`.
2. `./scripts/rollback.sh v1.1.0` (équivalent : `IMAGE_TAG=v1.1.0 docker compose -f compose.staging.yaml up -d`).
3. `scripts/wait-healthy.sh` vérifie `/api/health` et le frontend → OK.
4. Le label de l'image redevient `1.1.0`, puis `./scripts/deploy.sh v1.2.0` restaure la version courante.

Aucune reconstruction : on change uniquement le tag de l'image tirée de GHCR.

## 5. Preuves

- Pipeline vert : <!--URL_VERTE-->
- Pipeline rouge (PR bloquée) : <!--URL_ROUGE-->
- Images publiées : <https://github.com/mzn17/SmartShop_devOps/pkgs/container/smartshop-api>
