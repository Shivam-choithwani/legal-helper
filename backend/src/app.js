import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import morgan from 'morgan';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { apiRouter } from './routes/index.js';
import { errorMiddleware } from './middleware/error.middleware.js';
import dns from 'dns';

dns.setServers(['8.8.8.8', '1.1.1.1']);
const app = express();

app.use(helmet());
app.use(
	cors({
		origin: env.corsOrigin,
		credentials: true,
	}),
);

app.use(
	rateLimit({
		windowMs: 60 * 1000,
		max: 120,
		standardHeaders: true,
		legacyHeaders: false,
	}),
);

app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

app.get('/health', (_req, res) => {
	res.json({ status: 'ok' });
});

app.use('/api', apiRouter);
app.use('/api/v1', apiRouter);

app.use(errorMiddleware);

process.on('unhandledRejection', reason => {
	logger.error('Unhandled rejection', { reason });
});

process.on('uncaughtException', error => {
	logger.error('Uncaught exception', { error });
});

export { app };
