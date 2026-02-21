# RestOrder: Next-Gen Restaurant Management System

> **Architected for Scale. Engineered for Performance.**

RestOrder is a comprehensive, real-time restaurant order management platform designed to streamline operations across the entire dining lifecycle—from customer self-ordering via QR codes to staff fulfillment and managerial oversight. 

This repository houses the full-stack Next.js web application, leveraging modern web primitives to deliver a resilient, highly available, and reactive user experience.

## 🏗 System Architecture

We've adopted a modular, monolithic architecture optimized for the Vercel/Next.js ecosystem, ensuring low latency and high throughput. 

### Tech Stack
- **Core Framework**: [Next.js 14/15 (App Router)](https://nextjs.org/) - Utilizing React Server Components (RSC) where appropriate and client-side rendering for highly interactive segments.
- **State Management**: [Zustand](https://github.com/pmndrs/zustand) - A small, fast, and scalable bearbones state-management solution. Chosen over Redux to minimize boilerplate while maintaining a unidirectional data flow and strict type safety without `any`.
- **UI/UX Infrastructure**: [Material UI (MUI)](https://mui.com/) - Providing a robust, accessible, and customizable component foundation, backed by our bespoke Design System (Custom ThemeRegistry).
- **Real-Time Communication**: WebSockets (`ws`) - Facilitating instant updates across clients for new orders, payment statuses, and staff summons.
- **Database**: [MongoDB](https://www.mongodb.com/) via [Mongoose](https://mongoosejs.com/) - A flexible, document-oriented database ideal for hierarchical and evolving schemas (e.g., dynamic order structures and session telemetry).
- **Authentication**: JWT (JSON Web Tokens) with `HTTPOnly` cookies, ensuring secure, stateless sessions and granular Role-Based Access Control (RBAC).
- **Asset Storage**: AWS S3 - Scalable, highly-available file storage handling menu imagery and payment receipts.
- **Type Safety**: Strictly typed with **TypeScript**, strictly avoiding explicit or implicit `any`, forcing rigorous data contract validation.

## ✨ Core Workflows & Capabilities

1. **Customer Touchpoint (`/order/[tableId]`)**
   - **QR-Initiated Sessions**: Customers scan to begin a session natively bound to their active table.
   - **Real-time Engine**: Customers observe live item statuses ("Preparing", "Served") entirely powered by WebSockets.
   - **Self-Service Actions**: Add-to-cart, dietary notes, staff pinging, and checkout requests (Cash or QR transfer).

2. **Staff Operations (`/staff`)**
   - **Mission Control**: A real-time matrix of all zones and tables. Instantly triage "Needs Help" states or pending payment workflows.
   - **Omnipresent Ordering**: Ability to open sessions and inject orders on behalf of walk-in customers natively without altering the primary flow constraints.

3. **Admin Dashboard (`/admin`)**
   - **Data Management Hub**: Full CRUD lifecycle operations over Menus, Categories, Tables (with automatic QR code visual generation), and System Users.
   - **Analytics & Telemetry**: Aggregated, live view of active revenue, top-performing items, and session turnaround times.

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v18.17+ recommended)
- [Docker](https://www.docker.com/) & Docker Compose (for local database provisioning)

### 1. Environment Configuration
Clone the `.env.local.example` or define your `.env.local` strictly matching the internal schema requirement:
```bash
# Database Config
MONGODB_URI=mongodb://admin:secret@localhost:27017/restaurant-order?authSource=admin

# Core Security
# Note: In production, generate a high-entropy string: `openssl rand -base64 32`
JWT_SECRET=your-super-secret-jwt-key

# Service Endpoints
NEXT_PUBLIC_WS_URL=ws://localhost:8080
NEXT_PUBLIC_APP_URL=http://localhost:3000

# AWS S3 (Media Infrastructure)
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=ap-southeast-2
AWS_S3_BUCKET_NAME=your-bucket-name
AWS_S3_ENDPOINT_URL=https://s3.ap-southeast-2.amazonaws.com
```

### 2. Infrastructure Bootstrapping
Fire up the local MongoDB instance using the provided Docker compose file:
```bash
docker-compose up -d
```

### 3. Application Initialization
Install the dependency tree and execute the database seeder to establish initial administrative credentials:
```bash
npm install
npm run dev
```

Navigate to `http://localhost:3000/login`.
To seed mock data if needed, invoke `POST /api/seed` (Internal usage only).

## 🛡 Engineering Standard & Contribution

- **Strict Typing**: We operate on a strict Zero-Any policy. All payloads traversing boundaries must be mapped to their specific domain interfaces.
- **Component Isolation**: Adhere strictly to atomic design principles. Layout logic should rarely mix with state computations.

---
_Architected for resilience, shaped for speed._
