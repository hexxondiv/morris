// app/api/upload-avatar/route.ts
import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { userId } = await auth();
    
    if (!userId || userId !== id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the raw request body and forward it to Clerk
    const formData = await request.formData();
    
    // Create a new FormData for Clerk
    const clerkFormData = new FormData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    clerkFormData.append('file', file);

    // Use fetch directly to Clerk's API (if you have the endpoint)
    // This is more direct and might avoid any transformation issues
    const clerkResponse = await fetch(`https://api.clerk.dev/v1/users/${userId}/profile_image`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.CLERK_SECRET_KEY}`,
      },
      body: clerkFormData,
    });

    if (!clerkResponse.ok) {
      const errorData = await clerkResponse.json();
      throw new Error(`Clerk API error: ${JSON.stringify(errorData)}`);
    }

    const result = await clerkResponse.json();
    
    return NextResponse.json({
      url: result.image_url,
      success: true,
      message: 'Avatar updated successfully'
    });

  } catch (error: any) {
    console.error('Direct Clerk API error:', error);
    return NextResponse.json({ 
      error: 'Failed to upload avatar',
      details: error.message 
    }, { status: 500 });
  }
}