import { supabaseAdmin } from '@/lib/supabase-admin';
import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getUser } from '@/lib/actions/users';

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error } = await supabaseAdmin
      .rpc('get_user_dashboard_data', { p_user_id: userId })
      .single();

    if (error) {
      console.error('Failed to fetch dashboard data:', error);
      
      if (
        error.code === 'P0001' &&
        error.message &&
        error.message.includes('not found')
      ) {
        // Fetch user info from Clerk
        const user = await getUser();
        
        if (!user) {
          return NextResponse.json({ error: 'Failed to fetch user from Clerk' }, { status: 500 });
        }

        // Extract user data with correct property names
        const email = user.emailAddresses?.[0]?.emailAddress || null;
        const userMetadata = user.publicMetadata || {};

        const { error: upsertError } = await supabaseAdmin
          .from('profiles')
          .upsert({
            id: user.id,
            email,
            role: (userMetadata.role as string) || 'user',
            avatar_url: user.imageUrl || null,
            created_at: new Date().toISOString(),
            first_name: user.firstName || null,
            last_name: user.lastName || null,
          });

        if (upsertError) {
          console.error('Failed to upsert profile:', upsertError);
          return NextResponse.json({ error: 'Failed to create user profile' }, { status: 500 });
        }

        // Try fetching dashboard data again
        const { data: retryData, error: retryError } = await supabaseAdmin
          .rpc('get_user_dashboard_data', { p_user_id: userId })
          .single();

        if (retryError) {
          console.error('Failed to fetch dashboard data after upsert:', retryError);
          return NextResponse.json({ error: 'Failed to fetch dashboard data' }, { status: 500 });
        }

        return NextResponse.json(retryData, { status: 200 });
      }
      
      return NextResponse.json({ error: 'Failed to fetch dashboard data' }, { status: 500 });
    }

    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    console.error('Dashboard API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

