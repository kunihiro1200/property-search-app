# Property Listing Update Sync - Design

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     Auto-Sync Orchestration                      │
│                  (EnhancedAutoSyncService)                       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ├─ Phase 1: Seller Sync
                              ├─ Phase 2: Property Creation
                              ├─ Phase 3: Seller Updates
                              ├─ Phase 4: Property Listing Updates ← NEW
                              └─ Phase 5: Other Syncs
                              
                              ↓ Phase 4
                              
┌─────────────────────────────────────────────────────────────────┐
│              PropertyListingSyncService (Enhanced)               │
├─────────────────────────────────────────────────────────────────┤
│  Existing:                                                       │
│  • syncPropertyListings() - INSERT new properties               │
│  • detectNewPropertyListings() - Find new properties            │
│                                                                  │
│  NEW:                                                            │
│  • syncUpdatedPropertyListings() - UPDATE changed properties    │
│  • detectUpdatedPropertyListings() - Find changed properties    │
│  • updatePropertyListing() - Update single property             │
└─────────────────────────────────────────────────────────────────┘
                              │
                ┌─────────────┴─────────────┐
                │                           │
                ↓                           ↓
┌──────────────────────────┐  ┌──────────────────────────┐
│   GoogleSheetsClient     │  │   Supabase Client        │
│                          │  │                          │
│  • Read spreadsheet      │  │  • Read database         │
│  • Get property data     │  │  • Update properties     │
│  • Handle rate limits    │  │  • Log sync results      │
└──────────────────────────┘  └──────────────────────────┘
                │                           │
                ↓                           ↓
┌──────────────────────────┐  ┌──────────────────────────┐
│  Property Listings       │  │  property_listings       │
│  Spreadsheet             │  │  Table                   │
│                          │  │                          │
│  Sheet: 物件             │  │  • property_number (PK)  │
│  ID: 1tI_iXai...         │  │  • atbb_status           │
│                          │  │  • status                │
│  Columns:                │  │  • storage_location      │
│  • 物件番号              │  │  • updated_at            │
│  • atbb成約済み/非公開   │  │  • ... (all fields)      │
│  • 状況                  │  │                          │
│  • 保存場所              │  │                          │
│  • ... (all fields)      │  │                          │
└──────────────────────────┘  └──────────────────────────┘
```

## Data Flow

### Update Detection Flow

```
1. Read Spreadsheet Data
   ↓
   [GoogleSheetsClient.readAll()]
   ↓
   All property rows from spreadsheet
   
2. Read Database Data
   ↓
   [Supabase.from('property_listings').select('*')]
   ↓
   All property records from database
   
3. Compare Data
   ↓
   For each property:
     For each mapped column:
       Compare spreadsheet value vs database value
       If different → Add to changes list
   ↓
   List of PropertyListingUpdate objects
   
4. Return Changes
   ↓
   [
     {
       property_number: 'AA9313',
       changed_fields: {
         atbb_status: { old: 'Y', new: 'N' },
         status: { old: '成約', new: '公開中' }
       },
       spreadsheet_data: { ... }
     },
     ...
   ]
```

### Update Execution Flow

```
1. Detect Updates
   ↓
   [detectUpdatedPropertyListings()]
   ↓
   List of properties to update
   
2. Batch Processing
   ↓
   Split into batches of 10
   ↓
   For each batch:
   
3. Update Each Property
   ↓
   For each property in batch:
     [updatePropertyListing(property_number, updates)]
     ↓
     Supabase.update(updates).eq('property_number', ...)
     ↓
     Success or Error
   
4. Collect Results
   ↓
   {
     total: 50,
     updated: 48,
     failed: 2,
     errors: [...]
   }
   
5. Log to sync_logs
   ↓
   Insert sync result record
   
6. Return Summary
```

## Component Design

### PropertyListingSyncService (Enhanced)

```typescript
class PropertyListingSyncService {
  // Existing methods
  async syncPropertyListings(): Promise<SyncResult>
  async detectNewPropertyListings(): Promise<PropertyListing[]>
  
  // NEW: Update detection
  async detectUpdatedPropertyListings(): Promise<PropertyListingUpdate[]> {
    // 1. Read all from spreadsheet
    const spreadsheetData = await this.sheetsClient.readAll();
    
    // 2. Read all from database
    const { data: dbData } = await this.supabase
      .from('property_listings')
      .select('*');
    
    // 3. Create lookup map
    const dbMap = new Map(
      dbData.map(p => [p.property_number, p])
    );
    
    // 4. Compare and detect changes
    const updates: PropertyListingUpdate[] = [];
    
    for (const row of spreadsheetData) {
      const propertyNumber = row['物件番号'];
      const dbProperty = dbMap.get(propertyNumber);
      
      if (!dbProperty) continue; // New property, not update
      
      const changes = this.detectChanges(row, dbProperty);
      
      if (Object.keys(changes).length > 0) {
        updates.push({
          property_number: propertyNumber,
          changed_fields: changes,
          spreadsheet_data: row
        });
      }
    }
    
    return updates;
  }
  
  // NEW: Single property update
  async updatePropertyListing(
    propertyNumber: string,
    updates: Partial<PropertyListing>
  ): Promise<UpdateResult> {
    try {
      // 1. Validate property exists
      const { data: existing } = await this.supabase
        .from('property_listings')
        .select('property_number')
        .eq('property_number', propertyNumber)
        .single();
      
      if (!existing) {
        return {
          success: false,
          error: 'Property not found'
        };
      }
      
      // 2. Add updated_at timestamp
      const updateData = {
        ...updates,
        updated_at: new Date().toISOString()
      };
      
      // 3. Execute update
      const { error } = await this.supabase
        .from('property_listings')
        .update(updateData)
        .eq('property_number', propertyNumber);
      
      if (error) {
        return {
          success: false,
          error: error.message
        };
      }
      
      return {
        success: true,
        property_number: propertyNumber,
        fields_updated: Object.keys(updates)
      };
      
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  // NEW: Batch update sync
  async syncUpdatedPropertyListings(): Promise<SyncResult> {
    const startTime = Date.now();
    
    try {
      // 1. Detect updates
      const updates = await this.detectUpdatedPropertyListings();
      
      if (updates.length === 0) {
        return {
          total: 0,
          updated: 0,
          failed: 0,
          duration_ms: Date.now() - startTime
        };
      }
      
      // 2. Process in batches
      const BATCH_SIZE = 10;
      const results: UpdateResult[] = [];
      
      for (let i = 0; i < updates.length; i += BATCH_SIZE) {
        const batch = updates.slice(i, i + BATCH_SIZE);
        
        const batchResults = await Promise.all(
          batch.map(update => {
            const mappedUpdates = this.mapSpreadsheetToDatabase(
              update.spreadsheet_data
            );
            return this.updatePropertyListing(
              update.property_number,
              mappedUpdates
            );
          })
        );
        
        results.push(...batchResults);
      }
      
      // 3. Collect summary
      const summary = {
        total: updates.length,
        updated: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        duration_ms: Date.now() - startTime,
        errors: results
          .filter(r => !r.success)
          .map(r => ({
            property_number: r.property_number,
            error: r.error
          }))
      };
      
      // 4. Log to sync_logs
      await this.logSyncResult('property_listing_update', summary);
      
      return summary;
      
    } catch (error) {
      // Log error and return failure summary
      await this.logSyncError('property_listing_update', error);
      throw error;
    }
  }
  
  // Helper: Detect changes between spreadsheet and database
  private detectChanges(
    spreadsheetRow: any,
    dbProperty: PropertyListing
  ): Record<string, { old: any; new: any }> {
    const changes: Record<string, { old: any; new: any }> = {};
    
    // Get column mappings
    const mappings = this.getColumnMappings();
    
    for (const [spreadsheetCol, dbCol] of Object.entries(mappings)) {
      const spreadsheetValue = this.normalizeValue(
        spreadsheetRow[spreadsheetCol]
      );
      const dbValue = this.normalizeValue(dbProperty[dbCol]);
      
      if (spreadsheetValue !== dbValue) {
        changes[dbCol] = {
          old: dbValue,
          new: spreadsheetValue
        };
      }
    }
    
    return changes;
  }
  
  // Helper: Normalize values for comparison
  private normalizeValue(value: any): any {
    if (value === null || value === undefined) return null;
    if (typeof value === 'string') return value.trim() || null;
    return value;
  }
}
```

### EnhancedAutoSyncService Integration

```typescript
class EnhancedAutoSyncService {
  async runFullSync(): Promise<void> {
    // ... existing phases ...
    
    // Phase 4: Property Listing Updates (NEW)
    try {
      console.log('Phase 4: Syncing property listing updates...');
      
      const propertyListingUpdateResult = 
        await this.propertyListingSyncService.syncUpdatedPropertyListings();
      
      console.log(
        `Updated ${propertyListingUpdateResult.updated} properties, ` +
        `${propertyListingUpdateResult.failed} failed`
      );
      
      if (propertyListingUpdateResult.failed > 0) {
        console.error(
          'Property listing update errors:',
          propertyListingUpdateResult.errors
        );
      }
      
    } catch (error) {
      console.error('Phase 4 failed:', error);
      // Continue to next phase
    }
    
    // ... remaining phases ...
  }
}
```

## Data Models

### PropertyListingUpdate

```typescript
interface PropertyListingUpdate {
  property_number: string;
  changed_fields: Record<string, {
    old: any;
    new: any;
  }>;
  spreadsheet_data: Record<string, any>;
}
```

### UpdateResult

```typescript
interface UpdateResult {
  success: boolean;
  property_number?: string;
  fields_updated?: string[];
  error?: string;
}
```

### SyncResult

```typescript
interface SyncResult {
  total: number;
  updated: number;
  failed: number;
  duration_ms: number;
  errors?: Array<{
    property_number: string;
    error: string;
  }>;
}
```

## Database Schema

### sync_logs Table (Enhanced)

```sql
-- Add new sync_type for property listing updates
-- sync_type: 'property_listing_update'

-- Example log entry:
{
  id: uuid,
  sync_type: 'property_listing_update',
  started_at: '2026-01-07T10:00:00Z',
  completed_at: '2026-01-07T10:01:30Z',
  status: 'success',
  properties_updated: 48,
  properties_failed: 2,
  duration_ms: 90000,
  error_details: {
    errors: [
      {
        property_number: 'AA1234',
        error: 'Database connection timeout'
      },
      {
        property_number: 'AA5678',
        error: 'Invalid data format'
      }
    ]
  }
}
```

## Error Handling

### Error Types

1. **Spreadsheet Read Errors**
   - Rate limit exceeded
   - Authentication failure
   - Sheet not found
   - **Handling:** Retry with exponential backoff

2. **Database Errors**
   - Connection timeout
   - Query failure
   - Constraint violation
   - **Handling:** Log error, continue with next property

3. **Data Validation Errors**
   - Invalid property number
   - Missing required fields
   - Data type mismatch
   - **Handling:** Skip property, log error

4. **Sync Errors**
   - Partial batch failure
   - Complete sync failure
   - **Handling:** Return detailed error summary

### Error Recovery

```typescript
async updatePropertyListing(
  propertyNumber: string,
  updates: Partial<PropertyListing>
): Promise<UpdateResult> {
  try {
    // Attempt update
    const result = await this.executeUpdate(propertyNumber, updates);
    return result;
    
  } catch (error) {
    // Log error
    console.error(
      `Failed to update ${propertyNumber}:`,
      error.message
    );
    
    // Return failure result (don't throw)
    return {
      success: false,
      property_number: propertyNumber,
      error: error.message
    };
  }
}
```

## Performance Considerations

### Batch Processing

- Process updates in batches of 10
- Prevents overwhelming database
- Allows progress tracking
- Enables partial success

### Rate Limiting

- Respect Google Sheets API limits (100 requests/100 seconds)
- Add delays between batches if needed
- Use exponential backoff on errors

### Caching

- Cache spreadsheet data for comparison
- Avoid redundant database queries
- Clear cache after sync completes

### Optimization

- Only update changed fields (not full row)
- Use database indexes on property_number
- Parallel processing within batches
- Skip properties with no changes

## Security Considerations

### Data Validation

- Validate property_number format
- Sanitize input values
- Check data types match schema
- Prevent SQL injection

### Access Control

- Use service account for spreadsheet access
- Use Supabase service key for database
- Log all update operations
- Audit trail in sync_logs

### Error Information

- Don't expose sensitive data in errors
- Sanitize error messages
- Log full details securely
- Return safe error messages to users

## Monitoring & Observability

### Metrics to Track

1. **Sync Performance**
   - Total sync duration
   - Properties updated per minute
   - Batch processing time
   - API call latency

2. **Sync Success Rate**
   - Percentage of successful updates
   - Number of failed properties
   - Error types distribution
   - Retry success rate

3. **Data Quality**
   - Number of changes detected
   - Fields most frequently updated
   - Properties never updated
   - Stale data detection

### Logging Strategy

```typescript
// Start of sync
console.log('Starting property listing update sync...');

// Progress updates
console.log(`Processing batch 1/5 (10 properties)...`);

// Individual updates
console.log(`Updated AA9313: atbb_status Y → N`);

// Errors
console.error(`Failed to update AA1234: ${error.message}`);

// Summary
console.log(
  `Sync complete: ${updated} updated, ${failed} failed, ` +
  `${duration}ms`
);
```

## Testing Strategy

### Unit Tests

```typescript
describe('PropertyListingSyncService', () => {
  describe('detectUpdatedPropertyListings', () => {
    it('detects single field change', async () => {
      // Mock spreadsheet with changed atbb_status
      // Mock database with old atbb_status
      // Expect change detected
    });
    
    it('detects multiple field changes', async () => {
      // Mock multiple changed fields
      // Expect all changes detected
    });
    
    it('handles no changes', async () => {
      // Mock identical data
      // Expect empty array
    });
  });
  
  describe('updatePropertyListing', () => {
    it('updates single property', async () => {
      // Mock successful update
      // Expect success result
    });
    
    it('handles non-existent property', async () => {
      // Mock property not found
      // Expect error result
    });
  });
});
```

### Integration Tests

```typescript
describe('Property Listing Update Sync Integration', () => {
  it('syncs AA9313 update', async () => {
    // Update AA9313 in test spreadsheet
    // Run sync
    // Verify database updated
    // Check sync logs
  });
  
  it('handles batch updates', async () => {
    // Update 10 properties
    // Run sync
    // Verify all updated
  });
});
```

## Deployment Plan

### Phase 1: Development
1. Implement core update logic
2. Add unit tests
3. Test with AA9313

### Phase 2: Staging
1. Deploy to staging environment
2. Run integration tests
3. Test with real data (read-only)

### Phase 3: Production
1. Deploy to production
2. Run manual sync first
3. Enable auto-sync integration
4. Monitor for 24 hours

### Rollback Plan

If issues occur:
1. Disable Phase 4 in EnhancedAutoSyncService
2. Revert to manual fix scripts
3. Investigate and fix issues
4. Re-deploy when ready

## Future Enhancements

### Bidirectional Sync
- Sync database changes back to spreadsheet
- Conflict resolution
- Last-write-wins strategy

### Real-time Sync
- Webhook-based updates
- Immediate sync on spreadsheet change
- Reduce sync latency

### Change History
- Track all changes over time
- Audit trail for compliance
- Rollback capability

### Conflict Resolution UI
- Show conflicts to users
- Allow manual resolution
- Merge strategies
