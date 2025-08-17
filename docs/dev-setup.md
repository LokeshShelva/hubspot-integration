# Development Setup Guide

This guide will help you set up the HubSpot Integration API project for local development.

## Prerequisites

Before starting, ensure you have the following installed:

- **Node.js** (v18 or higher)
- **npm**
- **MongoDB** (local installation or MongoDB Atlas account)
- **Git**
- **HubSpot Developer Account** with API access

## Installation

### 1. Clone the Repository

```bash
git clone https://github.com/LokeshShelva/hubspot-integration.git
cd hubspot-integration
```

### 2. Install Dependencies

Navigate to the API directory and install the required packages:

```bash
cd api
npm install
```

### 3. Environment Configuration

Create a `.env` file in the `api` directory with the following variables:

```env
# HubSpot OAuth Configuration
CLIENT_ID=your_hubspot_client_id
CLIENT_SECRET=your_hubspot_client_secret
SCOPES="oauth crm.objects.contacts.read crm.objects.contacts.write crm.objects.owners.read crm.schemas.contacts.write"
REDIRECT_URI=http://localhost:3000/api/auth/callback
TOKEN_URL=https://api.hubapi.com/oauth/v1/token

# Database Configuration
MONGO_CONNECTION_STRING=mongodb://localhost:27017/hubspot_integration

# Security Configuration
ENCRYPTION_KEY=your_32_character_encryption_key
JWT_SECRET=your-jwt-secret-change-in-production

# Webhook Configuration
WEBHOOK_URL=https://webhook.site/your-webhook-id
```

#### Environment Variables Explained

- **CLIENT_ID**: Your HubSpot app client ID (from HubSpot developer dashboard)
- **CLIENT_SECRET**: Your HubSpot app client secret (from HubSpot developer dashboard)
- **SCOPES**: OAuth scopes required for HubSpot API access. The default scopes include:
  - `oauth` - Basic OAuth functionality
  - `crm.objects.contacts.read` - Read contact data
  - `crm.objects.contacts.write` - Create and update contacts
  - `crm.objects.owners.read` - Read contact owner data
  - `crm.schemas.contacts.write` - Create custom contact properties
- **REDIRECT_URI**: OAuth callback URL for HubSpot authentication
- **TOKEN_URL**: HubSpot OAuth token endpoint
- **MONGO_CONNECTION_STRING**: Your MongoDB connection string. For local development, use `mongodb://localhost:27017/hubspot_integration`
- **ENCRYPTION_KEY**: A 32-character key for data encryption. Generate one using: `openssl rand -hex 32`
- **JWT_SECRET**: A secure random string for JWT token signing. Generate one using: `openssl rand -base64 32`
- **WEBHOOK_URL**: URL for testing webhooks (you can use webhook.site for testing)

## HubSpot Setup

### 1. Create a HubSpot Developer Account

1. Go to [HubSpot Developer Portal](https://developers.hubspot.com/)
2. Sign up or log in with your HubSpot account
3. Navigate to "My Apps" and create a new app

### 2. Configure App Permissions

Your HubSpot app needs the following scopes:

- `contacts` - Read and write access to contacts
- `crm.objects.contacts.read` - Read contact data
- `crm.objects.contacts.write` - Create and update contacts
- `crm.schemas.contacts.write` - Create custom contact properties
- `crm.objects.owners.read` - Read contact owner data

### 3. Get API Credentials

1. In your HubSpot app dashboard, go to the "Auth" tab
2. Copy your **Client ID** and **Client Secret**
3. Set your **Redirect URL** to: `http://localhost:3000/api/auth/callback`
4. Update the `.env` file with your actual credentials

### 4. OAuth Flow Setup

This project uses OAuth 2.0 for HubSpot authentication. The flow works as follows:

1. Users visit the authorization URL to grant permissions
2. HubSpot redirects to your callback URL with an authorization code
3. Your app exchanges the code for access and refresh tokens
4. Tokens are used to make API calls on behalf of the user

### 5. Generate Security Keys

Generate secure keys for encryption and JWT:

```bash
# Generate a 32-character encryption key
openssl rand -hex 32

# Generate a JWT secret
openssl rand -base64 32
```

Copy these values to your `.env` file.

## Development Workflow

### 1. Start the Development Server

```bash
npm run dev
```

The server will start on `http://localhost:3000` with hot reloading enabled.

### 2. Available Scripts

- `npm run dev` - Start development server with nodemon
- `npm run build` - Compile TypeScript to JavaScript
- `npm start` - Start production server
