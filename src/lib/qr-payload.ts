export function parseTicketQrPayload(raw: string): { ticketId: string } {
  let payload = raw.trim();

  const dataMatch = payload.match(/[?&]data=([^&]+)/);
  if (dataMatch?.[1]) {
    payload = decodeURIComponent(dataMatch[1]);
  } else if (/%[0-9A-Fa-f]{2}/.test(payload)) {
    payload = decodeURIComponent(payload);
  }

  const decodedData = atob(payload);
  const parsed = JSON.parse(decodedData) as { ticketId?: string };

  if (!parsed.ticketId) {
    throw new Error("Invalid QR code format.");
  }

  return { ticketId: parsed.ticketId };
}
