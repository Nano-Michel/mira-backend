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
    miraBaseUrl: process.env.MIRA_BASE_URL || 'https://mira-gtsn.onrender.com/api/v1',
    backendPort: port
  });
});

// Route pour exécuter une requête
app.post('/query', async (req, res) => {
  try {
    const { dbType, connectionString, nlQuery, userId, configuration } = req.body;

    console.log('Received query request:', { dbType, nlQuery, userId, configuration });

    // Validation des entrées
    if (!dbType || !connectionString || !nlQuery || !userId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters: dbType, connectionString, nlQuery, userId'
      });
    }

    // Exécution de la requête via le package Mira avec nouvelles options
    console.log('Calling Mira API...');
    const result = await mira.query({
      dbType,
      connectionString,
      nlQuery,
      userId,
      configuration: configuration || {}
    });

    console.log('Mira API response:', result.isOk() ? 'Success' : 'Error');

    // Gestion du résultat
    if (result.isOk()) {
      const response = result.value;
      return res.json({
        success: true,
        ...response  // Spread toute la réponse (data, comment, metadata, meta)
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

// Route de test pour les nouvelles fonctionnalités v1.1.0
app.post('/query-v1.1', async (req, res) => {
  try {
    const { dbType, connectionString, nlQuery, userId, outputKeyFormat, maxResults, timeout } = req.body;

    console.log('Received v1.1 query request:', { 
      dbType, nlQuery, userId, outputKeyFormat, maxResults, timeout 
    });

    // Validation des entrées
    if (!dbType || !connectionString || !nlQuery || !userId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters: dbType, connectionString, nlQuery, userId'
      });
    }

    // Configuration avec les nouvelles options
    const configuration = {
      ...(outputKeyFormat && { outputKeyFormat }),
      ...(maxResults && { maxResults: parseInt(maxResults) }),
      ...(timeout && { timeout: parseInt(timeout) })
    };

    console.log('Using configuration:', configuration);

    // Exécution de la requête avec les nouvelles options
    const result = await mira.query({
      dbType,
      connectionString,
      nlQuery,
      userId,
      configuration
    });

    console.log('Mira API response:', result.isOk() ? 'Success' : 'Error');

    if (result.isOk()) {
      const response = result.value;
      return res.json({
        success: true,
        configuration: configuration,
        ...response  // Spread toute la réponse (data, comment, metadata, meta)
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
    console.error('Error in /query-v1.1:', error);
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
  console.log(`  POST /query    - Query via Mira API (supports v1.1.0 configuration)`);
  console.log(`  POST /query-v1.1 - Test new v1.1.0 features (outputKeyFormat, maxResults, timeout)`);
  console.log(`  POST /query-direct - Direct query (bypasses Mira API)`);
});
