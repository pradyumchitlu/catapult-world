import { Router, Response } from 'express';
import { AuthenticatedRequest, requireAuth } from '../middleware/auth';
import supabase from '../lib/supabase';
import { evaluateWorker } from '../services/gemini';

const router = Router();

/**
 * POST /api/chat
 * AI chatbot endpoint for worker evaluation
 */
router.post('/', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { worker_id, message, session_id } = req.body;
    const clientId = req.userId!;

    if (!worker_id || !message) {
      return res.status(400).json({ error: 'Missing worker_id or message' });
    }

    // Get worker profile
    const { data: profile, error: profileError } = await supabase
      .from('worker_profiles')
      .select('*, user:user_id(display_name)')
      .eq('user_id', worker_id)
      .single();

    if (profileError || !profile) {
      return res.status(404).json({ error: 'Worker not found' });
    }

    // Get worker's reviews
    const { data: reviews } = await supabase
      .from('reviews')
      .select('*, reviewer:reviewer_id(display_name)')
      .eq('worker_id', worker_id)
      .eq('status', 'active')
      .order('stake_amount', { ascending: false })
      .limit(10);

    // Get or create chat session
    let session;
    if (session_id) {
      const { data: existingSession } = await supabase
        .from('chat_sessions')
        .select('*')
        .eq('id', session_id)
        .eq('client_id', clientId)
        .single();

      session = existingSession;
    }

    if (!session) {
      const { data: newSession, error: sessionError } = await supabase
        .from('chat_sessions')
        .insert({
          client_id: clientId,
          worker_id,
          messages: [],
        })
        .select()
        .single();

      if (sessionError) throw sessionError;
      session = newSession;
    }

    // Add user message to session
    const messages = session.messages || [];
    messages.push({
      role: 'user',
      content: message,
      timestamp: new Date().toISOString(),
    });

    // Generate AI response
    const aiResponse = await evaluateWorker(
      {
        name: (profile as any).user?.display_name || 'Worker',
        profile,
        reviews: reviews || [],
      },
      message,
      messages.slice(0, -1) // Previous messages for context
    );

    // Add AI response to session
    messages.push({
      role: 'assistant',
      content: aiResponse,
      timestamp: new Date().toISOString(),
    });

    // Update session
    await supabase
      .from('chat_sessions')
      .update({
        messages,
        updated_at: new Date().toISOString(),
      })
      .eq('id', session.id);

    // Log the query
    await supabase.from('query_log').insert({
      worker_id,
      querier_id: clientId,
      query_type: 'chat_query',
    });

    return res.json({
      session_id: session.id,
      message: aiResponse,
    });
  } catch (error) {
    console.error('Chat error:', error);
    return res.status(500).json({ error: 'Chat failed' });
  }
});

export default router;
