import { Pool } from 'pg';
import axios from 'axios';

interface QueryResult {
  success: boolean;
  data?: any[];
  error?: string;
  sql?: string;
}

export async function executeDirectQuery(
  connectionString: string,
  nlQuery: string,
  dbType: string,
  apiKey: string
): Promise<QueryResult> {
  let pool: Pool | null = null;

  try {
    // Nettoyer la chaîne de connexion
    const cleanConnectionString = connectionString.replace(/[&?]channel_binding=\w+/g, '');

    // Créer le pool de connexion
    pool = new Pool({
      connectionString: cleanConnectionString,
      connectionTimeoutMillis: 30000,
      ssl: {
        rejectUnauthorized: false
      },
      max: 1
    });

    // Tester la connexion
    await pool.query('SELECT 1');
    console.log('✅ Database connection successful');

    // Extraire le schéma
    console.log('📊 Extracting database schema...');
    const schema = await extractSchema(pool);
    console.log('✅ Schema extracted:', Object.keys(schema).length, 'tables');

    // Générer la requête SQL via l'IA
    console.log('🤖 Generating SQL from natural language...');
    const sqlQuery = await generateSQL(nlQuery, schema, apiKey);
    console.log('✅ SQL generated:', sqlQuery);

    // Exécuter la requête
    console.log('🔍 Executing query...');
    const result = await pool.query(sqlQuery);
    console.log('✅ Query executed successfully, rows:', result.rows.length);

    return {
      success: true,
      data: result.rows,
      sql: sqlQuery
    };

  } catch (error: any) {
    console.error('❌ Error in direct query:', error);
    return {
      success: false,
      error: error.message || 'Unknown error occurred'
    };
  } finally {
    if (pool) {
      try {
        await pool.end();
      } catch (e) {
        console.error('Error closing pool:', e);
      }
    }
  }
}

async function extractSchema(pool: Pool): Promise<any> {
  const tablesQuery = `
    SELECT 
      t.table_name,
      c.column_name,
      c.data_type,
      c.is_nullable,
      c.column_default,
      tc.constraint_type
    FROM information_schema.tables t
    LEFT JOIN information_schema.columns c 
      ON t.table_name = c.table_name 
      AND t.table_schema = c.table_schema
    LEFT JOIN information_schema.key_column_usage kcu
      ON c.table_name = kcu.table_name 
      AND c.column_name = kcu.column_name
      AND c.table_schema = kcu.table_schema
    LEFT JOIN information_schema.table_constraints tc
      ON kcu.constraint_name = tc.constraint_name
      AND kcu.table_schema = tc.table_schema
    WHERE t.table_schema = 'public'
      AND t.table_type = 'BASE TABLE'
    ORDER BY t.table_name, c.ordinal_position;
  `;

  const result = await pool.query(tablesQuery);

  // Grouper par table
  const schema: Record<string, any> = {};
  for (const row of result.rows) {
    if (!schema[row.table_name]) {
      schema[row.table_name] = {
        name: row.table_name,
        columns: []
      };
    }
    schema[row.table_name].columns.push({
      name: row.column_name,
      type: row.data_type,
      nullable: row.is_nullable === 'YES',
      default: row.column_default,
      constraint: row.constraint_type
    });
  }

  return schema;
}

async function generateSQL(
  nlQuery: string,
  schema: any,
  apiKey: string
): Promise<string> {
  const schemaDescription = Object.values(schema)
    .map((table: any) => {
      const columns = table.columns
        .map((col: any) => `${col.name} (${col.type})`)
        .join(', ');
      return `Table ${table.name}: ${columns}`;
    })
    .join('\n');

  const prompt = `Given the following PostgreSQL database schema:

${schemaDescription}

Generate a SQL query for the following request (respond with ONLY the SQL query, no explanations):
"${nlQuery}"

Rules:
- Return ONLY valid PostgreSQL SQL
- Use proper table and column names from the schema
- Add LIMIT 100 if not specified
- No markdown, no explanations, just the SQL query`;

  try {
    console.log('🤖 Calling Grok API...');
    console.log('API Key:', apiKey ? `${apiKey.substring(0, 10)}...` : 'NOT SET');
    
    const response = await axios.post(
      'https://api.x.ai/v1/chat/completions',
      {
        model: 'grok-2-1212',
        messages: [
          {
            role: 'system',
            content: 'You are a SQL expert. Generate only valid PostgreSQL queries.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.1
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    let sqlQuery = response.data.choices[0].message.content.trim();
    
    // Nettoyer la réponse
    sqlQuery = sqlQuery.replace(/```sql\n?/g, '').replace(/```\n?/g, '').trim();
    
    // Enlever le point-virgule final s'il existe
    if (sqlQuery.endsWith(';')) {
      sqlQuery = sqlQuery.slice(0, -1);
    }

    return sqlQuery;
  } catch (error: any) {
    console.error('❌ Error calling AI API:');
    console.error('Status:', error.response?.status);
    console.error('Data:', error.response?.data);
    console.error('Message:', error.message);
    throw new Error(`Failed to generate SQL query: ${error.response?.data?.error || error.message}`);
  }
}
