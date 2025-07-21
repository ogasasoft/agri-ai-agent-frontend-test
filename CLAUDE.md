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
- **Fallback**: Basic quota exceeded error handling with simple message
- **Implementation**: Straightforward API call without system prompts or agricultural expertise
- API key stored in `.env.local` for development and Vercel environment variables for production

### Data Management
- **Development**: Mock data in API routes
- **Production**: Ready for database integration (PostgreSQL via Vercel Postgres recommended)
- **Personal Data**: Automatic masking (e.g., `田中太郎` → `田***郎`)

## Common Commands

```bash
# Development
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server

# Alternative if npm run dev fails to connect
npx next dev --port 4000  # Direct Next.js startup with custom port

# Quality & Testing
npm run lint         # Run ESLint
npm run typecheck    # Run TypeScript checks

# Vercel Deployment
vercel               # Deploy to Vercel (requires Vercel CLI)
vercel --prod        # Deploy to production
```

## Development Workflow

1. **Always run linting and type checking** before committing changes
2. **Test locally with npm run dev** before deploying to Vercel
3. **Use mock data** for initial development and testing
4. **Test AI error handling** when API quotas are exceeded

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
- CSV upload and processing with Papa Parse
- Persistent AI chat with IndexedDB and cross-tab synchronization
- Personal information masking throughout the application (`田中太郎` → `田***郎`)
- Responsive design with Tailwind CSS
- Japanese localization with date-fns locale support

## API Routes Structure

API routes (`src/app/api/`) implement:
- `/api/orders` - Order CRUD operations
- `/api/chat` - AI chat functionality with basic OpenAI integration
- `/api/settings` - Application settings
- `/api/upload` - CSV file processing

## Chat API Implementation

The chat API (`src/app/api/chat/route.ts`) includes:
- **OpenAI Integration**: Basic ChatGPT API calls with gpt-3.5-turbo
- **Simple Fallback**: Basic quota exceeded (429) error message
- **Error Handling**: Standard connection error management
- **Note**: No system prompts, keyword detection, or agricultural expertise built-in

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

### Japanese Business Context
- Complete Japanese UI with agricultural terminology
- Date formatting with Japanese locale (`date-fns/locale/ja`)
- Currency formatting for Japanese Yen
- Agricultural product-specific order management

## Important Notes

- API routes work consistently between development and production on Vercel
- The chat API has basic error handling - additional fallback systems may be needed
- Personal data masking is crucial - maintain this pattern in all new features
- The application uses Japanese language throughout the UI and AI responses
- Always test localhost connectivity issues by trying different ports if needed
- If `npm run dev` shows "Ready" but connection fails, use `npx next dev --port 4000` instead

## Vercel Deployment

### Prerequisites
1. Install Vercel CLI: `npm i -g vercel`
2. Login to Vercel: `vercel login`

### Environment Variables
Set in Vercel dashboard or via CLI:
- `OPENAI_API_KEY`: Your OpenAI API key

### Deployment Steps
1. `vercel` - First deployment (follow prompts)
2. `vercel --prod` - Deploy to production
3. Environment variables are automatically loaded from Vercel settings