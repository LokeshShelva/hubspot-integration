import express, { Request, Response } from "express";
import { validateSchema } from "../middleware/validation.js";
import {
  createContactSchema,
  CreateCustomPropertyInput,
  createCustomPropertySchema,
  UpdateContactDetailsInput,
  updateContactDetailsSchema,
  type CreateContactInput,
} from "../schemas/hubspot.js";
import { authenticateToken } from "../middleware/auth.js";
import AuthService from "../services/authService.js";
import { HubspotService } from "../services/hubspotService.js";

const authService = new AuthService();
const hubspotService = new HubspotService(authService);

const router = express.Router();
router.use(authenticateToken);

router.post(
  "/contacts",
  validateSchema(createContactSchema),
  async (req: Request, res: Response) => {
    try {
      const contactData = req.body as CreateContactInput;
      const username = req.user?.username;

      if (!username) {
        return res.status(401).json({
          success: false,
          error: "Authentication required",
          message: "You must be logged in to create a contact",
        });
      }

      const result = await hubspotService.createContact(contactData, username);
      return res.status(201).json({
        success: true,
        message: "Contact created successfully",
        data: {
          ...result,
        },
      });
    } catch (error: any) {
      console.error("Create contact error:", error);
      return res.status(500).json({
        success: false,
        error: "Failed to create contact",
        message: error.message || "An unexpected error occurred",
      });
    }
  }
);

router.post(
  "/contacts/properties",
  validateSchema(createCustomPropertySchema),
  async (req: Request, res: Response) => {
    try {
      const propertyData = req.body as CreateCustomPropertyInput;
      const username = req.user?.username;

      if (!username) {
        return res.status(401).json({
          success: false,
          error: "Authentication required",
          message: "You must be logged in to create a contact",
        });
      }

      const result = await hubspotService.createCustomProperties(
        propertyData,
        "contacts",
        username
      );
      return res.status(201).json({
        success: true,
        message: "Custom properties creation request validated successfully",
        data: {
          properties: result,
        },
      });
    } catch (error: any) {
      console.error("Create custom properties error:", error);
      return res.status(500).json({
        success: false,
        error: "Failed to create custom properties",
        message: error.message || "An unexpected error occurred",
      });
    }
  }
);

router.patch(
  "/contacts/properties",
  validateSchema(updateContactDetailsSchema),
  async (req: Request, res: Response) => {
    try {
      const { email, properties } = req.body as UpdateContactDetailsInput;
      const username = req.user?.username;

      if (!username) {
        return res.status(401).json({
          success: false,
          error: "Authentication required",
          message: "You must be logged in to create a contact",
        });
      }

      const result = await hubspotService.updateContactDetails(
        email,
        properties,
        username
      );
      return res.status(200).json({
        success: true,
        message: "Custom properties updated successfully",
        data: {
          properties: result,
        },
      });
    } catch (error: any) {
      console.error("Create custom properties error:", error);
      return res.status(500).json({
        success: false,
        error: "Failed to create custom properties",
        message: error.message || "An unexpected error occurred",
      });
    }
  }
);
export default router;
