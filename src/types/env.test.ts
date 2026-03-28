import { ProcessEnv } from './env';

describe('ProcessEnv Interface', () => {
  it('should have all required fields', () => {
    const env: ProcessEnv = {
      DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
      NODE_ENV: 'development',
    };

    expect(env.DATABASE_URL).toBe('postgresql://user:pass@localhost:5432/db');
    expect(env.NODE_ENV).toBe('development');
  });

  it('should support all NODE_ENV values', () => {
    const environments: ProcessEnv['NODE_ENV'][] = ['development', 'production', 'test'];
    environments.forEach((env) => {
      const processEnv: ProcessEnv = {
        DATABASE_URL: 'postgresql://localhost/db',
        NODE_ENV: env,
      };
      expect(processEnv.NODE_ENV).toBe(env);
    });
  });

  it('should support optional Yamato API fields', () => {
    const env: ProcessEnv = {
      DATABASE_URL: 'postgresql://localhost/db',
      NODE_ENV: 'production',
      YAMATO_API_KEY: 'yamato-key-123',
      YAMATO_API_SECRET: 'yamato-secret-456',
      YAMATO_API_BASE_URL: 'https://api.yamato.co.jp',
    };

    expect(env.YAMATO_API_KEY).toBe('yamato-key-123');
    expect(env.YAMATO_API_SECRET).toBe('yamato-secret-456');
    expect(env.YAMATO_API_BASE_URL).toBe('https://api.yamato.co.jp');
  });

  it('should support optional OpenAI API field', () => {
    const env: ProcessEnv = {
      DATABASE_URL: 'postgresql://localhost/db',
      NODE_ENV: 'development',
      OPENAI_API_KEY: 'sk-openai-key-789',
    };

    expect(env.OPENAI_API_KEY).toBe('sk-openai-key-789');
  });

  it('should support optional public URL', () => {
    const env: ProcessEnv = {
      DATABASE_URL: 'postgresql://localhost/db',
      NODE_ENV: 'development',
      NEXT_PUBLIC_BASE_URL: 'https://example.com',
    };

    expect(env.NEXT_PUBLIC_BASE_URL).toBe('https://example.com');
  });
});
