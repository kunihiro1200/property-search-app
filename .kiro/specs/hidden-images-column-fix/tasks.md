# Hidden Images Column Fix - Tasks

## Status: READY FOR EXECUTION

All preparation work is complete. User needs to execute the migration.

## Task Breakdown

### ✅ Task 1: Root Cause Analysis
**Status**: COMPLETE

**What was done:**
- Investigated why migrations weren't working
- Discovered REST API cannot execute DDL statements
- Confirmed column physically doesn't exist
- Ruled out schema cache issues

**Deliverables:**
- Root cause documented in requirements.md
- Clear explanation of the real problem

---

### ✅ Task 2: Create SQL Migration File
**Status**: COMPLETE

**What was done:**
- Created `077_add_hidden_images_MANUAL_EXECUTION.sql`
- Includes column creation, comments, indexes, permissions
- Includes verification query
- Made idempotent with IF NOT EXISTS

**Deliverables:**
- `backend/migrations/077_add_hidden_images_MANUAL_EXECUTION.sql`

**SQL Contents:**
```sql
ALTER TABLE property_listings 
ADD COLUMN IF NOT EXISTS hidden_images TEXT[] DEFAULT ARRAY[]::TEXT[];

COMMENT ON COLUMN property_listings.hidden_images IS '非表示にした画像のファイルIDリスト';

CREATE INDEX IF NOT EXISTS idx_property_listings_hidden_images 
ON property_listings USING GIN (hidden_images);

GRANT SELECT, UPDATE ON property_listings TO anon;
GRANT SELECT, UPDATE ON property_listings TO authenticated;
GRANT ALL ON property_listings TO service_role;
```

---

### ✅ Task 3: Create Direct PostgreSQL Execution Script
**Status**: COMPLETE

**What was done:**
- Created `execute-077-direct-postgresql.ts`
- Uses DATABASE_URL for direct connection
- Executes DDL statements via PostgreSQL client
- Includes error handling

**Deliverables:**
- `backend/execute-077-direct-postgresql.ts`

**Usage:**
```bash
# 1. Uncomment DATABASE_URL in .env
# 2. Run script
cd backend
npx ts-node execute-077-direct-postgresql.ts
```

---

### ✅ Task 4: Create Japanese Documentation
**Status**: COMPLETE

**What was done:**
- Created `今すぐ実行_真の解決策.md`
- Step-by-step instructions in Japanese
- Clear explanation of the real problem
- Two solution methods documented

**Deliverables:**
- `backend/今すぐ実行_真の解決策.md`

**Contents:**
- Problem explanation
- Method 1: SQL Editor (recommended)
- Method 2: Direct PostgreSQL connection
- Verification steps
- Why previous attempts failed

---

### ✅ Task 5: Create English Documentation
**Status**: COMPLETE

**What was done:**
- Created `HIDDEN_IMAGES_REAL_SOLUTION.md`
- Detailed explanation in English
- Technical details
- Best practices for future

**Deliverables:**
- `backend/HIDDEN_IMAGES_REAL_SOLUTION.md`

**Contents:**
- Root cause analysis
- Solution methods
- SQL to execute
- Verification process
- Future prevention strategies

---

### ⏳ Task 6: Execute Migration (USER ACTION REQUIRED)
**Status**: PENDING USER ACTION

**What needs to be done:**

#### Option A: SQL Editor (Recommended)

1. **Access Supabase Dashboard**
   - Go to https://app.supabase.com
   - Select project `fzcuexscuwhoywcicdqq`

2. **Open SQL Editor**
   - Click "SQL Editor" in left sidebar
   - Click "New query"

3. **Execute SQL**
   - Copy contents from `backend/migrations/077_add_hidden_images_MANUAL_EXECUTION.sql`
   - Paste into SQL Editor
   - Click "Run" button

4. **Verify Success**
   - Check query results
   - Should see confirmation messages

#### Option B: Direct PostgreSQL Connection

1. **Enable DATABASE_URL**
   ```bash
   # Edit backend/.env
   # Uncomment this line:
   DATABASE_URL=postgresql://postgres:Y4MxYv8nnv0adDgT@db.fzcuexscuwhoywcicdqq.supabase.co:5432/postgres
   ```

2. **Run Script**
   ```bash
   cd backend
   npx ts-node execute-077-direct-postgresql.ts
   ```

3. **Check Output**
   - Should see success messages
   - No errors

**Acceptance Criteria:**
- [ ] SQL executed without errors
- [ ] Confirmation messages displayed
- [ ] No rollback needed

---

### ⏳ Task 7: Verify Column Exists (USER ACTION REQUIRED)
**Status**: PENDING USER ACTION

**What needs to be done:**

1. **Run Verification Script**
   ```bash
   cd backend
   npx ts-node check-hidden-images-column-exists.ts
   ```

2. **Expected Output**
   ```
   ✅ hidden_imagesカラムが存在します
   ```

3. **If Verification Fails**
   - Check if migration was executed
   - Check for error messages
   - Try running migration again
   - Contact support if still failing

**Acceptance Criteria:**
- [ ] Verification script runs successfully
- [ ] Success message displayed
- [ ] Column confirmed to exist

---

### ⏳ Task 8: Test Application (USER ACTION REQUIRED)
**Status**: PENDING USER ACTION

**What needs to be done:**

1. **Test Public Property Site**
   - Access public property listing
   - Check if images display correctly
   - Try hiding/unhiding images
   - Verify functionality works

2. **Test API Endpoints**
   - Test GET /api/public-properties
   - Test PATCH /api/property-listings/:id
   - Verify hidden_images field is accessible

3. **Check for Errors**
   - Monitor browser console
   - Check backend logs
   - Verify no database errors

**Acceptance Criteria:**
- [ ] Application loads without errors
- [ ] Image functionality works
- [ ] No console errors
- [ ] No backend errors

---

## Summary

### Completed Tasks (5/8)
- ✅ Root cause analysis
- ✅ SQL migration file created
- ✅ Direct PostgreSQL script created
- ✅ Japanese documentation created
- ✅ English documentation created

### Pending Tasks (3/8)
- ⏳ Execute migration (USER ACTION)
- ⏳ Verify column exists (USER ACTION)
- ⏳ Test application (USER ACTION)

## Next Steps for User

1. **Choose execution method:**
   - SQL Editor (recommended) - easier, no configuration
   - Direct PostgreSQL - automatable, requires .env change

2. **Execute migration:**
   - Follow steps in `backend/今すぐ実行_真の解決策.md` (Japanese)
   - Or follow steps in `backend/HIDDEN_IMAGES_REAL_SOLUTION.md` (English)

3. **Verify success:**
   - Run `npx ts-node check-hidden-images-column-exists.ts`
   - Should see ✅ success message

4. **Test application:**
   - Access public property site
   - Verify image functionality works

## Troubleshooting

### If Migration Fails

**Error: Permission denied**
- Check Supabase project access
- Verify you're logged in
- Try refreshing dashboard

**Error: Column already exists**
- This is OK! Migration is idempotent
- Run verification script to confirm

**Error: Connection failed**
- Check Supabase project status
- Verify network connectivity
- Try again in a few minutes

### If Verification Fails

**Column not found**
- Migration may not have executed
- Try running migration again
- Check SQL Editor history

**Connection error**
- Check .env file configuration
- Verify Supabase credentials
- Check network connectivity

### If Application Errors

**Cannot read property 'hidden_images'**
- Column may not exist yet
- Run verification script
- Execute migration if needed

**Permission denied**
- Check RLS policies
- Verify permissions were granted
- Re-run permission grants

## Files Reference

### Documentation
- `backend/今すぐ実行_真の解決策.md` - Japanese guide
- `backend/HIDDEN_IMAGES_REAL_SOLUTION.md` - English guide
- `.kiro/specs/hidden-images-column-fix/requirements.md` - Requirements
- `.kiro/specs/hidden-images-column-fix/design.md` - Design

### SQL Files
- `backend/migrations/077_add_hidden_images_MANUAL_EXECUTION.sql` - SQL to execute

### Scripts
- `backend/execute-077-direct-postgresql.ts` - Direct execution script
- `backend/check-hidden-images-column-exists.ts` - Verification script

### Configuration
- `backend/.env` - Environment variables (DATABASE_URL commented out)

## Success Criteria

- [x] Root cause identified
- [x] Solution documented
- [x] SQL file created
- [x] Scripts created
- [ ] Migration executed
- [ ] Column verified
- [ ] Application tested
- [ ] User confirmed working

## Estimated Time

- **Preparation**: COMPLETE (already done)
- **Execution**: 5-10 minutes (user action)
- **Verification**: 2-3 minutes (user action)
- **Testing**: 5-10 minutes (user action)

**Total user time**: 15-25 minutes
