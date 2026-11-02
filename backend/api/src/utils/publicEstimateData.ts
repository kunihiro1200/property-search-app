/**
 * Build the minimal estimate input from the same public-facing property fields
 * used by the property detail page. Do not pass private Sheets rows to PDF code.
 */
export interface PublicEstimateProperty {
  property_number: string;
  display_address?: string | null;
  address?: string | null;
  property_type?: string | null;
  sales_price?: number | string | null;
  listing_price?: number | string | null;
}

export interface PublicEstimateData {
  propertyNumber: string;
  propertyName: string;
  propertyType: string;
  price: number;
}

const publicTypeLabels: Record<string, string> = {
  detached_house: '戸建',
  apartment: 'マンション',
  land: '土地',
  income: '収益物件',
  commercial: '事業用',
};

export function toPublicEstimateData(row: PublicEstimateProperty): PublicEstimateData {
  // Match the public detail page: public display address, then public address.
  // A masked display_address must never be replaced with the raw address.
  const preferredAddress =
    (typeof row.display_address === 'string' && row.display_address.trim()) ||
    (typeof row.address === 'string' && row.address.trim()) ||
    row.property_number;

  const rawType = typeof row.property_type === 'string' ? row.property_type.trim() : '';
  // The PDF calculator recognizes the Japanese mansion label.
  const propertyType = publicTypeLabels[rawType] || rawType;

  // Keep the existing detail page's sales_price || listing_price precedence.
  const rawPrice = row.sales_price || row.listing_price || 0;
  const parsedPrice = Number(rawPrice);
  const price = Number.isFinite(parsedPrice) && parsedPrice >= 0 ? parsedPrice : 0;

  return {
    propertyNumber: row.property_number,
    propertyName: preferredAddress,
    propertyType,
    price,
  };
}
