# Mira Backend

Backend Express pour tester le package `@korva/mira` avec deux modes de fonctionnement :
1. **Mode API** : Utilise l'API Mira (nécessite que l'API tourne sur le port 4000)
2. **Mode Direct** : Exécute les requêtes directement sans l'API Mira ✅ **RECOMMANDÉ**

## Prérequis

- Node.js (v18 ou supérieur)
- npm
- Une base de données PostgreSQL accessible

## Installation

```bash
cd mira-backend
npm install
```

Copier et configurer le fichier `.env` :

```bash
cp .env.example .env
# Éditer .env avec votre clé API et chaîne de connexion
```

## Démarrage

```bash
npm run dev
```

Le serveur démarre sur `http://localhost:3000`

## Endpoints disponibles

### 1. Health Check
```bash
GET http://localhost:3000/
```

### 2. Debug Info
```bash
GET http://localhost:3000/debug
```

### 3. Query via API Mira (nécessite l'API sur port 4000)
```bash
POST http://localhost:3000/query
Content-Type: application/json

{
  "dbType": "postgres",
  "connectionString": "postgresql://...",
  "nlQuery": "je veux la liste des users",
  "userId": "123e4567-e89b-12d3-a456-426614174000"
}
```

### 4. Query Direct ✅ **RECOMMANDÉ**
```bash
POST http://localhost:3000/query-direct
Content-Type: application/json

{
  "dbType": "postgres",
  "connectionString": "postgresql://...",
  "nlQuery": "je veux la liste des users",
  "userId": "123e4567-e89b-12d3-a456-426614174000"
}
```

**Réponse :**
```json
{
  "success": true,
  "data": [...],
  "sql": "SELECT * FROM users LIMIT 100"
}
```

## Exemple complet avec cURL

```bash
curl --location 'http://localhost:3000/query-direct' \
--header 'Content-Type: application/json' \
--data-raw '{
  "connectionString": "postgresql://neondb_owner:npg_kdgH9cSneN8x@ep-tight-butterfly-ab3bhh4o-pooler.eu-west-2.aws.neon.tech/neondb?sslmode=require",
  "nlQuery": "je veux la liste des users",
  "userId": "123e4567-e89b-12d3-a456-426614174000",
  "dbType": "postgres"
}'
```

## Structure du projet

```
mira-backend/
├── src/
│   ├── index.ts          # Serveur Express principal
│   └── directQuery.ts    # Logique de requête directe
├── test-connection.js    # Script de test de connexion DB
├── .env                  # Configuration (ne pas committer)
├── .env.example          # Template de configuration
├── package.json          # Dépendances
├── tsconfig.json         # Config TypeScript
├── README.md             # Ce fichier
├── SOLUTION.md           # Solutions aux problèmes
└── TROUBLESHOOTING.md    # Guide de dépannage
```

## Dépannage

Si vous rencontrez des problèmes :

1. **Tester la connexion DB** :
   ```bash
   node test-connection.js
   ```

2. **Consulter les guides** :
   - `SOLUTION.md` - Solutions détaillées
   - `TROUBLESHOOTING.md` - Guide de dépannage

3. **Vérifier les logs** du serveur dans le terminal

## Différences entre les deux modes

| Fonctionnalité | Mode API | Mode Direct |
|----------------|----------|-------------|
| Nécessite l'API Mira | ✅ Oui | ❌ Non |
| Connexion DB | Via API | Directe |
| Performance | Plus lent | Plus rapide |
| Debugging | Difficile | Facile |
| **Recommandé pour test** | ❌ | ✅ |

## Licence

MIT
