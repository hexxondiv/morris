import { supabaseAdmin } from "@/lib/supabase-admin";

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin.rpc('get_marquee_data');
    
    if (error) {
      console.error('RPC Error:', error);
      return Response.json({ error: 'Failed to fetch marquee data' }, { status: 500 });
    }
    
    return Response.json(data || []);
  } catch (err) {
    console.error('API Error:', err);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}