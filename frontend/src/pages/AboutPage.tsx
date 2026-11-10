import { Link } from "react-router-dom";
import { Award, Users, Globe, CheckCircle, ArrowRight, HeartHandshake } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";


const VALUES = [
  {
    Icon: Award,
    title: "Safety & Reliability",
    desc: "Every vehicle in our passenger fleet is commercially registered, rigorously inspected, and piloted by vetted, courteous drivers.",
  },
  {
    Icon: Users,
    title: "Customer Centric",
    desc: "We put travelers at the center of every journey — from upfront transparent pricing to 24/7 on-call dispatch assistance.",
  },
  {
    Icon: Globe,
    title: "Complete Mobility",
    desc: "Comprehensive solutions covering local city cabs, one-way outstations, airport transfers, corporate commutes, and custom tours.",
  },
  {
    Icon: HeartHandshake,
    title: "Zero Surge & Transparency",
    desc: "Honest, upfront trip fares with no hidden tolls, abrupt cancellations, or unexpected surge pricing.",
  },
];

export function AboutPage() {
  return (
    <div className="min-h-screen bg-white pt-16">
      {/* Hero */}
      <section className="relative bg-slate-950 py-24 overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=1600&q=80"
          alt="Fleet Highway Travel"
          className="absolute inset-0 w-full h-full object-cover opacity-25"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/95 via-slate-950/80 to-slate-950/60" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Badge className="mb-6 bg-amber-500/20 text-amber-300 border border-amber-500/30 text-sm py-1.5 px-4 font-bold">
            About Swaraj Tours & Travel
          </Badge>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white mb-6 tracking-tight">
            Your Trusted Travel &
            <br />
            <span className="gradient-text">Mobility Partner</span>
          </h1>
          <p className="text-lg sm:text-xl text-slate-300 max-w-3xl mx-auto leading-relaxed">
            From everyday city rides to outstation journeys, airport transfers and memorable holidays — we make every journey comfortable, convenient and reliable.
          </p>
        </div>
      </section>

      {/* Mission */}
      <section className="section-padding bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <Badge variant="default" className="mb-4">Our Identity & Mission</Badge>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 mb-5 leading-tight">
                We believe every journey should be safe, comfortable, and punctual
              </h2>
              <p className="text-slate-600 leading-relaxed mb-4">
                Swaraj Tours & Travel is a dedicated <strong>Cab, Taxi, Corporate Transportation and Tours & Travels</strong> service provider. We are not a self-drive rental platform — we are your end-to-end transportation partner.
              </p>
              <p className="text-slate-600 leading-relaxed mb-6">
                Whether you need a dependable point-to-point city cab, an early-morning guaranteed airport pickup, dedicated daily staff shuttles for your company, or a spiritual pilgrimage tour across Western India's sacred shrines, our mission is to deliver dependable transportation with professional drivers and spotless vehicles.
              </p>
              <ul className="space-y-3">
                {[
                  "Local Point-to-Point and Hourly Cab Services",
                  "One-Way & Round-Trip Outstation Journeys",
                  "Guaranteed Airport Pickup and Drop with Live Flight Tracking",
                  "Corporate & Employee Transportation Solutions",
                  "Customized Holiday Packages, Pilgrimages & Sightseeing",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2.5 text-slate-700 text-sm font-semibold">
                    <CheckCircle className="h-5 w-5 text-emerald-500 shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="relative rounded-3xl overflow-hidden aspect-[4/3] shadow-2xl">
              <img
                src="https://images.unsplash.com/photo-1502877338535-766e1452684a?w=800&q=80"
                alt="Executive Cab Fleet"
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "/assets/vehicles/toyota-innova-crysta/toyota-innova-crysta.png";
                }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Stats Banner */}
      <section className="bg-blue-600 py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 text-center">
            {[
              { value: "2022", label: "Year Founded" },
              { value: "10+", label: "Fleet Categories (4 to 40 Seaters)" },
              { value: "24/7", label: "Dispatch & Roadside Support" },
              { value: "12,000+", label: "Completed Trips" },
            ].map(({ value, label }) => (
              <div key={label}>
                <p className="text-3xl sm:text-4xl font-extrabold text-white">{value}</p>
                <p className="text-blue-100 mt-1 text-sm">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="section-padding bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <Badge variant="default" className="mb-3">What Drives Us</Badge>
            <h2 className="text-3xl lg:text-4xl font-extrabold text-slate-900">Our Core Principles</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {VALUES.map(({ Icon, title, desc }) => (
              <div key={title} className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm card-hover text-center">
                <div className="inline-flex h-14 w-14 rounded-2xl bg-blue-100 items-center justify-center text-blue-600 mb-4">
                  <Icon className="h-7 w-7" />
                </div>
                <h3 className="font-bold text-slate-900 mb-2">{title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>


      {/* CTA */}
      <section className="section-padding bg-slate-950">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-extrabold text-white mb-4">Ready to experience Swaraj Tours & Travel?</h2>
          <p className="text-slate-400 mb-8">Book your cab, corporate shuttle, or holiday tour package with confidence.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/cars">
              <Button size="xl" className="gap-2 font-bold">
                Explore Our Fleet <ArrowRight className="h-5 w-5" />
              </Button>
            </Link>
            <Link to="/contact">
              <Button size="xl" variant="outline-dark" className="font-semibold">
                Contact Travel Desk
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
