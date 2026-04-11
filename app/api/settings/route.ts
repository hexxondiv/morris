import { NextRequest, NextResponse } from 'next/server';
import { 
  getAllSettings, 
  saveSettings, 
  saveSetting,
  getSettingCategories 
} from '@/lib/actions/settings';
import type { SettingsApiResponse } from '@/types/settings';

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const category = url.searchParams.get('category');
    const keys = url.searchParams.get('keys')?.split(',');
    const includeMetadata = url.searchParams.get('includeMetadata') === 'true';

    // If specific keys requested
    if (keys && keys.length > 0) {
      const settings = await getAllSettings();
      const filteredSettings = settings.filter((setting:any) => keys.includes(setting.key));
      return NextResponse.json(filteredSettings);
    }

    // If category filter requested
    if (category && category !== 'All') {
      const settings = await getAllSettings();
      const filteredSettings = settings.filter((setting: any) => setting.category === category);
      return NextResponse.json(filteredSettings);
    }

    // Get all settings with access control
    const settings = await getAllSettings();
    
    // Add metadata if requested
    if (includeMetadata) {
      const categories = await getSettingCategories();
      return NextResponse.json({
        settings,
        categories,
        metadata: {
          totalSettings: settings.length,
          lastUpdated: new Date().toISOString()
        }
      });
    }
    
    return NextResponse.json(settings);
  } catch (error: any) {
    console.error('Settings GET API error:', error);
    return NextResponse.json({ 
      error: error.message || 'Failed to fetch settings' 
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { settings } = await request.json();
    
    if (!settings || !Array.isArray(settings)) {
      return NextResponse.json({ 
        error: 'Invalid settings data. Expected an array of settings.' 
      }, { status: 400 });
    }
    
    if (settings.length === 0) {
      return NextResponse.json({ 
        error: 'No settings provided to save.' 
      }, { status: 400 });
    }
    
    const result = await saveSettings(settings);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Settings POST API error:', error);
    
    // Return specific error status codes
    if (error.message.includes('Unauthorized')) {
      return NextResponse.json({ 
        error: error.message 
      }, { status: 403 });
    }
    
    if (error.message.includes('Validation errors') || error.message.includes('Invalid type')) {
      return NextResponse.json({ 
        error: error.message 
      }, { status: 400 });
    }
    
    return NextResponse.json({ 
      error: error.message || 'Failed to save settings' 
    }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { key, value, type, description } = await request.json();
    
    if (!key || value === undefined) {
      return NextResponse.json({ 
        error: 'Key and value are required' 
      }, { status: 400 });
    }
    
    const result = await saveSetting(key, String(value), type || 'string', description);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Settings PATCH API error:', error);
    
    if (error.message.includes('Unauthorized')) {
      return NextResponse.json({ 
        error: error.message 
      }, { status: 403 });
    }
    
    return NextResponse.json({ 
      error: error.message || 'Failed to update setting' 
    }, { status: 500 });
  }
}