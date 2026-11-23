# SmartShop

Application de gestion de magasin (caisse, stock, administration).

- Backend : Node.js / Express
- Base de données : MongoDB
- Frontend : React / Vite

## Status de la caisse

GET /api/health → {"success":true,...}

## Démarrage rapide

npm --prefix frontend ci && VITE_API_URL=/api npm --prefix frontend run build
docker compose up -d --build
curl http://localhost:5000/api/health
