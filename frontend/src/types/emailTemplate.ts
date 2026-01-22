/**
 * Email Template Types (Frontend)
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
 * Property information for email context
 */
export interface PropertyInfo {
  /** Property ID */
  id: string;
  
  /** Property identification number */
  propertyNumber: string;
  
  /** Full address of the property */
  address: string;
  
  /** Property price in yen */
  price: number;
  
  /** Date of inquiry */
  inquiryDate: Date;
  
  /** Property type (optional) */
  propertyType?: string;
  
  /** Land area (optional) */
  landArea?: number;
  
  /** Building area (optional) */
  buildingArea?: number;
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
 * Email data for sending
 */
export interface EmailData {
  /** Buyer ID */
  buyerId: string;
  
  /** Property ID (optional) */
  propertyId?: string;
  
  /** Template ID used */
  templateId: string;
  
  /** Email subject */
  subject: string;
  
  /** Email body */
  body: string;
  
  /** Recipient email address */
  recipientEmail: string;
}

/**
 * Email send result
 */
export interface SendResult {
  /** Whether the email was sent successfully */
  success: boolean;
  
  /** Gmail message ID (if successful) */
  messageId?: string;
  
  /** Error message (if failed) */
  error?: string;
}
