/**
 * Email Template Types
 * Defines types for email templates used in buyer communication
 */

/**
 * Email template with placeholders for dynamic content
 */
export interface EmailTemplate {
  /** Unique identifier for the template */
  id: string;
  
  /** Display name of the template */
  name: string;
  
  /** Brief description of when to use this template */
  description: string;
  
  /** Email subject line (may contain placeholders) */
  subject: string;
  
  /** Email body content (may contain placeholders) */
  body: string;
  
  /** List of placeholder keys used in this template */
  placeholders: string[];
}

/**
 * Property data used for placeholder replacement
 */
export interface PropertyData {
  /** Property identification number */
  propertyNumber: string;
  
  /** Full address of the property */
  propertyAddress: string;
  
  /** Property price in yen */
  price: number;
  
  /** Land area in square meters (optional) */
  landArea?: number;
  
  /** Building area in square meters (optional) */
  buildingArea?: number;
  
  /** Property type (e.g., 戸建て, マンション) */
  propertyType?: string;
  
  /** Additional property fields */
  [key: string]: any;
}

/**
 * Buyer data used for placeholder replacement
 */
export interface BuyerData {
  /** Buyer's name */
  buyerName: string;
  
  /** Buyer's email address */
  email: string;
  
  /** Additional buyer fields */
  [key: string]: any;
}

/**
 * Merged email content after placeholder replacement
 */
export interface MergedEmailContent {
  /** Email subject with placeholders replaced */
  subject: string;
  
  /** Email body with placeholders replaced */
  body: string;
}

/**
 * Context data for template merging
 */
export interface TemplateContext {
  /** Property data (optional if no property selected) */
  property?: PropertyData;
  
  /** Buyer data */
  buyer: BuyerData;
  
  /** Additional context fields */
  [key: string]: any;
}

/**
 * Email template with validation status
 */
export interface ValidatedTemplate extends EmailTemplate {
  /** Whether all required placeholders can be filled */
  isValid: boolean;
  
  /** List of missing placeholder values */
  missingPlaceholders?: string[];
}
