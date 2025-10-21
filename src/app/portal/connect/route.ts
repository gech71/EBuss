
import { headers } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const headerList = headers();
    const authHeader = headerList.get('Authorization');

    if (!authHeader) {
      return NextResponse.json(
        {
          status: 'error',
          message: 'Authorization header is missing from the request.',
        },
        { status: 401 }
      );
    }

    const bearerPrefix = 'Bearer ';
    if (!authHeader.startsWith(bearerPrefix)) {
      return NextResponse.json(
        {
          status: 'error',
          message:
            'Authorization header is malformed. It must start with "Bearer ".',
        },
        { status: 401 }
      );
    }

    const token = authHeader.substring(bearerPrefix.length);

    if (!token) {
        return NextResponse.json(
        {
          status: 'error',
          message: 'Bearer token is missing.',
        },
        { status: 401 }
      );
    }
    
    // Step 2: Validate the token with the external service
    const validationUrl = process.env.VALIDATE_TOKEN_URL;
    if (!validationUrl) {
      console.error('VALIDATE_TOKEN_URL environment variable is not set.');
      return NextResponse.json(
        {
          status: 'error',
          message: 'Server configuration error.',
        },
        { status: 500 }
      );
    }
    
    const externalResponse = await fetch(validationUrl, {
      method: 'GET',
      headers: {
        Authorization: authHeader, // Forward the original Authorization header
        Accept: 'application/json',
      },
      cache: 'no-store',
    });

    if (!externalResponse.ok) {
        const errorText = await externalResponse.text();
        return NextResponse.json(
            {
                status: 'error',
                message: `Token validation failed: ${externalResponse.statusText}`,
                details: errorText,
            },
            { status: externalResponse.status }
        );
    }

    const responseData = await externalResponse.json();
    const phoneNumber = responseData.phone;

    if (!phoneNumber) {
        return NextResponse.json(
            {
                status: 'error',
                message: 'Phone number not found in validation response.',
            },
            { status: 404 }
        );
    }

    return NextResponse.json({
        status: 'success',
        message: 'Token successfully validated.',
        phoneNumber: phoneNumber,
    });


  } catch (error) {
    console.error('Error processing connect request:', error);
    return NextResponse.json(
      {
        status: 'error',
        message: 'An unexpected server error occurred.',
      },
      { status: 500 }
    );
  }
}
