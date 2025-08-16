import { z } from "zod";

/**
 * Schema for creating a HubSpot contact
 */
export const createContactSchema = z.object({
  contact_owner: z
    .string()
    .min(1, "Contact owner is required")
    .max(100, "Contact owner must be less than 100 characters")
    .trim(),
  email: z.email("Invalid email format").trim(),
  firstname: z
    .string()
    .max(50, "First name must be less than 50 characters")
    .trim(),
  candidate_experience: z
    .number()
    .min(0, "Candidate experience must be a positive number"),
  candidate_date_of_joining: z
    .string()
    .refine((date) => !isNaN(Date.parse(date)), "Invalid date format"),
  candidate_name: z
    .string()
    .max(100, "Candidate name must be less than 100 characters")
    .trim(),
  candidate_past_company: z
    .string()
    .max(100, "Past company name must be less than 100 characters")
    .trim(),
});

/**
 * Schema of a custom property
 */
export const propertySchema = z.object({
  name: z
    .string()
    .min(1, "Property name is required")
    .max(100, "Property name must be less than 100 characters")
    .regex(
      /^[a-z0-9_]+$/,
      "Property name must contain only lowercase letters, numbers, and underscores"
    )
    .trim(),

  label: z
    .string()
    .min(1, "Property label is required")
    .max(255, "Property label must be less than 255 characters")
    .trim(),

  description: z
    .string()
    .max(1000, "Property description must be less than 1000 characters")
    .trim()
    .optional(),

  groupName: z
    .string()
    .min(1, "Property group name is required")
    .max(100, "Property group name must be less than 100 characters")
    .trim(),

  type: z.enum(
    ["string", "number", "bool", "datetime", "enumeration", "date"],
    { message: "Invalid property type" }
  ),

  fieldType: z.enum(
    [
      "text",
      "textarea",
      "number",
      "select",
      "radio",
      "checkbox",
      "booleancheckbox",
      "date",
      "file",
      "calculation_equation",
    ],
    { message: "Invalid field type" }
  ),

  displayOrder: z
    .number()
    .int("Display order must be an integer")
    .min(-1, "Display order must be -1 or higher")
    .optional()
    .default(2),

  hidden: z.boolean().optional().default(false),
});

export const createCustomPropertySchema = z.object({
    inputs: z.array(propertySchema).min(1, "At least one property is required"),
});

// Export type inference for use in controllers
export type CreateContactInput = z.infer<typeof createContactSchema>;
export type propertyInput = z.infer<typeof propertySchema>;
export type CreateCustomPropertyInput = z.infer<typeof createCustomPropertySchema>;

export default {
  createContactSchema,
  propertySchema,
  createCustomPropertySchema
};
