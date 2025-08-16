import express from "express";
import { config } from "../config.js";
import { AuthService } from "../services/authService.js";
import { authenticateToken } from "../middleware/auth.js";

const router = express.Router();
const authService = new AuthService();

router.get("/generate", authenticateToken, (req, res) => {
  const authUrl =
    `https://app.hubspot.com/oauth/authorize?` +
    `client_id=${config.CLIENT_ID}&` +
    `redirect_uri=${encodeURIComponent(config.REDIRECT_URI)}&` +
    `scope=${encodeURIComponent(config.SCOPES)}&` +
    `state=${encodeURIComponent(req.user.username)}`

  res.json({
    success: true,
    message: "Redirect to this URL to start OAuth flow",
    authUrl: authUrl,
  });
});

router.get("/callback", async (req, res) => {
  const { code, state, error } = req.query;

  if (error) {
    console.error("OAuth error:", error);
    return res.status(400).json({
      success: false,
      error: "OAuth authorization failed",
      details: error,
    });
  }

  if (!code) {
    return res.status(400).json({
      success: false,
      error: "Authorization code is required",
    });
  }

  try {
    // Use the authenticated user's username instead of 'testuser'
    await authService.createAccessToken(code, state);
    return res.json({
      success: true,
      message: "Access token created successfully",
      user: state
    })

  } catch (error) {
    console.error("OAuth callback error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to process OAuth callback",
      details: error.message,
    });
  }
});

router.post('/refresh', authenticateToken, async (req, res) => {
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
  } catch (error) {
    console.error("HubSpot token refresh error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to refresh HubSpot token",
      details: error.message,
    });
  }
});

export default router;
