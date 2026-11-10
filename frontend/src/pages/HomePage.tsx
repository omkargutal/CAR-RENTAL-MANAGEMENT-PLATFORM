import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight, Shield, Clock, MapPin, Award, Headphones,
  ChevronRight, CheckCircle, Sparkles, Plane,
  Briefcase, Car as CarIcon, Compass, Check
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { SearchWidget } from "@/components/SearchWidget";
import { CarCard, Car } from "@/components/CarCard";
import { MOCK_CARS, getVehiclePerKmRate } from "@/data/cars";
import { SERVICES_DATA } from "@/data/services";
import { vehiclesApi } from "@/core/api";
import { sortVehiclesByRequiredSequence, getVehicleSeatingLabel } from "@/utils/vehicleSorting";
import { TestimonialCarousel } from "@/components/TestimonialCarousel";

const WHY_US = [
  {
    Icon: Shield,
    title: "100% Insured & Verified Fleet",
    desc: "Every vehicle is commercially licensed, thoroughly insured, and monitored with GPS for complete traveler safety.",
    color: "bg-blue-100 text-blue-600",
  },
  {
    Icon: Clock,
    title: "Punctual Pickup Guarantee",
    desc: "Guaranteed on-time arrival for every airport transfer, outstation trip, and daily office commute with live tracking.",
    color: "bg-purple-100 text-purple-600",
  },
  {
    Icon: Award,
    title: "Sanitized & Modern Cabs",
    desc: "Clean, air-conditioned vehicles inspected before every journey, piloted by polite, background-verified drivers.",
    color: "bg-amber-100 text-amber-600",
  },
  {
    Icon: Headphones,
    title: "24/7 Dispatch Support",
    desc: "Our round-the-clock operations desk is always available via phone and WhatsApp for immediate booking assistance.",
    color: "bg-emerald-100 text-emerald-600",
  },
];


const LOCATIONS_PREVIEW = [
  {
    city: "Pune Hub",
    airport: "Pune International Airport (PNQ) & IT Corridors",
    cars: 48,
    img: "/assets/hubs/pune-hub.jpeg",
  },
  {
    city: "Mumbai Hub",
    airport: "CSMIA Mumbai Airport (BOM) & BKC Expressway",
    cars: 64,
    img: "https://images.unsplash.com/photo-1567157577867-05ccb1388e66?w=600&q=75",
  },
  {
    city: "Western Ghats & Circuits",
    airport: "Lonavala, Mahabaleshwar & Pilgrimage Corridors",
    cars: 36,
    img: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=600&q=75",
  },
];

export function HomePage() {
  const [featured, setFeatured] = useState<Car[]>(MOCK_CARS.filter((c) => c.featured).slice(0, 4));

  useEffect(() => {
    vehiclesApi.listVehicles({ limit: 8, sort_by: "capacity" })
      .then((res) => {
        if (res.vehicles && res.vehicles.length > 0) {
          const sorted = sortVehiclesByRequiredSequence(res.vehicles);
          const mapped: Car[] = sorted.slice(0, 4).map((v) => ({
            id: v.id,
            name: `${v.make || v.brand} ${v.model}`,
            brand: v.make || v.brand,
            category: v.category,
            image: v.primary_image_url || v.image_url || (v.images?.[0]?.url) || "/assets/vehicles/mahindra-thar/mahindra-thar-4x4.png",
            pricePerDay: Number(v.daily_rate) || 3500,
            perKmRate: getVehiclePerKmRate(v),
            rating: 4.9,
            reviewCount: 200 + (v.sort_order || 1) * 35,
            seats: v.seats || 5,
            seatingCapacityLabel: getVehicleSeatingLabel(v),
            fuel: v.fuel_type || "Petrol",
            transmission: v.transmission || "Manual",
            available: v.status === "AVAILABLE",
            featured: true,
            badge: v.sort_order === 1 ? "4x4 Travel" : v.sort_order === 2 ? "Best Value" : v.sort_order === 3 ? "Most Popular" : "Executive",
            sort_order: v.sort_order,
          }));
          setFeatured(mapped);
        }
      })
      .catch((err) => console.warn("Using fallback featured cabs:", err));
  }, []);

  const scrollToBooking = () => {
    const el = document.getElementById("booking-panel");
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="flex flex-col">
      {/* ─── HERO ─────────────────────────────────────────────── */}
      <section className="relative min-h-[92vh] sm:min-h-[88vh] lg:min-h-[92vh] flex items-center overflow-hidden bg-slate-950">
        {/* Mobile Background: Framed specifically for portrait screens so both the Aeroplane above & 'PUNE AIRPORT PNQ' are visible */}
        <div
          className="sm:hidden absolute inset-0 bg-cover bg-[position:center_top] transition-all duration-700"
          style={{ backgroundImage: "url('/assets/hero/pune-airport-hero-mobile.webp')" }}
        />
        {/* Tablet & Desktop Background: Wide panoramic view */}
        <div
          className="hidden sm:block absolute inset-0 bg-cover sm:bg-[position:65%_center] lg:bg-[position:60%_center] xl:bg-center transition-all duration-700"
          style={{ backgroundImage: "url('/assets/hero/pune-airport-hero.webp')" }}
        />

        {/* Responsive Readability Overlays */}
        {/* Mobile: Gentle top fade so the Airplane & Pune Airport PNQ sign shine through, deepening to dark over text */}
        <div className="sm:hidden absolute inset-0 bg-gradient-to-b from-slate-950/20 via-slate-950/70 via-40% to-slate-950/95" />
        {/* Desktop: Horizontal gradient from left to right */}
        <div className="hidden sm:block absolute inset-0 bg-gradient-to-r from-slate-950/95 via-slate-950/80 sm:via-slate-950/60 sm:via-45% to-slate-950/20" />
        <div className="hidden sm:block absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/30 to-transparent" />

        {/* Glow accents */}
        <div className="hero-glow w-96 h-96 bg-blue-600 -top-20 -left-20 opacity-25 pointer-events-none" />
        <div className="hero-glow w-64 h-64 bg-indigo-500 top-1/2 right-1/4 opacity-20 pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 sm:pt-28 pb-16 sm:pb-20 w-full">
          <div className="max-w-2xl lg:max-w-xl xl:max-w-2xl animate-fade-up">
            <Badge variant="default" className="mb-4 text-xs font-bold py-1.5 px-4 shadow-lg shadow-blue-500/20 bg-blue-600 text-white border-0">
              <Plane className="h-3.5 w-3.5 mr-1.5 text-blue-200 fill-current" />
              Pune's Trusted Cab & Taxi Services
            </Badge>

            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black leading-[1.15] mb-5 tracking-tight uppercase">
              <span className="bg-gradient-to-r from-amber-400 via-orange-400 to-amber-300 bg-clip-text text-transparent drop-shadow-md">
                Your Journey,
                <br />
                Our Responsibility.
              </span>
            </h1>

            <p className="text-base sm:text-lg lg:text-xl text-slate-200 mb-8 max-w-xl leading-relaxed">
              From Airport pickups and drops to local rides, outstation journeys and customized tours, we make every journey comfortable, convenient and reliable.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 mb-2">
              <Button size="xl" onClick={scrollToBooking} className="gap-2 w-full sm:w-auto font-bold shadow-xl shadow-blue-600/30">
                Book Your Cab <ArrowRight className="h-5 w-5" />
              </Button>
              <Link to="/services">
                <Button size="xl" variant="outline-dark" className="w-full sm:w-auto font-semibold">
                  Explore Our Services
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ─── CAB BOOKING SEARCH PANEL ─────────────────────────── */}
      <section id="booking-panel" className="bg-slate-100/90 py-6 sm:py-8 lg:py-10 border-y border-slate-200/80 scroll-mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-5 text-center sm:text-left">
            <span className="text-xs font-black uppercase tracking-widest text-blue-600 block mb-1">
              Plan Your Ride
            </span>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 tracking-tight">
              Book Your Journey
            </h2>
            <p className="text-slate-600 text-sm mt-1 max-w-2xl">
              Choose your travel option, specify pickup and drop details, and select your ideal vehicle from our verified fleet.
            </p>
          </div>
          <SearchWidget />
        </div>
      </section>

      {/* ─── FEATURED FLEET ───────────────────────────────────── */}
      <section className="section-padding bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between mb-10">
            <div>
              <Badge variant="default" className="mb-3">Explore Our Fleet</Badge>
              <h2 className="text-3xl lg:text-4xl font-extrabold text-slate-900">
                Find the Right Ride for Every Journey
              </h2>
              <p className="text-slate-500 mt-2">
                Choose the right vehicle for your journey, whether you're travelling alone, with family or in a larger group.
              </p>
            </div>
            <Link to="/cars" className="hidden sm:flex items-center gap-1 text-blue-600 font-semibold text-sm hover:underline">
              View all fleet <ChevronRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {featured.map((car) => <CarCard key={car.id} car={car} />)}
          </div>

          <div className="text-center mt-8">
            <Link to="/cars">
              <Button variant="outline" size="lg" className="font-semibold">
                Browse Complete Fleet (10 Categories) <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ─── OUR BUSINESS OFFERINGS ──────────────────────────── */}
      <section className="section-padding bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <Badge variant="default" className="mb-3">Our Core Offerings</Badge>
            <h2 className="text-3xl lg:text-4xl font-extrabold text-slate-900 mb-4 tracking-tight">
              Your Trusted Travel & Mobility Partner
            </h2>
            <p className="text-slate-500 max-w-2xl mx-auto leading-relaxed">
              From everyday city rides to outstation journeys, airport transfers and memorable holidays — we make every journey comfortable, convenient and reliable.
            </p>
          </div>

          {/* 4 Major Business Offerings Cards with Images */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
            {SERVICES_DATA.map((svc) => (
              <div
                key={svc.id}
                className="group bg-white rounded-3xl p-5 border border-slate-200/80 hover:border-blue-400 hover:shadow-xl transition-all duration-300 flex flex-col justify-between"
              >
                <div>
                  {/* Clean High-Resolution Asset Image Container */}
                  <div className="h-44 w-full rounded-2xl overflow-hidden mb-4 bg-slate-100 flex items-center justify-center border border-slate-100 shadow-inner">
                    <img
                      src={svc.image}
                      alt={svc.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      loading="eager"
                    />
                  </div>

                  {/* Header Block: Styled Icon | Divider | Title & Subtitle (Matching Reference) */}
                  <div className="flex items-center gap-3.5 my-3">
                    {/* Icon with custom accent styling */}
                    <div className="h-11 w-11 rounded-xl bg-slate-50 border border-slate-200/90 flex items-center justify-center shrink-0 shadow-sm">
                      {svc.id === "explore-cars" && (
                        <div className="relative">
                          <CarIcon className="h-5 w-5 text-blue-900" />
                          <span className="absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full bg-amber-500 border border-white flex items-center justify-center">
                            <Sparkles className="h-2 w-2 text-white" />
                          </span>
                        </div>
                      )}
                      {svc.id === "corporate-mobility" && (
                        <div className="relative">
                          <Briefcase className="h-5 w-5 text-blue-900" />
                          <span className="absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full bg-amber-500 border border-white flex items-center justify-center">
                            <Check className="h-2 w-2 text-white stroke-[3]" />
                          </span>
                        </div>
                      )}
                      {svc.id === "cab-services" && (
                        <div className="relative flex flex-col items-center">
                          <MapPin className="h-5 w-5 text-blue-900 fill-blue-900/10" />
                          <span className="h-1.5 w-4 rounded-full border border-amber-500 bg-amber-500/20 -mt-0.5" />
                        </div>
                      )}
                      {svc.id === "tours-travels" && (
                        <div className="relative">
                          <Compass className="h-5 w-5 text-blue-900" />
                          <span className="absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full bg-amber-500 border border-white flex items-center justify-center">
                            <Sparkles className="h-2 w-2 text-white" />
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Vertical Divider */}
                    <div className="h-9 w-[1.5px] bg-slate-200 shrink-0" />

                    {/* Title & Tagline */}
                    <div className="min-w-0">
                      <h3 className="text-base font-extrabold text-slate-900 group-hover:text-blue-600 transition-colors tracking-tight leading-tight">
                        {svc.title}
                      </h3>
                      <p className="text-xs text-slate-500 font-medium leading-snug mt-0.5">
                        {svc.tagline}
                      </p>
                    </div>
                  </div>

                  {/* Minimized, Simple & Attractive Description */}
                  <p className="text-xs text-slate-600 leading-relaxed mb-4">
                    {svc.shortDescription}
                  </p>
                </div>

                <div className="pt-3.5 border-t border-slate-100 mt-auto">
                  <Link
                    to={svc.id === "explore-cars" ? "/cars" : `/services#${svc.anchor}`}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 group-hover:text-blue-700 hover:gap-2 transition-all"
                  >
                    {svc.ctaText} <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>

          {/* Pillars of Service Excellence */}
          <div className="pt-8 border-t border-slate-100">
            <div className="text-center mb-8">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Our Service Excellence Guarantee
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {WHY_US.map(({ Icon, title, desc, color }) => (
                <Card key={title} className="card-hover border-slate-100">
                  <CardContent className="pt-6">
                    <div className={`inline-flex h-12 w-12 rounded-2xl items-center justify-center mb-4 ${color}`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <h3 className="font-bold text-slate-900 mb-2">{title}</h3>
                    <p className="text-sm text-slate-500 leading-relaxed">{desc}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <div className="text-center mt-12">
            <Link to="/services">
              <Button size="lg" className="gap-2 shadow-lg shadow-blue-500/20 font-bold">
                <Sparkles className="h-4 w-4" /> View All Services & Tour Packages
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ─── POPULAR DESTINATIONS & HUBS ──────────────────────── */}
      <section className="section-padding bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <Badge variant="default" className="mb-3">Major Travel Hubs</Badge>
            <h2 className="text-3xl lg:text-4xl font-extrabold text-slate-900">
              Reliable Cab Service Across Key Corridors
            </h2>
            <p className="text-slate-500 mt-2">
              Serving major airports, commercial tech parks, and spiritual & holiday destinations
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {LOCATIONS_PREVIEW.map(({ city, airport, cars, img }) => (
              <Link key={city} to="/cars" className="group relative rounded-2xl overflow-hidden aspect-[4/3] block shadow-md">
                <img
                  src={img}
                  alt={city}
                  className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = `https://placehold.co/400x300/1e293b/94a3b8?text=${city}`;
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/30 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-5">
                  <div className="flex items-center gap-1.5 text-xs text-blue-300 mb-1">
                    <MapPin className="h-3 w-3" />
                    {airport}
                  </div>
                  <h3 className="text-white font-bold text-xl">{city}</h3>
                  <p className="text-slate-300 text-xs mt-1">{cars} dedicated cabs and drivers</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ─── HOW IT WORKS (3 EASY STEPS) ──────────────────────── */}
      <section className="section-padding bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <Badge variant="default" className="mb-3">Simple Booking Process</Badge>
            <h2 className="text-3xl lg:text-4xl font-extrabold text-slate-900">
              Book Your Cab in 3 Easy Steps
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                step: "01",
                title: "Select Ride & Route",
                desc: "Choose your journey type — local cab, outstation one-way/round-trip, airport transfer, or corporate mobility.",
              },
              {
                step: "02",
                title: "Confirm Trip Details",
                desc: "Enter your pickup location, schedule, and passenger requirements with clear, upfront trip fares.",
              },
              {
                step: "03",
                title: "Relax & Travel",
                desc: "Your verified driver arrives on schedule in a clean, sanitized cab. Enjoy a safe and comfortable ride.",
              },
            ].map(({ step, title, desc }) => (
              <div key={step} className="text-center">
                <div className="inline-flex h-16 w-16 rounded-2xl bg-blue-600 items-center justify-center text-white text-2xl font-black mb-5 shadow-lg shadow-blue-500/30">
                  {step}
                </div>
                <h3 className="font-bold text-slate-900 text-xl mb-2">{title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── TESTIMONIALS ─────────────────────────────────────── */}
      <TestimonialCarousel />

      {/* ─── CTA BANNER ───────────────────────────────────────── */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-indigo-700 relative overflow-hidden">
        <div className="hero-glow w-96 h-96 bg-blue-400 -top-20 -right-20 opacity-20" />
        <div className="max-w-4xl mx-auto px-4 text-center relative z-10">
          <h2 className="text-3xl lg:text-4xl font-extrabold text-white mb-4">
            Ready for Your Next Journey?
          </h2>
          <p className="text-blue-100 text-lg mb-8 max-w-2xl mx-auto">
            Experience comfortable, reliable travel with Swaraj Tours & Travel. Book your local cab, outstation journey, airport transfer or holiday package today.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="xl"
              variant="secondary"
              onClick={scrollToBooking}
              className="bg-white text-blue-700 hover:bg-blue-50 gap-2 font-bold shadow-lg"
            >
              <CheckCircle className="h-5 w-5" />
              Book Your Cab Now
            </Button>
            <Link to="/services">
              <Button size="xl" variant="outline-dark" className="gap-2 font-semibold">
                Explore Services & Packages <ArrowRight className="h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
