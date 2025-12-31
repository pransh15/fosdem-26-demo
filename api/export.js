import { kv } from '@vercel/kv';

export const config = {
  runtime: 'edge',
};

export default async function handler(req) {
  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    // Get all feedback IDs
    const feedbackIds = await kv.lrange('feedback-list', 0, -1);
    
    // Get all feedback objects
    const allFeedback = [];
    for (const id of feedbackIds) {
      const feedback = await kv.get(id);
      if (feedback) {
        allFeedback.push(feedback);
      }
    }

    // Convert to CSV
    if (allFeedback.length === 0) {
      return new Response('No feedback data available', {
        status: 200,
        headers: { 'Content-Type': 'text/plain' },
      });
    }

    const headers = Object.keys(allFeedback[0]);
    const csvRows = [
      headers.join(','),
      ...allFeedback.map(obj =>
        headers.map(header => {
          const value = obj[header] || '';
          return typeof value === 'string' && value.includes(',') 
            ? `"${value}"` 
            : value;
        }).join(',')
      )
    ];

    return new Response(csvRows.join('\n'), {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename=fosdem-feedback.csv',
      },
    });
  } catch (error) {
    console.error('Error exporting feedback:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}