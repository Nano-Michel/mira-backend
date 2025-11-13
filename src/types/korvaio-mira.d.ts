declare module '@korvaio/mira' {
  import { Result } from 'neverthrow';

  export interface QueryInput {
    dbType: 'postgres' | 'mongodb';
    connectionString: string;
    nlQuery: string;
    userId: string;
    configuration?: {
      outputKeyFormat?: 'camelCase' | 'snake_case' | 'PascalCase' | 'kebab-case' | 'original';
      maxResults?: number;
      timeout?: number;
    };
  }

  export class AppError extends Error {
    readonly code: string;
    constructor(code: string, message: string);
  }

  export class Mira {
    constructor(apiKey: string, baseUrl?: string);
    query(input: QueryInput): Promise<Result<any[], AppError>>;
  }
}
