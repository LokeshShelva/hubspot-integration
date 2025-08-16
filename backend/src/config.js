import dotenv from 'dotenv';
dotenv.config();

const config = {
    PORT: process.env.PORT || 3000,
    CLIENT_ID: process.env.CLIENT_ID,
    CLIENT_SECRET: process.env.CLIENT_SECRET,
    REDIRECT_URI: process.env.REDIRECT_URI,
    SCOPES: process.env.SCOPES,
    TOKEN_URL: process.env.TOKEN_URL,
    ENCRYPTION_KEY: process.env.ENCRYPTION_KEY,
    MONGO_CONNECTION_STRING: process.env.MONGO_CONNECTION_STRING
};

let errors = [];

Object.keys(config).forEach(key => {
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