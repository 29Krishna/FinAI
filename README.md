# FinAI - Personal Finance Management Application

FinAI is a modern, user-friendly personal finance management application built with Next.js, Clerk for authentication, and Prisma for database management. It helps users track their expenses, manage accounts, and maintain budgets effectively.

## Features

### Account Management
- Create and manage multiple accounts (Current/Savings)
- Set default accounts for transactions
- Track account balances
- View transaction history per account

### Transaction Tracking
- Record income and expenses
- Categorize transactions
- Support for recurring transactions
- Upload receipts for transactions
- Track transaction status (Pending/Completed/Failed)

### Budget Management
- Set monthly budgets
- Track budget progress
- Receive budget alerts

### User Experience
- Modern, responsive UI built with Tailwind CSS
- Secure authentication with Clerk
- Real-time updates
- Intuitive dashboard with visualizations

## Tech Stack

- **Frontend**: Next.js 15, React 18, Tailwind CSS
- **Authentication**: Clerk
- **Database**: PostgreSQL with Prisma ORM
- **UI Components**: Radix UI, Shadcn UI
- **Charts**: Recharts
- **Form Handling**: React Hook Form with Zod validation
- **Styling**: Tailwind CSS with custom animations

## Getting Started

### Prerequisites

- Node.js 18.17 or later
- PostgreSQL database
- Clerk account for authentication

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/29Krishna/FinAI.git
   cd FinAI
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   Create a `.env` file with the following variables:
   ```
   DATABASE_URL="your_postgresql_connection_string"
   DIRECT_URL="your_postgresql_direct_connection_string"
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="your_clerk_publishable_key"
   CLERK_SECRET_KEY="your_clerk_secret_key"
   ```

4. Set up the database:
   ```bash
   npx prisma generate
   npx prisma db push
   ```

5. Start the development server:
   ```bash
   npm run dev
   ```

## Project Structure

```
finai/
├── app/                    # Next.js app directory
│   ├── (auth)/            # Authentication routes
│   ├── (main)/            # Main application routes
│   └── api/               # API routes
├── components/            # Reusable UI components
├── actions/              # Server actions
├── lib/                  # Utility functions and configurations
├── prisma/              # Database schema and migrations
└── public/              # Static assets
```

## Database Schema

The application uses the following main models:

- **User**: Stores user information and authentication details
- **Account**: Manages user's financial accounts
- **Transaction**: Records all financial transactions
- **Budget**: Tracks user's budget settings
