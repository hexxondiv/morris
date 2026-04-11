import { supabaseAdmin } from '@/lib/supabase-admin';
import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const formData = await req.formData();
  const file = formData.get('file') as File;
  const path = formData.get('path') as string;

  if (!file || typeof file === 'string') {
    return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
  }

  const fileExt = file.name.split('.').pop();
  let filePath = `${Date.now()}.${fileExt}`;
  if (path) {
    filePath = `${path}/${filePath}`;
  }
  // Ensure file path length is reasonable
  if (filePath.length > 100) {
    return NextResponse.json({ error: 'File path is too long' }, { status: 400 });
  }

  const { error } = await supabaseAdmin.storage
    .from('images')
    .upload(filePath, file, {
      contentType: file.type,
      upsert: true,
    });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { data: urlData } = supabaseAdmin.storage.from('images').getPublicUrl(filePath);

  return NextResponse.json({ url: urlData.publicUrl, path: filePath });
}
