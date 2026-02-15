# Testing the Password Reset Error Handling

## Manual Testing Guide

### Test 1: Same Password Error

**Objective:** Verify that using the same password shows the correct error message.

**Steps:**

1. Request a password reset email
2. Click the reset link in your email
3. Enter your **current password** in both fields
4. Click "Set new password"

**Expected Result:**

- ✅ Loading indicator appears ("Updating password...")
- ✅ Error message displays: "New password must be different from your old password."
- ✅ Form remains editable
- ✅ You can modify the password and try again

### Test 2: Password Mismatch

**Objective:** Verify client-side validation for password mismatch.

**Steps:**

1. Open password reset page with valid token
2. Enter "newpassword123" in the first field
3. Enter "differentpass456" in the confirm field
4. Click "Set new password"

**Expected Result:**

- ✅ Error displays immediately: "Passwords don't match."
- ✅ No API call is made (check Network tab)
- ✅ Form remains editable

### Test 3: Password Too Short

**Objective:** Verify minimum length validation.

**Steps:**

1. Open password reset page with valid token
2. Enter "short" in both password fields (less than 8 characters)
3. Click "Set new password"

**Expected Result:**

- ✅ Error displays: "Password must be at least 8 characters long."
- ✅ No API call is made
- ✅ Form remains editable

### Test 4: Password Too Long

**Objective:** Verify maximum length validation.

**Steps:**

1. Open password reset page with valid token
2. Enter a password longer than 30 characters in both fields
3. Click "Set new password"

**Expected Result:**

- ✅ Error displays: "Password must not exceed 30 characters."
- ✅ No API call is made
- ✅ Form remains editable

### Test 5: Expired/Invalid Token

**Objective:** Verify handling of expired reset links.

**Steps:**

1. Use an old password reset link (>24 hours old) OR
2. Use a reset link that's already been used
3. Attempt to submit new password

**Expected Result:**

- ✅ Error displays: "Your password reset session has expired..."
- ✅ Clear message that user needs to request a new link
- ✅ Form remains editable for retry attempts

### Test 6: Network Error Simulation

**Objective:** Verify network error handling.

**Steps:**

1. Open browser DevTools
2. Go to Network tab
3. Enable "Offline" mode
4. Attempt to submit password reset
5. Re-enable network
6. Try again

**Expected Result:**

- ✅ First attempt shows network error message
- ✅ Loading state properly clears
- ✅ Second attempt (with network) works correctly

### Test 7: Successful Password Reset

**Objective:** Verify the happy path works correctly.

**Steps:**

1. Request a password reset email
2. Click the reset link
3. Enter a valid new password (different from old, 8-30 chars)
4. Enter the same password in confirm field
5. Click "Set new password"

**Expected Result:**

- ✅ Loading indicator appears
- ✅ Success message displays: "Password reset successful! Redirecting to login..."
- ✅ Form fields are cleared
- ✅ After 2 seconds, redirected to login page
- ✅ Can login with new password

## Browser Console Testing

You can also test error handling directly in the browser console:

### Simulate Supabase Error Response

```javascript
// Open browser console on the password reset page
// This simulates what happens when an error occurs

const testError = {
    code: 422,
    error_code: "same_password",
    msg: "New password should be different from the old password."
};

// The error handler should extract:
// - errorCode: "same_password"
// - message: "New password should be different from the old password."
```

### Check State Management

```javascript
// In browser console, you can inspect the data service state
// (if you have access to Angular DevTools)

// Check if isSubmitting$ properly resets to false after errors
// Check if errorMessage$ contains the user-friendly message
// Check if successMessage$ is properly cleared when showing errors
```

## Automated Testing Scenarios

For writing unit tests, consider these test cases:

### Data Service Tests (`user-reset-password-data.service.spec.ts`)

```typescript
describe('UserResetPasswordDataService Error Handling', () => {
  
  it('should display error when passwords do not match', () => {
    // Test client-side validation
  });
  
  it('should display error when password is too short', () => {
    // Test minimum length validation
  });
  
  it('should display error when password is too long', () => {
    // Test maximum length validation
  });
  
  it('should handle same_password error from API', () => {
    // Mock Supabase error response
    // Verify error message mapping
    // Verify isSubmitting$ is reset
  });
  
  it('should handle network errors gracefully', () => {
    // Mock network error
    // Verify user-friendly message
    // Verify state cleanup
  });
  
  it('should clear form and redirect on success', () => {
    // Mock successful response
    // Verify form is cleared
    // Verify redirect happens after 2 seconds
  });
  
  it('should allow retry after error', () => {
    // Simulate error
    // Verify form is still editable
    // Submit again
    // Verify second submission works
  });
});
```

### Supabase Service Tests (`supabase.service.spec.ts`)

```typescript
describe('SupabaseService.resetPassword$ Error Parsing', () => {
  
  it('should parse error with error_code field', () => {
    const error = {
      code: 422,
      error_code: "same_password",
      msg: "New password should be different from the old password."
    };
    // Verify createPasswordResetError maps to correct message
  });
  
  it('should parse error with code field only', () => {
    // Test fallback error format parsing
  });
  
  it('should provide generic message for unknown errors', () => {
    // Test unknown error handling
  });
});
```

## Monitoring in Production

### What to Log

- Error codes received from Supabase
- Frequency of different error types
- User retry behavior after errors

### What to Alert On

- High rate of same_password errors (might indicate UX issue)
- High rate of invalid_session errors (token expiry too short?)
- Network errors (backend availability issues)

### Success Metrics

- ✅ Error display rate: 100% of API errors shown to users
- ✅ Retry capability: Users can always retry after errors
- ✅ State cleanup: isSubmitting$ always resets correctly
- ✅ User satisfaction: Clear, actionable error messages