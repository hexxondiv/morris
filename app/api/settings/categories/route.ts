// app/api/settings/categories/route.ts - Categories endpoint

import { NextResponse } from 'next/server';
import { getSettingCategories } from '@/lib/actions/settings';

export async function GET() {
  try {
    const categories = await getSettingCategories();
    
    const response = NextResponse.json(categories);
    response.headers.set('Cache-Control', 's-maxage=3600, stale-while-revalidate=300');
    
    return response;
  } catch (error: any) {
    console.error('Categories API error:', error);
    return NextResponse.json({ 
      error: error.message || 'Failed to fetch categories' 
    }, { status: 500 });
  }
}