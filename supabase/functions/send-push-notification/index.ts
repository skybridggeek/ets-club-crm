import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ─── Web Push (using web-push compatible approach with VAPID) ─────────────────
// We use the built-in crypto for VAPID signing

const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY")!;
const VAPID_PUBLIC_KEY = Deno.env.get("NEXT_PUBLIC_VAPID_PUBLIC_KEY")!;
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") || "mailto:admin@ets-club.com";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

serve(async (req) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { title, body, url, exclude_user_id } = await req.json();

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get all push subscriptions
    let query = supabase.from("push_subscriptions").select("*");
    if (exclude_user_id) {
      query = query.neq("user_id", exclude_user_id);
    }
    const { data: subscriptions, error } = await query;

    if (error) throw error;
    if (!subscriptions || subscriptions.length === 0) {
      return new Response(JSON.stringify({ sent: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload = JSON.stringify({ title, body, url: url || "/dashboard" });

    let sent = 0;
    const staleIds: number[] = [];

    for (const sub of subscriptions) {
      try {
        await sendPushNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          payload
        );
        sent++;
      } catch (err: any) {
        // 410 = subscription expired/unsubscribed
        if (err?.status === 410 || err?.status === 404) {
          staleIds.push(sub.id);
        }
        console.error(`Failed to send to sub ${sub.id}:`, err?.message);
      }
    }

    // Clean up expired subscriptions
    if (staleIds.length > 0) {
      await supabase.from("push_subscriptions").delete().in("id", staleIds);
    }

    return new Response(JSON.stringify({ sent, stale_removed: staleIds.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("Edge function error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// ─── VAPID Push Implementation ────────────────────────────────────────────────
async function sendPushNotification(
  subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
  payload: string
) {
  const url = new URL(subscription.endpoint);
  const audience = `${url.protocol}//${url.host}`;

  // Build VAPID JWT
  const vapidJWT = await buildVapidJWT(audience);

  // Encrypt the payload
  const encrypted = await encryptPayload(subscription.keys, payload);

  const response = await fetch(subscription.endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Encoding": "aes128gcm",
      Authorization: `vapid t=${vapidJWT},k=${VAPID_PUBLIC_KEY}`,
      TTL: "86400",
    },
    body: encrypted,
  });

  if (!response.ok && response.status !== 201) {
    const err: any = new Error(`Push failed: ${response.status}`);
    err.status = response.status;
    throw err;
  }
}

async function buildVapidJWT(audience: string): Promise<string> {
  const header = btoa(JSON.stringify({ typ: "JWT", alg: "ES256" }))
    .replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");

  const now = Math.floor(Date.now() / 1000);
  const claims = btoa(JSON.stringify({
    aud: audience,
    exp: now + 12 * 3600,
    sub: VAPID_SUBJECT,
  })).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");

  const signingInput = `${header}.${claims}`;

  // Import private key
  const rawKey = base64UrlToUint8Array(VAPID_PRIVATE_KEY);
  const privateKey = await crypto.subtle.importKey(
    "pkcs8",
    rawKey,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    privateKey,
    new TextEncoder().encode(signingInput)
  );

  const sig = uint8ArrayToBase64Url(new Uint8Array(signature));
  return `${signingInput}.${sig}`;
}

async function encryptPayload(
  keys: { p256dh: string; auth: string },
  payload: string
): Promise<Uint8Array> {
  const authSecret = base64UrlToUint8Array(keys.auth);
  const clientPublicKey = base64UrlToUint8Array(keys.p256dh);

  // Generate server key pair
  const serverKeyPair = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveBits"]
  );

  const serverPublicKey = await crypto.subtle.exportKey("raw", serverKeyPair.publicKey);
  const clientKey = await crypto.subtle.importKey(
    "raw",
    clientPublicKey,
    { name: "ECDH", namedCurve: "P-256" },
    false,
    []
  );

  // Derive shared secret
  const sharedSecret = await crypto.subtle.deriveBits(
    { name: "ECDH", public: clientKey },
    serverKeyPair.privateKey,
    256
  );

  // HKDF PRK
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const prk = await hkdf(
    new Uint8Array(sharedSecret),
    authSecret,
    new TextEncoder().encode("Content-Encoding: auth\0"),
    32
  );

  // Derive content encryption key and nonce
  const serverPublicKeyBytes = new Uint8Array(serverPublicKey);
  const keyInfo = buildInfo("aesgcm", clientPublicKey, serverPublicKeyBytes);
  const nonceInfo = buildInfo("nonce", clientPublicKey, serverPublicKeyBytes);

  const contentKey = await hkdf(prk, salt, keyInfo, 16);
  const nonce = await hkdf(prk, salt, nonceInfo, 12);

  // Encrypt
  const payloadBytes = new TextEncoder().encode(payload);
  const paddedPayload = new Uint8Array(payloadBytes.length + 2);
  paddedPayload.set(paddedPayload.subarray(0, 2)); // 2 byte padding length = 0
  paddedPayload.set(payloadBytes, 2);

  const cryptoKey = await crypto.subtle.importKey("raw", contentKey, "AES-GCM", false, ["encrypt"]);
  const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce }, cryptoKey, paddedPayload);

  // Build aes128gcm content
  // Header: salt (16) + rs (4) + idlen (1) + keyid (serverPublicKey 65 bytes)
  const rs = new Uint8Array(4);
  new DataView(rs.buffer).setUint32(0, 4096, false);

  const header = new Uint8Array(16 + 4 + 1 + serverPublicKeyBytes.length);
  let offset = 0;
  header.set(salt, offset); offset += 16;
  header.set(rs, offset); offset += 4;
  header[offset] = serverPublicKeyBytes.length; offset += 1;
  header.set(serverPublicKeyBytes, offset);

  const result = new Uint8Array(header.length + encrypted.byteLength);
  result.set(header, 0);
  result.set(new Uint8Array(encrypted), header.length);
  return result;
}

function buildInfo(type: string, clientKey: Uint8Array, serverKey: Uint8Array): Uint8Array {
  const encoder = new TextEncoder();
  const typeBytes = encoder.encode(`Content-Encoding: ${type}\0P-256\0`);
  const info = new Uint8Array(typeBytes.length + 2 + clientKey.length + 2 + serverKey.length);
  let offset = 0;
  info.set(typeBytes, offset); offset += typeBytes.length;
  new DataView(info.buffer).setUint16(offset, clientKey.length, false); offset += 2;
  info.set(clientKey, offset); offset += clientKey.length;
  new DataView(info.buffer).setUint16(offset, serverKey.length, false); offset += 2;
  info.set(serverKey, offset);
  return info;
}

async function hkdf(ikm: Uint8Array, salt: Uint8Array, info: Uint8Array, length: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey("raw", ikm, "HKDF", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "HKDF", hash: "SHA-256", salt, info },
    key,
    length * 8
  );
  return new Uint8Array(bits);
}

function base64UrlToUint8Array(base64Url: string): Uint8Array {
  const padding = "=".repeat((4 - (base64Url.length % 4)) % 4);
  const base64 = (base64Url + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  return new Uint8Array([...raw].map((c) => c.charCodeAt(0)));
}

function uint8ArrayToBase64Url(array: Uint8Array): string {
  return btoa(String.fromCharCode(...array))
    .replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}
