import express, { Request, Response } from "express";
import { config } from "../config.js";
import { AuthService } from "../services/authService.js";
import { authenticateToken } from "../middleware/auth.js";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const router = express.Router();
const authService = new AuthService();

router.get("/generate", authenticateToken, (req: Request, res: Response): void => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      error: "Authentication required"
    });
    return;
  }

  if (!config.CLIENT_ID || !config.REDIRECT_URI || !config.SCOPES) {
    res.status(500).json({
      success: false,
      error: "OAuth configuration incomplete"
    });
    return;
  }

  const authUrl =
    `https://app.hubspot.com/oauth/authorize?` +
    `client_id=${config.CLIENT_ID}&` +
    `redirect_uri=${encodeURIComponent(config.REDIRECT_URI)}&` +
    `scope=${encodeURIComponent(config.SCOPES)}&` +
    `state=${encodeURIComponent(req.user.username)}`;

  res.json({
    success: true,
    message: "Redirect to this URL to start OAuth flow",
    authUrl: authUrl,
  });
});

router.get("/callback", async (req: Request, res: Response): Promise<void> => {
  const { code, state, error } = req.query;

  if (error) {
    console.error("OAuth error:", error);
    
    // Serve error HTML page
    try {
      const htmlPath = join(__dirname, '..', 'templates', 'error.html');
      let html = readFileSync(htmlPath, 'utf8');
      html = html.replace('{{ERROR_MESSAGE}}', `OAuth authorization failed: ${error}`);
      
      res.setHeader('Content-Type', 'text/html');
      res.status(400).send(html);
    } catch (fileError) {
      // Fallback to JSON if HTML file can't be read
      console.warn("Could not read error.html, falling back to JSON response:", fileError);
      res.status(400).json({
        success: false,
        error: "OAuth authorization failed",
        details: error,
      });
    }
    return;
  }

  if (!code || typeof code !== 'string') {
    // Serve error HTML page
    try {
      const htmlPath = join(__dirname, '..', 'templates', 'error.html');
      let html = readFileSync(htmlPath, 'utf8');
      html = html.replace('{{ERROR_MESSAGE}}', 'Authorization code is required');
      
      res.setHeader('Content-Type', 'text/html');
      res.status(400).send(html);
    } catch (fileError) {
      // Fallback to JSON if HTML file can't be read
      console.warn("Could not read error.html, falling back to JSON response:", fileError);
      res.status(400).json({
        success: false,
        error: "Authorization code is required",
      });
    }
    return;
  }

  if (!state || typeof state !== 'string') {
    // Serve error HTML page
    try {
      const htmlPath = join(__dirname, '..', 'templates', 'error.html');
      let html = readFileSync(htmlPath, 'utf8');
      html = html.replace('{{ERROR_MESSAGE}}', 'State parameter is required');
      
      res.setHeader('Content-Type', 'text/html');
      res.status(400).send(html);
    } catch (fileError) {
      // Fallback to JSON if HTML file can't be read
      console.warn("Could not read error.html, falling back to JSON response:", fileError);
      res.status(400).json({
        success: false,
        error: "State parameter is required",
      });
    }
    return;
  }

  try {
    // Use the authenticated user's username instead of 'testuser'
    await authService.createAccessToken(code, state);
    
    // Serve success HTML page
    try {
      const htmlPath = join(__dirname, '..', 'templates', 'success.html');
      let html = readFileSync(htmlPath, 'utf8');
      html = html.replace('{{USER_ID}}', state);
      
      res.setHeader('Content-Type', 'text/html');
      res.send(html);
    } catch (fileError) {
      // Fallback to JSON if HTML file can't be read
      console.warn("Could not read success.html, falling back to JSON response:", fileError);
      res.json({
        success: true,
        message: "Access token created successfully",
        user: state
      });
    }
  } catch (error: any) {
    console.error("OAuth callback error:", error);
    
    // Serve error HTML page
    try {
      const htmlPath = join(__dirname, '..', 'templates', 'error.html');
      let html = readFileSync(htmlPath, 'utf8');
      html = html.replace('{{ERROR_MESSAGE}}', `Failed to process OAuth callback: ${error.message}`);
      
      res.setHeader('Content-Type', 'text/html');
      res.status(500).send(html);
    } catch (fileError) {
      // Fallback to JSON if HTML file can't be read
      console.warn("Could not read error.html, falling back to JSON response:", fileError);
      res.status(500).json({
        success: false,
        error: "Failed to process OAuth callback",
        details: error.message,
      });
    }
  }
});

router.post('/refresh', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      error: "Authentication required"
    });
    return;
  }

  try {
    const refreshedTokens = await authService.refreshAccessToken(req.user.username);
    
    res.json({
      success: true,
      message: 'HubSpot tokens refreshed successfully',
      data: {
        expires_in: refreshedTokens.expires_in,
        refreshed_at: refreshedTokens.refreshed_at
      }
    });
  } catch (error: any) {
    console.error("HubSpot token refresh error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to refresh HubSpot token",
      details: error.message,
    });
  }
});

export default router;
