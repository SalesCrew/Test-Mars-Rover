// Vercel Serverless Function - Markets Import API
// File: api/markets/import.ts

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export default async function handler(req: any, res: any) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const markets = req.body;

    if (!Array.isArray(markets) || markets.length === 0) {
      return res.status(400).json({ error: 'Invalid request: markets array required' });
    }

    console.log('Importing markets:', markets.length);

    // Insert markets using upsert (insert or update if exists)
    const { data, error } = await supabase
      .from('markets')
      .upsert(markets, { 
        onConflict: 'id',
        ignoreDuplicates: false 
      })
      .select();

    if (error) {
      console.error('Supabase error:', error);
      throw error;
    }

    console.log('Successfully imported:', data?.length);

    return res.status(200).json({
      success: data?.length || 0,
      failed: markets.length - (data?.length || 0),
    });
  } catch (error: any) {
    console.error('Import API Error:', error);
    return res.status(500).json({ 
      error: error.message || 'Internal server error',
      details: error
    });
  }
}

