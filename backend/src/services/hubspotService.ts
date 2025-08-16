import { config } from "../config.js";
import Auth from "../models/auth.js";
import {
  CreateContactInput,
  CreateCustomPropertyInput,
  PartialContactPropertyInput,
} from "../schemas/hubspot";
import AuthService from "./authService.js";

interface HubspotServiceError extends Error {
  code?: string;
}

class HubspotService {
  private baseUrl: string;
  private authService: AuthService;

  /**
   * Initialize HubspotService with authentication service
   * @param authService - Service for handling authentication operations
   * @throws {Error} When HUBSPOT_BASE is not configured
   */
  constructor(authService: AuthService) {
    if (!config.HUBSPOT_BASE) {
      throw new Error("HUBSPOT_BASE is not defined in the configuration");
    }

    this.baseUrl = config.HUBSPOT_BASE;
    this.authService = authService;
  }

  /**
   * Creates a new contact in HubSpot
   * @param contactData - Contact information including owner, email, name, and custom properties
   * @param username - Username of the authenticated user
   * @returns Promise containing the created contact details with id and properties
   * @throws {HubspotServiceError} When API request fails or user/owner not found
   */
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

    // @ts-ignore
    const { _, properties } = contactData;

    const payload = {
      properties: {
        hubspot_owner_id: contact_owner.id,
        ...properties,
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
      email: contactData.properties.email,
      firstName: contactData.properties.firstname,
    };
  }

  /**
   * Creates custom properties for a specific HubSpot object type in batch
   * @param properties - Array of property definitions with name, label, type, etc.
   * @param objectType - HubSpot object type (e.g., 'contacts', 'companies', 'deals')
   * @param username - Username of the authenticated user
   * @returns Promise containing the batch creation result from HubSpot API
   * @throws {HubspotServiceError} When API request fails or authentication issues occur
   */
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

  /**
   * Updates contact details in HubSpot using email as identifier
   * @param email - Email address of the contact to update
   * @param properties - Partial property object with fields to update
   * @param username - Username of the authenticated user
   * @returns Promise containing the updated contact details from HubSpot API
   * @throws {HubspotServiceError} When API request fails or authentication issues occur
   */
  public async updateContactDetails(
    email: string,
    properties: PartialContactPropertyInput,
    username: string
  ) {
    const accessToken = await this.getAccessToken(username);

    const apiUrl = `${
      this.baseUrl
    }/crm/v3/objects/contacts/${encodeURIComponent(email)}?idProperty=email`;
    const headers = {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    };

    const response = await fetch(apiUrl, {
      method: "PATCH",
      headers: headers,
      body: JSON.stringify({ properties }),
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

  /**
   * Retrieves and decrypts the access token for a user
   * @param username - Username to lookup in the database
   * @returns Promise containing the decrypted access token
   * @throws {Error} When user is not found or token decryption fails
   * @private
   */
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

  /**
   * Fetches HubSpot contact owner details by email address
   * @param email - Email address of the contact owner to lookup
   * @param username - Username of the authenticated user making the request
   * @returns Promise containing owner details (id, email, firstName, lastName)
   * @throws {HubspotServiceError} When API request fails
   * @throws {Error} When no contact owner is found for the provided email
   * @private
   */
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
