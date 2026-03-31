import dotenv from 'dotenv';

dotenv.config({ path: process.env.ENV_FILE || '.env.example' });

const devAuthBypass = process.env.DEV_AUTH_BYPASS === 'true';
if ((process.env.NODE_ENV || 'development') === 'production' && devAuthBypass) {
	throw new Error('DEV_AUTH_BYPASS must never be enabled in production');
}

const required = [
	'MONGO_URI',
	'JWT_ACCESS_SECRET',
	'JWT_REFRESH_SECRET',
	'AI_SERVICE_URL',
];

for (const key of required) {
	if (!process.env[key]) {
		console.error(`Missing required environment variable: ${key}`);
		throw new Error(`Missing required environment variable: ${key}`);
	}
}

export const env = {
	nodeEnv: process.env.NODE_ENV || 'development',
	devAuthBypass,
	devAuthEmail: process.env.DEV_AUTH_EMAIL || 'dev@legal-helper.local',
	devAuthName: process.env.DEV_AUTH_NAME || 'Developer',
	port: Number(process.env.PORT || 4000),
	mongoUri: process.env.MONGO_URI,
	jwtAccessSecret: process.env.JWT_ACCESS_SECRET,
	jwtRefreshSecret: process.env.JWT_REFRESH_SECRET,
	jwtAccessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
	jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
	aiServiceUrl: process.env.AI_SERVICE_URL,
	internalApiKey: process.env.INTERNAL_API_KEY || '',
	uploadDir: process.env.UPLOAD_DIR || 'uploads',
	maxUploadSizeMb: Number(process.env.MAX_UPLOAD_SIZE_MB || 20),
	corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
};
