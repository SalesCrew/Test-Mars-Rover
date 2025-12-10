// Vercel Serverless Function - Single Market API
// File: api/markets/[id].ts

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export default async function handler(req: any, res: any) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const { id } = req.query;

    if (!id) {
      return res.status(400).json({ error: 'Market ID required' });
    }

    switch (req.method) {
      case 'GET':
        // Get single market
        const { data: getData, error: getError } = await supabase
          .from('markets')
          .select('*')
          .eq('id', id)
          .single();

        if (getError) throw getError;
        return res.status(200).json(getData);

      case 'PUT':
        // Update market
        const { data: updateData, error: updateError } = await supabase
          .from('markets')
          .update(req.body)
          .eq('id', id)
          .select()
          .single();

        if (updateError) throw updateError;
        return res.status(200).json(updateData);

      case 'DELETE':
        // Delete market
        const { error: deleteError } = await supabase
          .from('markets')
          .delete()
          .eq('id', id);

        if (deleteError) throw deleteError;
        return res.status(204).end();

      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error: any) {
    console.error('Market API Error:', error);
    return res.status(500).json({ 
      error: error.message || 'Internal server error',
      details: error
    });
  }
}

