# BonDeal Backend API Documentation

Complete API documentation for the BonDeal backend service.

## Base URL

```
Development: http://localhost:3000/api/v1
Production: https://api.bondeal.com/api/v1
```

## Authentication

Most endpoints require authentication using JWT tokens in the Authorization header:

```
Authorization: Bearer <access_token>
```

## Response Format

### Success Response
```json
{
  "success": true,
  "data": { ... },
  "message": "Operation successful"
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Error message",
    "details": { ... }
  }
}
```

### Pagination Response
```json
{
  "success": true,
  "data": [ ... ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5,
    "hasNext": true,
    "hasPrev": false
  }
}
```

---

## 1. Authentication Endpoints

### 1.1 Send OTP
Send OTP code to phone number for registration/login.

**Endpoint:** `POST /auth/send-otp`

**Request Body:**
```json
{
  "phone": "+24101234567"
}
```

**Response:**
```json
{
  "success": true,
  "message": "OTP sent successfully",
  "data": {
    "expiresIn": 300
  }
}
```

**Error Codes:**
- `INVALID_PHONE`: Invalid phone number format
- `RATE_LIMIT`: Too many OTP requests

---

### 1.2 Verify OTP
Verify OTP code for phone number.

**Endpoint:** `POST /auth/verify-otp`

**Request Body:**
```json
{
  "phone": "+24101234567",
  "code": "123456"
}
```

**Response:**
```json
{
  "success": true,
  "message": "OTP verified successfully",
  "data": {
    "verified": true,
    "isNewUser": true
  }
}
```

**Error Codes:**
- `INVALID_OTP`: Invalid or expired OTP code
- `OTP_EXPIRED`: OTP code has expired

---

### 1.3 Set Password
Set password after OTP verification (for new users).

**Endpoint:** `POST /auth/set-password`

**Request Body:**
```json
{
  "phone": "+24101234567",
  "password": "SecurePass123!"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Password set successfully",
  "data": {
    "user": {
      "id": "uuid",
      "phone": "+24101234567"
    },
    "accessToken": "jwt_token",
    "refreshToken": "refresh_token"
  }
}
```

**Error Codes:**
- `WEAK_PASSWORD`: Password doesn't meet requirements
- `OTP_NOT_VERIFIED`: OTP not verified for this phone

---

### 1.4 Login
Login with phone and password.

**Endpoint:** `POST /auth/login`

**Request Body:**
```json
{
  "phone": "+24101234567",
  "password": "SecurePass123!"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "uuid",
      "phone": "+24101234567",
      "name": "John Doe",
      "avatar": "url"
    },
    "accessToken": "jwt_token",
    "refreshToken": "refresh_token"
  }
}
```

**Error Codes:**
- `INVALID_CREDENTIALS`: Invalid phone or password
- `USER_NOT_FOUND`: User doesn't exist

---

### 1.5 Refresh Token
Refresh access token using refresh token.

**Endpoint:** `POST /auth/refresh`

**Request Body:**
```json
{
  "refreshToken": "refresh_token"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "accessToken": "new_jwt_token",
    "refreshToken": "new_refresh_token"
  }
}
```

---

### 1.6 Logout
Logout and invalidate tokens.

**Endpoint:** `POST /auth/logout`

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

## 2. User Endpoints

### 2.1 Get Current User
Get authenticated user's profile.

**Endpoint:** `GET /users/me`

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "phone": "+24101234567",
    "name": "John Doe",
    "email": "john@example.com",
    "avatar": "https://...",
    "location": "Libreville, Gabon",
    "latitude": 0.4162,
    "longitude": 9.4673,
    "verified": true,
    "joinDate": "2024-01-15",
    "stats": {
      "listings": 12,
      "sold": 8,
      "favorites": 24,
      "reviews": 4.8
    }
  }
}
```

---

### 2.2 Update Profile
Update user profile information.

**Endpoint:** `PATCH /users/me`

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request Body:**
```json
{
  "name": "John Doe Updated",
  "email": "newemail@example.com",
  "location": "New Location",
  "latitude": 0.4162,
  "longitude": 9.4673
}
```

**Response:**
```json
{
  "success": true,
  "message": "Profile updated successfully",
  "data": {
    "id": "uuid",
    "name": "John Doe Updated",
    ...
  }
}
```

---

### 2.3 Upload Avatar
Upload user profile picture.

**Endpoint:** `POST /users/me/avatar`

**Headers:**
```
Authorization: Bearer <access_token>
Content-Type: multipart/form-data
```

**Request Body:**
```
FormData:
  - file: <image_file>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "avatar": "https://cdn.bondeal.com/avatars/uuid.jpg"
  }
}
```

---

### 2.4 Get User Stats
Get user statistics.

**Endpoint:** `GET /users/me/stats`

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "listings": 12,
    "sold": 8,
    "favorites": 24,
    "reviews": 4.8,
    "totalViews": 156,
    "totalLikes": 45
  }
}
```

---

## 3. Product Endpoints

### 3.1 List Products
Get paginated list of products with filters.

**Endpoint:** `GET /products`

**Query Parameters:**
- `page` (number, default: 1)
- `limit` (number, default: 20, max: 100)
- `category` (string, optional)
- `condition` (string, optional)
- `status` (string: 'available' | 'sold', optional)
- `minPrice` (number, optional)
- `maxPrice` (number, optional)
- `latitude` (number, optional)
- `longitude` (number, optional)
- `maxDistance` (number, optional, in km)
- `sortBy` (string: 'relevance' | 'price_low' | 'price_high' | 'date_new' | 'date_old' | 'distance', default: 'date_new')
- `search` (string, optional, for text search)

**Example:**
```
GET /products?page=1&limit=20&category=Electronics&status=available&sortBy=price_low
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "title": "Macbook Pro 2020 (256 GB)",
      "description": "...",
      "price": 350000,
      "category": "Electronics",
      "condition": "Used",
      "listingType": "sell",
      "status": "available",
      "location": "Kinguele - 25 min",
      "latitude": 0.4162,
      "longitude": 9.4673,
      "address": "Kinguele, Libreville, Gabon",
      "distance": "2.5 km",
      "images": [
        "https://cdn.bondeal.com/products/uuid-1.jpg"
      ],
      "tags": ["Urgent", "Negociable"],
      "seller": {
        "id": "uuid",
        "name": "Jean Baptiste",
        "avatar": "https://..."
      },
      "engagement": {
        "likes": 12,
        "views": 45,
        "comments": 3
      },
      "postedDate": "2 jours",
      "createdAt": "2024-01-15T10:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

---

### 3.2 Get Product Details
Get detailed information about a specific product.

**Endpoint:** `GET /products/:id`

**Path Parameters:**
- `id` (UUID, required)

**Headers:**
```
Authorization: Bearer <access_token> (optional, for engagement tracking)
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "title": "Macbook Pro 2020 (256 GB)",
    "description": "Full description...",
    "price": 350000,
    "category": "Electronics",
    "condition": "Used",
    "listingType": "sell",
    "status": "available",
    "location": {
      "address": "Kinguele, Libreville, Gabon",
      "latitude": 0.4162,
      "longitude": 9.4673
    },
    "images": [
      "https://cdn.bondeal.com/products/uuid-1.jpg",
      "https://cdn.bondeal.com/products/uuid-2.jpg"
    ],
    "tags": ["Urgent", "Negociable"],
    "seller": {
      "id": "uuid",
      "name": "Jean Baptiste",
      "avatar": "https://...",
      "verified": true,
      "joinDate": "2024-01-15",
      "stats": {
        "listings": 12,
        "reviews": 4.8
      }
    },
    "engagement": {
      "likes": 12,
      "views": 156,
      "comments": 3,
      "isLiked": false,
      "isFavorited": false
    },
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T10:30:00Z"
  }
}
```

**Note:** View count is automatically incremented if user is authenticated.

---

### 3.3 Create Product
Create a new product listing.

**Endpoint:** `POST /products`

**Headers:**
```
Authorization: Bearer <access_token>
Content-Type: multipart/form-data
```

**Request Body:**
```
FormData:
  - title: "Product Title"
  - description: "Product description"
  - price: 350000
  - category: "Electronics"
  - condition: "Used"
  - listingType: "sell" | "share" | "exchange"
  - tags: ["tag1", "tag2"] (JSON array as string)
  - latitude: 0.4162
  - longitude: 9.4673
  - address: "Kinguele, Libreville, Gabon"
  - images: <file1>, <file2>, ... (up to 10 images)
```

**Response:**
```json
{
  "success": true,
  "message": "Product created successfully",
  "data": {
    "id": "uuid",
    "title": "Product Title",
    ...
  }
}
```

**Error Codes:**
- `VALIDATION_ERROR`: Invalid input data
- `IMAGE_UPLOAD_FAILED`: Image upload error
- `MAX_IMAGES_EXCEEDED`: More than 10 images

---

### 3.4 Update Product
Update an existing product (only by owner).

**Endpoint:** `PATCH /products/:id`

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request Body:**
```json
{
  "title": "Updated Title",
  "description": "Updated description",
  "price": 320000,
  "status": "sold"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Product updated successfully",
  "data": {
    "id": "uuid",
    ...
  }
}
```

**Error Codes:**
- `PRODUCT_NOT_FOUND`: Product doesn't exist
- `UNAUTHORIZED`: Not the product owner
- `CANNOT_UPDATE_SOLD`: Cannot update sold product

---

### 3.5 Delete Product
Delete a product (only by owner).

**Endpoint:** `DELETE /products/:id`

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "success": true,
  "message": "Product deleted successfully"
}
```

**Error Codes:**
- `PRODUCT_NOT_FOUND`: Product doesn't exist
- `UNAUTHORIZED`: Not the product owner

---

### 3.6 Get User's Products
Get products created by authenticated user.

**Endpoint:** `GET /products/my`

**Headers:**
```
Authorization: Bearer <access_token>
```

**Query Parameters:**
- `page` (number, default: 1)
- `limit` (number, default: 20)
- `status` (string: 'available' | 'sold' | 'draft', optional)

**Response:**
```json
{
  "success": true,
  "data": [ ... ],
  "pagination": { ... }
}
```

---

### 3.7 Like/Unlike Product
Like or unlike a product.

**Endpoint:** `POST /products/:id/like`
**Endpoint:** `DELETE /products/:id/like`

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "success": true,
  "message": "Product liked",
  "data": {
    "isLiked": true,
    "likesCount": 13
  }
}
```

---

### 3.8 Favorite/Unfavorite Product
Add or remove product from favorites.

**Endpoint:** `POST /products/:id/favorite`
**Endpoint:** `DELETE /products/:id/favorite`

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "success": true,
  "message": "Product added to favorites",
  "data": {
    "isFavorited": true,
    "favoritesCount": 25
  }
}
```

---

## 4. Search Endpoints

### 4.1 Search Products
Search products by query string.

**Endpoint:** `GET /search`

**Query Parameters:**
- `q` (string, required) - Search query
- `page` (number, default: 1)
- `limit` (number, default: 20)
- `category` (string, optional)
- `sortBy` (string, optional)

**Response:**
```json
{
  "success": true,
  "data": [ ... ],
  "pagination": { ... }
}
```

---

### 4.2 Search Suggestions
Get search suggestions/autocomplete.

**Endpoint:** `GET /search/suggestions`

**Query Parameters:**
- `q` (string, required) - Search query (min 2 characters)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "text": "iPhone 12 Pro Max",
      "category": "Électronique",
      "type": "product"
    },
    {
      "text": "Libreville Centre",
      "category": "Lieu",
      "type": "location"
    }
  ]
}
```

---

### 4.3 Get Recent Searches
Get user's recent searches.

**Endpoint:** `GET /search/recent`

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "success": true,
  "data": [
    "shoes",
    "cartables",
    "iphone xs"
  ]
}
```

---

## 5. Chat/Message Endpoints

### 5.1 Get Conversations
Get list of user's conversations.

**Endpoint:** `GET /chats`

**Headers:**
```
Authorization: Bearer <access_token>
```

**Query Parameters:**
- `page` (number, default: 1)
- `limit` (number, default: 20)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "otherUser": {
        "id": "uuid",
        "name": "malbanjunior",
        "avatar": "https://..."
      },
      "product": {
        "id": "uuid",
        "title": "Macbook Pro 2020",
        "image": "https://..."
      },
      "lastMessage": {
        "content": "Salut! Comment ça va?",
        "timestamp": "2024-01-15T14:30:00Z",
        "isSent": false
      },
      "unreadCount": 2,
      "updatedAt": "2024-01-15T14:30:00Z"
    }
  ],
  "pagination": { ... }
}
```

---

### 5.2 Get or Create Chat
Get existing chat or create new one with another user.

**Endpoint:** `GET /chats/user/:userId`
**Endpoint:** `POST /chats`

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request Body (POST):**
```json
{
  "userId": "uuid",
  "productId": "uuid" (optional)
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "user1Id": "uuid",
    "user2Id": "uuid",
    "productId": "uuid",
    "createdAt": "2024-01-15T14:30:00Z"
  }
}
```

---

### 5.3 Get Messages
Get messages for a specific chat.

**Endpoint:** `GET /chats/:chatId/messages`

**Headers:**
```
Authorization: Bearer <access_token>
```

**Query Parameters:**
- `page` (number, default: 1)
- `limit` (number, default: 50)
- `before` (ISO timestamp, optional) - Get messages before this time

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "senderId": "uuid",
      "content": "Salut! Comment ça va?",
      "isSent": false,
      "isRead": true,
      "timestamp": "2024-01-15T14:30:00Z"
    }
  ],
  "pagination": { ... }
}
```

---

### 5.4 Send Message
Send a message in a chat.

**Endpoint:** `POST /chats/:chatId/messages`

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request Body:**
```json
{
  "content": "Tapez un message...",
  "attachments": [] (optional, for future file support)
}
```

**Response:**
```json
{
  "success": true,
  "message": "Message sent",
  "data": {
    "id": "uuid",
    "senderId": "uuid",
    "content": "Tapez un message...",
    "isSent": true,
    "isRead": false,
    "timestamp": "2024-01-15T14:32:00Z"
  }
}
```

---

### 5.5 Mark Messages as Read
Mark messages in a chat as read.

**Endpoint:** `PATCH /chats/:chatId/read`

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "success": true,
  "message": "Messages marked as read"
}
```

---

## 6. Notification Endpoints

### 6.1 Get Notifications
Get user's notifications.

**Endpoint:** `GET /notifications`

**Headers:**
```
Authorization: Bearer <access_token>
```

**Query Parameters:**
- `page` (number, default: 1)
- `limit` (number, default: 20)
- `type` (string, optional) - Filter by type
- `isRead` (boolean, optional) - Filter by read status

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "type": "message",
      "title": "Nouveau message",
      "message": "Marie Claire vous a envoyé un message concernant \"Nike Air Max 270\"",
      "isRead": false,
      "avatar": "https://...",
      "productImage": "https://...",
      "actionData": {
        "chatId": "uuid",
        "productId": "uuid"
      },
      "timestamp": "Il y a 5 min",
      "createdAt": "2024-01-15T14:25:00Z"
    }
  ],
  "pagination": { ... }
}
```

---

### 6.2 Mark Notification as Read
Mark a notification as read.

**Endpoint:** `PATCH /notifications/:id/read`

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "success": true,
  "message": "Notification marked as read"
}
```

---

### 6.3 Mark All as Read
Mark all notifications as read.

**Endpoint:** `PATCH /notifications/read-all`

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "success": true,
  "message": "All notifications marked as read"
}
```

---

### 6.4 Delete Notification
Delete a notification.

**Endpoint:** `DELETE /notifications/:id`

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "success": true,
  "message": "Notification deleted"
}
```

---

### 6.5 Get Unread Count
Get count of unread notifications.

**Endpoint:** `GET /notifications/unread-count`

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "count": 5
  }
}
```

---

## 7. Error Codes

### Authentication Errors
- `INVALID_CREDENTIALS`: Invalid phone or password
- `INVALID_TOKEN`: Invalid or expired JWT token
- `TOKEN_EXPIRED`: JWT token has expired
- `UNAUTHORIZED`: Missing or invalid authentication

### OTP Errors
- `INVALID_PHONE`: Invalid phone number format
- `INVALID_OTP`: Invalid OTP code
- `OTP_EXPIRED`: OTP code has expired
- `OTP_NOT_VERIFIED`: OTP not verified
- `RATE_LIMIT`: Too many OTP requests

### Product Errors
- `PRODUCT_NOT_FOUND`: Product doesn't exist
- `UNAUTHORIZED`: Not authorized to perform action
- `VALIDATION_ERROR`: Invalid input data
- `IMAGE_UPLOAD_FAILED`: Image upload failed
- `MAX_IMAGES_EXCEEDED`: Too many images

### General Errors
- `VALIDATION_ERROR`: Request validation failed
- `NOT_FOUND`: Resource not found
- `INTERNAL_ERROR`: Internal server error
- `RATE_LIMIT`: Too many requests

---

## 8. Rate Limiting

API endpoints are rate-limited to prevent abuse:

- **OTP endpoints**: 5 requests per phone per hour
- **Authentication endpoints**: 10 requests per minute
- **General endpoints**: 100 requests per minute per user
- **File upload**: 20 requests per minute per user

Rate limit headers in response:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1642234567
```

---

## 9. Webhooks (Future)

Webhooks for real-time events (optional):
- `message.created`
- `notification.created`
- `product.created`
- `product.status.changed`

---

## 10. WebSocket Events (Future)

Real-time WebSocket events for chat (optional):
- `message:new` - New message received
- `message:read` - Message read status
- `typing:start` - User started typing
- `typing:stop` - User stopped typing

