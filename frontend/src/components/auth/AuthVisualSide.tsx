export function AuthVisualSide() {
  return (
    <div className="hidden lg:flex flex-col justify-end relative bg-slate-950 overflow-hidden p-10 xl:p-14 min-h-screen">
      {/* Background Image: Toyota Innova Crysta at Airport Terminal */}
      {/* Positioned at 90% horizontally so the entire car is comfortably inside the frame */}
      <img
        src="/assets/auth/airport-innova-auth.jpg"
        alt="Swaraj Tours & Travel Toyota Innova Crysta at Airport"
        style={{ objectPosition: "90% 50%" }}
        className="absolute inset-0 w-full h-full object-cover transform scale-100 transition-all duration-700"
      />

      {/* Subtle bottom vignette to ensure tagline legibility while keeping the car and terminal crisp */}
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/25 to-transparent pointer-events-none" />

      {/* Bottom Content: Clean, elegant tagline */}
      <div className="relative z-10 max-w-md">
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
