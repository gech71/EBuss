
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { randomBytes } from 'crypto';

export async function GET(request: Request) {
  const token = randomBytes(32).toString('hex');
  
  cookies().set({
    name: 'csrf_token',
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
  });

  return NextResponse.json({ token });
}
