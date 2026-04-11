import { getUserRoleFromClerk } from '@/lib/actions';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = id;
  
  const role = await getUserRoleFromClerk(userId);

  if (!role) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  return NextResponse.json({ role });
}