# Campaign Detail API - Hướng dẫn sử dụng

## Endpoint mới đã thêm

### `GET /api/admin/campaigns/{id}`

**Mô tả**: Lấy thông tin chi tiết của một campaign (bao gồm cả campaign pending)

**Quyền truy cập**: Chỉ dành cho Admin

**Headers**:

```
Authorization: Bearer {token}
Content-Type: application/json
```

**URL Parameters**:

-   `id` (string, required): ID của campaign cần xem

**Response**:

```json
{
	"campaign_id": "uuid",
	"title": "Tên campaign",
	"description": "Mô tả ngắn",
	"detailed_description": "Mô tả chi tiết",
	"goal_amount": 100000000,
	"current_amount": 0,
	"start_date": "2024-01-01",
	"end_date": "2024-12-31",
	"category": "education",
	"status": "pending",
	"approval_status": "pending",
	"rejection_reason": null,
	"location": "Hà Nội",
	"beneficiaries": "Trẻ em vùng cao",
	"expected_impact": "Hỗ trợ 1000 trẻ em",
	"image_url": "/uploads/campaigns/image.jpg",
	"gallery_images": ["/uploads/campaigns/img1.jpg"],
	"documents": ["/uploads/documents/doc1.pdf"],
	"charity": {
		"charity_id": "uuid",
		"name": "Tên tổ chức",
		"verification_status": "verified",
		"logo_url": "/uploads/avatars/logo.jpg",
		"phone": "0901234567",
		"email": "charity@example.com",
		"address": "123 ABC Street",
		"city": "Hà Nội",
		"user": {
			"user_id": "uuid",
			"full_name": "Người đại diện",
			"email": "user@example.com",
			"phone": "0901234567",
			"created_at": "2024-01-01T00:00:00.000Z"
		}
	},
	"donations": [
		{
			"donation_id": "uuid",
			"amount": 500000,
			"method": "bank_transfer",
			"tx_code": "TXN123456789",
			"message": "Chúc chiến dịch thành công",
			"is_anonymous": false,
			"created_at": "2024-01-01T00:00:00.000Z",
			"user": {
				"full_name": "Người donate",
				"email": "donor@example.com"
			}
		}
	],
	"created_at": "2024-01-01T00:00:00.000Z",
	"updated_at": "2024-01-01T00:00:00.000Z"
}
```

## Cách sử dụng

### 1. Lấy danh sách campaign pending

```bash
curl -X GET "http://localhost:3000/api/admin/campaigns/pending" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 2. Xem detail một campaign cụ thể

```bash
curl -X GET "http://localhost:3000/api/admin/campaigns/{campaign_id}" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 3. Sử dụng với JavaScript/Axios

```javascript
const token = 'your_admin_token';
const campaignId = 'campaign_uuid';

const response = await axios.get(`/api/admin/campaigns/${campaignId}`, {
	headers: {
		Authorization: `Bearer ${token}`,
	},
});

const campaignDetail = response.data;
console.log(campaignDetail);
```

## Thông tin trả về

### Thông tin chính của campaign:

-   **Cơ bản**: title, description, goal_amount, dates, category
-   **Trạng thái**: status, approval_status, rejection_reason
-   **Chi tiết**: location, beneficiaries, expected_impact
-   **Media**: image_url, gallery_images, documents

### Thông tin tổ chức từ thiện:

-   **Thông tin cơ bản**: name, contact info, address
-   **Trạng thái**: verification_status
-   **Người đại diện**: thông tin user tạo charity

### Danh sách donations gần đây:

-   10 donations mới nhất
-   Thông tin người donate (nếu không ẩn danh)
-   Số tiền, phương thức, mã giao dịch và tin nhắn

## Error Responses

### 401 Unauthorized

```json
{
	"status": "error",
	"message": "Token không hợp lệ"
}
```

### 403 Forbidden

```json
{
	"status": "error",
	"message": "Không có quyền truy cập"
}
```

### 404 Not Found

```json
{
	"status": "error",
	"message": "Không tìm thấy chiến dịch"
}
```

## Testing

Chạy demo script để test:

```bash
node demo-campaign-detail.js
```

Hoặc chạy test suite:

```bash
node test-api.js
```

## Workflow Admin

1. **Xem danh sách pending**: `GET /admin/campaigns/pending`
2. **Xem detail**: `GET /admin/campaigns/{id}`
3. **Phê duyệt**: `PUT /admin/campaigns/{id}/approve`
4. **Từ chối**: `PUT /admin/campaigns/{id}/reject`

## Lưu ý

-   Endpoint này chỉ dành cho admin
-   Có thể xem được tất cả campaigns (pending, approved, rejected)
-   Thông tin donations chỉ hiển thị 10 record gần nhất
-   Hỗ trợ xem media files và documents đính kèm
