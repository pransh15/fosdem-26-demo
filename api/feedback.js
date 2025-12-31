import { kv } from '@vercel/kv';

export const config = {
  runtime: 'edge',
};

export default async function handler(req) {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await req.json();
    
    const feedback = {
      ...body,
      timestamp: new Date().toISOString(),
      id: `feedback-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };

    // Store in KV
    await kv.set(feedback.id, feedback);
    await kv.lpush('feedback-list', feedback.id);

    return new Response(JSON.stringify({ success: true, id: feedback.id }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('Error saving feedback:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}