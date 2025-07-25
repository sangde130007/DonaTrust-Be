# Google OAuth Login - Hướng dẫn chi tiết

## 🔑 Authorization Code từ đâu?

**Authorization Code** trong Google OAuth2 flow được tạo ra từ Google Servers và gửi về ứng dụng của bạn thông qua callback URL.

## 🔄 Google OAuth2 Flow - Bước chi tiết

### **Bước 1: Frontend redirect user đến Google**

```javascript
// Frontend (React/Vue/Angular)
const GOOGLE_OAUTH_URL =
	'https://accounts.google.com/oauth/authorize?' +
	'client_id=YOUR_GOOGLE_CLIENT_ID&' +
	'redirect_uri=YOUR_REDIRECT_URI&' +
	'scope=openid email profile&' +
	'response_type=code&' +
	'state=random_state_string';

// User click "Login with Google" button
window.location.href = GOOGLE_OAUTH_URL;
```

### **Bước 2: User đăng nhập Google**

-   User được chuyển đến trang login của Google
-   User nhập email/password Google
-   User cho phép app truy cập thông tin (consent screen)

### **Bước 3: Google redirect về app với Authorization Code**

```
https://your-app.com/auth/google/callback?code=4/0AX4XfWi...&state=random_state_string
```

**➡️ `code=4/0AX4XfWi...` chính là Authorization Code!**

### **Bước 4: Frontend gửi code đến Backend**

```javascript
// Frontend gửi code đến backend DonaTrust
const response = await fetch('/api/auth/google', {
	method: 'POST',
	headers: { 'Content-Type': 'application/json' },
	body: JSON.stringify({
		code: '4/0AX4XfWi...', // Code từ Google
	}),
});
```

### **Bước 5: Backend exchange code lấy tokens**

```javascript
// DonaTrust Backend - authService.js
exports.googleLogin = async (code) => {
	// Exchange authorization code với Google
	const { tokens } = await client.getToken(code);

	// Verify và decode user info
	const ticket = await client.verifyIdToken({
		idToken: tokens.id_token,
		audience: process.env.GOOGLE_CLIENT_ID,
	});

	const payload = ticket.getPayload();
	const { sub: google_id, email, name, picture } = payload;

	// Tạo hoặc update user trong database
	// Return JWT token cho app
};
```

## 📋 Cấu hình Google OAuth

### **1. Tạo Google OAuth App**

1. Vào [Google Cloud Console](https://console.cloud.google.com/)
2. Tạo project mới hoặc chọn project existing
3. Enable Google+ API
4. Tạo OAuth 2.0 Client IDs

### **2. Cấu hình Redirect URIs**

```
Authorized redirect URIs:
- http://localhost:3000/auth/google/callback  (Development)
- https://yourdomain.com/auth/google/callback (Production)
```

### **3. Environment Variables (.env)**

```bash
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here
GOOGLE_REDIRECT_URI=http://localhost:3000/auth/google/callback
```

## 🎯 DonaTrust OAuth Implementation

### **API Endpoint: POST /api/auth/google**

**Request:**

```json
{
	"code": "4/0AX4XfWi..."
}
```

**Response (Success):**

```json
{
	"token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
	"user": {
		"user_id": "user_abc123",
		"full_name": "Nguyễn Văn A",
		"email": "user@gmail.com",
		"role": "donor",
		"email_verified": true,
		"profile_image": "https://lh3.googleusercontent.com/..."
	}
}
```

**Response (Error):**

```json
{
	"status": "error",
	"message": "Mã Google OAuth không hợp lệ"
}
```

## 🔧 Frontend Implementation Example

### **React Example:**

```jsx
import { useGoogleLogin } from '@react-oauth/google';

function GoogleLoginButton() {
	const login = useGoogleLogin({
		onSuccess: async (response) => {
			// response.code chính là authorization code!
			const result = await fetch('/api/auth/google', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ code: response.code }),
			});

			const data = await result.json();
			if (data.token) {
				localStorage.setItem('token', data.token);
				// Redirect to dashboard
			}
		},
		flow: 'auth-code', // Important: use auth-code flow
	});

	return <button onClick={login}>Login with Google</button>;
}
```

### **Vanilla JavaScript Example:**

```javascript
function googleLogin() {
	const params = new URLSearchParams({
		client_id: 'YOUR_GOOGLE_CLIENT_ID',
		redirect_uri: window.location.origin + '/auth/google/callback',
		scope: 'openid email profile',
		response_type: 'code',
		state: Math.random().toString(36),
	});

	window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

// Handle callback
if (window.location.pathname === '/auth/google/callback') {
	const urlParams = new URLSearchParams(window.location.search);
	const code = urlParams.get('code');

	if (code) {
		// Send code to backend
		fetch('/api/auth/google', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ code }),
		})
			.then((response) => response.json())
			.then((data) => {
				if (data.token) {
					localStorage.setItem('token', data.token);
					window.location.href = '/dashboard';
				}
			});
	}
}
```

## 🚨 Lỗi thường gặp

### **1. "Authorization code đã được sử dụng"**

-   Code chỉ sử dụng được 1 lần
-   Sau khi exchange thành công, code bị vô hiệu hóa
-   **Solution**: User phải login lại để có code mới

### **2. "Redirect URI mismatch"**

-   URI trong Google Console khác với URI trong request
-   **Solution**: Kiểm tra và đồng bộ redirect URIs

### **3. "Invalid client"**

-   GOOGLE_CLIENT_ID hoặc GOOGLE_CLIENT_SECRET sai
-   **Solution**: Kiểm tra lại credentials trong .env

### **4. "Code exchange failed"**

-   Thường do network timeout hoặc Google API error
-   **Solution**: Retry mechanism hoặc kiểm tra network

## 🔒 Security Best Practices

1. **Validate State Parameter**: Prevent CSRF attacks
2. **Use HTTPS**: Bắt buộc cho production
3. **Short-lived Codes**: Authorization code tự động expire
4. **Token Rotation**: Refresh tokens định kỳ
5. **Scope Minimal**: Chỉ request quyền cần thiết

## 📊 Testing Google OAuth

### **1. Test với Postman**

```bash
# Step 1: Get authorization code manually
# Visit Google OAuth URL in browser, copy code from callback

# Step 2: Test backend endpoint
POST http://localhost:3000/api/auth/google
Content-Type: application/json

{
  "code": "4/0AX4XfWi..."
}
```

### **2. Test với Demo Script**

```javascript
// test-google-oauth.js
const axios = require('axios');

async function testGoogleOAuth() {
	try {
		const code = 'PASTE_YOUR_CODE_HERE'; // Get from Google OAuth flow

		const response = await axios.post('http://localhost:3000/api/auth/google', {
			code: code,
		});

		console.log('✅ Google OAuth Success:', response.data);
	} catch (error) {
		console.log('❌ Google OAuth Error:', error.response?.data);
	}
}

testGoogleOAuth();
```

## 🎉 Tóm tắt

**Authorization Code từ đâu?**

1. 🌐 **Google Servers** tạo ra sau khi user login thành công
2. 🔄 **Callback URL** nhận code từ Google redirect
3. 📨 **Frontend** gửi code đến backend DonaTrust
4. 🔑 **Backend** exchange code lấy access token
5. 👤 **User Info** được lấy từ Google API
6. 🏠 **DonaTrust** tạo account và trả JWT token

**Flow hoàn chỉnh**: User → Google Login → Google Callback → Frontend → Backend → Database → JWT Token → Authentication Success! 🎯
