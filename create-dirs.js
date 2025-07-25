const fs = require('fs');
const path = require('path');

// Create directories if they don't exist
const dirs = ['uploads', 'uploads/avatars', 'uploads/campaigns', 'uploads/documents', 'uploads/reports'];

dirs.forEach((dir) => {
	if (!fs.existsSync(dir)) {
		fs.mkdirSync(dir, { recursive: true });
		console.log(`✅ Created directory: ${dir}`);
	} else {
		console.log(`📁 Directory already exists: ${dir}`);
	}
});

console.log('🎉 All upload directories are ready!');
