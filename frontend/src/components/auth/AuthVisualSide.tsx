import { Plane, MapPin, Car, CarFront } from "lucide-react";

export function AuthVisualSide() {
  return (
    <div className="hidden lg:flex flex-col justify-between relative bg-zinc-950 overflow-hidden p-8 xl:p-12 min-h-screen">
      {/* Background Image: Toyota Innova Crysta at Airport Terminal */}
      {/* Positioned at 90% horizontally so the entire car is comfortably inside the frame */}
      <img
        src="/assets/auth/airport-innova-auth.jpg"
        alt="Swaraj Tours & Travel Toyota Innova Crysta at Airport"
        style={{ objectPosition: "90% 50%" }}
        className="absolute inset-0 w-full h-full object-cover transform scale-100 transition-all duration-700"
      />

      {/* Modern cinematic gradients */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-black/60 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-transparent to-transparent pointer-events-none" />

      {/* Top Editorial Lockup: Graphic Designer typography & pill badges (No ASCII pipes!) */}
      <div className="relative z-10 max-w-lg">
        <div className="space-y-1.5">
          <p className="text-xs font-black tracking-[0.25em] text-white/90 uppercase drop-shadow">
            YOUR TRUSTED DAILY COMMUTE PARTNER
          </p>
          <h2 className="text-3xl sm:text-4xl xl:text-5xl font-black uppercase tracking-tight text-white drop-shadow-lg">
            PUNE &amp; <span className="text-orange-500">MUMBAI</span>
          </h2>
        </div>

        {/* Elegant Glass Badges (No ugly pipe separators!) */}
        <div className="flex flex-wrap items-center gap-2 pt-4">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/50 backdrop-blur-md border border-white/20 text-white text-[11px] xl:text-xs font-bold tracking-wide shadow-sm hover:border-orange-500/60 transition-colors">
            <Plane className="h-3.5 w-3.5 text-orange-400" />
            Airport Transfer
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/50 backdrop-blur-md border border-white/20 text-white text-[11px] xl:text-xs font-bold tracking-wide shadow-sm hover:border-orange-500/60 transition-colors">
            <MapPin className="h-3.5 w-3.5 text-orange-400" />
            Outstation
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/50 backdrop-blur-md border border-white/20 text-white text-[11px] xl:text-xs font-bold tracking-wide shadow-sm hover:border-orange-500/60 transition-colors">
            <Car className="h-3.5 w-3.5 text-orange-400" />
            One-Way Cab
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/50 backdrop-blur-md border border-white/20 text-white text-[11px] xl:text-xs font-bold tracking-wide shadow-sm hover:border-orange-500/60 transition-colors">
            <CarFront className="h-3.5 w-3.5 text-orange-400" />
            Local Taxi
          </span>
        </div>
      </div>

      {/* Bottom Content: Clean, elegant tagline */}
      <div className="relative z-10 max-w-md pt-6">
        <p className="text-xl xl:text-2xl font-bold text-white leading-snug drop-shadow-md">
          “Every journey, made comfortable.”
        </p>
        <p className="text-xs xl:text-sm text-orange-300 font-medium mt-1.5 drop-shadow">
          Your trusted travel partner for airport, outstation and city travel.
        </p>
      </div>
    </div>
  );
}
