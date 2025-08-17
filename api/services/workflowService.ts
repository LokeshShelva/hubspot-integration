import { config } from "../config.js";
import Auth from "../models/auth.js";
import User from "../models/user.js";
import AuthService from "./authService.js";
import CryptoJS from "crypto-js";

class WorkFlowService {
  private baseUrl: string;
  private webhookUrl: string;
  private authService: AuthService;

  constructor(authService: AuthService) {
    if (!config.HUBSPOT_BASE) {
      throw new Error("HUBSPOT_BASE is not defined in the configuration");
    }
    this.baseUrl = config.HUBSPOT_BASE;

    if (!config.WEBHOOK_URL) {
      throw new Error("WEBHOOK_URL is not defined in the configuration");
    }
    this.webhookUrl = config.WEBHOOK_URL;
    this.authService = authService;
  }

  public validateSignature(headers: any, requestBody: string): boolean {
    if (!headers['x-hubspot-signature-version']) {
      throw new Error('Missing HubSpot Signature Version');
    }

    if (headers['x-hubspot-signature-version'] !== 'v1') {
      throw new Error('Unsupported HubSpot Signature Version. Only v1 is supported.');
    }

    if (!headers['x-hubspot-signature']) {
      throw new Error('Missing HubSpot Signature');
    }

    const signature = headers['x-hubspot-signature'];
    const validationString = config.CLIENT_SECRET?.toString().trim() + requestBody;
    const expectedSignature = CryptoJS.SHA256(validationString).toString();

    return signature === expectedSignature;
  }

  public async contactOwnerChange(objectId: string, userAccountId: string) {
    const access_token = await this.getAccessToken(userAccountId);
    const apiUrl = `${this.baseUrl}/crm/v3/objects/contacts/${objectId}`;
    const headers = {
      Authorization: `Bearer ${access_token}`,
      "Content-Type": "application/json",
    };
    const query = new URLSearchParams({
      properties: "email, candidate_name, candidate_number",
    });

    const contact = await fetch(apiUrl + "?" + query.toString(), {
      method: "GET",
      headers: headers,
    });

    if (!contact.ok) {
      throw new Error(`Failed to fetch contact: ${contact.statusText}`);
    }
    const contactData: any = await contact.json();
    const properties = contactData.properties;

    if (!properties) {
      throw new Error("Contact does not have properties");
    }

    const response = await fetch(this.webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        Candidate_name: properties.candidate_name,
        Candidate_number: properties.candidate_number,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to send webhook: ${response.statusText}`);
    }

    return { objectId };
  }

  /**
   * Retrieves and decrypts the access token for a user
   * @param userAccountId - User account ID to lookup in the database
   * @returns Promise containing the decrypted access token
   * @throws {Error} When user is not found or token decryption fails
   * @private
   */
  private async getAccessToken(userAccountId: string): Promise<string> {
    const user = await (User as any).findByUserAccountId(userAccountId);
    if (!user) {
      throw new Error("User not found");
    }
    const authRecord = await (Auth as any).findByUsername(user.username);
    if (!authRecord) {
      throw new Error("Auth record not found for user");
    }

    const is_expired = authRecord.isTokenExpired();
    if (is_expired) {
      const result = await this.authService.refreshAccessToken(user.username);
      return result.access_token;
    }

    const access_token = this.authService.decryptToken(authRecord.access_token);
    if (!access_token) {
      throw new Error("Failed to decrypt access token");
    }

    return access_token;
  }
}

export { WorkFlowService };