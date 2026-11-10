import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { MapPin, Search, AlertCircle, Car, CreditCard } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { bookingsApi, Booking } from "@/core/api";
import { useAuth } from "@/context/AuthContext";
import { PaymentModal } from "@/components/PaymentModal";

const STATUS_FILTERS = [
  "ALL",
  "ACTIVE / CONFIRMED",
  "AWAITING_PAYMENT",
  "COMPLETED",
  "CANCELLED",
];

export function BookingsPage() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search & Filter state
  const [filter, setFilter] = useState("ALL");
  const [searchTerm, setSearchTerm] = useState("");

  // Reference Tracking input
  const [referenceQuery, setReferenceQuery] = useState("");
  const [trackingLoading, setTrackingLoading] = useState(false);
  const [trackedBooking, setTrackedBooking] = useState<Booking | null>(null);
  const [trackError, setTrackError] = useState<string | null>(null);

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
      if (user) {
        const data = await bookingsApi.listMyBookings();
        setBookings(data);
      } else {
        // Guest user: fetch active demo/general bookings or empty
        const all = await bookingsApi.listAllBookings();
        setBookings(all.slice(0, 10));
      }
    } catch (err: any) {
      setError(err?.message || "Failed to load bookings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, [user]);

  const handleTrackByReference = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!referenceQuery.trim()) return;

    setTrackingLoading(true);
    setTrackError(null);
    setTrackedBooking(null);

    try {
      const b = await bookingsApi.getBookingByReference(referenceQuery.trim());
      setTrackedBooking(b);
    } catch (err: any) {
      setTrackError(err?.message || "Booking reference not found. Please double check the code (e.g. BK-XXXXXXXX).");
    } finally {
      setTrackingLoading(false);
    }
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
      if (trackedBooking && trackedBooking.id === bookingId) {
        const refreshed = await bookingsApi.getBooking(bookingId);
        setTrackedBooking(refreshed);
      }
    } catch (err: any) {
      alert(err?.message || "Failed to cancel booking.");
    } finally {
      setCancellingLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "CONFIRMED":
      case "ACTIVE":
        return <Badge className="bg-emerald-600 text-white font-bold">{status}</Badge>;
      case "AWAITING_PAYMENT":
      case "PENDING":
        return <Badge className="bg-amber-500 text-white font-bold">{status}</Badge>;
      case "COMPLETED":
        return <Badge className="bg-blue-600 text-white font-bold">{status}</Badge>;
      case "CANCELLED":
      case "REJECTED":
        return <Badge variant="destructive" className="font-bold">{status}</Badge>;
      case "REFUND_PENDING":
      case "REFUNDED":
        return <Badge className="bg-purple-600 text-white font-bold">{status}</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const filtered = bookings.filter((b) => {
    const s = b.status.toUpperCase();
    if (filter === "ACTIVE / CONFIRMED" && s !== "ACTIVE" && s !== "CONFIRMED") return false;
    if (filter === "AWAITING_PAYMENT" && s !== "AWAITING_PAYMENT" && s !== "PENDING") return false;
    if (filter === "COMPLETED" && s !== "COMPLETED") return false;
    if (filter === "CANCELLED" && s !== "CANCELLED" && s !== "REJECTED") return false;

    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      const carStr = b.vehicle ? `${b.vehicle.brand} ${b.vehicle.model}`.toLowerCase() : "";
      const refStr = b.booking_reference.toLowerCase();
      const custStr = (b.customer_name || "").toLowerCase();
      return carStr.includes(q) || refStr.includes(q) || custStr.includes(q);
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-slate-50 pt-16">
      {/* Top Banner */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">Trip Bookings & Journey Status Tracking</h1>
              <p className="text-slate-500 text-sm mt-1">
                Real-time journey status, cab dispatch tracking & trip management.
              </p>
            </div>
            <Link to="/cars">
              <Button className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-500/20 gap-2">
                <Car className="h-4 w-4" /> Browse Fleet & Book Cab
              </Button>
            </Link>
          </div>

          {/* Quick Track by Reference Widget */}
          <div className="mt-6 pt-6 border-t border-slate-100">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-2 flex items-center gap-1.5">
              <Search className="h-3.5 w-3.5 text-blue-600" /> Track Any Reservation by Reference Number
            </h2>
            <form onSubmit={handleTrackByReference} className="flex gap-2 max-w-xl">
              <Input
                placeholder="Enter booking reference (e.g. BK-3C59D5AE)..."
                value={referenceQuery}
                onChange={(e) => setReferenceQuery(e.target.value)}
                className="h-10 rounded-xl font-mono text-sm uppercase bg-slate-50 focus:bg-white"
              />
              <Button
                type="submit"
                disabled={trackingLoading || !referenceQuery.trim()}
                className="bg-slate-900 hover:bg-black text-white font-bold rounded-xl text-xs px-5 h-10"
              >
                {trackingLoading ? "Searching..." : "Track Status"}
              </Button>
            </form>

            {trackError && (
              <div className="mt-3 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2 max-w-xl">
                <AlertCircle className="h-4 w-4 text-rose-500" />
                {trackError}
              </div>
            )}

            {/* Display Tracked Booking Modal Card */}
            {trackedBooking && (
              <div className="mt-4 p-5 bg-blue-50/60 border border-blue-200 rounded-2xl max-w-2xl animate-in fade-in">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">Found Reservation</span>
                    <h3 className="text-lg font-bold text-slate-900 mt-0.5">
                      {trackedBooking.vehicle ? `${trackedBooking.vehicle.brand} ${trackedBooking.vehicle.model} (${trackedBooking.vehicle.year})` : "Vehicle Reservation"}
                    </h3>
                    <p className="font-mono text-xs font-bold text-slate-600 mt-0.5">Reference: {trackedBooking.booking_reference}</p>
                  </div>
                  {getStatusBadge(trackedBooking.status)}
                </div>

                <div className="grid grid-cols-2 gap-4 mt-3 pt-3 border-t border-blue-100 text-xs">
                  <div>
                    <span className="text-slate-500">Pickup Date:</span>
                    <p className="font-semibold text-slate-800">{new Date(trackedBooking.start_datetime).toLocaleString()}</p>
                    <p className="text-[11px] text-slate-500">{trackedBooking.pickup_location?.name}</p>
                  </div>
                  <div>
                    <span className="text-slate-500">Return Date:</span>
                    <p className="font-semibold text-slate-800">{new Date(trackedBooking.end_datetime).toLocaleString()}</p>
                    <p className="text-[11px] text-slate-500">{trackedBooking.return_location?.name}</p>
                  </div>
                </div>

                <div className="flex justify-between items-center mt-3 pt-3 border-t border-blue-100 text-xs">
                  <span className="font-bold text-slate-700">Total Charge: ${trackedBooking.total_amount}</span>
                  <div className="flex gap-2">
                    {(trackedBooking.status === "AWAITING_PAYMENT" || trackedBooking.status === "PENDING") && (
                      <Button
                        size="sm"
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl h-8 flex items-center gap-1.5"
                        onClick={() => setPayingBooking(trackedBooking)}
                      >
                        <CreditCard className="h-3.5 w-3.5" /> Pay Now
                      </Button>
                    )}
                    {trackedBooking.status !== "CANCELLED" && trackedBooking.status !== "COMPLETED" && (
                      <Button
                        size="sm"
                        variant="destructive"
                        className="text-xs font-bold rounded-lg h-8"
                        onClick={() => setCancellingId(trackedBooking.id)}
                      >
                        Cancel Reservation
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {/* Search & Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6 items-center justify-between">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search by car, reference..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-10 rounded-xl bg-white"
            />
          </div>

          <div className="flex flex-wrap gap-1.5 w-full sm:w-auto">
            {STATUS_FILTERS.map((s) => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  filter === s
                    ? "bg-slate-900 text-white"
                    : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-xl mb-6 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-rose-500" />
            {error}
          </div>
        )}

        {/* Cancellation Reason Dialog */}
        {cancellingId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4">
              <h3 className="text-base font-bold text-slate-900">Cancel Reservation</h3>
              <p className="text-xs text-slate-500">
                Are you sure you want to cancel this booking? This will immediately release the reserved vehicle slot.
              </p>
              <textarea
                rows={3}
                placeholder="Reason for cancellation..."
                value={cancellationReason}
                onChange={(e) => setCancellationReason(e.target.value)}
                className="w-full p-3 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-rose-500 bg-slate-50 font-medium"
              />
              <div className="flex gap-2 justify-end">
                <Button variant="outline" size="sm" onClick={() => setCancellingId(null)} className="rounded-xl">
                  Keep Booking
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={cancellingLoading || !cancellationReason.trim()}
                  onClick={() => handleCancelBooking(cancellingId)}
                  className="rounded-xl font-bold"
                >
                  {cancellingLoading ? "Cancelling..." : "Confirm Cancellation"}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Bookings List */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-36 bg-slate-200 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
            <Car className="h-12 w-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-slate-800">No Reservations Found</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              {filter !== "ALL"
                ? `No bookings with status "${filter}". Try selecting "ALL" or adjusting your search.`
                : "You have no active reservations yet. Explore our fleet and place your first booking!"}
            </p>
            <Link to="/cars" className="mt-5 inline-block">
              <Button className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs">
                Browse Cars Now
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((b) => (
              <Card key={b.id} className="p-5 rounded-2xl border border-slate-200 hover:shadow-md transition bg-white">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700">
                      <Car className="h-6 w-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-slate-900 text-base">
                          {b.vehicle ? `${b.vehicle.brand} ${b.vehicle.model}` : "Reserved Vehicle"}
                        </span>
                        {b.vehicle && <Badge variant="outline" className="text-[10px]">{b.vehicle.category}</Badge>}
                      </div>
                      <span className="font-mono text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 inline-block mt-0.5">
                        Ref: {b.booking_reference}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {getStatusBadge(b.status)}
                    <span className="text-lg font-black text-slate-900">${b.total_amount}</span>
                  </div>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 text-xs">
                  <div>
                    <span className="text-slate-400 font-semibold uppercase tracking-wider block mb-1">Pickup</span>
                    <div className="flex items-start gap-1.5 text-slate-700 font-medium">
                      <MapPin className="h-3.5 w-3.5 text-blue-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold text-slate-900">{b.pickup_location?.name || "Pickup Hub"}</p>
                        <p className="text-slate-500">{new Date(b.start_datetime).toLocaleString()}</p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <span className="text-slate-400 font-semibold uppercase tracking-wider block mb-1">Return</span>
                    <div className="flex items-start gap-1.5 text-slate-700 font-medium">
                      <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold text-slate-900">{b.return_location?.name || "Return Hub"}</p>
                        <p className="text-slate-500">{new Date(b.end_datetime).toLocaleString()}</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col justify-between items-start md:items-end">
                    <div>
                      <span className="text-slate-400 font-semibold uppercase tracking-wider block mb-1">Duration & Pricing</span>
                      <p className="text-slate-700">
                        {b.total_days} {b.total_days === 1 ? "day" : "days"} • ${b.daily_rate}/d
                      </p>
                      {b.location_fee > 0 && <p className="text-amber-600 text-[11px] font-semibold">One-way fee: +${b.location_fee}</p>}
                    </div>

                    <div className="flex flex-wrap gap-2 mt-3 justify-end">
                      {(b.status === "AWAITING_PAYMENT" || b.status === "PENDING") && (
                        <Button
                          size="sm"
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl h-8 flex items-center gap-1.5 shadow-sm shadow-emerald-600/30"
                          onClick={() => setPayingBooking(b)}
                        >
                          <CreditCard className="h-3.5 w-3.5" /> Pay with Razorpay
                        </Button>
                      )}
                      {b.status !== "CANCELLED" && b.status !== "COMPLETED" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-rose-600 hover:bg-rose-50 hover:text-rose-700 border-rose-200 text-xs font-bold rounded-xl h-8"
                          onClick={() => setCancellingId(b.id)}
                        >
                          Cancel Booking
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

                {b.cancellation_reason && (
                  <div className="mt-3 p-2 bg-slate-50 rounded-lg border border-slate-200 text-[11px] text-slate-600">
                    <span className="font-bold text-slate-700">Cancellation Note:</span> {b.cancellation_reason}
                  </div>
                )}
              </Card>
            ))}
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
            if (trackedBooking && trackedBooking.id === payingBooking.id) {
              bookingsApi.getBooking(payingBooking.id).then(setTrackedBooking);
            }
          }}
        />
      )}
    </div>
  );
}
