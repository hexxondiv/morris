// app/api/settings/validate/route.ts - Validation endpoint

import { NextRequest, NextResponse } from 'next/server';
import { validateSettingValue } from '@/lib/actions/settings';

export async function POST(request: NextRequest) {
  try {
    const { key, value } = await request.json();
    
    if (!key || value === undefined) {
      return NextResponse.json({ 
        error: 'Key and value are required' 
      }, { status: 400 });
    }
    
    const result = await validateSettingValue(key, value);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Validation API error:', error);
    return NextResponse.json({ 
      error: error.message || 'Validation failed' 
    }, { status: 500 });
  }
}