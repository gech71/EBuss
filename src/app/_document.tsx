// app/_document.tsx
import { Html, Head, Main, NextScript } from 'next/document';
import crypto from 'crypto';

export default function Document() {
  // Generate a random nonce per request
  const nonce = crypto.randomBytes(16).toString('base64');

  return (
    <Html lang="en">
      <Head>
        <meta charSet="UTF-8" />
        <meta httpEquiv="Content-Security-Policy" content={`
          default-src 'self';
          script-src 'self' 'nonce-${nonce}';
          style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
          font-src 'self' https://fonts.gstatic.com;
          img-src 'self' https://api.qrserver.com data:;
          frame-ancestors 'self';
        `.replace(/\s+/g, ' ').trim()} />
      </Head>
      <body>
        <Main />
        <NextScript nonce={nonce} />
      </body>
    </Html>
  );
}
