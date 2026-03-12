"use client";
import { useEffect, useState } from "react";
import { Bell, BellOff, BellRing, Check, X } from "lucide-react";
import {
  isPushSupported,
  subscribeUserToPush,
  unsubscribeUserFromPush,
  isUserSubscribed,
  getNotificationPermission,
  registerServiceWorker,
} from "@/lib/pushNotifications";

interface Props {
  userId: number;
}

export default function NotificationBell({ userId }: Props) {
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showToast, setShowToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [supported, setSupported] = useState(true);

  useEffect(() => {
    const init = async () => {
      if (!isPushSupported()) {
        setSupported(false);
        setLoading(false);
        return;
      }
      // Register SW silently on load
      await registerServiceWorker();

      const already = await isUserSubscribed();
      setSubscribed(already);
      setLoading(false);
    };
    init();
  }, []);

  const handleToggle = async () => {
    if (!supported) {
      toast("error", "Push notifications aren't supported on this browser.");
      return;
    }

    setLoading(true);

    if (subscribed) {
      await unsubscribeUserFromPush(userId);
      setSubscribed(false);
      toast("success", "Notifications turned off.");
    } else {
      const permission = getNotificationPermission();
      if (permission === "denied") {
        toast("error", "Notifications are blocked. Please enable them in your browser settings.");
        setLoading(false);
        return;
      }
      const ok = await subscribeUserToPush(userId);
      if (ok) {
        setSubscribed(true);
        toast("success", "You'll now receive notifications!");
      } else {
        toast("error", "Couldn't enable notifications. Please try again.");
      }
    }

    setLoading(false);
    setShowModal(false);
  };

  const toast = (type: "success" | "error", msg: string) => {
    setShowToast({ type, msg });
    setTimeout(() => setShowToast(null), 4000);
  };

  if (!supported) return null;

  return (
    <>
      {/* Bell Button */}
      <button
        onClick={() => setShowModal(true)}
        disabled={loading}
        title={subscribed ? "Notifications ON" : "Enable Notifications"}
        className={`p-2 rounded-full transition relative ${
          subscribed
            ? "bg-brand-accent/10 text-brand-accent hover:bg-brand-accent/20"
            : "bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700"
        }`}
      >
        {loading ? (
          <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
        ) : subscribed ? (
          <BellRing size={20} />
        ) : (
          <Bell size={20} />
        )}
        {subscribed && (
          <span className="absolute top-1 right-1 w-2 h-2 bg-green-400 rounded-full" />
        )}
      </button>

      {/* Confirm Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-gray-900 border border-gray-700 p-6 rounded-2xl w-full max-w-sm shadow-2xl text-center animate-fade-in">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 text-gray-500 hover:text-white"
            >
              <X size={20} />
            </button>

            <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
              subscribed ? "bg-red-500/20 text-red-400" : "bg-brand-accent/20 text-brand-accent"
            }`}>
              {subscribed ? <BellOff size={32} /> : <BellRing size={32} />}
            </div>

            <h2 className="text-xl font-bold text-white mb-2">
              {subscribed ? "Turn Off Notifications?" : "Enable Notifications?"}
            </h2>
            <p className="text-gray-400 text-sm mb-6">
              {subscribed
                ? "You'll stop receiving alerts for announcements, messages, and updates."
                : "Get instant alerts on your phone for new announcements, messages, feedback, and sponsors."}
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 py-3 rounded-xl bg-gray-800 text-gray-300 hover:bg-gray-700 font-medium transition"
              >
                Cancel
              </button>
              <button
                onClick={handleToggle}
                disabled={loading}
                className={`flex-1 py-3 rounded-xl text-white font-bold transition disabled:opacity-50 ${
                  subscribed
                    ? "bg-red-600 hover:bg-red-700"
                    : "bg-brand-accent hover:bg-cyan-500 text-black"
                }`}
              >
                {loading ? "..." : subscribed ? "Turn Off" : "Enable"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {showToast && (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[200] px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 text-sm font-medium animate-fade-in ${
          showToast.type === "success"
            ? "bg-green-900 border border-green-700 text-green-300"
            : "bg-red-900 border border-red-700 text-red-300"
        }`}>
          {showToast.type === "success" ? <Check size={18} /> : <X size={18} />}
          {showToast.msg}
        </div>
      )}
    </>
  );
}
