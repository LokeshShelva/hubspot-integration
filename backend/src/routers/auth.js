import express from "express";
import { config } from "../config.js";

const router = express.Router();

// OAuth authorization URL endpoint
router.get("/auth", (req, res) => {
  const authUrl =
    `https://app.hubspot.com/oauth/authorize?` +
    `client_id=${config.CLIENT_ID}&` +
    `redirect_uri=${encodeURIComponent(config.REDIRECT_URI)}&` +
    `scope=contacts`;

  res.json({
    success: true,
    message: "Redirect to this URL to start OAuth flow",
    authUrl: authUrl,
  });
});

// OAuth callback endpoint
router.get("/callback", async (req, res) => {
  const { code, error } = req.query;

  // Handle OAuth error
  if (error) {
    console.error("OAuth error:", error);
    return res.status(400).json({
      success: false,
      error: "OAuth authorization failed",
      details: error,
    });
  }

  // Handle missing authorization code
  if (!code) {
    return res.status(400).json({
      success: false,
      error: "Authorization code is required",
    });
  }

  try {
    console.log("Received authorization code:", code);
    res.json({
      success: true,
      message: "Authorization code received",
    });
    // Exchange authorization code for access token
    //     const tokenResponse = await fetch('https://api.hubapi.com/oauth/v1/token', {
    //       method: 'POST',
    //       headers: {
    //         'Content-Type': 'application/x-www-form-urlencoded',
    //       },
    //       body: new URLSearchParams({
    //         grant_type: 'authorization_code',
    //         client_id: config.CLIENT_ID,
    //         client_secret: config.CLIENT_SECRET,
    //         redirect_uri: config.REDIRECT_URI,
    //         code: code
    //       })
    //     });

    //     const tokenData = await tokenResponse.json();

    //     if (!tokenResponse.ok) {
    //       throw new Error(tokenData.message || 'Failed to exchange code for token');
    //     }

    //     // Store tokens (in a real app, you'd save this to a database)
    //     console.log('OAuth successful! Tokens received:', {
    //       access_token: tokenData.access_token ? '***' : 'missing',
    //       refresh_token: tokenData.refresh_token ? '***' : 'missing',
    //       expires_in: tokenData.expires_in
    //     });

    //     res.json({
    //       success: true,
    //       message: 'OAuth authorization successful',
    //       data: {
    //         access_token: tokenData.access_token,
    //         refresh_token: tokenData.refresh_token,
    //         expires_in: tokenData.expires_in,
    //         token_type: tokenData.token_type
    //       }
    //     });

    //   } catch (error) {
    //     console.error('OAuth callback error:', error);
    //     res.status(500).json({
    //       success: false,
    //       error: 'Failed to process OAuth callback',
    //       details: error.message
    //     });
    //   }
    // });

    // // Token refresh endpoint
    // router.post('/refresh', async (req, res) => {
    //   const { refresh_token } = req.body;

    //   if (!refresh_token) {
    //     return res.status(400).json({
    //       success: false,
    //       error: 'Refresh token is required'
    //     });
    //   }

    //   try {
    //     const tokenResponse = await fetch('https://api.hubapi.com/oauth/v1/token', {
    //       method: 'POST',
    //       headers: {
    //         'Content-Type': 'application/x-www-form-urlencoded',
    //       },
    //       body: new URLSearchParams({
    //         grant_type: 'refresh_token',
    //         client_id: config.CLIENT_ID,
    //         client_secret: config.CLIENT_SECRET,
    //         refresh_token: refresh_token
    //       })
    //     });

    //     const tokenData = await tokenResponse.json();

    //     if (!tokenResponse.ok) {
    //       throw new Error(tokenData.message || 'Failed to refresh token');
    //     }

    //     res.json({
    //       success: true,
    //       message: 'Token refreshed successfully',
    //       data: {
    //         access_token: tokenData.access_token,
    //         refresh_token: tokenData.refresh_token,
    //         expires_in: tokenData.expires_in,
    //         token_type: tokenData.token_type
    //       }
    //     });
  } catch (error) {
    console.error("Token refresh error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to refresh token",
      details: error.message,
    });
  }
});

export default router;
