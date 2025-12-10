// Vercel Serverless Function - Markets API (List and Create)
// File: api/markets/index.ts

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export default async function handler(req: any, res: any) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    switch (req.method) {
      case 'GET':
        // Get all markets
        console.log('Fetching all markets...');
        const { data, error } = await supabase
          .from('markets')
          .select('*')
          .order('name', { ascending: true });

        if (error) {
          console.error('Supabase GET error:', error);
          throw error;
        }

        console.log('Fetched markets:', data?.length || 0);
        return res.status(200).json(data || []);

      case 'POST':
        // Create single market
        console.log('Creating market...');
        const { data: createData, error: createError } = await supabase
          .from('markets')
          .insert(req.body)
          .select()
          .single();

        if (createError) {
          console.error('Supabase POST error:', createError);
          throw createError;
        }

        console.log('Market created:', createData?.id);
        return res.status(201).json(createData);

      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error: any) {
    console.error('Markets API Error:', error);
    return res.status(500).json({ 
      error: error.message || 'Internal server error',
      details: error
    });
  }
}

