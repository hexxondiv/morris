// app/api/settings/public/route.ts - Public settings endpoint

import { NextRequest, NextResponse } from 'next/server';
import { getPublicSettings } from '@/lib/actions/settings';

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const keys = url.searchParams.get('keys')?.split(',');
    
    let settings = await getPublicSettings();
    
    // Filter by keys if specified
    if (keys && keys.length > 0) {
      const filteredSettings: Record<string, any> = {};
      for (const key of keys) {
        if (settings[key as keyof typeof settings] !== undefined) {
          filteredSettings[key] = settings[key as keyof typeof settings];
        }
      }
      settings = filteredSettings;
    }
    
    // Set aggressive caching headers for public settings
    const response = NextResponse.json(settings);
    response.headers.set('Cache-Control', 's-maxage=300, stale-while-revalidate=60');
    response.headers.set('CDN-Cache-Control', 'max-age=300');
    
    return response;
  } catch (error: any) {
    console.error('Public settings API error:', error);
    return NextResponse.json({ 
      error: error.message || 'Failed to fetch public settings' 
    }, { status: 500 });
  }
}
