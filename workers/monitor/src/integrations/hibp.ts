import axios from "axios";

const HIBP_API = "https://haveibeenpwned.com/api/v3";

interface HIBPBreach {
  Name: string;
  Title: string;
  Domain: string;
  BreachDate: string;
  Description: string;
  DataClasses: string[];
}

export async function checkEmailBreaches(email: string): Promise<HIBPBreach[]> {
  try {
    const res = await axios.get<HIBPBreach[]>(
      `${HIBP_API}/breachedaccount/${encodeURIComponent(email)}`,
      {
        headers: {
          "hibp-api-key": process.env.HIBP_API_KEY!,
          "user-agent": "Aegis-Security-Platform/1.0",
        },
        params: { truncateResponse: false },
      }
    );
    return res.data;
  } catch (e: any) {
    if (e.response?.status === 404) return []; // no breaches
    if (e.response?.status === 429) throw new Error("HIBP rate limited");
    throw e;
  }
}

export async function checkPasswordPwned(sha1Prefix: string): Promise<Map<string, number>> {
  const res = await axios.get(`https://api.pwnedpasswords.com/range/${sha1Prefix}`, {
    headers: { "user-agent": "Aegis-Security-Platform/1.0" },
  });
  const map = new Map<string, number>();
  for (const line of (res.data as string).split("\n")) {
    const [suffix, count] = line.trim().split(":");
    if (suffix && count) map.set(suffix, parseInt(count, 10));
  }
  return map;
}
