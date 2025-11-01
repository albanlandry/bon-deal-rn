# BonDeal Backend Architecture

This document outlines the overall structure and design of the BonDeal backend system.

## 1. Architecture Overview

### 1.1 High-Level Architecture

```
┌─────────────────┐
│   Mobile App    │
│   (React Native)│
└────────┬────────┘
         │
         │ HTTPS/REST API
         │
┌────────▼─────────────────────────────────────┐
│           API Gateway / Load Balancer         │
└────────┬──────────────────────────────────────┘
         │
         │
┌────────▼─────────────────────────────────────┐
│              Backend Services                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │   Auth   │  │ Products │  │ Messages │  │
│  │ Service │  │  Service │  │  Service │  │
│  └──────────┘  └──────────┘  └──────────┘  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │Notifications│ │ Search │  │   File   │  │
│  │  Service   │ │ Service │  │  Service │  │
│  └──────────┘  └──────────┘  └──────────┘  │
└────────┬──────────────────────────────────────┘
         │
         │
┌────────▼─────────────────────────────────────┐
│            Data Layer                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │PostgreSQL│  │  Redis   │  │  MongoDB │  │
│  │(Primary) │  │ (Cache)  │  │  (Logs)  │  │
│  └──────────┘  └──────────┘  └──────────┘  │
└───────────────────────────────────────────────┘
         │
         │
┌────────▼─────────────────────────────────────┐
│         External Services                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │   SMS    │  │   Push   │  │   File   │  │
│  │ Provider │  │ Notifications│ Storage │  │
│  │ (Twilio) │  │  (FCM)   │  │   (S3)   │  │
│  └──────────┘  └──────────┘  └──────────┘  │
└───────────────────────────────────────────────┘
```

### 1.2 Architecture Style
- **Primary Style**: Monolithic with modular service layers (can evolve to microservices)
- **Database**: PostgreSQL as primary database
- **Cache**: Redis for caching and session management
- **File Storage**: Cloud storage (AWS S3, Google Cloud Storage, or similar)
- **Real-time**: WebSocket for chat (optional, can use polling initially)

## 2. Technology Stack

### 2.1 Backend Framework
**Recommended Options:**
- **Node.js + Express** (JavaScript/TypeScript)
- **Python + FastAPI** (Python)
- **Go + Gin/Echo** (Go)
- **Java + Spring Boot** (Java)

**Recommended**: Node.js + Express with TypeScript for:
- Fast development
- Large ecosystem
- Good async support for real-time features
- Type safety with TypeScript

### 2.2 Database
- **Primary DB**: PostgreSQL
  - Relational data (users, products, messages, notifications)
  - ACID compliance
  - Complex queries and joins
  - Full-text search support (PostgreSQL FTS)

- **Cache**: Redis
  - Session storage
  - API response caching
  - Rate limiting
  - Real-time data (online users, active chats)

- **Optional - Logs DB**: MongoDB or Elasticsearch
  - Log aggregation
  - Analytics data

### 2.3 File Storage
- **Cloud Storage**: AWS S3 / Google Cloud Storage / Azure Blob Storage
- **CDN**: CloudFront / Cloudflare for image delivery
- **Image Processing**: Sharp (Node.js) or Pillow (Python) for resizing

### 2.4 External Services
- **SMS**: Twilio / AWS SNS / MessageBird
- **Push Notifications**: Firebase Cloud Messaging (FCM) / Apple Push Notification Service (APNS)
- **Maps**: Google Maps API / Mapbox
- **Email**: SendGrid / AWS SES (for password resets, notifications)

## 3. Application Structure

### 3.1 Layered Architecture

```
backend/
├── src/
│   ├── config/           # Configuration files
│   │   ├── database.ts
│   │   ├── redis.ts
│   │   ├── jwt.ts
│   │   └── aws.ts
│   │
│   ├── controllers/      # Request handlers
│   │   ├── auth.controller.ts
│   │   ├── product.controller.ts
│   │   ├── message.controller.ts
│   │   ├── notification.controller.ts
│   │   └── user.controller.ts
│   │
│   ├── services/         # Business logic
│   │   ├── auth.service.ts
│   │   ├── product.service.ts
│   │   ├── message.service.ts
│   │   ├── notification.service.ts
│   │   ├── search.service.ts
│   │   └── file.service.ts
│   │
│   ├── models/           # Data models
│   │   ├── User.ts
│   │   ├── Product.ts
│   │   ├── Message.ts
│   │   ├── Notification.ts
│   │   └── Chat.ts
│   │
│   ├── repositories/     # Data access layer
│   │   ├── user.repository.ts
│   │   ├── product.repository.ts
│   │   ├── message.repository.ts
│   │   └── notification.repository.ts
│   │
│   ├── middleware/       # Express middleware
│   │   ├── auth.middleware.ts
│   │   ├── validation.middleware.ts
│   │   ├── error.middleware.ts
│   │   └── rateLimiter.middleware.ts
│   │
│   ├── routes/           # API routes
│   │   ├── auth.routes.ts
│   │   ├── product.routes.ts
│   │   ├── message.routes.ts
│   │   ├── notification.routes.ts
│   │   └── user.routes.ts
│   │
│   ├── utils/            # Utility functions
│   │   ├── logger.ts
│   │   ├── validator.ts
│   │   ├── encryption.ts
│   │   └── helpers.ts
│   │
│   ├── types/            # TypeScript types
│   │   └── index.ts
│   │
│   └── app.ts            # Express app setup
│   └── server.ts         # Server entry point
│
├── migrations/           # Database migrations
├── seeds/                # Database seed data
├── tests/                # Test files
├── .env.example          # Environment variables template
├── package.json
└── tsconfig.json
```

## 4. Database Schema Design

### 4.1 Core Tables

**Users Table**
```sql
users
├── id (UUID, PK)
├── phone (VARCHAR, UNIQUE, NOT NULL)
├── password_hash (VARCHAR)
├── name (VARCHAR)
├── email (VARCHAR)
├── avatar_url (VARCHAR)
├── location (VARCHAR)
├── latitude (DECIMAL)
├── longitude (DECIMAL)
├── verified (BOOLEAN)
├── created_at (TIMESTAMP)
└── updated_at (TIMESTAMP)
```

**Products Table**
```sql
products
├── id (UUID, PK)
├── user_id (UUID, FK -> users.id)
├── title (VARCHAR, NOT NULL)
├── description (TEXT)
├── price (DECIMAL)
├── category (VARCHAR)
├── condition (VARCHAR)
├── listing_type (VARCHAR) -- 'sell', 'share', 'exchange'
├── status (VARCHAR) -- 'available', 'sold', 'draft'
├── latitude (DECIMAL)
├── longitude (DECIMAL)
├── address (VARCHAR)
├── views_count (INTEGER, DEFAULT 0)
├── likes_count (INTEGER, DEFAULT 0)
├── created_at (TIMESTAMP)
└── updated_at (TIMESTAMP)
```

**Product Images Table**
```sql
product_images
├── id (UUID, PK)
├── product_id (UUID, FK -> products.id)
├── image_url (VARCHAR, NOT NULL)
├── image_order (INTEGER)
└── created_at (TIMESTAMP)
```

**Product Tags Table**
```sql
product_tags
├── id (UUID, PK)
├── product_id (UUID, FK -> products.id)
└── tag (VARCHAR)
```

**Favorites Table**
```sql
favorites
├── id (UUID, PK)
├── user_id (UUID, FK -> users.id)
├── product_id (UUID, FK -> products.id)
├── created_at (TIMESTAMP)
└── UNIQUE(user_id, product_id)
```

**Likes Table**
```sql
product_likes
├── id (UUID, PK)
├── user_id (UUID, FK -> users.id)
├── product_id (UUID, FK -> products.id)
├── created_at (TIMESTAMP)
└── UNIQUE(user_id, product_id)
```

**Chats Table**
```sql
chats
├── id (UUID, PK)
├── product_id (UUID, FK -> products.id, nullable)
├── user1_id (UUID, FK -> users.id)
├── user2_id (UUID, FK -> users.id)
├── last_message_at (TIMESTAMP)
├── created_at (TIMESTAMP)
└── updated_at (TIMESTAMP)
```

**Messages Table**
```sql
messages
├── id (UUID, PK)
├── chat_id (UUID, FK -> chats.id)
├── sender_id (UUID, FK -> users.id)
├── content (TEXT, NOT NULL)
├── is_read (BOOLEAN, DEFAULT false)
├── created_at (TIMESTAMP)
└── INDEX(chat_id, created_at)
```

**Notifications Table**
```sql
notifications
├── id (UUID, PK)
├── user_id (UUID, FK -> users.id)
├── type (VARCHAR) -- 'message', 'like', 'view', 'sale', 'offer', 'system'
├── title (VARCHAR)
├── message (TEXT)
├── is_read (BOOLEAN, DEFAULT false)
├── related_product_id (UUID, FK -> products.id, nullable)
├── related_user_id (UUID, FK -> users.id, nullable)
├── action_data (JSONB)
├── created_at (TIMESTAMP)
└── INDEX(user_id, is_read, created_at)
```

**OTP Codes Table**
```sql
otp_codes
├── id (UUID, PK)
├── phone (VARCHAR, NOT NULL)
├── code (VARCHAR, NOT NULL)
├── expires_at (TIMESTAMP, NOT NULL)
├── verified (BOOLEAN, DEFAULT false)
├── created_at (TIMESTAMP)
└── INDEX(phone, code)
```

### 4.2 Indexes

```sql
-- Performance indexes
CREATE INDEX idx_products_user_id ON products(user_id);
CREATE INDEX idx_products_status ON products(status);
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_products_created_at ON products(created_at DESC);
CREATE INDEX idx_products_location ON products(latitude, longitude);

-- Full-text search
CREATE INDEX idx_products_search ON products USING gin(to_tsvector('french', title || ' ' || description));

-- Message indexes
CREATE INDEX idx_messages_chat_id_created ON messages(chat_id, created_at DESC);

-- Notification indexes
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, is_read, created_at DESC);
```

## 5. API Design Patterns

### 5.1 RESTful Conventions
- **GET**: Retrieve resources
- **POST**: Create resources
- **PUT/PATCH**: Update resources
- **DELETE**: Remove resources

### 5.2 Response Format
```json
{
  "success": true,
  "data": { ... },
  "message": "Operation successful",
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

### 5.3 Error Format
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": { ... }
  }
}
```

## 6. Security Architecture

### 6.1 Authentication Flow
1. User sends phone number → Backend generates OTP
2. OTP sent via SMS service
3. User submits OTP → Backend verifies
4. User sets password
5. Backend issues JWT token
6. Subsequent requests include JWT in Authorization header

### 6.2 Authorization
- JWT tokens with expiration (access token: 24h, refresh token: 7 days)
- Role-based access control (if needed)
- Resource ownership validation

### 6.3 Data Protection
- Password hashing (bcrypt, cost factor 12+)
- Phone number encryption (optional)
- Input validation and sanitization
- SQL injection prevention (parameterized queries)
- XSS prevention (output encoding)

## 7. Scalability Considerations

### 7.1 Horizontal Scaling
- Stateless API servers
- Load balancer distribution
- Database read replicas
- Redis cluster for distributed caching

### 7.2 Performance Optimization
- Database query optimization
- Connection pooling
- Response caching (Redis)
- Image CDN
- Database indexing
- Pagination for all list endpoints

### 7.3 Future Microservices Migration
- Auth Service (authentication, authorization)
- Product Service (CRUD, search)
- Messaging Service (real-time chat)
- Notification Service (push notifications)
- File Service (image upload/processing)
- Search Service (full-text search, Elasticsearch)

## 8. Deployment Architecture

### 8.1 Infrastructure
- **Application Servers**: Node.js servers (PM2 or Docker)
- **Database**: PostgreSQL with replication
- **Cache**: Redis cluster
- **File Storage**: AWS S3 / Google Cloud Storage
- **CDN**: CloudFront / Cloudflare

### 8.2 Monitoring
- Application logs (Winston, Morgan)
- Error tracking (Sentry)
- Performance monitoring (New Relic, Datadog)
- Database monitoring
- Uptime monitoring

### 8.3 CI/CD
- Git repository (GitHub/GitLab)
- Automated testing
- Build and deploy pipeline
- Environment management (dev, staging, prod)

## 9. Development Guidelines

### 9.1 Code Organization
- Separation of concerns (controllers, services, repositories)
- Dependency injection
- Error handling middleware
- Request validation middleware

### 9.2 Testing Strategy
- Unit tests (services, utilities)
- Integration tests (API endpoints)
- E2E tests (critical flows)
- Load testing (performance)

### 9.3 Documentation
- API documentation (Swagger/OpenAPI)
- Code comments
- Database schema documentation
- Deployment guides

