# Phase 1 Deployment Checklist

## Pre-Deployment

### 1. Code Review
- [ ] All Phase 1 code changes reviewed
- [ ] TypeScript types updated and validated
- [ ] No console.log or debug code in production
- [ ] Error handling implemented for all new endpoints
- [ ] Input validation added for all new fields

### 2. Testing
- [ ] All unit tests passing
- [ ] Integration tests passing
- [ ] Manual testing completed
- [ ] Duplicate detection tested with real data
- [ ] Seller number generation tested
- [ ] Filter functionality tested
- [ ] Mobile responsiveness verified

### 3. Database Preparation
- [ ] Backup current database
- [ ] Migration 007 (schema) ready
- [ ] Migration 008 (data) ready
- [ ] Rollback scripts prepared
- [ ] Test migrations on staging environment

### 4. Documentation
- [ ] API documentation updated
- [ ] User guide created
- [ ] Deployment checklist prepared
- [ ] README updated with Phase 1 features

## Deployment Steps

### Step 1: Database Migration (Supabase)

**Estimated Time**: 5-10 minutes

1. **Backup Database**
   ```bash
   # Create backup via Supabase Dashboard
   # Settings → Database → Backups → Create Backup
   ```

2. **Run Migration 007 (Schema Changes)**
   - Go to Supabase Dashboard → SQL Editor
   - Copy contents of `backend/migrations/007_phase1_seller_enhancements.sql`
   - Execute the SQL
   - Verify no errors

3. **Verify Schema Changes**
   ```sql
   -- Check new tables exist
   SELECT table_name 
   FROM information_schema.tables 
   WHERE table_schema = 'public' 
   AND table_name IN ('seller_number_sequence', 'seller_history');
   
   -- Check new columns in sellers table
   SELECT column_name, data_type 
   FROM information_schema.columns 
   WHERE table_name = 'sellers' 
   AND column_name IN (
       'seller_number', 'inquiry_source', 'inquiry_year', 
       'inquiry_date', 'is_unreachable', 'confidence_level'
   );
   ```

4. **Run Migration 008 (Data Migration)**
   - Option A: Via Supabase Dashboard SQL Editor
     - Copy contents of `backend/migrations/008_phase1_data_migration.sql`
     - Execute the SQL
   
   - Option B: Via Migration Script
     ```bash
     cd backend
     npm run migrate
     ```

5. **Verify Data Migration**
   ```sql
   -- Check all sellers have seller numbers
   SELECT COUNT(*) as total_sellers,
          COUNT(seller_number) as with_numbers
   FROM sellers;
   
   -- Should be equal
   
   -- Check sequence
   SELECT * FROM seller_number_sequence;
   ```

### Step 2: Backend Deployment

**Estimated Time**: 10-15 minutes

1. **Build Backend**
   ```bash
   cd backend
   npm run build
   ```

2. **Run Tests**
   ```bash
   npm test
   ```

3. **Deploy to Production**
   ```bash
   # If using a deployment service (e.g., Heroku, Railway)
   git push production main
   
   # Or manual deployment
   npm start
   ```

4. **Verify Backend**
   - Check server logs for errors
   - Test health endpoint
   - Verify environment variables are set

### Step 3: Frontend Deployment

**Estimated Time**: 10-15 minutes

1. **Build Frontend**
   ```bash
   cd frontend
   npm run build
   ```

2. **Deploy to Production**
   ```bash
   # If using Vercel/Netlify
   vercel deploy --prod
   
   # Or manual deployment
   # Upload dist/ folder to hosting service
   ```

3. **Verify Frontend**
   - Access production URL
   - Check console for errors
   - Verify all pages load correctly

### Step 4: Smoke Testing

**Estimated Time**: 15-20 minutes

1. **Test Seller Number Generation**
   - [ ] Create a new seller
   - [ ] Verify seller number is auto-generated (AA format)
   - [ ] Check seller number appears in list

2. **Test Phase 1 Fields**
   - [ ] Create seller with inquiry source
   - [ ] Create seller with inquiry date
   - [ ] Create seller with confidence level
   - [ ] Create seller with first caller initials
   - [ ] Verify all fields display correctly

3. **Test Filtering**
   - [ ] Filter by inquiry source
   - [ ] Filter by confidence level
   - [ ] Filter by unreachable status
   - [ ] Clear filters

4. **Test Duplicate Detection**
   - [ ] Create seller with existing phone number
   - [ ] Verify duplicate warning appears
   - [ ] Proceed with creation
   - [ ] Check duplicate history

5. **Test Unreachable Status**
   - [ ] Mark seller as unreachable
   - [ ] Verify unreachable badge appears
   - [ ] Clear unreachable status
   - [ ] Verify badge disappears

## Post-Deployment

### 1. Monitoring (First 24 Hours)

- [ ] Monitor server logs for errors
- [ ] Check database performance
- [ ] Monitor API response times
- [ ] Watch for user-reported issues

### 2. User Communication

- [ ] Notify users of new features
- [ ] Share user guide
- [ ] Provide training if needed
- [ ] Set up support channel for questions

### 3. Metrics Collection

- [ ] Track seller number generation
- [ ] Monitor duplicate detection usage
- [ ] Track filter usage
- [ ] Collect user feedback

## Rollback Procedure

If critical issues are discovered:

### Step 1: Rollback Frontend

```bash
# Revert to previous deployment
vercel rollback

# Or redeploy previous version
git revert HEAD
git push production main
```

### Step 2: Rollback Backend

```bash
# Revert to previous deployment
git revert HEAD
git push production main
```

### Step 3: Rollback Database (If Necessary)

**⚠️ WARNING: This will lose any data created after deployment**

1. **Rollback Data Migration**
   - No specific rollback needed (seller numbers remain)
   - New sellers created will keep their numbers

2. **Rollback Schema Migration**
   ```sql
   -- Execute rollback script
   -- File: backend/migrations/007_phase1_seller_enhancements_rollback.sql
   ```

3. **Restore from Backup (Last Resort)**
   - Go to Supabase Dashboard → Settings → Database → Backups
   - Select pre-deployment backup
   - Click "Restore"

## Verification Checklist

After deployment, verify:

- [ ] All existing sellers have seller numbers
- [ ] New sellers get auto-generated seller numbers
- [ ] Seller numbers are sequential (no gaps)
- [ ] Phase 1 fields display in seller list
- [ ] Phase 1 fields display in seller detail
- [ ] New seller form includes Phase 1 fields
- [ ] Filters work correctly
- [ ] Duplicate detection works
- [ ] Unreachable status management works
- [ ] No console errors in browser
- [ ] No server errors in logs
- [ ] Mobile view works correctly
- [ ] All existing functionality still works

## Troubleshooting

### Issue: Seller numbers not generating

**Symptoms**: New sellers don't have seller numbers

**Solution**:
1. Check if `seller_number_sequence` table exists
2. Check if trigger `trigger_auto_generate_seller_number` exists
3. Verify `generate_seller_number()` function exists
4. Check server logs for errors

### Issue: Duplicate detection not working

**Symptoms**: No duplicate warnings appear

**Solution**:
1. Check if `seller_history` table exists
2. Verify DuplicateDetectionService is imported correctly
3. Check server logs for errors
4. Verify phone numbers are encrypted correctly

### Issue: Filters not working

**Symptoms**: Filtering doesn't change results

**Solution**:
1. Check browser console for errors
2. Verify API endpoint accepts filter parameters
3. Check network tab for correct query parameters
4. Clear browser cache and reload

### Issue: Migration fails

**Symptoms**: SQL errors during migration

**Solution**:
1. Check if migration 007 was run before 008
2. Verify all required tables exist
3. Check for syntax errors in SQL
4. Review Supabase logs for detailed error messages
5. Restore from backup if necessary

## Support Contacts

- **Technical Issues**: [System Administrator]
- **Database Issues**: [Database Administrator]
- **User Questions**: [Support Team]

## Notes

- Keep this checklist updated for future deployments
- Document any issues encountered during deployment
- Update rollback procedures based on lessons learned
- Maintain communication with users throughout deployment
