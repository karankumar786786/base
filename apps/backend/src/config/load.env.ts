interface Config {
    DATABASE_URL: string;
    CACHE_URL: string;
    JWT_SECRET: string;
    ORG_NAME: string;
}
export async function loadEnv(): Promise<void> {
    const env:Config = Object.seal(
        {
            DATABASE_URL: 'postgres://postgres:postgres@localhost:5432/base',
            CACHE_URL: 'localhost:6379',
            JWT_SECRET: 'super-secret-key-that-is-at-least-32-characters-long',
            ORG_NAME: 'test-org'
        }
    );
    Object.assign(process.env,env);
};