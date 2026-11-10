import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  CheckCircle, AlertCircle, Clock,
  ArrowRight, ArrowLeft, Loader2, User as UserIcon, X, MapPin
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  bookingsApi,
  locationsApi,
  Location,
  Vehicle,
  BookingQuoteResponse,
  Booking,
} from "@/core/api";
import { useAuth } from "@/context/AuthContext";
import { PaymentModal } from "./PaymentModal";
import { getVehicleSeatingLabel } from "@/utils/vehicleSorting";
import { getVehiclePerKmRate, getVehicleOutstationMinKm } from "@/data/cars";

interface BookingFlowModalProps {
  vehicle: Vehicle;
  isOpen: boolean;
  onClose: () => void;
  defaultPickupLocationId?: string;
  initialPickupAddress?: string;
  initialDropAddress?: string;
  estimatedKm?: number;
}

export function BookingFlowModal({
  vehicle,
  isOpen,
  onClose,
  defaultPickupLocationId,
  initialPickupAddress = "",
  initialDropAddress = "",
  estimatedKm,
}: BookingFlowModalProps) {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Multi-step progress (Clean 3-step flow)
  // Step 1: Journey Details
  // Step 2: Fare & Passenger Details
  // Step 3: Review & Confirmation
  // Step 4: Booking Confirmed
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [locations, setLocations] = useState<Location[]>([]);

  // Form State (Default locations handled automatically behind the scenes)
  const [pickupLocId, setPickupLocId] = useState<string>(defaultPickupLocationId || vehicle.location_id || "");
  const [returnLocId, setReturnLocId] = useState<string>(defaultPickupLocationId || vehicle.location_id || "");

  // Detailed addresses: starts empty unless passed directly from home search
  const [pickupAddress, setPickupAddress] = useState<string>(initialPickupAddress || "");
  const [dropAddress, setDropAddress] = useState<string>(initialDropAddress || "");

  const formatCurrency = (val: number | string | undefined | null) => {
    if (val === undefined || val === null) return "0.00";
    const num = typeof val === "number" ? val : parseFloat(String(val));
    return isNaN(num) ? "0.00" : num.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  // Dates: start empty so the customer selects their own pickup and return dates
  const [pickupDateTime, setPickupDateTime] = useState<string>("");
  const [returnDateTime, setReturnDateTime] = useState<string>("");

  // Accurate distance and per-km pricing
  const minVehicleKm = getVehicleOutstationMinKm(vehicle);
  const effectiveKm = estimatedKm && estimatedKm > 0 ? estimatedKm : minVehicleKm;
  const perKmRate = getVehiclePerKmRate(vehicle);

  // Quote State
  const [promoCode, setPromoCode] = useState<string>("");
  const [calculatingQuote, setCalculatingQuote] = useState(false);
  const [quote, setQuote] = useState<BookingQuoteResponse | null>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);

  // Customer Information (starts completely blank without arbitrary pre-filled data)
  const [customerName, setCustomerName] = useState<string>(user?.full_name || "");
  const [customerEmail, setCustomerEmail] = useState<string>(user?.email || "");
  const [customerPhone, setCustomerPhone] = useState<string>(user?.phone_number || "");
  const [aadhaarNumber, setAadhaarNumber] = useState<string>("");

  // Submission & Confirmation State
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [confirmedBooking, setConfirmedBooking] = useState<Booking | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  // Load locations on open
  useEffect(() => {
    if (!isOpen) return;
    locationsApi
      .listLocations()
      .then((locs) => {
        setLocations(locs);
        const effectiveLocId =
          pickupLocId ||
          defaultPickupLocationId ||
          vehicle.location_id ||
          (locs.length > 0 ? locs[0].id : "");
        if (effectiveLocId) {
          setPickupLocId(effectiveLocId);
          setReturnLocId(effectiveLocId);
        }
      })
      .catch((err) => console.error("Error loading locations", err));
  }, [isOpen, defaultPickupLocationId, vehicle.location_id]);

  if (!isOpen) return null;

  // Authoritative Pricing Quote: based on km * fair price
  const performQuoteCalculation = async () => {
    if (!pickupDateTime || !returnDateTime) return null;
    setCalculatingQuote(true);
    setQuoteError(null);
    try {
      const locId = pickupLocId || vehicle.location_id || (locations[0]?.id ?? "");
      const res = await bookingsApi.getQuote({
        vehicle_id: vehicle.id,
        pickup_location_id: locId,
        return_location_id: returnLocId || locId,
        start_datetime: new Date(pickupDateTime).toISOString(),
        end_datetime: new Date(returnDateTime).toISOString(),
        promo_code: promoCode || undefined,
        estimated_km: effectiveKm,
      });
      setQuote(res);
      return res;
    } catch (err: any) {
      setQuoteError(err?.message || "Unable to calculate fare quote");
      return null;
    } finally {
      setCalculatingQuote(false);
    }
  };

  // Step 1 to Step 2 transition: validate dates and calculate quote directly
  const handleProceedFromDates = async () => {
    if (!pickupAddress.trim()) {
      alert("Please enter a pickup location and address.");
      return;
    }
    if (!pickupDateTime) {
      alert("Please select a pickup date and time.");
      return;
    }
    if (!returnDateTime) {
      alert("Please select a return date and time.");
      return;
    }
    const start = new Date(pickupDateTime);
    const end = new Date(returnDateTime);
    if (end <= start) {
      alert("Return date/time must be strictly after pickup date/time.");
      return;
    }
    const res = await performQuoteCalculation();
    if (res) {
      setCurrentStep(2); // Directly proceed to Fare & Customer Details
    }
  };

  // Submit booking with idempotency key
  const handleSubmitBooking = async () => {
    if (!customerName || !customerEmail || !aadhaarNumber) {
      setSubmitError("Please fill in your full name, email, and Aadhaar / Govt ID number.");
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    // Generate unique client idempotency key
    const idempotencyKey = `IDEMP-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const locId = pickupLocId || vehicle.location_id || (locations[0]?.id ?? "");

    try {
      const booking = await bookingsApi.createBooking(
        {
          vehicle_id: vehicle.id,
          pickup_location_id: locId,
          return_location_id: returnLocId || locId,
          start_datetime: new Date(pickupDateTime).toISOString(),
          end_datetime: new Date(returnDateTime).toISOString(),
          customer_name: customerName,
          customer_email: customerEmail,
          customer_phone: customerPhone,
          driver_license_number: aadhaarNumber,
          promo_code: promoCode || undefined,
          buffer_minutes: 60,
          estimated_km: effectiveKm,
        },
        idempotencyKey
      );

      setConfirmedBooking(booking);
      setCurrentStep(4); // Step 4: Booking Confirmed
    } catch (err: any) {
      setSubmitError(err?.message || "Failed to submit trip booking.");
    } finally {
      setSubmitting(false);
    }
  };

  // Cab Fare: km * fair price
  const baseTripFare = effectiveKm * perKmRate;
  const promoDiscount = quote ? Number(quote.pricing.discount_amount) : 0;
  const finalTotalFare = Math.max(0, baseTripFare - promoDiscount);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-5 flex items-center justify-between border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <Badge className="bg-blue-600 text-white hover:bg-blue-600 text-[10px] uppercase font-bold tracking-wider">
                {currentStep === 4 ? "Confirmed" : `Step ${currentStep} of 3`}
              </Badge>
              <span className="text-xs text-slate-400">Cab & Trip Booking</span>
            </div>
            <h2 className="text-xl font-bold mt-1 text-white">
              {currentStep === 4 ? "Trip Booking Confirmed" : `Book ${vehicle.make} ${vehicle.model}`}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">

          {/* STEP 1: Journey Details */}
          {currentStep === 1 && (
            <div className="space-y-5">
              {/* Vehicle Confirmation */}
              <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <img
                  src={vehicle.primary_image_url || vehicle.image_url || "/assets/vehicles/mahindra-thar/mahindra-thar-4x4.png"}
                  alt={vehicle.model}
                  className="w-24 h-16 object-contain rounded-xl border border-slate-200 bg-white p-1"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "/assets/vehicles/mahindra-thar/mahindra-thar-4x4.png";
                  }}
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-base">{vehicle.make} {vehicle.model}</span>
                    <Badge variant="outline" className="text-[10px] font-semibold">{getVehicleSeatingLabel(vehicle)}</Badge>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">{getVehicleSeatingLabel(vehicle)} • {vehicle.transmission} • {vehicle.fuel_type}</p>
                  <p className="text-xs font-bold text-blue-600 mt-1">₹{perKmRate} / km • Driver & Fuel Included • ~{effectiveKm} km estimated</p>
                </div>
              </div>

              {/* STEP 2: Pickup Location & Address */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5 text-blue-600" /> STEP 2: PICKUP LOCATION & ADDRESS
                </label>
                <Input
                  value={pickupAddress}
                  onChange={(e) => setPickupAddress(e.target.value)}
                  placeholder="Enter house/flat, street, area, or city"
                  className="h-11 rounded-xl text-sm"
                />
              </div>

              {/* STEP 3: Drop-off Location / Destination */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5 text-emerald-600" /> STEP 3: DROP-OFF LOCATION / DESTINATION
                </label>
                <Input
                  value={dropAddress}
                  onChange={(e) => setDropAddress(e.target.value)}
                  placeholder="Enter destination, landmark, railway station, or city"
                  className="h-11 rounded-xl text-sm"
                />
              </div>

              {/* STEP 4: PICKUP DATE & TIME and STEP 5: RETURN DATE & TIME */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    STEP 4: PICKUP DATE & TIME
                  </label>
                  <Input
                    type="datetime-local"
                    value={pickupDateTime}
                    onChange={(e) => setPickupDateTime(e.target.value)}
                    className="h-11 rounded-xl text-sm font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    STEP 5: RETURN DATE & TIME
                  </label>
                  <Input
                    type="datetime-local"
                    value={returnDateTime}
                    onChange={(e) => setReturnDateTime(e.target.value)}
                    className="h-11 rounded-xl text-sm font-medium"
                  />
                </div>
              </div>

              {quoteError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-rose-800 text-xs font-bold">
                  <AlertCircle className="h-4 w-4 text-rose-600" />
                  {quoteError}
                </div>
              )}

              <Button
                id="btn-verify-proceed"
                className="w-full h-12 text-sm font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-lg gap-2 mt-2"
                onClick={handleProceedFromDates}
                disabled={calculatingQuote}
              >
                {calculatingQuote ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Calculating Fare...
                  </>
                ) : (
                  <>
                    Continue to Fare & Customer Details <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          )}

          {/* STEP 2: Trip Fare Breakdown & Customer Details */}
          {currentStep === 2 && (
            <div className="space-y-6">
              {/* Trip Fare & Charges: km * fair price */}
              <div className="p-5 rounded-2xl bg-slate-900 text-white space-y-3">
                <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                  <div>
                    <span className="text-xs font-bold text-blue-400 uppercase tracking-wider">
                      Trip Fare & Charges
                    </span>
                    <h3 className="text-base font-bold text-white">{vehicle.make} {vehicle.model}</h3>
                  </div>
                  <span className="text-xs font-semibold text-slate-400">
                    {effectiveKm} km @ ₹{perKmRate}/km
                  </span>
                </div>

                <div className="space-y-2 text-xs text-slate-300">
                  <div className="flex justify-between">
                    <span>Estimated Distance:</span>
                    <span className="font-semibold text-white">{effectiveKm} km</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Rate per km:</span>
                    <span className="font-semibold text-white">₹{perKmRate} / km</span>
                  </div>
                  <div className="flex justify-between border-t border-slate-800 pt-2 text-slate-300">
                    <span>Trip Fare ({effectiveKm} km × ₹{perKmRate}/km):</span>
                    <span className="font-semibold text-white">₹{formatCurrency(baseTripFare)}</span>
                  </div>
                  {promoDiscount > 0 && (
                    <div className="flex justify-between text-emerald-400">
                      <span>Promo Discount ({promoCode}):</span>
                      <span className="font-semibold">-₹{formatCurrency(promoDiscount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-baseline pt-2 border-t border-slate-700 text-sm font-bold text-white">
                    <span>Total Trip Fare:</span>
                    <span className="text-lg font-black text-blue-400">₹{formatCurrency(finalTotalFare)}</span>
                  </div>
                </div>

                {/* Promo Code Input */}
                <div className="pt-2 flex gap-2">
                  <Input
                    placeholder="Enter Promo code for discounts"
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                    className="h-9 bg-slate-800 border-slate-700 text-xs text-white"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={performQuoteCalculation}
                    disabled={calculatingQuote}
                    className="text-xs h-9 text-slate-900 font-bold bg-white"
                  >
                    Apply
                  </Button>
                </div>
                {quoteError && (
                  <div className="p-2 bg-rose-950/60 border border-rose-800 rounded-lg text-rose-300 text-xs">
                    {quoteError}
                  </div>
                )}
              </div>

              {/* Customer Information */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <UserIcon className="h-4 w-4 text-blue-600" /> Customer & Passenger Details
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Full Name *</label>
                    <Input
                      placeholder="e.g. Rahul Sharma"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="h-10 rounded-xl text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Email Address *</label>
                    <Input
                      type="email"
                      placeholder="rahul@example.com"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      className="h-10 rounded-xl text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Mobile Number (for SMS & Driver WhatsApp) *</label>
                    <Input
                      placeholder="+91 8421081570"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      className="h-10 rounded-xl text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Customer Aadhaar / Govt ID (for Verification) *</label>
                    <Input
                      placeholder="Enter 12-digit Aadhaar / Govt ID number"
                      value={aadhaarNumber}
                      onChange={(e) => setAadhaarNumber(e.target.value)}
                      className="h-10 rounded-xl text-sm font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setCurrentStep(1)} className="flex-1 rounded-xl">
                  <ArrowLeft className="h-4 w-4 mr-1" /> Adjust Route & Dates
                </Button>
                <Button
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl"
                  onClick={() => {
                    if (!customerName || !customerEmail || !aadhaarNumber) {
                      alert("Please provide full name, email, and 12-digit Aadhaar / Govt ID number.");
                      return;
                    }
                    setCurrentStep(3); // Step 3: Review
                  }}
                >
                  Review Booking Details <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}

          {/* STEP 3: Review Booking & Final Confirmation */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div>
                <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Review Booking</span>
                <h3 className="text-xl font-extrabold text-slate-900 mt-0.5">Confirm Your Journey Reservation</h3>
                <p className="text-xs text-slate-500">Please verify your journey details before confirmation.</p>
              </div>

              <div className="rounded-2xl border border-slate-200 p-5 space-y-4 bg-slate-50/50">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                  <div>
                    <span className="text-xs text-slate-400 font-semibold uppercase">Assigned Cab</span>
                    <h4 className="font-bold text-slate-900 text-base">{vehicle.make} {vehicle.model}</h4>
                    <span className="text-xs text-emerald-600 font-semibold">Driver & vehicle details dispatched 2 hrs before pickup</span>
                  </div>
                  <Badge className="bg-slate-900 text-white">{vehicle.category}</Badge>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-slate-400 font-semibold uppercase">Pickup Details</span>
                    <p className="font-bold text-slate-800 text-sm mt-0.5">{pickupAddress || "Not specified"}</p>
                    <p className="text-blue-600 font-medium mt-1">{new Date(pickupDateTime).toLocaleString()}</p>
                  </div>
                  <div>
                    <span className="text-slate-400 font-semibold uppercase">Drop-off Details</span>
                    <p className="font-bold text-slate-800 text-sm mt-0.5">{dropAddress || "Not specified"}</p>
                    <p className="text-blue-600 font-medium mt-1">{new Date(returnDateTime).toLocaleString()}</p>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-slate-400 font-semibold uppercase">Customer</span>
                    <p className="font-bold text-slate-800 mt-0.5">{customerName}</p>
                    <p className="text-slate-500">{customerEmail} • {customerPhone}</p>
                  </div>
                  <div>
                    <span className="text-slate-400 font-semibold uppercase">Govt ID Verification</span>
                    <p className="font-bold text-slate-800 mt-0.5 font-mono">{aadhaarNumber}</p>
                  </div>
                </div>

                <div className="p-3 bg-white rounded-xl border border-slate-200 flex justify-between items-center text-sm">
                  <span className="font-bold text-slate-700">Trip Fare ({effectiveKm} km × ₹{perKmRate}/km):</span>
                  <span className="text-xl font-black text-blue-600">₹{formatCurrency(finalTotalFare)}</span>
                </div>
              </div>

              {submitError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-rose-500" />
                  {submitError}
                </div>
              )}

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setCurrentStep(2)} className="flex-1 rounded-xl">
                  Back
                </Button>
                <Button
                  id="btn-submit-booking"
                  className="flex-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg shadow-emerald-500/20 gap-2 h-11"
                  onClick={handleSubmitBooking}
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Confirming Booking...
                    </>
                  ) : (
                    <>
                      Confirm Cab Booking <CheckCircle className="h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* STEP 4: Booking Confirmed */}
          {currentStep === 4 && confirmedBooking && (
            <div className="space-y-6 text-center py-4">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle className="h-9 w-9" />
              </div>

              <div>
                <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">
                  Booking Confirmed
                </span>
                <h3 className="text-2xl font-black text-slate-900 mt-1">Trip Successfully Confirmed!</h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                  Your cab slot is locked. Driver name and car contact details will be shared via WhatsApp and SMS prior to pickup.
                </p>
              </div>

              <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl max-w-md mx-auto text-left space-y-3">
                <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                  <span className="text-xs font-bold text-slate-500 uppercase">Booking Reference</span>
                  <span className="font-mono text-base font-extrabold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                    {confirmedBooking.booking_reference}
                  </span>
                </div>

                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500">Trip Status:</span>
                  <Badge variant="default" className="font-bold">
                    {confirmedBooking.status}
                  </Badge>
                </div>

                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500">Payment Status:</span>
                  <span className="font-bold text-amber-600 flex items-center gap-1">
                    <Clock className="h-3 w-3" /> Awaiting Advance / Fare Pay
                  </span>
                </div>

                <div className="flex justify-between items-center text-xs border-t border-slate-200 pt-2">
                  <span className="text-slate-500">Total Trip Fare:</span>
                  <span className="text-sm font-black text-slate-900">₹{formatCurrency(confirmedBooking.total_amount)}</span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 justify-center max-w-md mx-auto">
                <Button
                  variant="outline"
                  className="rounded-xl flex-1 text-xs font-bold"
                  onClick={() => {
                    onClose();
                    navigate("/bookings");
                  }}
                >
                  View My Bookings
                </Button>
                <Button
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl flex-1 text-xs"
                  onClick={() => {
                    setShowPaymentModal(true);
                  }}
                >
                  Pay Fare with Razorpay
                </Button>
              </div>
            </div>
          )}

        </div>
      </div>

      {showPaymentModal && confirmedBooking && (
        <PaymentModal
          booking={confirmedBooking}
          isOpen={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          onPaymentSuccess={() => {
            setConfirmedBooking((prev) => (prev ? { ...prev, status: "CONFIRMED" } : prev));
          }}
        />
      )}
    </div>
  );
}
