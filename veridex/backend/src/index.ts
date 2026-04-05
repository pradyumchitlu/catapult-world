import './loadEnv';

import express from 'express';
import cors from 'cors';

// Import routes
import authRoutes from './routes/auth';
import reputationRoutes from './routes/reputation';
import queryRoutes from './routes/query';
import stakeRoutes from './routes/stake';
import reviewRoutes from './routes/review';
import contextualRoutes from './routes/contextual';
import agentRoutes from './routes/agent';
import chatRoutes from './routes/chat';
import walletRoutes from './routes/wallet';
import contractRoutes from './routes/contract';
import oauthRoutes from './routes/oauth';

const app = express();
const PORT = process.env.PORT || 8000;

// Middleware
const allowedOrigins = [
  'http://localhost:3000',
  ...(process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : []),
];
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, Postman)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
}));
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Mount routes
app.use('/api/auth', authRoutes);
app.use('/api/reputation', reputationRoutes);
app.use('/api', queryRoutes); // /api/trust/:veridexId
app.use('/api/stake', stakeRoutes);
app.use('/api/review', reviewRoutes);
app.use('/api', contextualRoutes); // /api/contextual-score
app.use('/api/agent', agentRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/contract', contractRoutes);
app.use('/api/oauth', oauthRoutes);

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err.message);
  res.status(500).json({ error: 'Internal server error', message: err.message });
});

// Start server only outside tests so supertest can import the app without opening a socket.
if (process.env.NODE_ENV !== 'test') {
  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`Veridex API server running on port ${PORT}`);
  });
}

export default app;
