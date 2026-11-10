import { Plane, Car, MapPin, ShieldCheck } from "lucide-react";

export function AuthVisualSide() {
  const benefits = [
    {
      icon: Car,
      title: "Easy Cab Booking",
      desc: "Instant reservations with straightforward travel choices.",
    },
    {
      icon: Plane,
      title: "Airport Pickup & Drop",
      desc: "Punctual terminal transfers across Mumbai & Pune airports.",
    },
    {
      icon: MapPin,
      title: "Local & Outstation Travel",
      desc: "Comfortable rides for daily commutes and holiday tours.",
    },
    {
      icon: ShieldCheck,
      title: "Comfortable Travel Experiences",
      desc: "Clean, air-conditioned fleet driven with care.",
    },
  ];

  return (
    <div className="hidden lg:flex flex-col justify-between relative bg-slate-950 overflow-hidden p-10 xl:p-14 min-h-screen">
      {/* Background Image: Toyota Innova Crysta at Airport Terminal */}
      <img
        src="/assets/auth/airport-innova-auth.jpg"
        alt="Swaraj Tours & Travel Toyota Innova Crysta at Airport"
        className="absolute inset-0 w-full h-full object-cover object-center transform scale-100 transition-transform duration-1000"
      />

      {/* Subtle modern gradient overlays for optimal text legibility */}
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/45 to-slate-950/30" />
      <div className="absolute inset-0 bg-blue-950/20 mix-blend-multiply" />

      {/* Top Branding Pill */}
      <div className="relative z-10 flex items-center justify-between">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/80 backdrop-blur-md border border-white/10 text-white text-xs font-semibold shadow-lg">
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Swaraj Tours & Travel</span>
        </div>
      </div>

      {/* Bottom Content: Concise verified benefits & tagline */}
      <div className="relative z-10 max-w-lg">
        {/* Verified benefits list */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mb-8">
          {benefits.map((b) => (
            <div
              key={b.title}
              className="p-3.5 rounded-xl bg-slate-900/70 backdrop-blur-md border border-white/10 text-white shadow-sm flex items-start gap-3"
            >
              <div className="p-2 rounded-lg bg-amber-500/20 border border-amber-500/30 text-amber-400 shrink-0 mt-0.5">
                <b.icon className="h-4 w-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white tracking-wide">{b.title}</h4>
                <p className="text-[11px] text-slate-300 leading-snug mt-0.5">{b.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Short, appropriate travel message */}
        <div className="pt-6 border-t border-white/15">
          <p className="text-xl font-bold text-white leading-snug">
            “Every journey, made comfortable.”
          </p>
          <p className="text-xs text-amber-300 font-medium mt-1">
            Your trusted travel partner for airport, outstation and city travel.
          </p>
        </div>
      </div>
    </div>
  );
}
