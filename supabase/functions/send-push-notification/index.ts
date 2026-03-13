import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { title, body, url, exclude_user_id } = await req.json();
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    let query = supabase.from("push_subscriptions").select("*");
    if (exclude_user_id) query = query.neq("user_id", exclude_user_id);
    const { data: subscriptions, error } = await query;

    console.log("Subscriptions found:", subscriptions?.length, "Error:", error?.message);

    if (error) throw error;
    if (!subscriptions || subscriptions.length === 0) {
      return new Response(JSON.stringify({ sent: 0, stale_removed: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload = JSON.stringify({ title, body, url: url || "/dashboard" });
    let sent = 0;
    const staleIds: number[] = [];

    for (const sub of subscriptions) {
      try {
        await sendPushNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, payload);
        sent++;
        console.log("Sent to user:", sub.user_id);
      } catch (err: any) {
        console.error("Failed to send:", err?.status, err?.message);
        if (err?.status === 410 || err?.status === 404) staleIds.push(sub.id);
      }
    }

    if (staleIds.length > 0) await supabase.from("push_subscriptions").delete().in("id", staleIds);

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

async function sendPushNotification(
  subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
  payload: string
) {
  const url = new URL(subscription.endpoint);
  const audience = `${url.protocol}//${url.host}`;
  const vapidJWT = await buildVapidJWT(audience);
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
    const text = await response.text();
    console.error("Push response:", response.status, text);
    const err: any = new Error(`Push failed: ${response.status} ${text}`);
    err.status = response.status;
    throw err;
  }
}

async function buildVapidJWT(audience: string): Promise<string> {
  const header = btoa(JSON.stringify({ typ: "JWT", alg: "ES256" }))
    .replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  const now = Math.floor(Date.now() / 1000);
  const claims = btoa(JSON.stringify({ aud: audience, exp: now + 12 * 3600, sub: VAPID_SUBJECT }))
    .replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  const signingInput = `${header}.${claims}`;

  const rawKey = base64UrlToUint8Array(VAPID_PRIVATE_KEY);
  const privateKey = await crypto.subtle.importKey(
    "raw",
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

  return `${signingInput}.${uint8ArrayToBase64Url(new Uint8Array(signature))}`;
}

async function encryptPayload(
  keys: { p256dh: string; auth: string },
  payload: string
): Promise<Uint8Array> {
  const authSecret = base64UrlToUint8Array(keys.auth);
  const clientPublicKey = base64UrlToUint8Array(keys.p256dh);

  const serverKeyPair = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]);
  const serverPublicKey = new Uint8Array(await crypto.subtle.exportKey("raw", serverKeyPair.publicKey));

  const clientKey = await crypto.subtle.importKey("raw", clientPublicKey, { name: "ECDH", namedCurve: "P-256" }, false, []);
  const sharedSecret = new Uint8Array(await crypto.subtle.deriveBits({ name: "ECDH", public: clientKey }, serverKeyPair.privateKey, 256));

  const salt = crypto.getRandomValues(new Uint8Array(16));
  const prk = await hkdf(sharedSecret, authSecret, new TextEncoder().encode("Content-Encoding: auth\0"), 32);
  const contentKey = await hkdf(prk, salt, buildInfo("aesgcm", clientPublicKey, serverPublicKey), 16);
  const nonce = await hkdf(prk, salt, buildInfo("nonce", clientPublicKey, serverPublicKey), 12);

  const payloadBytes = new TextEncoder().encode(payload);
  const paddedPayload = new Uint8Array(payloadBytes.length + 2);
  paddedPayload.set(payloadBytes, 2);

  const cryptoKey = await crypto.subtle.importKey("raw", contentKey, "AES-GCM", false, ["encrypt"]);
  const encrypted = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce }, cryptoKey, paddedPayload));

  const rs = new Uint8Array(4);
  new DataView(rs.buffer).setUint32(0, 4096, false);
  const header = new Uint8Array(16 + 4 + 1 + serverPublicKey.length);
  let offset = 0;
  header.set(salt, offset); offset += 16;
  header.set(rs, offset); offset += 4;
  header[offset] = serverPublicKey.length; offset += 1;
  header.set(serverPublicKey, offset);

  const result = new Uint8Array(header.length + encrypted.length);
  result.set(header);
  result.set(encrypted, header.length);
  return result;
}

function buildInfo(type: string, clientKey: Uint8Array, serverKey: Uint8Array): Uint8Array {
  const typeBytes = new TextEncoder().encode(`Content-Encoding: ${type}\0P-256\0`);
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
  return new Uint8Array(await crypto.subtle.deriveBits({ name: "HKDF", hash: "SHA-256", salt, info }, key, length * 8));
}

function base64UrlToUint8Array(base64Url: string): Uint8Array {
  const padding = "=".repeat((4 - (base64Url.length % 4)) % 4);
  const base64 = (base64Url + padding).replace(/-/g, "+").replace(/_/g, "/");
  return new Uint8Array([...atob(base64)].map((c) => c.charCodeAt(0)));
}

function uint8ArrayToBase64Url(array: Uint8Array): string {
  return btoa(String.fromCharCode(...array)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}