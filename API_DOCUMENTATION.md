# 📚 Real Estate 200 Units - API Documentation

**Version**: v3.25.0  
**Last Updated**: 2025-11-20  
**Base URL**: `https://real-estate-200units-v2.pages.dev`

---

## 🔐 Authentication

All API endpoints (except `/api/auth/login` and `/api/property-templates/presets`) require authentication.

**Authentication Method**: JWT Bearer Token

```bash
Authorization: Bearer <your_jwt_token>
```

---

## 📋 API Endpoints

### 🔑 Authentication (`/api/auth`)

#### POST /api/auth/login
**Description**: User login  
**Authentication**: Not required  
**Request Body**:
```json
{
  "email": "navigator-187@docomo.ne.jp",
  "password": "kouki187",
  "rememberMe": false
}
```
**Response**: 200 OK
```json
{
  "token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "user": {
    "id": "admin-001",
    "email": "navigator-187@docomo.ne.jp",
    "name": "管理者",
    "role": "ADMIN",
    "company_name": null
  }
}
```

#### POST /api/auth/logout
**Description**: User logout  
**Authentication**: Required  
**Response**: 200 OK
```json
{
  "message": "Logged out successfully"
}
```

---

### 📁 Deals Management (`/api/deals`)

#### GET /api/deals
**Description**: Get deals list  
**Authentication**: Required  
**Query Parameters**:
- `limit` (optional): Number of results (default: 10)
- `offset` (optional): Pagination offset (default: 0)

**Response**: 200 OK
```json
{
  "deals": [
    {
      "id": "deal-001",
      "title": "川崎市幸区塚越四丁目 アパート用地",
      "status": "NEW",
      "buyer_id": "admin-001",
      "seller_id": "seller-001",
      "location": "川崎市幸区塚越四丁目",
      "station": "矢向",
      "walk_minutes": 4,
      "land_area": "218.14㎡（実測）",
      "zoning": "第一種住居地域",
      "building_coverage": "60%",
      "floor_area_ratio": "200%",
      "road_info": "北側私道 幅員2.0m 接道2.0m",
      "current_status": "古家あり",
      "desired_price": "8,000万円",
      "reply_deadline": "2025-11-22 00:29:35",
      "created_at": "2025-11-20 00:29:35",
      "updated_at": "2025-11-20 00:29:35"
    }
  ]
}
```

#### GET /api/deals/:id
**Description**: Get deal details  
**Authentication**: Required  
**Path Parameters**:
- `id`: Deal ID

**Response**: 200 OK
```json
{
  "deal": { /* deal object */ }
}
```

#### POST /api/deals
**Description**: Create new deal (Admin only)  
**Authentication**: Required (ADMIN role)  
**Request Body**:
```json
{
  "title": "テスト案件：品川区 商業ビル用地",
  "seller_id": "seller-001",
  "location": "品川区大井1-1-1",
  "station": "大井町",
  "walk_minutes": 3,
  "land_area": "500.00㎡",
  "zoning": "商業地域",
  "building_coverage": "80%",
  "floor_area_ratio": "600%",
  "road_info": "東側公道 幅員8.0m 接道15.0m",
  "current_status": "駐車場",
  "desired_price": "3億円"
}
```

**Response**: 201 Created
```json
{
  "deal": {
    "id": "uWKg1HwG-2tRQDpwHwmfK",
    "title": "テスト案件：品川区 商業ビル用地",
    "status": "NEW",
    /* ... */
  }
}
```

#### PUT /api/deals/:id
**Description**: Update deal  
**Authentication**: Required  
**Path Parameters**:
- `id`: Deal ID

**Request Body** (partial update):
```json
{
  "status": "REPLIED",
  "desired_price": "9億円",
  "remarks": "価格交渉により値下げしました"
}
```

**Response**: 200 OK
```json
{
  "deal": { /* updated deal object */ }
}
```

#### DELETE /api/deals/:id
**Description**: Delete deal (Admin only)  
**Authentication**: Required (ADMIN role)  
**Path Parameters**:
- `id`: Deal ID

**Response**: 200 OK
```json
{
  "message": "Deal deleted successfully"
}
```

---

### 💬 Messages (`/api/messages`)

#### GET /api/messages/deals/:dealId
**Description**: Get messages for a deal  
**Authentication**: Required  
**Path Parameters**:
- `dealId`: Deal ID

**Query Parameters** (optional):
- `search`: Search in message content
- `hasAttachments`: Filter by attachments (true/false)
- `fromDate`: Filter from date
- `toDate`: Filter to date
- `senderId`: Filter by sender

**Response**: 200 OK
```json
{
  "messages": [
    {
      "id": "3CnRykWM5RcsJfkISezBV",
      "deal_id": "deal-001",
      "sender_id": "admin-001",
      "content": "テストメッセージ：案件についての確認事項です。@管理者 ご確認をお願いします。",
      "has_attachments": 0,
      "is_read_by_buyer": 1,
      "is_read_by_seller": 0,
      "sender_name": "管理者",
      "sender_role": "ADMIN"
    }
  ]
}
```

#### POST /api/messages/deals/:dealId
**Description**: Create new message  
**Authentication**: Required  
**Path Parameters**:
- `dealId`: Deal ID

**Request Body**:
```json
{
  "content": "テストメッセージ：案件についての確認事項です。@管理者 ご確認をお願いします。"
}
```

**Response**: 201 Created
```json
{
  "message": {
    "id": "3CnRykWM5RcsJfkISezBV",
    "deal_id": "deal-001",
    "sender_id": "admin-001",
    "content": "テストメッセージ...",
    "has_attachments": 0,
    "is_read_by_buyer": 1,
    "is_read_by_seller": 0
  }
}
```

---

### 📄 Property Templates (`/api/property-templates`)

#### GET /api/property-templates
**Description**: Get all templates (presets + custom)  
**Authentication**: Required  
**Response**: 200 OK
```json
{
  "success": true,
  "templates": [
    {
      "id": "preset_residential_land",
      "template_name": "住宅用地（標準）",
      "template_type": "residential_land",
      "template_data": "{...}",
      "description": "一般的な住宅用地の標準設定",
      "is_shared": 1,
      "is_preset": true,
      "use_count": 0
    }
  ],
  "presetCount": 4,
  "customCount": 0
}
```

#### GET /api/property-templates/presets
**Description**: Get preset templates only  
**Authentication**: Not required  
**Response**: 200 OK
```json
{
  "success": true,
  "presets": [
    {
      "id": "preset_residential_land",
      "key": "residential_land",
      "template_name": "住宅用地（標準）",
      "template_type": "residential_land",
      "template_data": { /* data object */ },
      "description": "一般的な住宅用地の標準設定",
      "is_preset": true
    }
  ],
  "count": 4
}
```

#### GET /api/property-templates/:id
**Description**: Get template details  
**Authentication**: Required  
**Path Parameters**:
- `id`: Template ID (e.g., "preset_apartment_land" or custom ID)

**Response**: 200 OK
```json
{
  "success": true,
  "template": {
    "id": "1",
    "template_name": "テスト用テンプレート：都心マンション用地",
    "template_type": "apartment_land",
    "template_data": { /* data object */ },
    "is_preset": false
  }
}
```

#### POST /api/property-templates
**Description**: Create custom template  
**Authentication**: Required  
**Request Body**:
```json
{
  "template_name": "テスト用テンプレート：都心マンション用地",
  "template_type": "apartment_land",
  "template_data": {
    "zoning": "商業地域",
    "building_coverage_ratio": 80,
    "floor_area_ratio": 600,
    "front_road_width": 12,
    "estimated_units": 300,
    "land_shape": "整形地",
    "topography": "平坦",
    "utility_status": "上下水道・都市ガス・光ファイバー完備"
  },
  "is_shared": false
}
```

**Response**: 201 Created
```json
{
  "success": true,
  "message": "テンプレートを作成しました",
  "templateId": 1
}
```

#### PUT /api/property-templates/:id
**Description**: Update custom template  
**Authentication**: Required (must be owner)  
**Path Parameters**:
- `id`: Template ID

**Request Body**: Same as POST
**Response**: 200 OK

#### DELETE /api/property-templates/:id
**Description**: Delete custom template  
**Authentication**: Required (must be owner)  
**Path Parameters**:
- `id`: Template ID

**Response**: 200 OK
```json
{
  "success": true,
  "message": "テンプレートを削除しました"
}
```

---

### 📎 Files Management (`/api/files`)

#### GET /api/files/deals/:dealId
**Description**: Get files for a deal  
**Authentication**: Required  
**Path Parameters**:
- `dealId`: Deal ID

**Response**: 200 OK
```json
{
  "files": [
    {
      "id": "lRzG8CKiDNh7XVzdEyuKu",
      "deal_id": "deal-001",
      "uploader_id": "admin-001",
      "filename": "test.pdf",
      "file_type": "OTHER",
      "size_bytes": 424,
      "storage_path": "files/deal-001/Nn4fMMA66W3wUljUVbr-C-test.pdf",
      "is_archived": 0
    }
  ],
  "storage": {
    "used": 424,
    "max": 52428800,
    "percentage": 0
  }
}
```

#### POST /api/files/deals/:dealId
**Description**: Upload file  
**Authentication**: Required  
**Path Parameters**:
- `dealId`: Deal ID

**Request**: multipart/form-data
- `file`: File to upload (max 10MB)

**Allowed File Types**:
- PDF, JPEG, PNG, GIF, Excel, Word, ZIP, TXT

**Response**: 201 Created
```json
{
  "file": {
    "id": "lRzG8CKiDNh7XVzdEyuKu",
    "deal_id": "deal-001",
    "uploader_id": "admin-001",
    "filename": "test.pdf",
    "file_type": "OTHER",
    "size_bytes": 424,
    "storage_path": "files/deal-001/...",
    "is_archived": 0
  },
  "message": "File uploaded successfully"
}
```

---

### ⚙️ OCR Settings (`/api/ocr-settings`)

#### GET /api/ocr-settings
**Description**: Get OCR settings  
**Authentication**: Required  
**Response**: 200 OK
```json
{
  "success": true,
  "settings": {
    "auto_save_history": 1,
    "default_confidence_threshold": 0.7,
    "enable_batch_processing": 1,
    "max_batch_size": 20,
    "is_default": true
  }
}
```

#### PUT /api/ocr-settings
**Description**: Update OCR settings  
**Authentication**: Required  
**Request Body**:
```json
{
  "default_confidence_threshold": 0.8,
  "enable_batch_processing": 1,
  "max_batch_size": 30
}
```

**Response**: 200 OK
```json
{
  "success": true,
  "message": "OCR設定を作成しました"
}
```

---

## 🔒 Security

### Authentication Flow
1. **Login**: POST `/api/auth/login` with email and password
2. **Receive Token**: Get JWT token in response
3. **Store Token**: Save token in localStorage or sessionStorage
4. **Use Token**: Include token in Authorization header for all API requests
5. **Logout**: POST `/api/auth/logout` to invalidate session

### Token Expiration
- **Without rememberMe**: 7 days
- **With rememberMe**: 30 days

### Permission Levels
- **ADMIN**: Full access to all features
- **AGENT**: Limited access, can only view/edit own deals

---

## 🚨 Error Responses

### Standard Error Format
```json
{
  "error": "Error message",
  "details": "Additional error details (optional)"
}
```

### Common Error Codes
- **400 Bad Request**: Invalid input data
- **401 Unauthorized**: Authentication required or invalid token
- **403 Forbidden**: Insufficient permissions
- **404 Not Found**: Resource not found
- **500 Internal Server Error**: Server-side error

---

## 📊 Testing Tips

### Using curl
```bash
# Login and get token
TOKEN=$(curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"navigator-187@docomo.ne.jp","password":"kouki187"}' \
  -s | jq -r '.token')

# Use token for authenticated requests
curl -X GET "http://localhost:3000/api/deals" \
  -H "Authorization: Bearer $TOKEN" \
  -s | jq '.'
```

### Performance Benchmarking
```bash
# Measure response time
curl -w "Response Time: %{time_total}s\nHTTP Code: %{http_code}\n" \
  -o /dev/null -s http://localhost:3000/api/health
```

---

## 🔍 Known Issues

### 1. File Upload API Path Confusion (Resolved in v3.25.0)
- **Issue**: Wrong endpoint path caused errors
- **Wrong**: `/api/files/upload?deal_id=deal-001`
- **Correct**: `/api/files/deals/deal-001`
- **Status**: ✅ Resolved

### 2. Chat API Path Confusion (Resolved in v3.24.0)
- **Issue**: Wrong endpoint path caused errors
- **Wrong**: `/api/messages?deal_id=deal-001`
- **Correct**: `/api/messages/deals/deal-001`
- **Status**: ✅ Resolved

---

## 📖 Additional Resources

- **Handover Documents**: `HANDOVER_V3.*.md`
- **Project README**: `README.md`
- **Database Seed**: `seed.sql`
- **Wrangler Config**: `wrangler.jsonc`

---

**Document Version**: v3.25.0  
**Maintained By**: Development Team  
**Contact**: For issues, check PM2 logs or GitHub issues
