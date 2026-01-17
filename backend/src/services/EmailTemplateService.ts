import { EmailTemplate, TemplateContext, MergedEmailContent, PropertyData, BuyerData } from '../types/emailTemplate';
import { getEmailTemplates, getEmailTemplateById } from '../config/emailTemplates';

/**
 * Service for managing email templates and merging them with data
 */
export class EmailTemplateService {
  /**
   * Get all available email templates
   */
  async getTemplates(): Promise<EmailTemplate[]> {
    return getEmailTemplates();
  }

  /**
   * Get a specific template by ID
   */
  async getTemplateById(templateId: string): Promise<EmailTemplate | null> {
    const template = getEmailTemplateById(templateId);
    return template || null;
  }

  /**
   * Merge template placeholders with actual data
   * @param template The email template
   * @param context The context data (buyer and optionally property)
   * @returns Merged email content with placeholders replaced
   */
  mergePlaceholders(template: EmailTemplate, context: TemplateContext): MergedEmailContent {
    let subject = template.subject;
    let body = template.body;

    // Create a flat map of all available data
    const dataMap = this.createDataMap(context);

    // Replace all placeholders in subject and body
    for (const [key, value] of Object.entries(dataMap)) {
      const placeholder = `{{${key}}}`;
      const replacement = this.formatValue(value);
      
      subject = subject.replace(new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), replacement);
      body = body.replace(new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), replacement);
    }

    return {
      subject,
      body
    };
  }

  /**
   * Create a flat map of all available data for placeholder replacement
   */
  private createDataMap(context: TemplateContext): Record<string, any> {
    const dataMap: Record<string, any> = {};

    // Add buyer data
    if (context.buyer) {
      dataMap['buyerName'] = context.buyer.buyerName;
      dataMap['email'] = context.buyer.email;
      
      // Add any additional buyer fields
      for (const [key, value] of Object.entries(context.buyer)) {
        if (key !== 'buyerName' && key !== 'email') {
          dataMap[key] = value;
        }
      }
    }

    // Add property data if available
    if (context.property) {
      dataMap['propertyNumber'] = context.property.propertyNumber;
      dataMap['propertyAddress'] = context.property.propertyAddress;
      dataMap['price'] = context.property.price;
      
      if (context.property.landArea) {
        dataMap['landArea'] = context.property.landArea;
      }
      if (context.property.buildingArea) {
        dataMap['buildingArea'] = context.property.buildingArea;
      }
      if (context.property.propertyType) {
        dataMap['propertyType'] = context.property.propertyType;
      }
      
      // Add any additional property fields
      for (const [key, value] of Object.entries(context.property)) {
        if (!['propertyNumber', 'propertyAddress', 'price', 'landArea', 'buildingArea', 'propertyType'].includes(key)) {
          dataMap[key] = value;
        }
      }
    }

    // Add any additional context fields
    for (const [key, value] of Object.entries(context)) {
      if (key !== 'buyer' && key !== 'property') {
        dataMap[key] = value;
      }
    }

    return dataMap;
  }

  /**
   * Format a value for display in email
   */
  private formatValue(value: any): string {
    if (value === null || value === undefined) {
      return '';
    }

    // Format numbers with commas
    if (typeof value === 'number') {
      return value.toLocaleString('ja-JP');
    }

    // Format dates
    if (value instanceof Date) {
      return value.toLocaleDateString('ja-JP');
    }

    // Convert to string
    return String(value);
  }

  /**
   * Validate that all required placeholders can be filled
   * @param template The email template
   * @param context The context data
   * @returns List of missing placeholders (empty if all can be filled)
   */
  validatePlaceholders(template: EmailTemplate, context: TemplateContext): string[] {
    const dataMap = this.createDataMap(context);
    const missing: string[] = [];

    for (const placeholder of template.placeholders) {
      // Remove {{ and }} from placeholder
      const key = placeholder.replace(/{{|}}/g, '');
      
      if (!(key in dataMap) || dataMap[key] === null || dataMap[key] === undefined) {
        missing.push(placeholder);
      }
    }

    return missing;
  }

  /**
   * Get template preview with sample data
   * @param templateId The template ID
   * @returns Preview of the template with sample data
   */
  async getTemplatePreview(templateId: string): Promise<MergedEmailContent | null> {
    const template = await this.getTemplateById(templateId);
    if (!template) {
      return null;
    }

    // Create sample context
    const sampleContext: TemplateContext = {
      buyer: {
        buyerName: '山田太郎',
        email: 'sample@example.com'
      },
      property: {
        propertyNumber: 'AA12345',
        propertyAddress: '大分県大分市中央町1-2-3',
        price: 35000000,
        landArea: 150.5,
        buildingArea: 95.2,
        propertyType: '戸建て'
      }
    };

    return this.mergePlaceholders(template, sampleContext);
  }

  /**
   * Merge template with multiple properties
   * @param template The email template
   * @param buyer Buyer data
   * @param properties Array of property data
   * @returns Merged email content with multiple properties
   */
  mergeMultipleProperties(
    template: EmailTemplate,
    buyer: BuyerData,
    properties: PropertyData[]
  ): MergedEmailContent {
    let subject = template.subject;
    let body = template.body;

    // Replace buyer placeholders
    const buyerMap: Record<string, any> = {
      buyerName: buyer.buyerName,
      email: buyer.email,
      ...buyer
    };

    for (const [key, value] of Object.entries(buyerMap)) {
      const placeholder = `{{${key}}}`;
      const replacement = this.formatValue(value);
      
      subject = subject.replace(new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), replacement);
      body = body.replace(new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), replacement);
    }

    // Format multiple properties section
    const propertiesSection = properties.map((property, index) => {
      return `
【物件${index + 1}】
物件番号: ${property.propertyNumber}
所在地: ${property.propertyAddress}
価格: ${this.formatValue(property.price)}円
${property.propertyType ? `物件種別: ${property.propertyType}` : ''}
${property.landArea ? `土地面積: ${property.landArea}㎡` : ''}
${property.buildingArea ? `建物面積: ${property.buildingArea}㎡` : ''}
      `.trim();
    }).join('\n\n');

    // Replace property placeholders with multiple properties section
    // If template has {{propertyNumber}}, replace with properties list
    if (body.includes('{{propertyNumber}}') || body.includes('{{propertyAddress}}')) {
      // Replace first property placeholder with all properties
      body = body.replace(/{{propertyNumber}}[\s\S]*?(?={{|$)/g, propertiesSection);
      body = body.replace(/{{propertyAddress}}/g, '');
      body = body.replace(/{{price}}/g, '');
      body = body.replace(/{{propertyType}}/g, '');
      body = body.replace(/{{landArea}}/g, '');
      body = body.replace(/{{buildingArea}}/g, '');
    } else {
      // Append properties section at the end
      body += '\n\n' + propertiesSection;
    }

    return {
      subject,
      body
    };
  }
}
