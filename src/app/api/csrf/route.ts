
import { NextResponse } from 'next/server';
import { headers } from 'next/headers';

export async function GET(request: Request) {
  const headerList = await headers();
  const token = headerList.get('X-CSRF-Token');

  if (!token) {
    // This should theoretically not happen if middleware is set up correctly
    return NextResponse.json({ error: 'CSRF token not found in request headers.' }, { status: 500 });
  }

  return NextResponse.json({ token });
}
