import dotenv from 'dotenv';
dotenv.config();

interface Config {
    PORT: number;
    CLIENT_ID: string | undefined;
    CLIENT_SECRET: string | undefined;
    REDIRECT_URI: string | undefined;
    SCOPES: string | undefined;
    TOKEN_URL: string | undefined;
    ENCRYPTION_KEY: string | undefined;
    MONGO_CONNECTION_STRING: string | undefined;
    JWT_SECRET: string | undefined;
    JWT_EXPIRES_IN: string;
    JWT_REFRESH_EXPIRES_IN: string;
    HUBSPOT_BASE: string | undefined;
}

const config: Config = {
    PORT: Number(process.env.PORT) || 3000,
    CLIENT_ID: process.env.CLIENT_ID,
    CLIENT_SECRET: process.env.CLIENT_SECRET,
    REDIRECT_URI: process.env.REDIRECT_URI,
    SCOPES: process.env.SCOPES,
    TOKEN_URL: process.env.TOKEN_URL,
    ENCRYPTION_KEY: process.env.ENCRYPTION_KEY,
    MONGO_CONNECTION_STRING: process.env.MONGO_CONNECTION_STRING,
    JWT_SECRET: process.env.JWT_SECRET,
    JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
    JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
    HUBSPOT_BASE: process.env.HUBSPOT_BASE || 'https://api.hubapi.com'
};

const errors: string[] = [];

(Object.keys(config) as Array<keyof Config>).forEach((key: keyof Config) => {
    const value = config[key];
    if (value === undefined || value === null) {
        errors.push(`Missing required environment variable: ${key}`);
    }
    if (value === '') {
        errors.push(`Environment variable cannot be an empty string: ${key}`);
    }
});

if (errors.length > 0) {
    throw new Error(`The following errors were found:\n${errors.join('\n')}`);
}

export { config };
export type { Config };
