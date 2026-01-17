# Phase 2: Properties & Valuations - Design Document

## Overview

Phase 2 builds upon Phase 1 (sellers table, authentication, encryption) and adds property management and valuation calculation features. This phase implements the database schema, services, and API endpoints needed to manage property details and calculate property valuations.

## Architecture

### Component Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     Phase 2 Components                       │
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Property     │  │ Valuation    │  │ Valuation    │      │
│  │ Service      │  │ Engine       │  │ Service      │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│         │                  │                  │              │
│         └──────────────────┴──────────────────┘              │
│                            │                                 │
└────────────────────────────┼─────────────────────────────────┘
                             │
                             ▼
                    ┌──────────────┐
                    │ PostgreSQL   │
                    │ - properties │
                    │ - valuations │
                    └──────────────┘
```

### Data Flow

```
1. Property Creation Flow:
   User → PropertyService → Database (properties table)
   
2. Automatic Valuation Flow:
   PropertyService → ValuationEngine → ValuationService → Database (valuations table)
   
3. Manual Valuation Flow (Apartments):
   User → ValuationService → Database (valuations table)
   
4. Post-Visit Valuation Flow:
   User → ValuationService → Database (valuations table)
   
5. Valuation History Flow:
   User → ValuationService → Database (valuations table) → User
```

## Database Schema

### Properties Table

```sql
CREATE TABLE properties (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Foreign Key
  seller_id UUID NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
  
  -- Property Type
  property_type VARCHAR(20) NOT NULL CHECK (property_type IN ('戸建て', '土地', 'マンション')),
  
  -- Area Information (平方メートル)
  land_area DECIMAL(10, 2),
  building_area DECIMAL(10, 2),
  land_area_verified DECIMAL(10, 2), -- 土地（当社調べ）
  building_area_verified DECIMAL(10, 2), -- 建物（当社調べ）
  
  -- Construction Information
  construction_year INTEGER, -- 築年
  structure VARCHAR(20) CHECK (structure IN ('木造', '軽量鉄骨', '鉄骨', '他')),
  
  -- Address Information
  property_address TEXT NOT NULL,
  property_address_ieul_apartment TEXT, -- イエウールのマンション専用
  
  -- Current Status
  current_status VARCHAR(20) CHECK (current_status IN ('居住中', '空き家', '賃貸中', '古屋あり', '更地')),
  
  -- Fixed Asset Tax Road Price
  fixed_asset_tax_road_price DECIMAL(15, 2),
  
  -- Floor Plan
  floor_plan TEXT,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_by UUID REFERENCES employees(id),
  updated_by UUID REFERENCES employees(id),
  version INTEGER DEFAULT 1 -- For optimistic locking
);

-- Indexes
CREATE INDEX idx_properties_seller_id ON properties(seller_id);
CREATE INDEX idx_properties_property_type ON properties(property_type);
CREATE INDEX idx_properties_created_at ON properties(created_at);
CREATE INDEX idx_properties_construction_year ON properties(construction_year);
CREATE INDEX idx_properties_current_status ON properties(current_status);

-- Trigger for updated_at
CREATE TRIGGER update_properties_updated_at
  BEFORE UPDATE ON properties
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

### Valuations Table

```sql
CREATE TABLE valuations (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Foreign Key
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  
  -- Valuation Type
  valuation_type VARCHAR(20) NOT NULL CHECK (valuation_type IN ('automatic', 'manual', 'post_visit')),
  
  -- Valuation Amounts (in Japanese Yen)
  valuation_amount_1 BIGINT NOT NULL, -- 査定額1 (Minimum)
  valuation_amount_2 BIGINT NOT NULL, -- 査定額2 (Medium)
  valuation_amount_3 BIGINT NOT NULL, -- 査定額3 (Maximum)
  
  -- Validation: Ensure ascending order
  CONSTRAINT check_valuation_order CHECK (
    valuation_amount_1 <= valuation_amount_2 AND 
    valuation_amount_2 <= valuation_amount_3
  ),
  
  -- Calculation Details (for automatic valuations)
  calculation_method TEXT,
  calculation_parameters JSONB,
  
  -- Valuation Report URL
  valuation_report_url TEXT, -- つながるオンライン査定書URL
  
  -- Metadata
  valuation_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_by UUID REFERENCES employees(id),
  notes TEXT,
  
  -- Audit
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_valuations_property_id ON valuations(property_id);
CREATE INDEX idx_valuations_valuation_date ON valuations(valuation_date DESC);
CREATE INDEX idx_valuations_valuation_type ON valuations(valuation_type);
CREATE INDEX idx_valuations_created_by ON valuations(created_by);
```

## Service Layer Design

### 1. PropertyService

**Responsibilities:**
- Create, read, update, delete properties
- Validate property data
- Manage property-seller relationships
- Handle optimistic locking
- Trigger automatic valuation for 戸建て and 土地

**Interface:**
```typescript
interface PropertyService {
  // Create a new property
  createProperty(data: CreatePropertyRequest, employeeId: string): Promise<Property>;
  
  // Get property by ID
  getProperty(id: string): Promise<Property>;
  
  // Update property
  updateProperty(id: string, data: UpdatePropertyRequest, employeeId: string): Promise<Property>;
  
  // Delete property (soft delete)
  deleteProperty(id: string): Promise<void>;
  
  // List properties by seller
  listPropertiesBySeller(sellerId: string): Promise<Property[]>;
  
  // Validate property data
  validatePropertyData(data: PropertyData): Promise<ValidationResult>;
}
```

**Implementation Details:**
```typescript
class PropertyService {
  constructor(
    private db: Database,
    private valuationEngine: ValuationEngine,
    private valuationService: ValuationService
  ) {}
  
  async createProperty(data: CreatePropertyRequest, employeeId: string): Promise<Property> {
    // 1. Validate property data
    const validation = await this.validatePropertyData(data);
    if (!validation.isValid) {
      throw new ValidationError(validation.errors);
    }
    
    // 2. Check if seller exists
    const seller = await this.db.query('SELECT id FROM sellers WHERE id = $1', [data.seller_id]);
    if (!seller.rows.length) {
      throw new NotFoundError('Seller not found');
    }
    
    // 3. Insert property
    const property = await this.db.query(
      `INSERT INTO properties (
        seller_id, property_type, land_area, building_area,
        construction_year, structure, property_address, current_status,
        created_by, updated_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`,
      [
        data.seller_id, data.property_type, data.land_area, data.building_area,
        data.construction_year, data.structure, data.property_address, data.current_status,
        employeeId, employeeId
      ]
    );
    
    // 4. Trigger automatic valuation for 戸建て and 土地
    if (data.property_type === '戸建て' || data.property_type === '土地') {
      await this.triggerAutomaticValuation(property.rows[0], employeeId);
    }
    
    return property.rows[0];
  }
  
  private async triggerAutomaticValuation(property: Property, employeeId: string): Promise<void> {
    try {
      const valuationResult = await this.valuationEngine.calculateValuation(property);
      await this.valuationService.createValuation({
        property_id: property.id,
        valuation_type: 'automatic',
        valuation_amount_1: valuationResult.amount1,
        valuation_amount_2: valuationResult.amount2,
        valuation_amount_3: valuationResult.amount3,
        calculation_method: valuationResult.method,
        calculation_parameters: valuationResult.parameters
      }, employeeId);
    } catch (error) {
      // Log error but don't fail property creation
      console.error('Automatic valuation failed:', error);
    }
  }
}
```

### 2. ValuationEngine

**Responsibilities:**
- Calculate automatic valuations for 戸建て and 土地
- Validate valuation amounts (ascending order)
- Generate valuation reports
- Store calculation parameters

**Interface:**
```typescript
interface ValuationEngine {
  // Calculate valuation for a property
  calculateValuation(property: Property): Promise<ValuationResult>;
  
  // Validate valuation order
  validateValuationOrder(amounts: [number, number, number]): boolean;
  
  // Generate valuation report
  generateValuationReport(valuation: Valuation): Promise<string>;
}
```

**Implementation Details:**
```typescript
class ValuationEngine {
  // Calculation constants
  private readonly LAND_PRICE_PER_SQM = 150000; // Base land price per square meter
  private readonly BUILDING_PRICE_PER_SQM = 200000; // Base building price per square meter
  private readonly DEPRECIATION_RATE = 0.015; // 1.5% per year
  private readonly MIN_VALUATION_MULTIPLIER = 0.85; // 85% for minimum
  private readonly MAX_VALUATION_MULTIPLIER = 1.15; // 115% for maximum
  
  async calculateValuation(property: Property): Promise<ValuationResult> {
    // 1. Calculate land value
    const landValue = this.calculateLandValue(property);
    
    // 2. Calculate building value (if applicable)
    const buildingValue = property.property_type === '戸建て' 
      ? this.calculateBuildingValue(property)
      : 0;
    
    // 3. Calculate total value
    const totalValue = landValue + buildingValue;
    
    // 4. Calculate three valuation amounts
    const amount1 = Math.round(totalValue * this.MIN_VALUATION_MULTIPLIER);
    const amount2 = Math.round(totalValue);
    const amount3 = Math.round(totalValue * this.MAX_VALUATION_MULTIPLIER);
    
    // 5. Validate order
    if (!this.validateValuationOrder([amount1, amount2, amount3])) {
      throw new ValidationError('Valuation amounts are not in ascending order');
    }
    
    // 6. Check for abnormal values
    if (amount1 < 1000000 || amount3 > 1000000000) {
      console.warn('Abnormal valuation detected:', { amount1, amount2, amount3 });
    }
    
    return {
      amount1,
      amount2,
      amount3,
      method: property.property_type === '戸建て' ? 'land_building_method' : 'land_method',
      parameters: {
        landArea: property.land_area,
        buildingArea: property.building_area,
        constructionYear: property.construction_year,
        structure: property.structure,
        landValue,
        buildingValue,
        totalValue
      }
    };
  }
  
  private calculateLandValue(property: Property): number {
    const landArea = property.land_area_verified || property.land_area || 0;
    
    // Use fixed asset tax road price if available
    if (property.fixed_asset_tax_road_price) {
      return property.fixed_asset_tax_road_price * landArea;
    }
    
    // Otherwise use base price
    return this.LAND_PRICE_PER_SQM * landArea;
  }
  
  private calculateBuildingValue(property: Property): number {
    const buildingArea = property.building_area_verified || property.building_area || 0;
    const currentYear = new Date().getFullYear();
    const age = property.construction_year ? currentYear - property.construction_year : 0;
    
    // Calculate base building value
    let baseValue = this.BUILDING_PRICE_PER_SQM * buildingArea;
    
    // Apply structure multiplier
    const structureMultiplier = this.getStructureMultiplier(property.structure);
    baseValue *= structureMultiplier;
    
    // Apply depreciation
    const depreciatedValue = this.applyDepreciation(baseValue, age);
    
    return depreciatedValue;
  }
  
  private getStructureMultiplier(structure: string | null): number {
    switch (structure) {
      case '木造': return 0.9;
      case '軽量鉄骨': return 1.0;
      case '鉄骨': return 1.1;
      case '他': return 1.0;
      default: return 1.0;
    }
  }
  
  private applyDepreciation(value: number, years: number): number {
    // Simple straight-line depreciation
    const depreciationAmount = value * this.DEPRECIATION_RATE * years;
    const depreciatedValue = value - depreciationAmount;
    
    // Minimum value is 10% of original
    return Math.max(depreciatedValue, value * 0.1);
  }
  
  validateValuationOrder(amounts: [number, number, number]): boolean {
    return amounts[0] <= amounts[1] && amounts[1] <= amounts[2];
  }
  
  async generateValuationReport(valuation: Valuation): Promise<string> {
    // Generate PDF report URL (placeholder)
    // In real implementation, this would call an external service
    return `https://tsunagaru-online.example.com/reports/${valuation.id}`;
  }
}
```

### 3. ValuationService

**Responsibilities:**
- Create, read valuations
- Manage valuation history
- Coordinate with ValuationEngine

**Interface:**
```typescript
interface ValuationService {
  // Create a new valuation
  createValuation(data: CreateValuationRequest, employeeId: string): Promise<Valuation>;
  
  // Get valuation history for a property
  getValuationHistory(propertyId: string): Promise<Valuation[]>;
  
  // Get latest valuation for a property
  getLatestValuation(propertyId: string): Promise<Valuation | null>;
  
  // Compare two valuations
  compareValuations(id1: string, id2: string): Promise<ValuationComparison>;
}
```

**Implementation Details:**
```typescript
class ValuationService {
  constructor(private db: Database) {}
  
  async createValuation(data: CreateValuationRequest, employeeId: string): Promise<Valuation> {
    // 1. Validate valuation order
    if (data.valuation_amount_1 > data.valuation_amount_2 || 
        data.valuation_amount_2 > data.valuation_amount_3) {
      throw new ValidationError('Valuation amounts must be in ascending order');
    }
    
    // 2. Check if property exists
    const property = await this.db.query('SELECT id FROM properties WHERE id = $1', [data.property_id]);
    if (!property.rows.length) {
      throw new NotFoundError('Property not found');
    }
    
    // 3. Insert valuation
    const valuation = await this.db.query(
      `INSERT INTO valuations (
        property_id, valuation_type,
        valuation_amount_1, valuation_amount_2, valuation_amount_3,
        calculation_method, calculation_parameters,
        valuation_report_url, created_by, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`,
      [
        data.property_id, data.valuation_type,
        data.valuation_amount_1, data.valuation_amount_2, data.valuation_amount_3,
        data.calculation_method, data.calculation_parameters,
        data.valuation_report_url, employeeId, data.notes
      ]
    );
    
    return valuation.rows[0];
  }
  
  async getValuationHistory(propertyId: string): Promise<Valuation[]> {
    const result = await this.db.query(
      `SELECT v.*, e.name as created_by_name
       FROM valuations v
       LEFT JOIN employees e ON v.created_by = e.id
       WHERE v.property_id = $1
       ORDER BY v.valuation_date DESC`,
      [propertyId]
    );
    
    return result.rows;
  }
  
  async getLatestValuation(propertyId: string): Promise<Valuation | null> {
    const result = await this.db.query(
      `SELECT v.*, e.name as created_by_name
       FROM valuations v
       LEFT JOIN employees e ON v.created_by = e.id
       WHERE v.property_id = $1
       ORDER BY v.valuation_date DESC
       LIMIT 1`,
      [propertyId]
    );
    
    return result.rows[0] || null;
  }
  
  async compareValuations(id1: string, id2: string): Promise<ValuationComparison> {
    const [val1, val2] = await Promise.all([
      this.db.query('SELECT * FROM valuations WHERE id = $1', [id1]),
      this.db.query('SELECT * FROM valuations WHERE id = $2', [id2])
    ]);
    
    if (!val1.rows.length || !val2.rows.length) {
      throw new NotFoundError('One or both valuations not found');
    }
    
    const v1 = val1.rows[0];
    const v2 = val2.rows[0];
    
    return {
      valuation1: v1,
      valuation2: v2,
      differences: {
        amount1: v2.valuation_amount_1 - v1.valuation_amount_1,
        amount2: v2.valuation_amount_2 - v1.valuation_amount_2,
        amount3: v2.valuation_amount_3 - v1.valuation_amount_3
      },
      percentageChanges: {
        amount1: ((v2.valuation_amount_1 - v1.valuation_amount_1) / v1.valuation_amount_1) * 100,
        amount2: ((v2.valuation_amount_2 - v1.valuation_amount_2) / v1.valuation_amount_2) * 100,
        amount3: ((v2.valuation_amount_3 - v1.valuation_amount_3) / v1.valuation_amount_3) * 100
      }
    };
  }
}
```

## API Endpoints Design

### Properties API

#### POST /api/properties
Create a new property

**Request:**
```typescript
{
  seller_id: string;
  property_type: '戸建て' | '土地' | 'マンション';
  land_area?: number;
  building_area?: number;
  land_area_verified?: number;
  building_area_verified?: number;
  construction_year?: number;
  structure?: '木造' | '軽量鉄骨' | '鉄骨' | '他';
  property_address: string;
  property_address_ieul_apartment?: string;
  current_status?: '居住中' | '空き家' | '賃貸中' | '古屋あり' | '更地';
  fixed_asset_tax_road_price?: number;
  floor_plan?: string;
}
```

**Response:** 201 Created
```typescript
{
  id: string;
  seller_id: string;
  property_type: string;
  // ... all property fields
  created_at: string;
  updated_at: string;
}
```

**Validation:**
- `seller_id`: Required, must exist in sellers table
- `property_type`: Required, must be one of ['戸建て', '土地', 'マンション']
- `property_address`: Required, must not be empty
- `land_area`: Optional, must be positive if provided
- `building_area`: Optional, must be positive if provided
- `construction_year`: Optional, must be between 1900 and current year + 1

**Error Responses:**
- 400 Bad Request: Validation failed
- 404 Not Found: Seller not found
- 500 Internal Server Error: Database error

#### GET /api/properties/:id
Get property by ID

**Response:** 200 OK
```typescript
{
  id: string;
  seller_id: string;
  property_type: string;
  // ... all property fields
  latest_valuation?: {
    valuation_amount_1: number;
    valuation_amount_2: number;
    valuation_amount_3: number;
    valuation_date: string;
  };
}
```

**Error Responses:**
- 404 Not Found: Property not found
- 500 Internal Server Error: Database error

#### PUT /api/properties/:id
Update property

**Request:** Same as POST (all fields optional except those being updated)

**Response:** 200 OK (same as GET)

**Validation:** Same as POST

**Error Responses:**
- 400 Bad Request: Validation failed
- 404 Not Found: Property not found
- 409 Conflict: Version mismatch (optimistic locking)
- 500 Internal Server Error: Database error

#### DELETE /api/properties/:id
Delete property (soft delete)

**Response:** 204 No Content

**Error Responses:**
- 404 Not Found: Property not found
- 500 Internal Server Error: Database error

#### GET /api/properties?seller_id=:sellerId
Get all properties for a seller

**Query Parameters:**
- `seller_id`: Required

**Response:** 200 OK
```typescript
{
  properties: Property[];
  total: number;
}
```

**Error Responses:**
- 400 Bad Request: Missing seller_id
- 500 Internal Server Error: Database error

### Valuations API

#### POST /api/valuations
Create a new valuation

**Request:**
```typescript
{
  property_id: string;
  valuation_type: 'automatic' | 'manual' | 'post_visit';
  valuation_amount_1: number;
  valuation_amount_2: number;
  valuation_amount_3: number;
  calculation_method?: string;
  calculation_parameters?: object;
  valuation_report_url?: string;
  notes?: string;
}
```

**Response:** 201 Created
```typescript
{
  id: string;
  property_id: string;
  valuation_type: string;
  valuation_amount_1: number;
  valuation_amount_2: number;
  valuation_amount_3: number;
  valuation_date: string;
  created_by: string;
  created_at: string;
}
```

**Validation:**
- `property_id`: Required, must exist in properties table
- `valuation_type`: Required, must be one of ['automatic', 'manual', 'post_visit']
- `valuation_amount_1`: Required, must be positive integer
- `valuation_amount_2`: Required, must be >= valuation_amount_1
- `valuation_amount_3`: Required, must be >= valuation_amount_2

**Error Responses:**
- 400 Bad Request: Validation failed
- 404 Not Found: Property not found
- 500 Internal Server Error: Database error

#### GET /api/valuations/:property_id
Get all valuations for a property

**Response:** 200 OK
```typescript
{
  valuations: Valuation[];
  total: number;
}
```

**Error Responses:**
- 404 Not Found: Property not found
- 500 Internal Server Error: Database error

#### POST /api/valuations/calculate
Calculate automatic valuation

**Request:**
```typescript
{
  property_id: string;
}
```

**Response:** 200 OK
```typescript
{
  valuation_amount_1: number;
  valuation_amount_2: number;
  valuation_amount_3: number;
  calculation_method: string;
  calculation_parameters: object;
}
```

**Error Responses:**
- 400 Bad Request: Property type is マンション (manual input required)
- 404 Not Found: Property not found
- 500 Internal Server Error: Calculation failed

#### GET /api/valuations/:id1/compare/:id2
Compare two valuations

**Response:** 200 OK
```typescript
{
  valuation1: Valuation;
  valuation2: Valuation;
  differences: {
    amount1: number;
    amount2: number;
    amount3: number;
  };
  percentageChanges: {
    amount1: number;
    amount2: number;
    amount3: number;
  };
}
```

**Error Responses:**
- 404 Not Found: One or both valuations not found
- 500 Internal Server Error: Database error

## Type Definitions

```typescript
// Property Types
interface Property {
  id: string;
  seller_id: string;
  property_type: '戸建て' | '土地' | 'マンション';
  land_area: number | null;
  building_area: number | null;
  land_area_verified: number | null;
  building_area_verified: number | null;
  construction_year: number | null;
  structure: '木造' | '軽量鉄骨' | '鉄骨' | '他' | null;
  property_address: string;
  property_address_ieul_apartment: string | null;
  current_status: '居住中' | '空き家' | '賃貸中' | '古屋あり' | '更地' | null;
  fixed_asset_tax_road_price: number | null;
  floor_plan: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
  version: number;
}

interface CreatePropertyRequest {
  seller_id: string;
  property_type: '戸建て' | '土地' | 'マンション';
  land_area?: number;
  building_area?: number;
  land_area_verified?: number;
  building_area_verified?: number;
  construction_year?: number;
  structure?: '木造' | '軽量鉄骨' | '鉄骨' | '他';
  property_address: string;
  property_address_ieul_apartment?: string;
  current_status?: '居住中' | '空き家' | '賃貸中' | '古屋あり' | '更地';
  fixed_asset_tax_road_price?: number;
  floor_plan?: string;
}

interface UpdatePropertyRequest extends Partial<CreatePropertyRequest> {
  version: number; // For optimistic locking
}

// Valuation Types
interface Valuation {
  id: string;
  property_id: string;
  valuation_type: 'automatic' | 'manual' | 'post_visit';
  valuation_amount_1: number;
  valuation_amount_2: number;
  valuation_amount_3: number;
  calculation_method: string | null;
  calculation_parameters: object | null;
  valuation_report_url: string | null;
  valuation_date: string;
  created_by: string | null;
  notes: string | null;
  created_at: string;
}

interface CreateValuationRequest {
  property_id: string;
  valuation_type: 'automatic' | 'manual' | 'post_visit';
  valuation_amount_1: number;
  valuation_amount_2: number;
  valuation_amount_3: number;
  calculation_method?: string;
  calculation_parameters?: object;
  valuation_report_url?: string;
  notes?: string;
}

interface ValuationResult {
  amount1: number;
  amount2: number;
  amount3: number;
  method: string;
  parameters: object;
}

interface ValuationComparison {
  valuation1: Valuation;
  valuation2: Valuation;
  differences: {
    amount1: number;
    amount2: number;
    amount3: number;
  };
  percentageChanges: {
    amount1: number;
    amount2: number;
    amount3: number;
  };
}
```

## Error Handling

### Property Errors

```typescript
class PropertyNotFoundError extends Error {
  constructor(propertyId: string) {
    super(`Property not found: ${propertyId}`);
    this.name = 'PropertyNotFoundError';
  }
}

class InvalidPropertyTypeError extends Error {
  constructor(propertyType: string) {
    super(`Invalid property type: ${propertyType}`);
    this.name = 'InvalidPropertyTypeError';
  }
}

class InvalidAreaValueError extends Error {
  constructor(field: string, value: number) {
    super(`Invalid area value for ${field}: ${value}`);
    this.name = 'InvalidAreaValueError';
  }
}

class InvalidConstructionYearError extends Error {
  constructor(year: number) {
    super(`Invalid construction year: ${year}`);
    this.name = 'InvalidConstructionYearError';
  }
}
```

### Valuation Errors

```typescript
class ValuationNotFoundError extends Error {
  constructor(valuationId: string) {
    super(`Valuation not found: ${valuationId}`);
    this.name = 'ValuationNotFoundError';
  }
}

class InvalidValuationOrderError extends Error {
  constructor(amounts: [number, number, number]) {
    super(`Valuation amounts are not in ascending order: ${amounts.join(', ')}`);
    this.name = 'InvalidValuationOrderError';
  }
}

class InvalidValuationTypeError extends Error {
  constructor(type: string) {
    super(`Invalid valuation type: ${type}`);
    this.name = 'InvalidValuationTypeError';
  }
}

class ValuationCalculationError extends Error {
  constructor(message: string, public originalError?: Error) {
    super(`Valuation calculation failed: ${message}`);
    this.name = 'ValuationCalculationError';
  }
}

class AbnormalValuationError extends Error {
  constructor(amounts: [number, number, number]) {
    super(`Abnormal valuation detected: ${amounts.join(', ')}`);
    this.name = 'AbnormalValuationError';
  }
}
```

## Validation Rules

### Property Validation

```typescript
function validateProperty(data: CreatePropertyRequest): ValidationResult {
  const errors: ValidationError[] = [];
  
  // Property type validation
  if (!['戸建て', '土地', 'マンション'].includes(data.property_type)) {
    errors.push({
      field: 'property_type',
      message: 'Property type must be one of: 戸建て, 土地, マンション'
    });
  }
  
  // Area validation
  if (data.land_area !== undefined && data.land_area <= 0) {
    errors.push({
      field: 'land_area',
      message: 'Land area must be positive'
    });
  }
  
  if (data.building_area !== undefined && data.building_area <= 0) {
    errors.push({
      field: 'building_area',
      message: 'Building area must be positive'
    });
  }
  
  // Construction year validation
  if (data.construction_year !== undefined) {
    const currentYear = new Date().getFullYear();
    if (data.construction_year < 1900 || data.construction_year > currentYear + 1) {
      errors.push({
        field: 'construction_year',
        message: `Construction year must be between 1900 and ${currentYear + 1}`
      });
    }
  }
  
  // Structure validation
  if (data.structure && !['木造', '軽量鉄骨', '鉄骨', '他'].includes(data.structure)) {
    errors.push({
      field: 'structure',
      message: 'Structure must be one of: 木造, 軽量鉄骨, 鉄骨, 他'
    });
  }
  
  // Address validation
  if (!data.property_address || data.property_address.trim() === '') {
    errors.push({
      field: 'property_address',
      message: 'Property address is required'
    });
  }
  
  // Current status validation
  if (data.current_status && !['居住中', '空き家', '賃貸中', '古屋あり', '更地'].includes(data.current_status)) {
    errors.push({
      field: 'current_status',
      message: 'Current status must be one of: 居住中, 空き家, 賃貸中, 古屋あり, 更地'
    });
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}
```

### Valuation Validation

```typescript
function validateValuation(data: CreateValuationRequest): ValidationResult {
  const errors: ValidationError[] = [];
  
  // Valuation type validation
  if (!['automatic', 'manual', 'post_visit'].includes(data.valuation_type)) {
    errors.push({
      field: 'valuation_type',
      message: 'Valuation type must be one of: automatic, manual, post_visit'
    });
  }
  
  // Amount validation
  if (data.valuation_amount_1 <= 0) {
    errors.push({
      field: 'valuation_amount_1',
      message: 'Valuation amount 1 must be positive'
    });
  }
  
  if (data.valuation_amount_2 <= 0) {
    errors.push({
      field: 'valuation_amount_2',
      message: 'Valuation amount 2 must be positive'
    });
  }
  
  if (data.valuation_amount_3 <= 0) {
    errors.push({
      field: 'valuation_amount_3',
      message: 'Valuation amount 3 must be positive'
    });
  }
  
  // Order validation
  if (data.valuation_amount_1 > data.valuation_amount_2) {
    errors.push({
      field: 'valuation_amount_2',
      message: 'Valuation amount 2 must be greater than or equal to amount 1'
    });
  }
  
  if (data.valuation_amount_2 > data.valuation_amount_3) {
    errors.push({
      field: 'valuation_amount_3',
      message: 'Valuation amount 3 must be greater than or equal to amount 2'
    });
  }
  
  // Abnormal value check
  if (data.valuation_amount_1 < 1000000 || data.valuation_amount_3 > 1000000000) {
    errors.push({
      field: 'valuation_amounts',
      message: 'Valuation amounts appear to be abnormal (too low or too high)',
      severity: 'warning'
    });
  }
  
  return {
    isValid: errors.filter(e => e.severity !== 'warning').length === 0,
    errors
  };
}
```

## Testing Strategy

### Unit Tests

**PropertyService Tests:**
```typescript
describe('PropertyService', () => {
  describe('createProperty', () => {
    it('should create a property with valid data', async () => {
      const data = {
        seller_id: 'seller-123',
        property_type: '戸建て',
        land_area: 150.5,
        building_area: 100.25,
        construction_year: 1995,
        structure: '木造',
        property_address: '大分県別府市...',
        current_status: '居住中'
      };
      
      const property = await propertyService.createProperty(data, 'employee-123');
      
      expect(property.id).toBeDefined();
      expect(property.seller_id).toBe(data.seller_id);
      expect(property.property_type).toBe(data.property_type);
    });
    
    it('should trigger automatic valuation for 戸建て', async () => {
      const data = {
        seller_id: 'seller-123',
        property_type: '戸建て',
        land_area: 150.5,
        building_area: 100.25,
        property_address: '大分県別府市...'
      };
      
      const property = await propertyService.createProperty(data, 'employee-123');
      const valuation = await valuationService.getLatestValuation(property.id);
      
      expect(valuation).toBeDefined();
      expect(valuation.valuation_type).toBe('automatic');
    });
    
    it('should not trigger automatic valuation for マンション', async () => {
      const data = {
        seller_id: 'seller-123',
        property_type: 'マンション',
        property_address: '大分県別府市...'
      };
      
      const property = await propertyService.createProperty(data, 'employee-123');
      const valuation = await valuationService.getLatestValuation(property.id);
      
      expect(valuation).toBeNull();
    });
    
    it('should throw error if seller does not exist', async () => {
      const data = {
        seller_id: 'non-existent',
        property_type: '戸建て',
        property_address: '大分県別府市...'
      };
      
      await expect(propertyService.createProperty(data, 'employee-123'))
        .rejects.toThrow(NotFoundError);
    });
  });
});
```

**ValuationEngine Tests:**
```typescript
describe('ValuationEngine', () => {
  describe('calculateValuation', () => {
    it('should calculate valuation for 戸建て', async () => {
      const property = {
        property_type: '戸建て',
        land_area: 150,
        building_area: 100,
        construction_year: 2000,
        structure: '木造'
      };
      
      const result = await valuationEngine.calculateValuation(property);
      
      expect(result.amount1).toBeLessThan(result.amount2);
      expect(result.amount2).toBeLessThan(result.amount3);
      expect(result.method).toBe('land_building_method');
    });
    
    it('should calculate valuation for 土地', async () => {
      const property = {
        property_type: '土地',
        land_area: 150
      };
      
      const result = await valuationEngine.calculateValuation(property);
      
      expect(result.amount1).toBeLessThan(result.amount2);
      expect(result.amount2).toBeLessThan(result.amount3);
      expect(result.method).toBe('land_method');
    });
    
    it('should use fixed asset tax road price if available', async () => {
      const property = {
        property_type: '土地',
        land_area: 150,
        fixed_asset_tax_road_price: 200000
      };
      
      const result = await valuationEngine.calculateValuation(property);
      
      expect(result.parameters.landValue).toBe(200000 * 150);
    });
  });
  
  describe('validateValuationOrder', () => {
    it('should return true for ascending order', () => {
      expect(valuationEngine.validateValuationOrder([10, 20, 30])).toBe(true);
    });
    
    it('should return false for non-ascending order', () => {
      expect(valuationEngine.validateValuationOrder([30, 20, 10])).toBe(false);
    });
  });
});
```

### Integration Tests

```typescript
describe('Properties API', () => {
  describe('POST /api/properties', () => {
    it('should create a property and return 201', async () => {
      const response = await request(app)
        .post('/api/properties')
        .set('Authorization', `Bearer ${token}`)
        .send({
          seller_id: sellerId,
          property_type: '戸建て',
          land_area: 150.5,
          building_area: 100.25,
          property_address: '大分県別府市...'
        });
      
      expect(response.status).toBe(201);
      expect(response.body.id).toBeDefined();
    });
    
    it('should return 400 for invalid property type', async () => {
      const response = await request(app)
        .post('/api/properties')
        .set('Authorization', `Bearer ${token}`)
        .send({
          seller_id: sellerId,
          property_type: 'invalid',
          property_address: '大分県別府市...'
        });
      
      expect(response.status).toBe(400);
    });
  });
});
```

### Property-Based Tests

```typescript
describe('Property-based tests', () => {
  it('P11: Property type determines valuation method', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          property_type: fc.constantFrom('戸建て', '土地', 'マンション'),
          land_area: fc.float({ min: 50, max: 500 }),
          building_area: fc.float({ min: 50, max: 300 }),
          construction_year: fc.integer({ min: 1980, max: 2025 })
        }),
        async (property) => {
          if (property.property_type === 'マンション') {
            // Manual valuation required
            return true;
          } else {
            const result = await valuationEngine.calculateValuation(property);
            return result.amount1 <= result.amount2 && result.amount2 <= result.amount3;
          }
        }
      )
    );
  });
  
  it('P12: Automatic valuation produces consistent results', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          property_type: fc.constantFrom('戸建て', '土地'),
          land_area: fc.float({ min: 50, max: 500 }),
          building_area: fc.float({ min: 50, max: 300 }),
          construction_year: fc.integer({ min: 1980, max: 2025 })
        }),
        async (property) => {
          const result1 = await valuationEngine.calculateValuation(property);
          const result2 = await valuationEngine.calculateValuation(property);
          
          return result1.amount1 === result2.amount1 &&
                 result1.amount2 === result2.amount2 &&
                 result1.amount3 === result2.amount3;
        }
      )
    );
  });
});
```

## Performance Requirements

- Property creation: < 200ms
- Property retrieval: < 100ms
- Property list (per seller): < 200ms
- Valuation calculation: < 500ms
- Valuation history retrieval: < 200ms

## Security Considerations

- Property addresses are NOT encrypted (needed for search)
- Valuation amounts are NOT encrypted (needed for calculations)
- All property modifications are logged with user information
- Optimistic locking prevents concurrent update conflicts
- Only authenticated users can create/update properties
- Users can only access properties linked to sellers they have access to

## Migration Strategy

1. Create properties table
2. Create valuations table
3. Create indexes
4. Migrate existing property data from sellers table (if any)
5. Verify data integrity
6. Update SellerService to use PropertyService

## Rollback Strategy

1. Drop valuations table
2. Drop properties table
3. Restore previous state

## Next Steps

After Phase 2 completion:
1. Deploy to staging environment
2. Perform user acceptance testing
3. Gather feedback on valuation accuracy
4. Plan Phase 3 (Activity Logs & Follow-ups)
