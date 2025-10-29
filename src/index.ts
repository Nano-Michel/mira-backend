import express from 'express';
import cors from 'cors';
import { Mira } from '@korvaio/mira';
import dotenv from 'dotenv';
import { executeDirectQuery } from './directQuery';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Configuration CORS
app.use(cors());
app.use(express.json());

// Initialisation du client Mira
const mira = new Mira(process.env.MIRA_API_KEY || '',
  process.env.MIRA_BASE_URL || 'https://mira-gtsn.onrender.com/api/v1');

// Route de test
app.get('/', (req, res) => {
  res.send('Mira Backend is running!');
});

// Route de debug pour vérifier la configuration
app.get('/debug', (req, res) => {
  res.json({
    message: 'Mira Backend Debug Info',
    miraApiKey: process.env.MIRA_API_KEY ? '***' + process.env.MIRA_API_KEY.slice(-4) : 'NOT SET',
    miraBaseUrl: 'https://mira-gtsn.onrender.com/api/v1',
    backendPort: port
  });
});

// Route pour exécuter une requête
app.post('/query', async (req, res) => {
  try {
    const { dbType, connectionString, nlQuery, userId } = req.body;

    console.log('Received query request:', { dbType, nlQuery, userId });

    // Validation des entrées
    if (!dbType || !connectionString || !nlQuery || !userId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters: dbType, connectionString, nlQuery, userId'
      });
    }

    // Exécution de la requête via le package Mira
    console.log('Calling Mira API...');
    const result = await mira.query({
      dbType,
      connectionString,
      nlQuery,
      userId
    });

    console.log('Mira API response:', result.isOk() ? 'Success' : 'Error');

    // Gestion du résultat
    if (result.isOk()) {
      return res.json({
        success: true,
        data: result.value
      });
    } else {
      console.error('Mira error:', result.error);
      return res.status(400).json({
        success: false,
        error: result.error.message,
        code: result.error.code
      });
    }
  } catch (error) {
    console.error('Error in /query:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Route directe (sans passer par l'API Mira)
app.post('/query-direct', async (req, res) => {
  try {
    const { dbType, connectionString, nlQuery, userId } = req.body;

    console.log('Received direct query request:', { dbType, nlQuery, userId });

    // Validation des entrées
    if (!dbType || !connectionString || !nlQuery || !userId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters: dbType, connectionString, nlQuery, userId'
      });
    }

    if (dbType !== 'postgres') {
      return res.status(400).json({
        success: false,
        error: 'Only PostgreSQL is supported in direct mode'
      });
    }

    // Exécution directe de la requête
    const result = await executeDirectQuery(
      connectionString,
      nlQuery,
      dbType,
      process.env.MIRA_API_KEY || ''
    );

    if (result.success) {
      return res.json({
        success: true,
        data: result.data,
        sql: result.sql
      });
    } else {
      return res.status(500).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    console.error('Error in /query-direct:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Démarrer le serveur
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
  console.log(`Available endpoints:`);
  console.log(`  GET  /         - Health check`);
  console.log(`  GET  /debug    - Debug info`);
  console.log(`  POST /query    - Query via Mira API (requires API running on port 4000)`);
  console.log(`  POST /query-direct - Direct query (bypasses Mira API)`);
});
