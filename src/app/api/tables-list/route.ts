import { getTablesList } from '@/app/api/tables-list';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const connectionId = searchParams.get('connectionId');

  if (!connectionId) {
    return NextResponse.json({ error: 'connectionId is required' }, { status: 400 });
  }

  try {
    const tables = await getTablesList(connectionId);
    return NextResponse.json(tables);
  } catch (error) {
    console.error('Error getting tables list:', error);
    return NextResponse.json(
      { error: 'Failed to get tables list' },
      { status: 500 }
    );
  }
}