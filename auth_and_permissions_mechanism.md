# Authentication & Authorization Mechanism

This document provides a technical overview of how the PMS (Project Management System) handles user login and granular permissions.

## 1. Authentication (Login Mechanism)

The system uses a **Session-based JWT (JSON Web Token)** approach with HTTP-only cookies.

- **Login Flow**:
  1. User submits credentials to `POST /api/auth/login`.
  2. The server verifies the password using `bcryptjs`.
  3. If valid, a JWT is generated containing the `User_ID`, `Email`, and `Role_Name`.
  4. The JWT is stored in an **HTTP-only cookie** (named `token`). This prevents client-side scripts from accessing the token, mitigating XSS attacks.
- **Session Retrieval**:
  - The [lib/auth.ts](file:///c:/xampp/htdocs/PMS/lib/auth.ts) file contains a [getSession()](file:///c:/xampp/htdocs/PMS/lib/auth.ts#35-41) utility.
  - It reads the cookie, decrypts/verifies the JWT using a `JWT_SECRET`, and returns the user's basic info.
- **Middleware Protection**:
  - [middleware.ts](file:///c:/xampp/htdocs/PMS/middleware.ts) runs on every request.
  - It checks for the existence of the `token` cookie.
  - If the user is unauthenticated and tries to access a protected page (like `/leads` or `/api/...`), they are redirected to `/login`.

## 2. Authorization (Permission Mechanism)

The system implements a **Role-Based Access Control (RBAC)** model with granular permissions.

### A. Permission Definition ([lib/permissions.ts](file:///c:/xampp/htdocs/PMS/lib/permissions.ts))
Permissions are defined as unique string constants grouped by module:
- `LEADS_VIEW`, `LEADS_CREATE`, `LEADS_EDIT`, `LEADS_DELETE`
- `USERS_VIEW`, `USERS_MANAGE` (Admin only)
- ...etc.

### B. Roles and the Access Matrix
- **Roles** (like Admin, Manager, Employee) are stored in the database.
- Each Role record contains a [Permissions](file:///c:/xampp/htdocs/PMS/hooks/usePermissions.ts#5-36) array which is a list of these string constants.
- The **Access Matrix UI** (in Role Master) allows an Admin to toggle these strings for any role.

### C. Backend Enforcement ([verifyPermission](file:///c:/xampp/htdocs/PMS/lib/auth.ts#50-65))
Every sensitive API route calls [verifyPermission(PERMISSION_CONSTANT)](file:///c:/xampp/htdocs/PMS/lib/auth.ts#50-65):
1. It retrieves the current session.
2. It fetches the user's full Role from the database (including the permissions array).
3. It checks if the required permission string exists in that array.
4. **Admin Bypass**: If the user's role is exactly `'Admin'`, it automatically returns `true`, ensuring admins are never locked out.

### D. Frontend Enforcement ([usePermissions](file:///c:/xampp/htdocs/PMS/hooks/usePermissions.ts#5-36))
The UI uses a custom React hook [usePermissions()](file:///c:/xampp/htdocs/PMS/hooks/usePermissions.ts#5-36):
1. It fetches the user's permissions once and provides a [hasPermission(permission)](file:///c:/xampp/htdocs/PMS/hooks/usePermissions.ts#29-33) function.
2. **Conditional Rendering**: Buttons (like "Delete") or sidebar links are only rendered if [hasPermission(...)](file:///c:/xampp/htdocs/PMS/hooks/usePermissions.ts#29-33) is true.
3. This provides a smooth UX by hiding internal controls from unauthorized users.

## 3. Security Design Principles

- **Defense in Depth**: Permissions are checked on **both** the Frontend (for UX) and the Backend (for actual security). Hiding a button on the UI isn't enough; the API remains locked.
- **Principle of Least Privilege**: Users are only granted the specific permissions they need to perform their jobs.
- **Secure Storage**: Passwords are never stored in plain text (BCRYPT), and tokens are never stored in `localStorage` (HTTP-Only Cookies).
