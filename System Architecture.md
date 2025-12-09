# EZBus System Architecture

This document provides a high-level overview of the technical architecture for the EZBus platform, a comprehensive bus ticket booking system.

## 1. Core Technology Stack

- **Framework**: [Next.js 14+](https://nextjs.org/) (App Router)
- **Language**: TypeScript
- **Database**: PostgreSQL
- **ORM**: [Prisma](https://www.prisma.io/)
- **UI Components**: [shadcn/ui](https://ui.shadcn.com/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Authentication**: Custom JWT-based solution with server-side sessions
- **Deployment**: Configured for Firebase App Hosting

## 2. Application Structure

The application is a monolith built with Next.js, leveraging its features for both frontend rendering and backend API logic.

### 2.1. Frontend (Client-Side)

- **Rendering Strategy**: Primarily uses Server Components for fast initial page loads and SEO, with Client Components ("use client") for interactive UI elements.
- **State Management**: A combination of React's built-in hooks (`useState`, `useMemo`) and React Context for providing a global CSRF token (`useCsrf` hook).
- **Data Fetching**:
  - **Server-Side**: Prisma is called directly within Server Components (e.g., in `page.tsx` files) to fetch initial data.
  - **Client-Side**: The `fetch` API is used in Client Components to call internal API routes (e.g., `/api/my-tickets`) for dynamic data loading.
- **Mutations & Form Handling**:
  - **Server Actions**: Secure form submissions and data mutations are handled primarily through Server Actions (e.g., `createBusAction`, `updateRouteAction`). This simplifies the architecture by co-locating backend logic with the frontend code that uses it, without needing to create separate API endpoints for every action.
  - **CSRF Protection**: All Server Actions are protected against Cross-Site Request Forgery. A CSRF token is fetched by the client and included in every state-changing request.

### 2.2. Backend (Server-Side)

The backend logic resides within the Next.js application in two primary forms:

1.  **API Routes** (`/src/app/api/**`):
    - Used for client-side data fetching where Server Actions are not suitable (e.g., fetching initial props for the homepage, polling for payment status).
    - Also handles external callbacks, such as the webhook for the payment gateway.

2.  **Server Actions** (`/src/app/**/actions.ts`):
    - The primary mechanism for handling data mutations (Create, Update, Delete).
    - Each action performs its own validation, authentication/authorization checks, and database operations using Prisma.
    - Uses `revalidatePath` to update the Next.js cache and reflect changes across the UI.

## 3. Database Schema

The database schema is managed by Prisma and defined in `prisma/schema.prisma`. It includes the following key models:

- **User & BusOwner**: Manages user accounts, roles, and the relationship between admins and their bus companies.
- **Bus & SeatLayout**: Defines the fleet, including bus capacity and the specific grid layout of seats and aisles for each bus.
- **Location & Route**: Defines the geographic locations and the scheduled trips between them, including departure/arrival times, price, and the assigned bus.
- **Booking, Ticket & Payment**: Manages the entire booking lifecycle, from creating a booking with multiple tickets to tracking payment status.
- **Discount & Commission**: Manages promotional offers and the commission structure for bus owners.
- **Security & Logging**: `Session`, `LoginAttempt`, `ApiRequestAttempt`, and `AuditLog` tables to support robust security and logging.

## 4. Authentication and Authorization

### 4.1. Authentication Flow

1.  **Login**: A user submits their credentials via a form.
2.  **Validation**: The `authenticate` Server Action validates credentials against the hashed password in the database.
3.  **Session Creation**:
    - A unique session ID (`jti`) is generated and a session record is created in the `Session` table in the database.
    - A JWT is created containing the `userId`, `jti`, and an expiration time. This JWT is signed with a server-side secret.
4.  **Cookie**: The signed JWT is sent to the client as a secure, HTTP-only cookie.

### 4.2. Request Validation

1.  **Middleware**: On every request, the `middleware.ts` file checks for the session cookie.
2.  **Decryption**: The JWT is decrypted and its payload is read.
3.  **Server-Side Validation (`validateRequest`)**: The `jti` from the JWT is used to look up the session in the database.
    - If the session exists and is not expired, the request is considered valid.
    - The session's `expiresAt` timestamp is "slid" forward to keep the session alive during user activity.
    - If the session does not exist in the database (e.g., after logout), the request is rejected, even if the JWT itself is technically valid.

### 4.3. Authorization

- **Role-Based Access Control (RBAC)**: The system defines `ADMIN` and `SUPER_ADMIN` roles.
- **Middleware Enforcement**: The middleware protects entire route segments (e.g., `/admin/*`, `/super-admin/*`) based on the user's role stored in the session.
- **Action-Level Checks**: Every Server Action and API Route re-validates the user's session and ownership (e.g., ensuring an admin can only modify buses belonging to their own company).

## 5. Security Measures

- **JWTs with Server-Side Invalidation**: Logout is immediate and effective because the session is deleted from the database. Stolen JWTs are useless once a user logs out.
- **CSRF Protection**: A unique token is generated and stored in a cookie, and validated on all form submissions and Server Actions to prevent cross-site request forgery.
- **Password Hashing**: Passwords are hashed using `bcrypt` before being stored.
- **Rate Limiting**: Basic rate limiting is implemented on sensitive endpoints like login and ticket scanning to prevent brute-force attacks.
- **Forced Password Changes**: A flag (`passwordChangeRequired`) forces new or reset users to change their temporary password upon first login.
- **Content Security Policy (CSP)**: A strict CSP is implemented in the middleware to mitigate XSS and other injection attacks.
- **Secure Headers**: Standard security headers like `Strict-Transport-Security`, `X-Content-Type-Options`, and `X-Frame-Options` are applied.

## 6. Mini-App Integration (Telebirr/Nib)

The application includes a special integration for a "mini-app" environment.

- **Connection**: An external app can initiate a session by directing the user to `/portal/connect` with a valid authorization token.
- **Session Bridge**: Upon successful validation of the external token, a secure, encoded session cookie (`miniapp_session`) is created. This cookie stores the authentication status and the user's phone number.
- **Payment Gateway**: The booking flow is modified for the mini-app. Instead of showing a payment portal, it initiates a payment request via `createPaymentRequestAction`, which communicates with a mock payment gateway API. A callback is handled via the `/api/portal/payment-callback` endpoint to update the booking status.