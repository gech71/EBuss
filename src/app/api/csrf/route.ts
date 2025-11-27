
import { headers } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET() {
  const headersList = headers();
  const token = headersList.get('X-CSRF-Token');

  if (!token) {
    return NextResponse.json({ message: 'CSRF token not found in headers.' }, { status: 400 });
  }

  return NextResponse.json({ token });
}
