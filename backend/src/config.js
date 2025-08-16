
// Load environment variables from .env file
import dotenv from 'dotenv';
dotenv.config();

// Required environment variables
// const requiredEnvVars = [
//     'CLIENT_ID',
//     'CLIENT_SECRET',
//     'REDIRECT_URI'
// ];

// // Check for missing required environment variables
// const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

// if (missingVars.length > 0) {
//     throw new Error(
//         `Missing required environment variables: ${missingVars.join(', ')}\n` +
//         `Please set the following environment variables:\n` +
//         missingVars.map(varName => `  - ${varName}`).join('\n')
//     );
// }

// // Validate that required values are not empty strings
// const emptyVars = requiredEnvVars.filter(varName => 
//     process.env[varName] && process.env[varName].trim() === ''
// );

// if (emptyVars.length > 0) {
//     throw new Error(
//         `Environment variables cannot be empty: ${emptyVars.join(', ')}`
//     );
// }

const config = {
    PORT: process.env.PORT || 3000,
    CLIENT_ID: process.env.CLIENT_ID,
    CLIENT_SECRET: process.env.CLIENT_SECRET,
    REDIRECT_URI: process.env.REDIRECT_URI,
    SCOPES: process.env.SCOPES
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