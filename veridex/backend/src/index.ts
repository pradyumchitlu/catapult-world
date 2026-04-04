import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Import routes
import authRoutes from './routes/auth';
import reputationRoutes from './routes/reputation';
import queryRoutes from './routes/query';
import stakeRoutes from './routes/stake';
import reviewRoutes from './routes/review';
import contextualRoutes from './routes/contextual';
import agentRoutes from './routes/agent';
import chatRoutes from './routes/chat';

const app = express();
const PORT = process.env.PORT || 8000;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
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
app.use('/api', queryRoutes); // /api/trust/:veridexId, /api/agent/:agentId
app.use('/api/stake', stakeRoutes);
app.use('/api/review', reviewRoutes);
app.use('/api', contextualRoutes); // /api/contextual-score
app.use('/api/agent', agentRoutes);
app.use('/api/chat', chatRoutes);

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err.message);
  res.status(500).json({ error: 'Internal server error', message: err.message });
});

// Start server
app.listen(PORT, () => {
  console.log(`Veridex API server running on port ${PORT}`);
});

export default app;
