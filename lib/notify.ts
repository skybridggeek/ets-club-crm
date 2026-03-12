// Call this from any page after inserting data to Supabase
// It triggers the Edge Function which sends push to all subscribed users

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

interface NotifyOptions {
  title: string;
  body: string;
  url?: string;
  exclude_user_id?: number; // Don't notify the person who triggered it
}

export async function notifyAll(options: NotifyOptions): Promise<void> {
  try {
    await fetch(`${SUPABASE_URL}/functions/v1/send-push-notification`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify(options),
    });
  } catch (err) {
    // Non-blocking — don't crash the app if push fails
    console.error("Push notification failed:", err);
  }
}
