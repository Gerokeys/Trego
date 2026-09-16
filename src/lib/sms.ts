import "server-only";

/**
 * SMS through Africa's Talking, enabled by AT_USERNAME + AT_API_KEY (use the
 * username "sandbox" with a sandbox key for testing). AT_SENDER_ID is
 * optional. Without credentials, messages are printed to the server log.
 */
export function isSmsConfigured() {
  return Boolean(process.env.AT_USERNAME?.trim() && process.env.AT_API_KEY?.trim());
}

/** Returns whether Africa's Talking accepted the message. Never throws. */
export async function sendSms(to: string, message: string): Promise<boolean> {
  const configuredUsername = process.env.AT_USERNAME?.trim();
  const apiKey = process.env.AT_API_KEY?.trim();
  if (!configuredUsername || !apiKey) {
    console.info(`[sms not configured] to ${to}: ${message}`);
    return false;
  }

  // The sandbox account is always called "sandbox"; accept any capitalisation
  // so "Sandbox" in .env doesn't silently send sandbox keys to the live API.
  const isSandbox = configuredUsername.toLowerCase() === "sandbox";
  const username = isSandbox ? "sandbox" : configuredUsername;
  const host = isSandbox
    ? "https://api.sandbox.africastalking.com"
    : "https://api.africastalking.com";
  const body = new URLSearchParams({ username, to, message });
  if (process.env.AT_SENDER_ID) body.set("from", process.env.AT_SENDER_ID);

  try {
    const res = await fetch(`${host}/version1/messaging`, {
      method: "POST",
      headers: {
        apiKey,
        Accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      console.error(`SMS to ${to} failed (${res.status}): ${await res.text()}`);
      return false;
    }

    // 201 only means the request was accepted; each recipient carries its own
    // status (100–102 are success, e.g. 403 InvalidPhoneNumber is not).
    const data = (await res.json()) as {
      SMSMessageData?: { Recipients?: { status?: string; statusCode?: number }[] };
    };
    const recipients = data.SMSMessageData?.Recipients ?? [];
    const delivered = recipients.some(
      (recipient) => typeof recipient.statusCode === "number" && recipient.statusCode >= 100 && recipient.statusCode <= 102
    );
    if (!delivered) {
      const reason = recipients.map((r) => `${r.status ?? "unknown"} (${r.statusCode ?? "?"})`).join(", ");
      console.error(`SMS to ${to} was not accepted: ${reason || "no recipients in response"}`);
      return false;
    }
    return true;
  } catch (err) {
    console.error(`SMS to ${to} failed:`, err);
    return false;
  }
}
