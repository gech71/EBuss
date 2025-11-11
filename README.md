# EZBus - A Bus Ticket Booking System

This is a Next.js application for a bus ticket booking platform, complete with an admin panel for bus owners and a super-admin dashboard for platform management. It uses Prisma for database management.

## Getting Started Locally

Follow these steps to set up and run the application in your local development environment.

### Prerequisites

- Node.js (v18 or later recommended)
- npm or another package manager
- A local PostgreSQL database instance running. You can easily set one up using Docker.
- A [Mailtrap](https://mailtrap.io/) account for testing email sending.

### 1. Install Dependencies

First, install the necessary project dependencies:

```bash
npm install
```

### 2. Set Up Environment Variables

Create a `.env` file in the root of the project by copying the example.

```bash
cp .env.example .env
```

Now, open the `.env` file and update the following variables:

- **DATABASE_URL**: Replace the placeholder with the connection string for your local PostgreSQL database. The format is: `postgresql://USER:PASSWORD@HOST:PORT/DATABASE`
  **Example:** `DATABASE_URL="postgresql://postgres:mysecretpassword@localhost:5432/ezbus"`

- **MAILTRAP_USER & MAILTRAP_PASS**: Go to your Mailtrap account, select an inbox, and find your SMTP credentials. Add your username and password to the `.env` file. This is required for sending credential emails to newly created users.

### 3. Apply the Database Schema

Push the Prisma schema to your database. This command will create all the necessary tables and columns based on the `prisma/schema.prisma` file.

```bash
npx prisma db push
```

### 4. Seed the Database

Populate the database with the initial sample data from `prisma/seed.ts`. This will create bus owners, buses, routes, and discounts.

```bash
npx prisma db seed
```

### 5. Generate Prisma Client

Ensure your Prisma Client is up-to-date with the schema.

```bash
npx prisma generate
```

### 6. Run the Application

You can now start the development server:

```bash
npm run dev
```

The application will be available at [http://localhost:9002](http://localhost:9002).

## Accessing Different Portals

- **Customer Portal**: [http://localhost:9002/](http://localhost:9002/)
- **Admin Login**: [http://localhost:9002/login](http://localhost:9002/login)
  - **Admin 1 (FleetFirst Inc.)**: `admin@example.com` / `password`
  - **Admin 2 (RoadRunner Co.)**: `runner@example.com` / `password`
- **Super Admin Login**: [http://localhost:9002/super-admin/login](http://localhost:9002/super-admin/login)
  - **Super Admin**: `super@example.com` / `password`
