import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  MapPin, Search, AlertCircle, Car, CreditCard,
  CheckCircle2, Clock, Copy, Check, X
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { bookingsApi, Booking } from "@/core/api";
import { useAuth } from "@/context/AuthContext";
import { PaymentModal } from "@/components/PaymentModal";

const STATUS_FILTERS = [
  { id: "ALL", label: "All" },
  { id: "CONFIRMED", label: "Confirmed" },
  { id: "PENDING", label: "Payment Pending" },
  { id: "COMPLETED", label: "Completed" },
  { id: "CANCELLED", label: "Cancelled" },
];

export function BookingsPage() {
  const { user, isAuthenticated } = useAuth();
  const [searchParams] = useSearchParams();
  const queryRef = searchParams.get("ref");

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search & Filter state
  const [filter, setFilter] = useState("ALL");
  const [searchTerm, setSearchTerm] = useState(queryRef || "");
  const [copiedRef, setCopiedRef] = useState<string | null>(null);

  // Cancellation state
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [cancellationReason, setCancellationReason] = useState("");
  const [cancellingLoading, setCancellingLoading] = useState(false);

  // Payment state
  const [payingBooking, setPayingBooking] = useState<Booking | null>(null);

  const fetchBookings = async () => {
    setLoading(true);
    setError(null);
    try {
      if (isAuthenticated) {
        const data = await bookingsApi.listMyBookings();
        setBookings(data);
      } else {
        setBookings([]);
      }
    } catch (err: any) {
      setError(err?.message || "Failed to load bookings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, [isAuthenticated, user?.id]);

  useEffect(() => {
    if (queryRef) {
      setSearchTerm(queryRef);
    }
  }, [queryRef]);

  const handleCopyRef = (ref: string) => {
    navigator.clipboard.writeText(ref);
    setCopiedRef(ref);
    setTimeout(() => setCopiedRef(null), 2000);
  };

  const handleCancelBooking = async (bookingId: string) => {
    if (!cancellationReason.trim()) {
      alert("Please provide a brief cancellation reason.");
      return;
    }
    setCancellingLoading(true);
    try {
      await bookingsApi.cancelBooking(bookingId, cancellationReason.trim());
      setCancellingId(null);
      setCancellationReason("");
      await fetchBookings();
    } catch (err: any) {
      alert(err?.message || "Failed to cancel booking.");
    } finally {
      setCancellingLoading(false);
    }
  };

  const formatCurrency = (val: number | string | undefined | null) => {
    const num = Number(val) || 0;
    return `₹${num.toLocaleString("en-IN", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    })}`;
  };

  const getStatusBadge = (status: string) => {
    const s = (status || "").toUpperCase();
    switch (s) {
      case "CONFIRMED":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
            <span className="h-2 w-2 rounded-full bg-emerald-600 animate-pulse" />
            Confirmed
          </span>
        );
      case "ACTIVE":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-600 text-white shadow-sm">
            <Car className="h-3.5 w-3.5" />
            In Progress / On Trip
          </span>
        );
      case "COMPLETED":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
            Completed
          </span>
        );
      case "AWAITING_PAYMENT":
      case "PENDING":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
            <Clock className="h-3.5 w-3.5 text-amber-600" />
            {s === "AWAITING_PAYMENT" ? "Payment Pending" : "Pending Confirmation"}
          </span>
        );
      case "CANCELLED":
      case "REJECTED":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-300">
            <AlertCircle className="h-3.5 w-3.5 text-slate-500" />
            Cancelled
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
            {s}
          </span>
        );
    }
  };

  const filtered = bookings.filter((b) => {
    const s = (b.status || "").toUpperCase();
    if (filter === "CONFIRMED" && s !== "CONFIRMED" && s !== "ACTIVE") return false;
    if (filter === "PENDING" && s !== "AWAITING_PAYMENT" && s !== "PENDING") return false;
    if (filter === "COMPLETED" && s !== "COMPLETED") return false;
    if (filter === "CANCELLED" && s !== "CANCELLED" && s !== "REJECTED") return false;

    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      const carStr = b.vehicle ? `${b.vehicle.brand} ${b.vehicle.model}`.toLowerCase() : "";
      const refStr = (b.booking_reference || "").toLowerCase();
      const custStr = (b.customer_name || "").toLowerCase();
      const pickStr = (b.pickup_location?.name || "").toLowerCase();
      const dropStr = (b.return_location?.name || "").toLowerCase();
      return (
        carStr.includes(q) ||
        refStr.includes(q) ||
        custStr.includes(q) ||
        pickStr.includes(q) ||
        dropStr.includes(q)
      );
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-slate-50 pt-16 lg:pt-[72px] pb-16">
      {/* Top Banner & Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-[1336px] mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-orange-600" />
                <span className="text-xs font-bold uppercase tracking-wider text-orange-600">
                  MY TRAVEL
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                My Bookings & Journey Tracking
              </h1>
              <p className="text-slate-500 text-sm leading-relaxed max-w-xl">
                Manage your reservations, track upcoming rides, view payment details and stay updated on your journeys.
              </p>
            </div>
            <div className="shrink-0">
              <Link to="/cars">
                <Button className="bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl shadow-lg shadow-orange-500/20 gap-2 h-10 sm:h-11 px-5 sm:px-6">
                  <Car className="h-4 w-4" /> Book a New Ride
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Main Bookings List Section */}
      <div className="max-w-[1336px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Guest Warning Banner if not authenticated */}
        {!isAuthenticated && (
          <div className="mb-6 p-4 rounded-2xl bg-orange-50 border border-orange-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-orange-600 text-white flex items-center justify-center shrink-0">
                <Car className="h-5 w-5" />
              </div>
              <div>
                <p className="font-bold text-slate-900 text-sm">
                  Sign in to view your complete personal booking history
                </p>
                <p className="text-xs text-slate-600 mt-0.5">
                  Sign in with your account to manage your trips and view booking details.
                </p>
              </div>
            </div>
            <Link to="/login" className="shrink-0">
              <Button size="sm" className="bg-slate-900 hover:bg-black text-white font-bold rounded-xl text-xs h-9">
                Sign In Now
              </Button>
            </Link>
          </div>
        )}

        {/* Search & Filter Toolbar */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 sm:gap-4 mb-6">
          <div className="relative w-full lg:max-w-md xl:max-w-lg">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search by car, reference, route..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-11 rounded-xl bg-white border-slate-200 text-sm focus:border-orange-500 w-full"
            />
          </div>

          {/* Compact Filter Pills with Mobile Horizontal Scrolling */}
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-1 w-full lg:w-auto -mx-1 px-1 sm:mx-0 sm:px-0 shrink-0">
            {STATUS_FILTERS.map((s) => {
              const isActive = filter === s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => setFilter(s.id)}
                  className={`h-11 px-4 sm:px-5 rounded-xl text-xs sm:text-sm whitespace-nowrap shrink-0 transition-all font-semibold flex items-center justify-center ${
                    isActive
                      ? "bg-orange-600 text-white shadow-md shadow-orange-500/25 border border-orange-600 font-bold"
                      : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 hover:text-slate-900 hover:border-slate-300"
                  }`}
                >
                  {s.label}
                </button>
              );
            })}
          </div>
        </div>

        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-2xl mb-6 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-rose-500 shrink-0" />
            {error}
          </div>
        )}

        {/* Cancellation Reason Modal */}
        {cancellingId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-base font-black text-slate-900">Cancel Cab Reservation</h3>
                <button onClick={() => setCancellingId(null)} className="p-1 rounded-lg text-slate-400 hover:text-slate-600">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Are you sure you want to cancel this booking? This will immediately release the reserved vehicle slot.
              </p>
              <textarea
                rows={3}
                placeholder="Reason for cancellation (e.g. Flight rescheduled, change of plans)..."
                value={cancellationReason}
                onChange={(e) => setCancellationReason(e.target.value)}
                className="w-full p-3 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-orange-500 bg-slate-50 font-medium"
              />
              <div className="flex gap-2 justify-end pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCancellingId(null)}
                  className="rounded-xl text-xs"
                >
                  Keep Booking
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={cancellingLoading || !cancellationReason.trim()}
                  onClick={() => handleCancelBooking(cancellingId)}
                  className="rounded-xl font-bold text-xs"
                >
                  {cancellingLoading ? "Cancelling..." : "Confirm Cancellation"}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Bookings List Cards */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-44 bg-slate-200 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          (() => {
            const emptyState = (() => {
              if (searchTerm) {
                return {
                  heading: "No Matching Bookings",
                  description: `No bookings match "${searchTerm}". Try searching by car model, route, or reference number.`,
                  showPromoCta: false,
                  ctaText: "Clear Search",
                  action: () => setSearchTerm(""),
                };
              }

              if (filter === "CONFIRMED") {
                return {
                  heading: "No Confirmed Bookings",
                  description: "You have no confirmed or active rides at the moment.",
                  showPromoCta: bookings.length === 0,
                  ctaText: bookings.length === 0 ? "Explore Fleet & Book a Cab →" : "View All Bookings",
                  ctaLink: "/cars",
                  action: () => setFilter("ALL"),
                  secondaryText: bookings.length === 0 ? "Reset filter to All" : undefined,
                  secondaryAction: () => setFilter("ALL"),
                };
              }

              if (filter === "PENDING") {
                return {
                  heading: "No Pending Payments",
                  description: "You're all settled! There are no bookings awaiting payment confirmation.",
                  showPromoCta: bookings.length === 0,
                  ctaText: bookings.length === 0 ? "Explore Fleet & Book a Cab →" : "View All Bookings",
                  ctaLink: "/cars",
                  action: () => setFilter("ALL"),
                  secondaryText: bookings.length === 0 ? "Reset filter to All" : undefined,
                  secondaryAction: () => setFilter("ALL"),
                };
              }

              if (filter === "COMPLETED") {
                return {
                  heading: "No Completed Trips",
                  description: "Completed journeys and invoices will appear here once your trips conclude.",
                  showPromoCta: bookings.length === 0,
                  ctaText: bookings.length === 0 ? "Explore Fleet & Book a Cab →" : "View All Bookings",
                  ctaLink: "/cars",
                  action: () => setFilter("ALL"),
                  secondaryText: bookings.length === 0 ? "Reset filter to All" : undefined,
                  secondaryAction: () => setFilter("ALL"),
                };
              }

              if (filter === "CANCELLED") {
                return {
                  heading: "No Cancelled Bookings",
                  description: "You have no cancelled or rejected reservations on record.",
                  showPromoCta: bookings.length === 0,
                  ctaText: bookings.length === 0 ? "Explore Fleet & Book a Cab →" : "View All Bookings",
                  ctaLink: "/cars",
                  action: () => setFilter("ALL"),
                  secondaryText: bookings.length === 0 ? "Reset filter to All" : undefined,
                  secondaryAction: () => setFilter("ALL"),
                };
              }

              // Default Empty State (filter === "ALL")
              return {
                heading: "No Bookings Yet",
                description:
                  "Your next journey is waiting! Explore our fleet and book a comfortable, hassle-free ride with Swaraj Tours & Travel.",
                showPromoCta: bookings.length === 0,
                ctaText: "Explore Fleet & Book a Cab →",
                ctaLink: "/cars",
                action: () => setFilter("ALL"),
              };
            })();

            return (
              /* Refined Empty State Matching Specifications */
              <div className="text-center py-[36px] sm:py-[56px] bg-white rounded-[16px] border border-slate-200 px-6 sm:px-8 shadow-sm max-w-xl mx-auto">
                {/* 76px Icon container with warm peach background */}
                <div className="w-[76px] h-[76px] rounded-[16px] bg-[#fff5ea] border border-orange-100 text-orange-600 flex items-center justify-center mx-auto mb-5 shadow-xs">
                  <Car className="h-8 w-8 text-orange-600 stroke-[2.2]" />
                </div>

                {/* 22px semibold heading */}
                <h3 className="text-[22px] font-semibold text-slate-900 tracking-tight">
                  {emptyState.heading}
                </h3>

                {/* 14px description with max-width 460px */}
                <p className="text-[14px] text-slate-500 mt-2 max-w-[460px] mx-auto leading-relaxed">
                  {emptyState.description}
                </p>

                {/* CTA Button: 48px height, 16px radius (rounded-[16px]) */}
                {emptyState.showPromoCta ? (
                  <div className="mt-6 space-y-2.5">
                    <Link to={emptyState.ctaLink || "/cars"} className="block w-full max-w-md mx-auto">
                      <Button className="w-full h-[48px] bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-[16px] shadow-lg shadow-orange-500/25 flex items-center justify-center gap-2 text-sm sm:text-base transition-all active:scale-[0.99]">
                        {emptyState.ctaText}
                      </Button>
                    </Link>
                    {emptyState.secondaryText && emptyState.secondaryAction && (
                      <button
                        type="button"
                        onClick={emptyState.secondaryAction}
                        className="text-xs font-semibold text-slate-400 hover:text-slate-700 transition-colors"
                      >
                        {emptyState.secondaryText}
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="mt-6 flex justify-center">
                    <Button
                      onClick={emptyState.action}
                      variant="outline"
                      className="h-[48px] rounded-[16px] border-slate-300 font-bold text-xs sm:text-sm px-6 hover:bg-slate-50 text-slate-800"
                    >
                      {emptyState.ctaText}
                    </Button>
                  </div>
                )}
              </div>
            );
          })()
        ) : (
          <div className="space-y-4">
            {filtered.map((b) => {
              const carName = b.vehicle
                ? `${b.vehicle.brand} ${b.vehicle.model}`
                : "Reserved Cab";
              const pickupName = b.pickup_location?.name || "Pickup Point";
              const dropName = b.return_location?.name || "Destination";
              const travelDate = new Date(b.start_datetime).toLocaleDateString("en-IN", {
                weekday: "short",
                day: "numeric",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              });
              const bookingDate = new Date(b.created_at).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
                year: "numeric",
              });

              return (
                <Card
                  key={b.id}
                  className="rounded-2xl border border-slate-200/90 hover:border-orange-200 bg-white shadow-sm hover:shadow-md transition-all overflow-hidden"
                >
                  {/* Top Bar: Booking Ref & Status */}
                  <div className="px-5 sm:px-6 py-3.5 sm:py-4 bg-slate-50/80 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                      <div className="flex items-center gap-1.5 font-mono text-xs font-bold bg-white text-slate-800 px-3 py-1 rounded-lg border border-slate-200">
                        <span>Ref: {b.booking_reference}</span>
                        <button
                          onClick={() => handleCopyRef(b.booking_reference)}
                          title="Copy Reference"
                          className="text-slate-400 hover:text-slate-700 ml-1 transition-colors"
                        >
                          {copiedRef === b.booking_reference ? (
                            <Check className="h-3.5 w-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </div>

                      <span className="text-xs text-slate-400 font-medium">
                        Booked on {bookingDate}
                      </span>
                    </div>

                    <div className="flex items-center">{getStatusBadge(b.status)}</div>
                  </div>

                  {/* Body Content */}
                  <div className="p-5 sm:p-6 space-y-5">
                    {/* Vehicle & Trip Info vs Fare */}
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
                      {/* Left: Vehicle Info */}
                      <div className="flex items-center gap-4">
                        <div className="h-14 w-14 rounded-2xl bg-slate-900 text-white flex items-center justify-center shrink-0 shadow-sm">
                          <Car className="h-7 w-7 text-orange-400" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                              {carName}
                            </h3>
                            {b.vehicle?.category && (
                              <Badge variant="outline" className="text-[10px] font-bold px-2 py-0.5">
                                {b.vehicle.category}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right: Fare Amount & Status */}
                      <div className="flex sm:flex-col items-start sm:items-end justify-between sm:justify-center border-t lg:border-t-0 pt-3 lg:pt-0 border-slate-100 gap-1 shrink-0">
                        <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">
                          Total Trip Fare
                        </span>
                        <span className="text-xl sm:text-2xl font-black text-slate-900 leading-none">
                          {formatCurrency(b.total_amount)}
                        </span>
                        <span className="text-xs font-semibold text-slate-500 mt-0.5">
                          {b.status === "CONFIRMED" || b.status === "COMPLETED"
                            ? "Paid via Razorpay"
                            : "Payment Pending"}
                        </span>
                      </div>
                    </div>

                    {/* Route Details Box: Balanced Two-Column Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-100">
                      <div>
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                          Pickup Location & Date
                        </span>
                        <div className="flex items-start gap-2.5">
                          <MapPin className="h-4 w-4 text-orange-600 shrink-0 mt-0.5" />
                          <div>
                            <p className="font-bold text-slate-800 text-xs sm:text-sm">{pickupName}</p>
                            <p className="text-slate-500 text-xs font-medium mt-1 flex items-center gap-1.5">
                              <Clock className="h-3.5 w-3.5 text-slate-400" />
                              {travelDate}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div>
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                          Drop Location
                        </span>
                        <div className="flex items-start gap-2.5">
                          <MapPin className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                          <div>
                            <p className="font-bold text-slate-800 text-xs sm:text-sm">{dropName}</p>
                            <p className="text-slate-500 text-xs font-medium mt-1 flex items-center gap-1.5">
                              <Clock className="h-3.5 w-3.5 text-slate-400" />
                              Estimated return:{" "}
                              {new Date(b.end_datetime).toLocaleDateString("en-IN", {
                                day: "numeric",
                                month: "short",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Actions Bar */}
                    {b.status !== "CANCELLED" && b.status !== "COMPLETED" && (
                      <div className="flex items-center justify-end gap-2.5 pt-3.5 border-t border-slate-100">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-10 px-4 rounded-xl text-xs font-bold text-slate-600 hover:text-red-600 border-slate-200 whitespace-nowrap"
                          onClick={() => setCancellingId(b.id)}
                        >
                          Cancel Ride
                        </Button>

                        {(b.status === "AWAITING_PAYMENT" || b.status === "PENDING") && (
                          <Button
                            size="sm"
                            className="h-10 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-1.5 shadow-md shadow-emerald-600/20 whitespace-nowrap"
                            onClick={() => setPayingBooking(b)}
                          >
                            <CreditCard className="h-3.5 w-3.5 shrink-0" /> Complete Payment
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Razorpay Payment Modal */}
      {payingBooking && (
        <PaymentModal
          booking={payingBooking}
          isOpen={!!payingBooking}
          onClose={() => setPayingBooking(null)}
          onPaymentSuccess={() => {
            fetchBookings();
          }}
        />
      )}
    </div>
  );
}
