# Design Document

## Overview

This design addresses the issue where employee names are displayed as "不明" (unknown) or encrypted-looking strings after Google OAuth login. The root cause is that the authentication callback handler is not properly extracting the display name from Google's user metadata, and is falling back to using the email address or other metadata fields as the name.

## Architecture

The fix involves three main components:

1. **Authentication Service Enhancement**: Improve the `getOrCreateEmployee` method to properly extract names from Google OAuth metadata
2. **Data Migration Script**: Create a one-time migration to fix existing employee records
3. **Logging Enhancement**: Add comprehensive logging to track name extraction

### Component Interaction

```
Google OAuth → Supabase Auth → Backend Auth Route → AuthService.getOrCreateEmployee → Database
                                                    ↓
                                              Logging System
```

## Components and Interfaces

### 1. AuthService.supabase.ts Enhancement

**Method: `getOrCreateEmployee`**

Current signature:
```typescript
async getOrCreateEmployee(userId: string, email: string, name: string): Promise<Employee>
```

The issue is that the `name` parameter is being passed from the auth route as:
```typescript
user.user_metadata.full_name || user.email!
```

This needs to be enhanced to try multiple metadata fields and extract from email as a last resort.

**New helper method:**
```typescript
private extractNameFromUserMetadata(user: any, email: string): string
```

This method will:
1. Try `user.user_metadata.full_name`
2. Try `user.user_metadata.name`
3. Try combining `user.user_metadata.given_name` and `user.user_metadata.family_name`
4. Extract from email (part before @)
5. Return email as absolute fallback

### 2. Auth Route Enhancement

**File: `backend/src/routes/auth.supabase.ts`**

The `/callback` endpoint needs to:
1. Pass the full user object to a new helper method
2. Log the available metadata fields
3. Use the enhanced name extraction logic

### 3. Data Migration Script

**File: `backend/migrations/028_fix_employee_names.sql`**

This migration will:
1. Identify employees with problematic names (encrypted-looking strings, "不明", etc.)
2. Update their names based on email extraction

**File: `backend/migrations/run-028-migration.ts`**

This script will:
1. Query Supabase Auth for user metadata
2. Update employee records with correct names
3. Log all changes

### 4. Frontend Display Utility

**File: `frontend/src/utils/employeeUtils.ts`**

Add a helper function to ensure names are never displayed as encrypted strings:
```typescript
export function getDisplayName(employee: Employee | null): string
```

## Data Models

### Employee Table (No changes required)

```sql
CREATE TABLE employees (
    id UUID PRIMARY KEY,
    google_id VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,  -- This field will be fixed
    role VARCHAR(50) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE,
    last_login_at TIMESTAMP WITH TIME ZONE
);
```

### Name Extraction Logic

Priority order for name extraction:
1. `user.user_metadata.full_name` (if present and not empty)
2. `user.user_metadata.name` (if present and not empty)
3. `${user.user_metadata.given_name} ${user.user_metadata.family_name}` (if both present)
4. Email prefix (part before @)
5. Email (absolute fallback)

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Name extraction never returns empty string

*For any* Google OAuth user object and email address, the name extraction function should always return a non-empty string.
**Validates: Requirements 1.1, 1.2**

### Property 2: Email-based name extraction produces readable names

*For any* valid email address, extracting the name from the email prefix should produce a string that does not contain encrypted-looking characters (no base64-like patterns).
**Validates: Requirements 1.2, 1.4**

### Property 3: Name update preserves identity

*For any* employee record update, the google_id and email fields should remain unchanged.
**Validates: Requirements 2.4**

### Property 4: Migration is idempotent

*For any* employee record, running the migration multiple times should produce the same final name value.
**Validates: Requirements 2.1, 2.2, 2.3**

## Error Handling

### Authentication Errors

1. **Missing user metadata**: Log warning and fall back to email extraction
2. **Database update failure**: Log error and return existing employee data
3. **Invalid email format**: Use full email as name

### Migration Errors

1. **Supabase Auth API failure**: Log error and skip that employee
2. **Database update failure**: Log error and continue with next employee
3. **Invalid employee data**: Log warning and skip

### Logging Strategy

All errors should be logged with:
- Timestamp
- Employee ID or email
- Error type
- Error message
- Stack trace (for unexpected errors)

## Testing Strategy

### Unit Tests

1. **Name extraction logic**:
   - Test with full_name present
   - Test with only given_name and family_name
   - Test with only email
   - Test with various email formats
   - Test with empty/null metadata

2. **Employee creation/update**:
   - Test new employee creation with valid name
   - Test existing employee update
   - Test name update for employees with invalid names

### Integration Tests

1. **Auth callback flow**:
   - Mock Google OAuth response with various metadata combinations
   - Verify correct name is stored in database
   - Verify logging output

2. **Migration script**:
   - Create test employees with problematic names
   - Run migration
   - Verify names are corrected
   - Verify idempotency

### Manual Testing

1. Log in with a new Google account
2. Verify name is displayed correctly
3. Check database to confirm correct name is stored
4. Check logs for proper metadata extraction

## Implementation Notes

### Name Extraction Heuristics

The email-based name extraction should:
- Take the part before @ symbol
- Replace dots and underscores with spaces
- Capitalize first letter of each word
- Handle common patterns like "firstname.lastname"

Example:
- `john.doe@example.com` → "John Doe"
- `jane_smith@example.com` → "Jane Smith"
- `bob123@example.com` → "Bob123"

### Migration Safety

The migration script should:
- Run in a transaction
- Create a backup of affected records
- Allow rollback if needed
- Report detailed results

### Backward Compatibility

The changes should:
- Not break existing authentication flow
- Handle both old and new employee records
- Maintain existing API contracts
