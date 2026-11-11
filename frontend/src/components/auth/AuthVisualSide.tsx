import { Plane, MapPin, Car, CarFront } from "lucide-react";

export function AuthVisualSide() {
  return (
    <div className="hidden lg:flex flex-col justify-between relative bg-slate-950 overflow-hidden p-8 xl:p-12 min-h-screen">
      {/* Background Image: Toyota Innova Crysta at Airport Terminal */}
      {/* Positioned at 90% horizontally so the entire car is comfortably inside the frame */}
      <img
        src="/assets/auth/airport-innova-auth.jpg"
        alt="Swaraj Tours & Travel Toyota Innova Crysta at Airport"
        style={{ objectPosition: "90% 50%" }}
        className="absolute inset-0 w-full h-full object-cover transform scale-100 transition-all duration-700"
      />

      {/* Modern gradient overlays matching Home section hero */}
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/30 to-slate-950/60 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-r from-slate-950/50 via-transparent to-transparent pointer-events-none" />

      {/* Top Banner Lockup Matching User's Shared Reference Image */}
      <div className="relative z-10 max-w-xl w-full">
        <div className="bg-slate-950/50 backdrop-blur-md border border-white/10 rounded-2xl p-4 sm:p-5 shadow-2xl">
          <div className="space-y-1">
            <span className="text-xs sm:text-sm font-extrabold tracking-widest uppercase text-white/95 drop-shadow">
              Your Trusted Daily Commute Partner
            </span>
            <h2 className="text-2xl sm:text-3xl xl:text-4xl font-black uppercase tracking-tight text-amber-400 drop-shadow-md">
              In Pune & Mumbai
            </h2>
          </div>

          {/* Thin divider line & 4 service icons matching the user's reference on a single clean row */}
          <div className="mt-3 pt-2.5 border-t border-white/20">
            <div className="flex items-center justify-between gap-1.5 text-[10px] xl:text-[11px] font-bold tracking-wider uppercase text-white/95 overflow-hidden">
              <span className="inline-flex items-center gap-1.5 shrink-0 drop-shadow">
                <Plane className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                Airport Transfer
              </span>
              <span className="text-white/30 shrink-0">|</span>
              <span className="inline-flex items-center gap-1.5 shrink-0 drop-shadow">
                <MapPin className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                Outstation
              </span>
              <span className="text-white/30 shrink-0">|</span>
              <span className="inline-flex items-center gap-1.5 shrink-0 drop-shadow">
                <Car className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                One Way Cab
              </span>
              <span className="text-white/30 shrink-0">|</span>
              <span className="inline-flex items-center gap-1.5 shrink-0 drop-shadow">
                <CarFront className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                Local Taxi
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Content: Clean, elegant tagline */}
      <div className="relative z-10 max-w-md pt-6">
        <p className="text-xl xl:text-2xl font-bold text-white leading-snug drop-shadow-md">
          “Every journey, made comfortable.”
        </p>
        <p className="text-xs xl:text-sm text-amber-300 font-medium mt-1.5 drop-shadow">
          Your trusted travel partner for airport, outstation and city travel.
        </p>
      </div>
    </div>
  );
}
