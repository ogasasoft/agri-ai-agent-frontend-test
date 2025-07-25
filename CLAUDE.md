# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a comprehensive agricultural AI agent frontend application built with Next.js 14, TypeScript, and Tailwind CSS. The application provides EC order management, AI-powered chat consultation, and data analysis for agricultural businesses.

## Key Architecture

### Deployment Setup
- **Development**: Uses Next.js API routes (`src/app/api/`)
- **Production**: Deployed on Vercel with seamless Next.js integration
- API routes work consistently between development and production environments

### AI Integration
- **Primary**: OpenAI ChatGPT API (gpt-3.5-turbo)
- **System Context**: AI dynamically accesses live database statistics, order data, and system settings
- **Page Context**: AI receives current page information for contextual responses
- **Fallback**: System-based responses when OpenAI API is unavailable
- API key stored in `.env.local` for development and Vercel environment variables for production

### Database Architecture
- **Production**: PostgreSQL with Neon database connection pooling
- **Schema**: Orders table with personal data masking built-in (`田中太郎` → `田***郎`)
- **Connection**: Direct PostgreSQL client (`pg`) with SSL configuration
- **CSV Integration**: Bulk import with Japanese header mapping

## Common Commands

```bash
# Development
npm run dev          # Start development server (access at http://localhost:3000/orders)
npm run build        # Build for production
npm run start        # Start production server

# Quality & Testing
npm run lint         # Run ESLint
npm run typecheck    # Run TypeScript checks

# Vercel Deployment
vercel               # Deploy to Vercel (requires Vercel CLI)
vercel --prod        # Deploy to production
```

## Development Workflow

1. **Start development**: Run `npm run dev` and access `http://localhost:3000/orders`
2. **Always run linting and type checking** before committing changes
3. **Test locally with npm run dev** before deploying to Vercel
4. **Use mock data** for initial development and testing
5. **Test AI error handling** when API quotas are exceeded

## Core Components

### Layout Structure
- Sidebar navigation (`src/components/Sidebar.tsx`)
- Main content area with routing
- Persistent AI chat panel (`src/components/ChatPanel.tsx`)

### State Management
- Zustand for chat state (`src/stores/chatStore.ts`)
- IndexedDB + BroadcastChannel for chat persistence

### Key Features
- Order management with two-pane delivery date separation
- CSV upload with preview confirmation before import
- Shipping workflow with Yamato Transport API integration
- Three-step order registration flow: choose method → confirm → complete
- Persistent AI chat with live database context awareness
- Personal information masking throughout the application (`田中太郎` → `田***郎`)
- Dashboard analytics with AI-powered insights and recommendations
- Responsive design with Tailwind CSS and Japanese localization

## API Routes Structure

API routes (`src/app/api/`) implement:
- `/api/orders` - Order CRUD operations with PostgreSQL integration
- `/api/chat` - AI chat with dynamic system context and database access
- `/api/settings` - Application settings persistence
- `/api/upload` - CSV processing with preview and bulk import
- `/api/ai-insights` - Dashboard analytics with OpenAI integration
- `/api/shipping` - Shipping workflow management
- `/api/customers` - Customer data registration from shipping completion
- `/api/yamato` - Yamato Transport API integration (mock implementation with TODO markers)

## AI Chat Architecture

The chat system (`src/app/api/chat/route.ts`) implements:
- **Dynamic System Context**: Real-time database queries for order statistics and system settings
- **Page-Aware Responses**: Context injection based on current user page location
- **Live Data Integration**: Direct PostgreSQL queries for comprehensive system information
- **Intelligent Fallback**: System-based responses using database context when OpenAI unavailable
- **Cross-Tab Persistence**: IndexedDB + BroadcastChannel for chat synchronization

## Unique Architecture Patterns

### Two-Pane Order Layout
- Orders are separated into panes based on delivery date presence
- Different visual styling (white vs light blue backgrounds) for distinction
- Maintains selection state across both panes for bulk operations

### Personal Data Masking System
- Automatic masking function: `maskPersonalInfo()`
- Pattern: first character + asterisks + last character
- Applied consistently across names, phones, and addresses
- Critical for privacy compliance - maintain in all new features

### Chat Persistence Strategy
- Uses IndexedDB for local storage with cross-tab synchronization
- BroadcastChannel API for real-time updates across browser tabs
- Graceful fallback when browser APIs are unavailable

### Shipping Workflow Architecture
- **Order Selection**: Multi-select orders from pending shipments page
- **Label Generation**: Yamato API integration with delivery type selection (normal/cool/frozen)
- **Customer Registration**: Automatic customer data registration upon shipping completion
- **Two-Pane Management**: Separate views for pending vs completed shipments
- **Session Storage**: Temporary order data storage for multi-step flows

### Japanese Business Context
- Complete Japanese UI with agricultural terminology
- Date formatting with Japanese locale (`date-fns/locale/ja`)
- Currency formatting for Japanese Yen
- Agricultural product-specific order management

## Important Notes

- **Quick Start**: `npm run dev` → `http://localhost:3000/orders`
- **Entry Point**: `/orders` redirects to `/orders/shipping/pending` (main order management)
- **Order Registration Flow**: `/orders/register/choose` → `/orders/register/confirm` → `/orders/register/complete`
- **Shipping Flow**: Pending orders → Select → Create labels → Complete → Customer registration
- API routes work consistently between development and production on Vercel
- Personal data masking is crucial - maintain this pattern in all new features
- **Yamato API**: Currently mock implementation with TODO markers for production integration
- The application uses Japanese language throughout the UI and AI responses

## Vercel Deployment

### Prerequisites
1. Install Vercel CLI: `npm i -g vercel`
2. Login to Vercel: `vercel login`

### Environment Variables
Set in Vercel dashboard or via CLI:
- `DATABASE_URL`: PostgreSQL connection string (Neon database)
- `OPENAI_API_KEY`: Your OpenAI API key for chat functionality
- `YAMATO_API_KEY`: Yamato Transport API key for shipping labels
- `YAMATO_API_SECRET`: Yamato Transport API secret
- `YAMATO_API_BASE_URL`: Yamato API base URL (default: https://api.yamato.co.jp/v1)

### Deployment Steps
1. `vercel` - First deployment (follow prompts)
2. `vercel --prod` - Deploy to production
3. Environment variables are automatically loaded from Vercel settings