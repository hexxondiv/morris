import { supabaseAdmin } from '@/lib/supabase-admin';
import { verifyWebhook } from '@clerk/nextjs/webhooks'
import { NextRequest } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const event = await verifyWebhook(req);
    console.log('Webhook event received:', event);
    if (event.type === 'user.created' || event.type === 'user.updated') {
      const { id, email_addresses, first_name, last_name } = event.data;
      const email = email_addresses[0]?.email_address;

      if (email) {
        console.log(`User ${id} email: ${email} created/updated`);

        
        const { error } = await supabaseAdmin
          .from('profiles')
          .upsert({
            id,
            email,
            first_name: first_name || null,
            last_name: last_name || null,
            updated_at: new Date().toISOString(),
          });

        if (error) throw error;
      }
    } else if (event.type === 'user.deleted') {
      const { id } = event.data;
      const { error } = await supabaseAdmin
        .from('profiles')
        .delete()
        .eq('id', id);

      if (error) throw error;
    }

    return new Response('Webhook received', { status: 200 })
  } catch (err) {
    console.error('Error verifying webhook:', err)
    return new Response('Error verifying webhook', { status: 400 })
  }
}
