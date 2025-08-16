import { config } from "../config.js";
import Auth from "../models/auth.js";
import {
  CreateContactInput,
  CreateCustomPropertyInput,
} from "../schemas/hubspot";
import AuthService from "./authService.js";

interface HubspotServiceError extends Error {
  code?: string;
}

class HubspotService {
  private baseUrl: string;
  private authService: AuthService;

  constructor(authService: AuthService) {
    if (!config.HUBSPOT_BASE) {
      throw new Error("HUBSPOT_BASE is not defined in the configuration");
    }

    this.baseUrl = config.HUBSPOT_BASE;
    this.authService = authService;
  }

  public async createContact(
    contactData: CreateContactInput,
    username: string
  ) {
    const access_token = await this.getAccessToken(username);
    const contact_owner = await this.getHubspotContactOwnerDetail(
      contactData.contact_owner,
      username
    );

    const apiUrl = `${this.baseUrl}/crm/v3/objects/contacts`;
    const headers = {
      Authorization: `Bearer ${access_token}`,
      "Content-Type": "application/json",
    };

    const { contact_owner: _, ...contactProperties } = contactData;
    
    const payload = {
      properties: {
        hubspot_owner_id: contact_owner.id,
        ...contactProperties,
      },
    };

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: headers,
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText: any = await response.json();
      const error: HubspotServiceError = new Error(
        `HubSpot API error: ${response.status} - ${
          errorText.message || "Unknown error"
        }`
      );
      error.code = "HUBSPOT_API_ERROR";
      throw error;
    }

    const createdContact: any = await response.json();

    return {
      id: createdContact.id,
      hubspot_owner_id: contact_owner.id,
      email: contactData.email,
      firstName: contactData.firstname,
    };
  }

  public async createCustomProperties(
    properties: CreateCustomPropertyInput,
    objectType: string,
    username: string
  ) {
    const accessToken = await this.getAccessToken(username);

    const apiUrl = `${this.baseUrl}/crm/v3/properties/${objectType}/batch/create`;
    const headers = {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    };
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: headers,
      body: JSON.stringify(properties),
    });

    if (!response.ok) {
      const errorText: any = await response.json();
      const error: HubspotServiceError = new Error(
        `HubSpot API error: ${response.status} - ${
          errorText.message || "Unknown error"
        }`
      );
      error.code = "HUBSPOT_API_ERROR";
      throw error;
    }
    const result: any = await response.json();
    return result;
  }

  private async getAccessToken(username: string): Promise<string> {
    const user = await (Auth as any).findByUsername(username);
    if (!user) {
      throw new Error("User not found");
    }

    const access_token = this.authService.decryptToken(user.access_token);
    if (!access_token) {
      throw new Error("Failed to decrypt access token");
    }

    return access_token;
  }

  private async getHubspotContactOwnerDetail(email: string, username: string) {
    const accessToken = await this.getAccessToken(username);

    const apiUrl = `${this.baseUrl}/crm/v3/owners`;
    const headers = {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    };
    const query = new URLSearchParams({
      email: email,
    });

    const res = await fetch(apiUrl + "?" + query.toString(), {
      method: "GET",
      headers: headers,
    });

    if (!res.ok) {
      const errorText: any = await res.json();
      const error: HubspotServiceError = new Error(
        `HubSpot API error: ${res.status} - ${
          errorText.message || "Unknown error"
        }`
      );
      error.code = "HUBSPOT_API_ERROR";
      throw error;
    }

    const data: any = await res.json();
    const result = data.results || [];
    if (result.length === 0) {
      throw new Error(
        "No contact owner found for the provided email - " + email
      );
    }

    return {
      id: result[0].id,
      email: result[0].email,
      firstName: result[0].firstName,
      lastName: result[0].lastName,
    };
  }
}

export { HubspotService };
export type { HubspotServiceError };
