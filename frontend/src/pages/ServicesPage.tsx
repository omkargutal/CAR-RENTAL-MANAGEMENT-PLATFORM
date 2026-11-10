import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Building2, Car, Compass, ArrowRight,
  ShieldCheck, Clock, MapPin, Sparkles, PhoneCall,
  ChevronRight, Check
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DEDICATED_SERVICES, TourPackage, getStoredTourPackages } from "@/data/services";

export function ServicesPage() {
  const location = useLocation();
  const [activeTourFilter, setActiveTourFilter] = useState<string>("All");
  const [tourPackages, setTourPackages] = useState<TourPackage[]>(() => getStoredTourPackages());

  // Listen for storage / custom updates so changes made in Admin dashboard reflect immediately
  useEffect(() => {
    const handleUpdate = () => {
      setTourPackages(getStoredTourPackages());
    };
    window.addEventListener("storage", handleUpdate);
    window.addEventListener("tour_packages_updated", handleUpdate);
    return () => {
      window.removeEventListener("storage", handleUpdate);
      window.removeEventListener("tour_packages_updated", handleUpdate);
    };
  }, []);

  // Handle smooth scrolling when navigated to with an anchor (#corporate-mobility, etc.)
  useEffect(() => {
    if (location.hash) {
      const id = location.hash.replace("#", "");
      const elem = document.getElementById(id);
      if (elem) {
        setTimeout(() => {
          const yOffset = -90; // offset for sticky navbar
          const y = elem.getBoundingClientRect().top + window.pageYOffset + yOffset;
          window.scrollTo({ top: y, behavior: "smooth" });
        }, 100);
      }
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [location]);

  const corporateService = DEDICATED_SERVICES.find((s) => s.id === "corporate-mobility")!;
  const cabService = DEDICATED_SERVICES.find((s) => s.id === "cab-services")!;

  const filteredTours = tourPackages.filter((pkg) => {
    if (activeTourFilter === "All") return true;
    if (activeTourFilter === "Pilgrimage") return pkg.category === "Pilgrimage Trips";
    if (activeTourFilter === "Weekend") return pkg.category === "Weekend Getaways";
    if (activeTourFilter === "Sightseeing") return pkg.category === "Sightseeing Tours";
    if (activeTourFilter === "Outstation") return pkg.category === "Outstation Travel";
    return pkg.category.toLowerCase().includes(activeTourFilter.toLowerCase());
  });


  return (
    <div className="min-h-screen bg-slate-50 pt-16">
      {/* ─── SERVICES HERO ───────────────────────────────────────── */}
      <section className="relative bg-slate-950 py-16 lg:py-24 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-blue-950/40 to-slate-950" />
        <div className="hero-glow w-96 h-96 bg-blue-600 -top-24 -left-24 opacity-25" />
        <div className="hero-glow w-96 h-96 bg-indigo-600 bottom-0 right-0 opacity-20" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Badge className="mb-4 bg-blue-900/80 text-blue-300 border border-blue-700/50 px-4 py-1.5 text-xs font-semibold tracking-wide">
            <Sparkles className="h-3.5 w-3.5 mr-1.5 text-blue-400" /> Dedicated Transportation & Travel Services
          </Badge>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-tight mb-5 max-w-4xl mx-auto">
            Our Business <span className="gradient-text">Offerings & Services</span>
          </h1>

          <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed mb-8">
            Reliable transportation solutions designed for businesses, everyday city and airport travel, and thoughtfully planned holiday tour packages.
          </p>

          {/* Quick Anchor Jump Buttons (No numbers) */}
          <div className="flex flex-wrap items-center justify-center gap-3 max-w-2xl mx-auto">
            <a
              href="#corporate-mobility"
              className="px-4 py-2.5 rounded-xl text-sm font-semibold bg-white/10 text-slate-200 border border-white/15 hover:bg-blue-600 hover:text-white hover:border-blue-500 transition-all backdrop-blur-md flex items-center gap-2 shadow-sm"
            >
              <Building2 className="h-4 w-4 text-blue-400" /> Corporate Mobility
            </a>
            <a
              href="#cab-services"
              className="px-4 py-2.5 rounded-xl text-sm font-semibold bg-white/10 text-slate-200 border border-white/15 hover:bg-blue-600 hover:text-white hover:border-blue-500 transition-all backdrop-blur-md flex items-center gap-2 shadow-sm"
            >
              <Car className="h-4 w-4 text-blue-400" /> Cab Services
            </a>
            <a
              href="#tours-travels"
              className="px-4 py-2.5 rounded-xl text-sm font-semibold bg-white/10 text-slate-200 border border-white/15 hover:bg-amber-500 hover:text-slate-950 hover:border-amber-400 transition-all backdrop-blur-md flex items-center gap-2 shadow-sm"
            >
              <Compass className="h-4 w-4 text-amber-400" /> Tours & Travels
            </a>
          </div>
        </div>
      </section>

      {/* ─── SERVICE 1: CORPORATE MOBILITY ───────────────────────── */}
      <section id="corporate-mobility" className="py-20 bg-slate-50 border-b border-slate-200/80 scroll-mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Visual Media Column (CLEAN, NO OVERLAYS HIDING IMAGE DETAILS) */}
            <div className="lg:col-span-5 order-2 lg:order-1">
              <div className="rounded-2xl overflow-hidden bg-white border border-slate-200 shadow-xl">
                <img
                  src="/assets/services/corporate-mobility/corporate-mobility.png"
                  alt="Swaraj Tours & Travel Corporate Mobility Solutions"
                  className="w-full h-auto object-cover"
                />
              </div>

              {/* Information cards placed cleanly BELOW the image */}
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="bg-white rounded-xl p-3.5 border border-slate-200/80 text-center shadow-sm">
                  <p className="text-xl font-black text-blue-600">50+</p>
                  <p className="text-xs text-slate-500 font-medium">Corporate Clients</p>
                </div>
                <div className="bg-white rounded-xl p-3.5 border border-slate-200/80 text-center shadow-sm">
                  <p className="text-xl font-black text-blue-600">24/7</p>
                  <p className="text-xs text-slate-500 font-medium">Dedicated Dispatch</p>
                </div>
              </div>
            </div>

            {/* Information Column */}
            <div className="lg:col-span-7 order-1 lg:order-2">
              <Badge variant="default" className="text-xs mb-3">Enterprise & Business Travel</Badge>

              <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight mb-2">
                Corporate Mobility
              </h2>

              <h3 className="text-lg sm:text-xl font-bold text-blue-600 mb-4">
                Corporate & Employee Transportation
              </h3>

              <p className="text-slate-600 text-base leading-relaxed mb-6">
                Reliable transportation solutions designed for businesses, corporate teams and employee mobility. We provide scalable corporate transport plans with GPS tracking, safety compliance, and monthly billing to make staff commute effortless.
              </p>

              {/* Offerings Grid */}
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                Comprehensive Enterprise Offerings
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
                {corporateService.features.map((feature, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-2.5 bg-white p-3 rounded-xl border border-slate-200/70 shadow-sm"
                  >
                    <div className="h-5 w-5 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 mt-0.5">
                      <Check className="h-3.5 w-3.5" />
                    </div>
                    <span className="text-xs sm:text-sm font-semibold text-slate-800">{feature}</span>
                  </div>
                ))}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3">
                <Link to="/contact?service=corporate-mobility">
                  <Button size="lg" className="w-full sm:w-auto gap-2">
                    Enquire for Corporate Mobility <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <a href="tel:+918421081570">
                  <Button size="lg" variant="outline" className="w-full sm:w-auto gap-2">
                    <PhoneCall className="h-4 w-4 text-blue-600" /> Call: +91 8421081570
                  </Button>
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── SERVICE 2: CAB SERVICES ─────────────────────────────── */}
      <section id="cab-services" className="py-20 bg-white border-b border-slate-200/80 scroll-mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Information Column */}
            <div className="lg:col-span-7">
              <Badge variant="default" className="text-xs mb-3">On-Demand & Scheduled Cabs</Badge>

              <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight mb-2">
                Cab Services
              </h2>

              <h3 className="text-lg sm:text-xl font-bold text-blue-600 mb-4">
                Local & Outstation Cab Services
              </h3>

              <p className="text-slate-600 text-base leading-relaxed mb-6">
                Comfortable and convenient cab services for everyday travel, airport transfers and journeys beyond the city. Clean, air-conditioned cars with experienced drivers and 100% transparent fares.
              </p>

              {/* Offerings Grid */}
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                Flexible Cab Categories
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
                {cabService.features.map((feature, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-2.5 bg-slate-50 p-3 rounded-xl border border-slate-200/70"
                  >
                    <div className="h-5 w-5 rounded-md bg-blue-100 text-blue-600 flex items-center justify-center shrink-0 mt-0.5">
                      <Check className="h-3.5 w-3.5" />
                    </div>
                    <span className="text-xs sm:text-sm font-semibold text-slate-800">{feature}</span>
                  </div>
                ))}
              </div>

              {/* Value Highlights */}
              <div className="grid grid-cols-3 gap-2.5 mb-8">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-center">
                  <Clock className="h-4 w-4 text-blue-600 mx-auto mb-1" />
                  <p className="text-xs font-bold text-slate-900">Punctual Pickups</p>
                  <p className="text-[10px] text-slate-500">Airport & city rides</p>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-center">
                  <ShieldCheck className="h-4 w-4 text-blue-600 mx-auto mb-1" />
                  <p className="text-xs font-bold text-slate-900">Transparent Fares</p>
                  <p className="text-[10px] text-slate-500">No hidden surprises</p>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-center">
                  <MapPin className="h-4 w-4 text-blue-600 mx-auto mb-1" />
                  <p className="text-xs font-bold text-slate-900">Doorstep Service</p>
                  <p className="text-[10px] text-slate-500">Pickup anywhere</p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3">
                <Link to="/contact?service=cab-services">
                  <Button size="lg" className="w-full sm:w-auto gap-2">
                    Book a Cab <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link to="/cars">
                  <Button size="lg" variant="outline" className="w-full sm:w-auto">
                    View Fleet Options
                  </Button>
                </Link>
              </div>
            </div>

            {/* Visual Media Column (CLEAN, NO OVERLAYS HIDING IMAGE DETAILS) */}
            <div className="lg:col-span-5">
              <div className="rounded-2xl overflow-hidden bg-white border border-slate-200 shadow-xl">
                <img
                  src="/assets/services/cab-services/cab-services.png"
                  alt="Swaraj Tours & Travel Cab Services"
                  className="w-full h-auto object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── SERVICE 3: TOURS & TRAVELS ──────────────────────────── */}
      <section id="tours-travels" className="py-24 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white scroll-mt-20 relative overflow-hidden">
        <div className="hero-glow w-96 h-96 bg-amber-500/15 top-1/4 -left-20" />
        <div className="hero-glow w-96 h-96 bg-blue-600/20 bottom-10 right-0" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Section Header */}
          <div className="text-center max-w-3xl mx-auto mb-14">
            <Badge className="bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs px-3 py-1 mb-3">
              Tours, Travels & Holiday Packages
            </Badge>

            <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight mb-3">
              Tours & Travels
            </h2>

            <h3 className="text-xl sm:text-2xl font-bold text-amber-400 mb-5">
              Tours, Travels & Holiday Packages
            </h3>

            <p className="text-slate-300 text-base sm:text-lg leading-relaxed mb-6">
              Discover memorable journeys with thoughtfully planned tours, comfortable travel arrangements and customized holiday experiences.
            </p>

            {/* Prominent Supporting Line Banner */}
            <div className="bg-white/10 backdrop-blur-md rounded-2xl py-3.5 px-6 border border-white/15 max-w-2xl mx-auto shadow-xl">
              <p className="text-amber-200 font-semibold text-sm sm:text-base tracking-wide">
                Family tours, pilgrimage trips, sightseeing, weekend getaways and customized travel.
              </p>
            </div>
          </div>

          {/* 6 Key Travel Offerings Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-16">
            {[
              {
                title: "Family Tours",
                desc: "Comfortable travel experiences designed for families with spacious vehicles, safe highway driving, and relaxed stops.",
              },
              {
                title: "Pilgrimage Trips",
                desc: "Convenient journeys to religious and spiritual destinations including Ashtavinayak and Jyotirlinga circuits.",
              },
              {
                title: "Sightseeing Tours",
                desc: "Explore popular destinations, natural wonders, historic monuments, and captivating local attractions.",
              },
              {
                title: "Weekend Getaways",
                desc: "Short trips and refreshing escapes to Western Ghats hill stations, misty waterfalls, and serene lakes.",
              },
              {
                title: "Outstation Travel",
                desc: "Comfortable journeys to destinations outside the city with dedicated drivers who know every highway corridor.",
              },
              {
                title: "Customized Travel",
                desc: "Flexible itineraries tailored entirely to your preferences, departure timings, group size, and favorite sights.",
              },
            ].map((offering, idx) => (
              <div
                key={idx}
                className="bg-slate-800/60 backdrop-blur-sm border border-slate-700/70 rounded-2xl p-5 hover:border-amber-400/50 hover:bg-slate-800/90 transition-all duration-300 group"
              >
                <h4 className="text-lg font-bold text-white group-hover:text-amber-300 transition-colors mb-2">
                  {offering.title}
                </h4>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  {offering.desc}
                </p>
              </div>
            ))}
          </div>

          {/* ─── CLEAN DESTINATION GALLERY (IMAGES UNOBSTRUCTED) ──── */}
          <div className="mb-14">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8">
              <div>
                <h4 className="text-2xl font-black text-white tracking-tight">
                  Featured Destinations & Packages Gallery
                </h4>
                <p className="text-slate-400 text-xs sm:text-sm mt-1">
                  Authentic holiday and pilgrimage packages with our dedicated driver fleet
                </p>
              </div>

              {/* Category Filter Pills */}
              <div className="flex flex-wrap gap-2">
                {["All", "Pilgrimage", "Weekend", "Sightseeing", "Outstation"].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setActiveTourFilter(cat)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                      activeTourFilter === cat
                        ? "bg-amber-400 text-slate-950 shadow-md font-bold"
                        : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                    }`}
                  >
                    {cat === "All" ? "All Packages" : cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Responsive Image Grid with Info Moved Cleanly BELOW Images */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredTours.map((pkg) => (
                <div
                  key={pkg.id}
                  className="group bg-slate-900 rounded-3xl overflow-hidden border border-slate-800 hover:border-amber-400/60 shadow-xl transition-all duration-300 flex flex-col justify-between"
                >
                  {/* Clean Image Container: NO overlays, NO gradients covering picture artwork */}
                  <div className="w-full overflow-hidden bg-slate-950 flex items-center justify-center">
                    <img
                      src={pkg.image}
                      alt={pkg.title}
                      className="w-full h-auto object-cover group-hover:scale-103 transition-transform duration-500 ease-out"
                      loading="eager"
                    />
                  </div>

                  {/* Card Info completely BELOW the image */}
                  <div className="p-5 flex flex-col justify-between flex-grow bg-slate-900 border-t border-slate-800">
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="text-[11px] font-bold text-amber-300 uppercase tracking-wider">
                          {pkg.category}
                        </span>
                        <span className="text-[11px] text-slate-400 flex items-center gap-1">
                          <Clock className="h-3 w-3 text-amber-400" />
                          {pkg.duration}
                        </span>
                      </div>

                      <h3 className="text-xl font-black text-white group-hover:text-amber-300 transition-colors mb-1">
                        {pkg.title}
                      </h3>

                      <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-3">
                        <MapPin className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                        <span className="truncate">{pkg.destination}</span>
                      </div>

                      <p className="text-xs text-slate-300 leading-relaxed mb-4">
                        {pkg.description}
                      </p>

                      <div className="space-y-1.5 mb-4 pt-3 border-t border-slate-800">
                        {pkg.highlights.slice(0, 3).map((h, i) => (
                          <div key={i} className="flex items-center gap-2 text-[11px] text-slate-400">
                            <span className="h-1.5 w-1.5 rounded-full bg-amber-400 shrink-0" />
                            <span className="truncate">{h}</span>
                          </div>
                        ))}
                      </div>

                      {pkg.price && (
                        <div className="flex items-center justify-between pb-3 mb-2 text-xs border-b border-slate-800/80">
                          <span className="text-slate-400">Package Fare:</span>
                          <span className="font-extrabold text-amber-300 text-sm">{pkg.price}</span>
                        </div>
                      )}
                    </div>

                    <Link to={`/contact?service=tours-travels&package=${pkg.id}`}>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full bg-slate-800/80 border-slate-700 text-amber-300 hover:bg-amber-400 hover:text-slate-950 hover:border-amber-400 font-semibold gap-1.5 transition-colors"
                      >
                        Enquire for {pkg.title} <ChevronRight className="h-3.5 w-3.5" />
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Tours CTA Banner */}
          <div className="bg-gradient-to-r from-amber-500/20 via-blue-600/20 to-indigo-600/20 rounded-3xl p-8 sm:p-12 border border-white/10 backdrop-blur-md text-center max-w-4xl mx-auto">
            <h3 className="text-2xl sm:text-3xl font-black text-white mb-3">
              Need a Custom Travel Itinerary or Group Booking?
            </h3>
            <p className="text-slate-300 text-sm sm:text-base max-w-xl mx-auto mb-8">
              Whether you are planning a corporate offsite, multi-day family pilgrimage, or weekend hill-station road trip, our travel desk will craft the perfect itinerary with our fleet.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/contact?service=tours-travels">
                <Button size="xl" className="bg-amber-400 text-slate-950 hover:bg-amber-300 font-bold gap-2">
                  Plan Your Trip <ArrowRight className="h-5 w-5" />
                </Button>
              </Link>
              <a href="tel:+918421081570">
                <Button size="xl" variant="outline-dark" className="border-white/30 text-white hover:bg-white/10 gap-2">
                  <PhoneCall className="h-4 w-4 text-amber-400" /> Call: +91 8421081570
                </Button>
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
