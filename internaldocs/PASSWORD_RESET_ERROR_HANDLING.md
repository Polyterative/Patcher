# Password Reset Error Handling

## Overview

This document describes the robust error handling implementation for the password reset flow.

## Problem Solved

Previously, when users attempted to reset their password, errors from Supabase (such as using the same password) were
not properly handled. The UI would show a loading state but wouldn't display error messages or allow users to retry.

## Implementation

### 1. Error Message Constants (`SharedConstants.ts`)

Added comprehensive error messages for various scenarios:

- `samePassword`: When user tries to use their old password
- `weakPassword`: When password doesn't meet security requirements
- `passwordTooShort`: When password is less than 8 characters
- `passwordTooLong`: When password exceeds 30 characters
- `invalidSession`: When the reset token has expired
- `networkError`: When there are connection issues
- `unknownError`: Generic fallback for unexpected errors

### 2. Supabase Service Error Parsing (`supabase.service.ts`)

Enhanced the `resetPassword$` method to:

- Properly check for errors in Supabase responses
- Parse error codes from multiple formats (error_code, code, name)
- Extract messages from multiple fields (msg, message, error_description)
- Map error codes to user-friendly messages using `createPasswordResetError()`

#### Error Response Format Support

The implementation handles Supabase errors in this format:

```json
{
  "code": 422,
  "error_code": "same_password",
  "msg": "New password should be different from the old password."
}
```

### 3. Data Service Error Handling (`user-reset-password-data.service.ts`)

Improved the password reset submission handler to:

- Clear previous error/success messages before each submission
- Validate all input fields before making API calls
- Properly catch and display errors from the API
- Reset the `isSubmitting$` state on both success and error
- Log detailed error information for debugging
- Clear form fields on success
- Allow users to retry after errors

### 4. UI State Management

The error handling ensures:

- Loading state is shown while submitting
- Loading state is properly cleared on error or success
- Error messages are displayed prominently with red styling
- Success messages are displayed with green styling
- Form remains interactive after errors for retries
- Button is disabled during submission and validation

## Error Flow

1. User submits new password
2. Client-side validation checks:
    - Required fields
    - Password length (8-30 characters)
    - Password match
3. If validation passes, API call is made
4. If API returns error:
    - Error is parsed and mapped to user-friendly message
    - Loading state is cleared
    - Error message is displayed
    - User can modify and resubmit
5. If API succeeds:
    - Success message is displayed
    - Form is cleared
    - User is redirected to login after 2 seconds

## Supported Error Scenarios

| Error Code            | User Message                                                                         | Cause                                          |
|-----------------------|--------------------------------------------------------------------------------------|------------------------------------------------|
| `same_password`       | "New password must be different from your old password."                             | User entered their current password            |
| `weak_password`       | "Password is too weak. Please use a stronger password with a mix of characters."     | Password doesn't meet Supabase security policy |
| `invalid_credentials` | "Your password reset session has expired. Please request a new password reset link." | Reset token expired                            |
| Network errors        | "Network error occurred. Please check your connection and try again."                | Connection issues                              |
| Unknown               | Error message from API or generic fallback                                           | Any other error                                |

## Testing Scenarios

To test the error handling:

1. **Same Password Error**: Try resetting to your current password
2. **Password Mismatch**: Enter different passwords in the two fields
3. **Too Short**: Enter a password less than 8 characters
4. **Too Long**: Enter a password more than 30 characters
5. **Expired Token**: Use an old password reset link
6. **Network Error**: Disable network while submitting

## Future Improvements

- Add password strength meter
- Add retry mechanism with exponential backoff for network errors
- Add analytics for common error patterns
- Consider adding password history check on client side