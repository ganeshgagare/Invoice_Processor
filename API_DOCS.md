# API Documentation

## Base URL
```
http://localhost:8000/api
```

## Authentication
All endpoints except `/auth/register` and `/auth/login` require JWT token in Authorization header:
```
Authorization: Bearer <your_token>
```

---

## Auth Endpoints

### Register User
```
POST /auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securepassword",
  "full_name": "John Doe"
}

Response (201):
{
  "id": 1,
  "email": "user@example.com",
  "full_name": "John Doe",
  "is_active": true,
  "created_at": "2024-01-01T12:00:00"
}
```

### Login User
```
POST /auth/login
Content-Type: application/x-www-form-urlencoded

email=user@example.com&password=securepassword

Response (200):
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer"
}
```

### Get Current User
```
GET /auth/me
Authorization: Bearer <token>

Response (200):
{
  "id": 1,
  "email": "user@example.com",
  "full_name": "John Doe",
  "is_active": true,
  "created_at": "2024-01-01T12:00:00"
}
```

---

## Invoice Endpoints

### Upload Invoice
```
POST /invoices/upload
Content-Type: multipart/form-data
Authorization: Bearer <token>

Parameters:
- file: (binary) Invoice file (PDF, JPEG, PNG, WebP)
- user_prompt: (string) Optional processing instructions

Response (200):
{
  "id": 1,
  "status": "completed",
  "message": "Invoice processed successfully"
}
```

### List Invoices
```
GET /invoices/list?skip=0&limit=10
Authorization: Bearer <token>

Query Parameters:
- skip: Number of invoices to skip (default: 0)
- limit: Number of invoices to return (default: 10)

Response (200):
{
  "invoices": [
    {
      "id": 1,
      "filename": "invoice_1_123456.pdf",
      "original_filename": "invoice.pdf",
      "user_prompt": "Extract only vendor details",
      "status": "completed",
      "extracted_data": {...},
      "error_message": null,
      "created_at": "2024-01-01T12:00:00",
      "updated_at": "2024-01-01T12:00:05"
    }
  ],
  "total": 15
}
```

### Get Invoice Details
```
GET /invoices/{invoice_id}
Authorization: Bearer <token>

Response (200):
{
  "id": 1,
  "filename": "invoice_1_123456.pdf",
  "original_filename": "invoice.pdf",
  "user_prompt": "Extract only vendor details",
  "status": "completed",
  "extracted_data": {
    "invoice_number": "INV-001",
    "invoice_date": "2024-01-01",
    "vendor_name": "ACME Corp",
    ...
  },
  "error_message": null,
  "created_at": "2024-01-01T12:00:00",
  "updated_at": "2024-01-01T12:00:05"
}
```

### Get Invoice HTML Report
```
GET /invoices/{invoice_id}/html
Authorization: Bearer <token>

Response (200):
{
  "html": "<html>...</html>",
  "filename": "invoice.pdf"
}
```

### Delete Invoice
```
DELETE /invoices/{invoice_id}
Authorization: Bearer <token>

Response (200):
{
  "message": "Invoice deleted successfully"
}
```

---

## Error Responses

### 400 Bad Request
```json
{
  "detail": "Invalid file format. Only PDF, JPEG, PNG, and WebP files are allowed"
}
```

### 401 Unauthorized
```json
{
  "detail": "Could not validate credentials"
}
```

### 403 Forbidden
```json
{
  "detail": "Not authorized to access this invoice"
}
```

### 404 Not Found
```json
{
  "detail": "Invoice not found"
}
```

### 500 Internal Server Error
```json
{
  "detail": "Internal server error"
}
```

---

## Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 500 | Server Error |

---

## Invoice Status Values

- `pending` - Queued for processing
- `processing` - Currently being processed by AI
- `completed` - Successfully extracted
- `failed` - Processing failed

---

## Extracted Data Structure

```json
{
  "invoice_number": "INV-2024-001",
  "invoice_date": "2024-01-15",
  "due_date": "2024-02-15",
  "vendor_name": "ACME Corporation",
  "vendor_address": "123 Business St, City, State 12345",
  "vendor_contact": "+1-555-0123",
  "customer_name": "Your Company",
  "customer_address": "456 Main St, City, State 54321",
  "line_items": [
    {
      "description": "Product/Service A",
      "quantity": 5,
      "unit_price": "$100.00",
      "amount": "$500.00"
    }
  ],
  "subtotal": "$500.00",
  "tax_amount": "$50.00",
  "total_amount": "$550.00",
  "payment_terms": "Net 30",
  "notes": "Thank you for your business"
}
```

---

## Rate Limiting

No rate limiting implemented currently. Consider implementing for production:
- 100 requests per minute per user
- 1000 requests per hour per API key
- 10 concurrent uploads per user

---

## File Upload Limits

- Maximum file size: 25MB
- Supported formats: PDF, JPEG, PNG, WebP
- File validation on upload

---

## Testing with cURL

```bash
# Register
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123","full_name":"Test User"}'

# Login
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "email=test@example.com&password=test123"

# Upload Invoice
curl -X POST http://localhost:8000/api/invoices/upload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@invoice.pdf" \
  -F "user_prompt=Extract all details"

# List Invoices
curl -X GET "http://localhost:8000/api/invoices/list" \
  -H "Authorization: Bearer YOUR_TOKEN"
```
