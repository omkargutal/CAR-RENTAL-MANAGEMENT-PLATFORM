import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Car, Calendar, MapPin,
  ChevronRight, CheckCircle2, Clock,
  AlertCircle, Navigation, Snowflake,
  Headphones, User
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { useAuth } from "@/context/AuthContext";
import { bookingsApi, Booking, CustomerStats } from "@/core/api";

export function DashboardPage() {
  const { user } = useAuth();
  const firstName = user?.full_name ? user.full_name.split(" ")[0] : "Traveler";

  const [stats, setStats] = useState<CustomerStats>({
    total_bookings: 0,
    upcoming_trips: 0,
    completed_trips: 0,
    cancelled_bookings: 0,
    total_amount_spent: 0,
    currency: "INR",
  });
  const [recentBookings, setRecentBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboardData() {
      setLoading(true);
      try {
        const [statsData, bookingsData] = await Promise.allSettled([
          bookingsApi.getMyBookingStats(),
          bookingsApi.listMyBookings(),
        ]);

        if (statsData.status === "fulfilled") {
          setStats(statsData.value);
        }

        if (bookingsData.status === "fulfilled") {
          setRecentBookings(bookingsData.value.slice(0, 5));
        }
      } catch (err) {
        console.error("Dashboard data load error:", err);
      } finally {
        setLoading(false);
      }
    }

    loadDashboardData();
  }, [user?.id]);

  const formatCurrency = (amount: number | string) => {
    const num = Number(amount) || 0;
    return `₹${num.toLocaleString("en-IN", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    })}`;
  };

  const getStatusBadge = (status: string) => {
    const s = (status || "").toUpperCase();
    switch (s) {
      case "CONFIRMED":
      case "ACTIVE":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-pulse" />
            {s}
          </span>
        );
      case "COMPLETED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="h-3 w-3 text-emerald-600" />
            Completed
          </span>
        );
      case "AWAITING_PAYMENT":
      case "PENDING":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
            <Clock className="h-3 w-3 text-amber-600" />
            {s === "AWAITING_PAYMENT" ? "Payment Pending" : "Pending"}
          </span>
        );
      case "CANCELLED":
      case "REJECTED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-300">
            <AlertCircle className="h-3 w-3 text-slate-500" />
            Cancelled
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
            {s}
          </span>
        );
    }
  };

  const statCards = [
    {
      label: "TOTAL BOOKINGS",
      value: stats.total_bookings,
      subtext: stats.total_bookings === 0 ? "No bookings yet" : `${stats.total_bookings} registered trips`,
      Icon: Calendar,
      colorClass: "bg-slate-100 text-slate-900 border-slate-200",
      accentBg: "bg-slate-50",
    },
    {
      label: "UPCOMING TRIPS",
      value: stats.upcoming_trips,
      subtext: stats.upcoming_trips === 0 ? "No active rides" : "Ready for travel",
      Icon: Navigation,
      colorClass: "bg-orange-100 text-orange-600 border-orange-200",
      accentBg: "bg-orange-50/50",
    },
    {
      label: "COMPLETED TRIPS",
      value: stats.completed_trips,
      subtext: stats.completed_trips === 0 ? "0 journeys finished" : "Fulfilled safely",
      Icon: CheckCircle2,
      colorClass: "bg-emerald-100 text-emerald-700 border-emerald-200",
      accentBg: "bg-emerald-50/50",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 pt-20 pb-16">
      <div className="max-w-[1336px] mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-orange-500 animate-pulse" />
              <span className="text-xs font-bold uppercase tracking-widest text-orange-600">
                Customer Travel Portal
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mt-1">
              Welcome back, {firstName}! 👋
            </h1>
            <p className="text-slate-500 text-sm mt-0.5">
              Your journeys, bookings and travel details — all in one place.
            </p>
          </div>
        </div>

        {/* Dynamic 3 KPI Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {statCards.map((card) => (
            <div
              key={card.label}
              className={`rounded-2xl border bg-white p-5 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5 ${card.accentBg}`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider line-clamp-1">
                  {card.label}
                </span>
                <div
                  className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 border ${card.colorClass}`}
                >
                  <card.Icon className="h-4 w-4" />
                </div>
              </div>
              <div className="text-3xl font-black text-slate-900 tracking-tight">
                {card.value}
              </div>
              <p className="text-xs text-slate-500 mt-1 truncate">
                {card.subtext}
              </p>
            </div>
          ))}
        </div>

        {/* Main Content Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Left Column: Recent Bookings / Empty State (Span 2 cols) */}
          <div className="lg:col-span-2 space-y-4">
            <Card className="border-slate-200/80 shadow-sm rounded-2xl overflow-hidden bg-white">
              <CardHeader className="flex flex-row items-center justify-between py-4 px-4 sm:px-6 border-b border-slate-100 bg-slate-50/50">
                <div>
                  <CardTitle className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                    Recent Bookings
                  </CardTitle>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Your upcoming rides and previous journeys, all in one place.
                  </p>
                </div>
                <Link
                  to="/bookings"
                  className="text-xs font-bold text-slate-900 hover:text-orange-600 flex items-center gap-1 transition-colors shrink-0 ml-2"
                >
                  View All →
                </Link>
              </CardHeader>

              <CardContent className="p-3.5 sm:p-6">
                {loading ? (
                  <div className="py-16 text-center text-slate-400">
                    <div className="h-8 w-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                    <p className="text-xs font-medium">Loading your booking records...</p>
                  </div>
                ) : recentBookings.length === 0 ? (
                  /* Zero-State: Attractive, Interactive First-Booking Call to Action */
                  <div className="py-10 px-4 sm:px-8 text-center max-w-xl mx-auto">
                    <div className="h-16 w-16 rounded-2xl bg-orange-100/80 border border-orange-200/60 text-orange-600 flex items-center justify-center mx-auto mb-4 shadow-sm">
                      <Car className="h-8 w-8 text-orange-600" />
                    </div>

                    <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                      Your First Journey Starts Here!
                    </h3>

                    <p className="text-slate-600 text-sm mt-2 max-w-lg mx-auto leading-relaxed">
                      Ready to explore? Book your first cab with Swaraj Tours & Travel and enjoy a comfortable, safe and hassle-free journey.
                    </p>

                    <div className="mt-6">
                      <Link to="/cars" className="block w-full max-w-md mx-auto">
                        <Button className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl shadow-lg shadow-orange-500/25 h-12 text-sm gap-2 transition-all">
                          <Car className="h-4 w-4" /> Book Your First Cab
                        </Button>
                      </Link>
                    </div>

                    <div className="mt-4">
                      <p className="text-xs text-slate-500 font-medium">Already have a booking?</p>
                      <Link
                        to="/bookings"
                        className="inline-flex items-center gap-1 text-xs font-bold text-orange-600 hover:text-orange-700 mt-1 transition-colors"
                      >
                        Track by Booking Reference →
                      </Link>
                    </div>

                    <div className="mt-8 grid grid-cols-3 gap-3 pt-6 border-t border-slate-100 text-center">
                      <div>
                        <MapPin className="h-5 w-5 text-orange-600 mx-auto mb-1.5" />
                        <p className="text-xs sm:text-sm font-bold text-slate-900">Pune & Mumbai</p>
                        <p className="text-[11px] text-slate-500 mt-0.5">Service Areas</p>
                      </div>
                      <div>
                        <Snowflake className="h-5 w-5 text-orange-600 mx-auto mb-1.5" />
                        <p className="text-xs sm:text-sm font-bold text-slate-900">AC Fleet</p>
                        <p className="text-[11px] text-slate-500 mt-0.5">Comfortable Rides</p>
                      </div>
                      <div>
                        <Headphones className="h-5 w-5 text-orange-600 mx-auto mb-1.5" />
                        <p className="text-xs sm:text-sm font-bold text-slate-900">Customer Support</p>
                        <p className="text-[11px] text-slate-500 mt-0.5">WhatsApp Assistance</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Display Real Recent Bookings */
                  <div className="space-y-3">
                    {recentBookings.map((b) => {
                      const carName = b.vehicle
                        ? `${b.vehicle.brand} ${b.vehicle.model}`
                        : "Reserved Cab";
                      const pickupName = b.pickup_location?.name || "Pickup Point";
                      const dropName = b.return_location?.name || "Destination";
                      const travelDate = new Date(b.start_datetime).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      });

                      return (
                        <div
                          key={b.id}
                          className="rounded-2xl border border-slate-200/90 hover:border-orange-200/90 bg-white hover:bg-orange-50/10 transition-all p-3.5 sm:p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)] group"
                        >
                          {/* Row 1: Header - Vehicle Icon + Details on Left, Status Badge on Right */}
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="h-10 w-10 sm:h-11 sm:w-11 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0 shadow-sm group-hover:bg-orange-600 transition-colors">
                                <Car className="h-5 w-5" />
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h4 className="font-bold text-slate-900 text-sm sm:text-base leading-snug">
                                    {carName}
                                  </h4>
                                  <span className="font-mono text-[11px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200 shrink-0">
                                    {b.booking_reference}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-0.5">
                                  <Calendar className="h-3 w-3 text-slate-400 shrink-0" />
                                  <span>{travelDate}</span>
                                </div>
                              </div>
                            </div>

                            {/* Status Badge in top right */}
                            <div className="shrink-0 self-start">
                              {getStatusBadge(b.status)}
                            </div>
                          </div>

                          {/* Row 2: Route Display with Visual Origin & Destination Connectors */}
                          <div className="mt-3 pt-3 border-t border-slate-100">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                              {/* Pickup Point */}
                              <div className="flex items-center gap-2 min-w-0 bg-slate-50 sm:bg-slate-50/70 p-2 sm:px-3 sm:py-2 rounded-xl border border-slate-100">
                                <div className="h-5 w-5 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                                  <span className="h-2 w-2 rounded-full bg-emerald-600" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block leading-tight">
                                    Pickup Point
                                  </span>
                                  <p className="font-semibold text-slate-800 text-xs truncate" title={pickupName}>
                                    {pickupName}
                                  </p>
                                </div>
                              </div>

                              {/* Destination */}
                              <div className="flex items-center gap-2 min-w-0 bg-slate-50 sm:bg-slate-50/70 p-2 sm:px-3 sm:py-2 rounded-xl border border-slate-100">
                                <div className="h-5 w-5 rounded-full bg-orange-100 flex items-center justify-center shrink-0">
                                  <span className="h-2 w-2 rounded-full bg-orange-600" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block leading-tight">
                                    Destination
                                  </span>
                                  <p className="font-semibold text-slate-800 text-xs truncate" title={dropName}>
                                    {dropName}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Row 3: Fare & Actions Footer */}
                          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between gap-3">
                            <div>
                              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block leading-none mb-0.5">
                                Total Amount
                              </span>
                              <span className="text-base sm:text-lg font-black text-slate-900 leading-none">
                                {formatCurrency(b.total_amount)}
                              </span>
                            </div>

                            <Link to={`/bookings?ref=${b.booking_reference}`}>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 text-xs font-bold text-orange-600 border-orange-200 hover:border-orange-300 hover:bg-orange-50 px-3 rounded-xl shadow-none gap-1"
                              >
                                Track <ChevronRight className="h-3.5 w-3.5" />
                              </Button>
                            </Link>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Quick Actions & 24/7 Customer Support */}
          <div className="space-y-5">
            <Card className="border-slate-200/80 shadow-sm rounded-2xl overflow-hidden bg-white">
              <CardHeader className="py-4 px-5 border-b border-slate-100 bg-slate-50/50">
                <CardTitle className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                  <Navigation className="h-3.5 w-3.5 text-orange-600" />
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 space-y-1.5">
                {[
                  {
                    label: "Book a Cab",
                    href: "/cars",
                    desc: "Browse available cars and book your next ride.",
                    Icon: Car,
                    highlight: true,
                  },
                  {
                    label: "My Bookings",
                    href: "/bookings",
                    desc: "View upcoming trips, booking history and status.",
                    Icon: Calendar,
                    highlight: false,
                  },
                  {
                    label: "My Profile",
                    href: "/profile",
                    desc: "Manage your personal details and account settings.",
                    Icon: User,
                    highlight: false,
                  },
                ].map(({ label, href, desc, Icon, highlight }) => (
                  <Link key={label} to={href} className="block group">
                    <div
                      className={`p-3 rounded-xl transition-all flex items-start gap-3 border ${
                        highlight
                          ? "bg-orange-50/40 border-orange-200 hover:bg-orange-50"
                          : "border-transparent hover:bg-slate-50 hover:border-slate-200"
                      }`}
                    >
                      <div
                        className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                          highlight
                            ? "bg-orange-600 text-white"
                            : "bg-slate-100 text-slate-700 group-hover:bg-orange-100 group-hover:text-orange-700"
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-bold text-slate-900 group-hover:text-orange-600 transition-colors">
                            {label}
                          </span>
                          <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-orange-600 group-hover:translate-x-0.5 transition-all" />
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5 truncate">{desc}</p>
                      </div>
                    </div>
                  </Link>
                ))}
              </CardContent>
            </Card>

            {/* 24/7 CUSTOMER SUPPORT */}
            <div className="p-5 rounded-2xl bg-slate-900 text-white space-y-3 shadow-sm border border-slate-800">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300">
                  24/7 CUSTOMER SUPPORT
                </span>
              </div>
              <h4 className="text-sm font-bold text-white tracking-tight">
                Need a Ride or Assistance?
              </h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                Get in touch with our team for cab bookings, airport transfers, outstation trips, corporate travel or tour planning across Pune & Mumbai.
              </p>
              <a
                href="https://wa.me/918421081570"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-md shadow-emerald-900/40 gap-1.5"
              >
                WhatsApp Us Directly
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
