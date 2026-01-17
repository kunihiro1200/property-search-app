# Blank Screen After Login - Debug Guide

## Current Issue
After logging in with Google, the screen goes blank instead of showing the sellers page.

## Root Causes

### 1. Backend Migration Issues
The backend server is starting but the auto-sync service is failing due to missing database objects:
- `sellers.deleted_at` column missing
- `sync_logs` table not found
- `sync_health` table not found

**Impact**: While the server starts, some background services fail. This shouldn't cause the blank screen directly, but it indicates incomplete database setup.

### 2. Authentication Flow Issues
The authentication callback might be failing silently. Check these:

#### A. Check Browser Console
Open browser DevTools (F12) and look for:
- ❌ Red errors in Console tab
- 🔵 Blue log messages starting with "🔵"
- ❌ Network errors in Network tab

#### B. Check Network Tab
1. Open DevTools → Network tab
2. Try logging in again
3. Look for these requests:
   - `POST /auth/callback` - Should return 200 with employee data
   - `GET /auth/me` - Should return 200 with employee data
4. If you see 401, 403, or 500 errors, click on them to see the response

#### C. Check Local Storage
1. Open DevTools → Application tab → Local Storage
2. After login, you should see:
   - `session_token` - JWT token
   - `refresh_token` - Refresh token
3. If these are missing, the auth callback failed

## Quick Fixes

### Fix 1: Run Database Migrations (REQUIRED)

**You MUST run these migrations first!**

Go to your Supabase Dashboard → SQL Editor and run the SQL from:
`backend/RUN_MIGRATIONS_NOW.md`

This will:
1. Add soft delete support (Migration 051)
2. Add sync health monitoring (Migration 039)

After running migrations, restart your backend server.

### Fix 2: Clear Browser State

1. Open DevTools (F12)
2. Go to Application tab
3. Click "Clear site data" button
4. Refresh the page
5. Try logging in again

### Fix 3: Check Backend Logs

When you try to log in, watch the backend console for:
```
🔵 /auth/callback called
🔵 Has access_token: true
🔵 Has refresh_token: true
🔵 Verifying token with Supabase...
🔵 Session result: { hasUser: true, ... }
🔵 Creating/getting employee record...
✅ Employee record created/retrieved: { ... }
```

If you see ❌ errors, that's where the problem is.

### Fix 4: Check Supabase Configuration

Verify your Supabase settings:

**Backend (.env)**:
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

**Frontend (.env)**:
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_API_URL=http://localhost:3000
```

**Supabase Dashboard**:
1. Go to Authentication → Providers
2. Enable Google provider
3. Add redirect URL: `http://localhost:5173/auth/callback`

## Debugging Steps

### Step 1: Check if Backend is Running
```bash
curl http://localhost:3000/auth/me
```
Should return 401 (unauthorized) - this means the endpoint exists.

### Step 2: Test Auth Callback Manually
After getting the access token from the URL hash after Google login:
```bash
curl -X POST http://localhost:3000/auth/callback \
  -H "Content-Type: application/json" \
  -d '{"access_token":"YOUR_TOKEN_HERE"}'
```

### Step 3: Enable Verbose Logging

Add this to `frontend/src/pages/AuthCallbackPage.tsx` at the top of `processCallback`:
```typescript
console.log('🔍 Full URL:', window.location.href);
console.log('🔍 Hash:', window.location.hash);
console.log('🔍 Search:', window.location.search);
```

### Step 4: Check for CORS Issues

If you see CORS errors in the console:
1. Make sure backend is running on port 3000
2. Make sure frontend is running on port 5173
3. Check backend CORS configuration in `backend/src/index.ts`

## Common Error Messages

### "有効なセッションが見つかりません"
- The Supabase session is not being created properly
- Check if Google OAuth is configured correctly in Supabase
- Verify redirect URLs match exactly

### "認証処理中にエラーが発生しました"
- Generic error from auth callback
- Check backend logs for the actual error
- Check network tab for failed requests

### Blank screen with no errors
- Auth callback might be stuck in infinite loop
- Check if `isLoading` is stuck at `true` in auth store
- Add console.logs to track the flow

## Next Steps

1. **First**: Run the database migrations from `backend/RUN_MIGRATIONS_NOW.md`
2. **Second**: Clear browser cache and local storage
3. **Third**: Try logging in while watching both browser console and backend logs
4. **Fourth**: If still failing, share the error messages from both consoles

## Testing the Fix

After applying fixes:
1. Clear browser data
2. Restart backend server
3. Refresh frontend
4. Click "Googleでログイン"
5. Select your Google account
6. You should be redirected to `/auth/callback`
7. You should see loading spinner briefly
8. You should be redirected to `/` (sellers page)

If you get stuck at step 6 or 7, that's where the issue is.
