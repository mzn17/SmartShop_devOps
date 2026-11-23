FROM node:20-alpine
LABEL version="1.2.1"

WORKDIR /app

# 1. Dépendances d'abord : cette couche reste en cache tant que package*.json ne change pas
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# 2. Code ensuite (.dockerignore exclut node_modules, .env, .git)
COPY --chown=node:node . .

# 3. Exécution sans droits root
USER node

EXPOSE 5000

# 4. Le conteneur est "healthy" seulement si /api/health répond 200
HEALTHCHECK --interval=10s --timeout=5s --retries=3 \
  CMD node -e "const r = require('http').get('http://localhost:5000/api/health', res => { res.resume(); process.exit(res.statusCode === 200 ? 0 : 1); }); r.on('error', () => process.exit(1));"

CMD ["node", "server.js"]
