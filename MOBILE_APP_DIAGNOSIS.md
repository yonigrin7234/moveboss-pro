# Mobile App Diagnosis - Root Cause Analysis

**Date:** January 2025  
**Status:** Investigating infinite loop and flickering issues

---

## 🔍 ROOT CAUSE IDENTIFIED

### Primary Issue: AuthProvider Context Value Recreation

**Problem:**
The `AuthProvider` creates a new context value object on every render, even when the actual auth state hasn't changed. This causes ALL consumers of `useAuth()` to re-render constantly.

**Current Code (BEFORE FIX):**
```typescript
return (
  <AuthContext.Provider
    value={{
      session,
      user: session?.user ?? null,  // New object every render!
      loading,
      signIn,
      signOut,
    }}
  >
```

**Why This Causes Infinite Loops:**
1. Context value object is recreated every render
2. All `useAuth()` consumers re-render
3. Hooks that depend on `user` re-run
4. State updates trigger re-renders
5. Loop continues

---

## 🔧 FIXES APPLIED

### Fix 1: Memoize AuthProvider Context Value ✅
- Added `useMemo` to context value
- Compare by `sessionUserId` instead of `session` object
- Memoize `user` by `session?.user?.id`
- Memoize `signIn` and `signOut` with `useCallback`

### Fix 2: Fix RootLayoutNav Dependencies ✅
- Changed from `[session, loading, segments]` 
- To `[session?.user?.id, loading, segments]`
- Prevents navigation loops

### Fix 3: Fix TripDetailProvider Refs ✅
- Moved ref updates to `useEffect` instead of render phase
- Prevents stale closure issues

### Fix 4: Fix All Hook Dependencies ✅ (Already Done)
- `useDriverDashboard`: `[user?.id]` ✅
- `useDriverProfile`: `[user?.id]` ✅
- `useVehicleDocuments`: `[user?.id]` ✅
- `useLoadDetail`: `[user?.id, loadId]` ✅

---

## 🐛 REMAINING POTENTIAL ISSUES

### Issue 1: Session Object Still Changes
Even with memoization, if Supabase's `session` object reference changes (which it can), the context value will update. However, we're now comparing by `sessionUserId`, so this should be stable.

### Issue 2: Multiple Hooks Fetching Simultaneously
The home screen calls 3 hooks that all fetch data:
- `useDriverProfile` - fetches driver
- `useDriverDashboard` - fetches trips
- `useVehicleDocuments` - fetches vehicle docs

If these are racing or causing state updates, could cause flickering.

### Issue 3: Navigation Logic
The `RootLayoutNav` useEffect might be triggering navigation loops if segments change frequently.

---

## 🎯 NEXT STEPS TO DEBUG

1. **Add console logs** to see what's re-rendering
2. **Check if queries are failing** - maybe errors are causing re-fetches
3. **Verify environment variables** - maybe Supabase isn't connecting
4. **Check for React DevTools** warnings about excessive re-renders
5. **Test with minimal data** - see if it's a data volume issue

---

## 💡 RECOMMENDED FIXES

### Option 1: Add Debugging
Add console logs to see what's actually happening:
```typescript
useEffect(() => {
  console.log('[useDriverDashboard] Fetching...', { userId: user?.id });
  fetchDashboardData();
}, [fetchDashboardData]);
```

### Option 2: Add Request Deduplication
Prevent multiple simultaneous requests:
```typescript
const isFetchingRef = useRef(false);
if (isFetchingRef.current) return;
isFetchingRef.current = true;
// ... fetch
isFetchingRef.current = false;
```

### Option 3: Check for Query Errors
Maybe queries are failing and retrying constantly:
```typescript
if (driverError) {
  console.error('[useDriverDashboard] Driver error:', driverError);
  // ...
}
```

---

## 🔍 WHAT TO CHECK

1. **Console logs** - What's actually happening?
2. **Network tab** - Are queries being made repeatedly?
3. **React DevTools** - What components are re-rendering?
4. **Error messages** - Are there any errors being swallowed?
5. **Environment variables** - Is Supabase configured correctly?

---

**Status:** Fixes applied, need to verify if they resolve the issue.

