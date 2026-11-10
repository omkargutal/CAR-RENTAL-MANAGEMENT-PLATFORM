import { useState, useEffect } from "react";
import { MessageCircle, X, ExternalLink, Sparkles } from "lucide-react";
import { whatsappApi, WhatsAppPublicConfig } from "@/core/api";

export function WhatsAppFloatingButton() {
  const [config, setConfig] = useState<WhatsAppPublicConfig | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    whatsappApi
      .getPublicConfig()
      .then((cfg) => {
        if (cfg && cfg.floating_button_enabled) {
          setConfig(cfg);
        }
      })
      .catch(() => {
        // Fallback default so the button always works even if network fails
        setConfig({
          floating_button_enabled: true,
          business_phone_number: "8421081570",
          display_phone_number: "+91 8421081570",
          floating_button_greeting: "Hi Swaraj Tours & Travel! I'd like to ask about booking a cab or tour.",
          wa_me_url: "https://wa.me/918421081570?text=Hi%20Swaraj%20Tours%20%26%20Travel!%20I%20would%20like%20to%20inquire%20about%20booking.",
        });
      });
  }, []);

  if (!config || !config.floating_button_enabled) {
    return null;
  }

  // Construct target wa.me URL
  let targetUrl = config.wa_me_url;
  if (!targetUrl && config.business_phone_number) {
    const rawDigits = config.business_phone_number.replace(/\D/g, "");
    const formattedDigits = rawDigits.length === 10 ? `91${rawDigits}` : rawDigits;
    const greeting = encodeURIComponent(
      config.floating_button_greeting || "Hi Swaraj Tours & Travel! I would like to inquire about booking a cab or tour."
    );
    targetUrl = `https://wa.me/${formattedDigits}?text=${greeting}`;
  }

  if (!targetUrl) {
    targetUrl = "https://wa.me/918421081570?text=Hi%20Swaraj%20Tours%20%26%20Travel!";
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end pointer-events-auto">
      {/* Interactive Chat Popup Preview */}
      {isOpen && (
        <div className="mb-3 w-80 bg-white rounded-3xl shadow-2xl border border-emerald-100 overflow-hidden transform transition-all duration-300 animate-in fade-in slide-in-from-bottom-4">
          {/* Header */}
          <div className="bg-gradient-to-r from-emerald-600 to-teal-700 p-4 text-white flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
                <MessageCircle className="w-6 h-6 text-white" />
              </div>
              <div>
                <h4 className="font-bold text-sm leading-tight flex items-center gap-1.5">
                  Swaraj Travel Desk
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                </h4>
                <div className="flex items-center gap-1.5 text-xs text-emerald-100">
                  <span className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse" />
                  <span>Online • Instant replies</span>
                </div>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-white/80 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors"
              aria-label="Close WhatsApp chat popup"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body */}
          <div className="p-4 bg-slate-50/80 text-xs text-slate-600 space-y-3">
            <div className="bg-white p-3 rounded-2xl rounded-tl-none shadow-sm border border-slate-100 text-slate-800">
              <p className="font-medium">
                👋 Hello! Looking to book a cab, outstation trip, or custom tour?
              </p>
              <p className="text-slate-500 mt-1">
                Chat directly with our 24/7 Helpline & Support concierge on WhatsApp.
              </p>
            </div>

            <div className="text-[11px] text-slate-500 text-center bg-slate-100/70 py-1.5 px-2 rounded-lg">
              24/7 Helpline & WhatsApp: <span className="font-bold text-slate-800">{config.display_phone_number || "+91 8421081570"}</span>
            </div>
          </div>

          {/* Action */}
          <div className="p-3 bg-white border-t border-slate-100 flex gap-2">
            <a
              href={targetUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setIsOpen(false)}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-xs py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-md shadow-emerald-600/20"
            >
              <span>Start WhatsApp Chat</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      )}

      {/* Main Floating Button */}
      <div className="flex items-center gap-3">
        {!isOpen && (
          <div
            onClick={() => setIsOpen(true)}
            className="cursor-pointer hidden sm:flex items-center gap-2 bg-white/95 backdrop-blur-md px-3.5 py-1.5 rounded-full shadow-lg border border-emerald-100 text-xs font-semibold text-slate-800 hover:shadow-xl transition-all hover:scale-105"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            <span>Chat with us</span>
          </div>
        )}

        <button
          onClick={() => setIsOpen(!isOpen)}
          aria-label="Open WhatsApp Business Chat"
          className="relative group w-14 h-14 rounded-full bg-gradient-to-tr from-emerald-600 via-emerald-500 to-teal-500 text-white flex items-center justify-center shadow-xl shadow-emerald-500/30 hover:shadow-2xl hover:shadow-emerald-500/50 hover:scale-110 active:scale-95 transition-all duration-300"
        >
          {isOpen ? (
            <X className="w-6 h-6 text-white" />
          ) : (
            <svg
              className="w-7 h-7 fill-white"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.006c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.086-.177.18-.076.354.101.174.449.741.964 1.201.662.591 1.221.774 1.394.86s.275.072.376-.044c.101-.116.433-.506.549-.68.116-.173.231-.145.39-.087s1.011.477 1.184.564.289.13.332.202c.045.072.045.419-.099.824zm-3.423-14.416c-6.627 0-12 5.373-12 12 0 2.155.57 4.178 1.564 5.928l-1.564 5.728 5.897-1.547c1.691.933 3.633 1.471 5.703 1.471 6.627 0 12-5.373 12-12s-5.373-12-12-12z" />
            </svg>
          )}

          {/* Pulse ring indicator */}
          {!isOpen && (
            <span className="absolute -top-1 -right-1 flex h-4 w-4">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500 border-2 border-white" />
            </span>
          )}
        </button>
      </div>
    </div>
  );
}
