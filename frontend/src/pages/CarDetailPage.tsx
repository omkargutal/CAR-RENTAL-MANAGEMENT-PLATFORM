import { useState, useEffect } from "react";
import { useParams, Link, useNavigate, useLocation } from "react-router-dom";
import {
  Users, Fuel, Gauge, ChevronLeft,
  Award, ArrowRight, ShieldAlert
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { vehiclesApi, Vehicle } from "@/core/api";
import { BookingFlowModal } from "@/components/BookingFlowModal";
import { getVehicleSeatingLabel } from "@/utils/vehicleSorting";
import { getVehiclePerKmRate, getVehicleOutstationMinKm } from "@/data/cars";

export function CarDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const locationState = useLocation();

  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isBookingOpen, setIsBookingOpen] = useState(false);

  // Parse any search params or stored journey search
  const queryParams = new URLSearchParams(locationState.search);
  const searchPickup = queryParams.get("pickup") || "";
  const searchDrop = queryParams.get("destination") || "";

  // Trip distance calculator (defaults to vehicle outstation minimum standard)
  const [distanceKm, setDistanceKm] = useState<number>(250);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError(null);

    vehiclesApi.getVehicle(id)
      .then((v) => {
        setVehicle(v);
        setDistanceKm(getVehicleOutstationMinKm(v));
      })
      .catch((err) => {
        setError(err?.message || "Failed to load vehicle details.");
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 pt-20 px-4 max-w-7xl mx-auto">
        <div className="animate-pulse space-y-6">
          <div className="h-6 bg-slate-200 rounded w-1/4" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-4">
              <div className="h-96 bg-slate-200 rounded-3xl" />
              <div className="h-8 bg-slate-200 rounded w-1/2" />
              <div className="h-24 bg-slate-200 rounded-2xl" />
            </div>
            <div className="h-96 bg-slate-200 rounded-3xl" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !vehicle) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-16 bg-slate-50">
        <div className="text-center max-w-md p-6 bg-white rounded-3xl border border-slate-200 shadow-sm">
          <div className="text-6xl mb-4">🚗</div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Vehicle Not Found</h2>
          <p className="text-slate-500 mb-6 text-sm">
            {error || "This vehicle doesn't exist or was archived from our fleet."}
          </p>
          <div className="flex gap-3 justify-center">
            <Button variant="outline" onClick={() => navigate(-1)}>Go Back</Button>
            <Link to="/cars"><Button>Browse Fleet</Button></Link>
          </div>
        </div>
      </div>
    );
  }

  const isBookable = vehicle.is_bookable !== false && vehicle.status === "AVAILABLE";
  const ratePerKm = getVehiclePerKmRate(vehicle);

  // Consolidate images
  const allImages = vehicle.images && vehicle.images.length > 0
    ? vehicle.images.map((img) => img.url)
    : [
        vehicle.primary_image_url || vehicle.image_url ||
        "/assets/vehicles/mahindra-thar/mahindra-thar-4x4.png"
      ];

  const estimatedTotal = (ratePerKm * distanceKm).toLocaleString("en-IN");

  return (
    <div className="min-h-screen bg-slate-50 pt-16">
      {/* Breadcrumb Bar */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-blue-600 transition-colors"
          >
            <ChevronLeft className="h-4 w-4" /> Back to Fleet
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Availability Warning Banner if not bookable */}
        {!isBookable && (
          <div className="bg-amber-50 border border-amber-300 rounded-2xl p-4 mb-6 flex items-start gap-3">
            <ShieldAlert className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-amber-900 text-sm">Vehicle Currently Unavailable for Booking</h4>
              <p className="text-amber-700 text-xs mt-0.5">
                This vehicle is currently marked as <span className="font-semibold uppercase">{vehicle.status}</span>.
                Archived or under-maintenance vehicles cannot be booked by customers.
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Gallery & Details */}
          <div className="lg:col-span-2 space-y-8">
            {/* Gallery */}
            <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm p-4">
              <div className="relative aspect-[16/10] bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl overflow-hidden flex items-center justify-center p-6">
                <img
                  src={allImages[activeImageIndex] || allImages[0]}
                  alt={`${vehicle.make} ${vehicle.model}`}
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = `/assets/vehicles/mahindra-thar/mahindra-thar-4x4.png`;
                  }}
                />
                <Badge className="absolute top-4 left-4 bg-slate-900/90 text-white font-bold text-xs">
                  {getVehicleSeatingLabel(vehicle)}
                </Badge>
              </div>

              {allImages.length > 1 && (
                <div className="flex gap-3 mt-4 overflow-x-auto pb-2">
                  {allImages.map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => setActiveImageIndex(idx)}
                      className={`relative w-20 h-14 rounded-xl border-2 overflow-hidden shrink-0 transition ${
                        activeImageIndex === idx ? "border-blue-600 ring-2 ring-blue-600/30" : "border-slate-200"
                      }`}
                    >
                      <img src={img} alt="" className="w-full h-full object-contain bg-slate-50" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Vehicle Profile & Specifications */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <span className="text-xs font-extrabold uppercase tracking-widest text-blue-600">
                    {vehicle.make || vehicle.brand}
                  </span>
                  <h1 className="text-3xl md:text-4xl font-black text-slate-900 mt-1">
                    {vehicle.model}
                  </h1>
                </div>

                <div className="text-right">
                  <div className="text-xs text-slate-400 font-semibold uppercase">Cab Trip Fare</div>
                  <div className="text-3xl font-black text-slate-900">
                    ₹{ratePerKm} <span className="text-sm font-bold text-slate-500">/ km</span>
                  </div>
                  <span className="text-xs text-emerald-600 font-semibold">Driver & Fuel Included</span>
                </div>
              </div>

              {/* Core Specs Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 py-5 border-y border-slate-100 my-6 text-sm">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                    <Users className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-xs text-slate-400 font-medium">Seating Capacity</div>
                    <div className="font-bold text-slate-800">{getVehicleSeatingLabel(vehicle)}</div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600">
                    <Gauge className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-xs text-slate-400 font-medium">Transmission</div>
                    <div className="font-bold text-slate-800 capitalize">{vehicle.transmission?.toLowerCase()}</div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                    <Fuel className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-xs text-slate-400 font-medium">Fuel Type</div>
                    <div className="font-bold text-slate-800 capitalize">{vehicle.fuel_type?.toLowerCase()}</div>
                  </div>
                </div>
              </div>

              {/* Description */}
              {vehicle.description && (
                <div className="space-y-2 mb-6">
                  <h3 className="font-bold text-slate-900 text-sm">Vehicle Overview</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    {vehicle.description}
                  </p>
                </div>
              )}

              {/* Transparent Fare Policy Overview */}
              <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Award className="h-4 w-4 text-blue-600" /> Transparent All-Inclusive Cab Fare Structure
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
                  <div className="bg-white rounded-xl p-3 border border-slate-200">
                    <div className="text-xs text-slate-500 font-medium">Per-KM Base Rate</div>
                    <div className="text-xl font-black text-slate-900 mt-0.5">₹{ratePerKm} / km</div>
                    <div className="text-[11px] text-emerald-600 font-semibold">Includes Fuel & Vehicle</div>
                  </div>
                  <div className="bg-white rounded-xl p-3 border border-slate-200">
                    <div className="text-xs text-slate-500 font-medium">Driver Allowance</div>
                    <div className="text-lg font-extrabold text-blue-600 mt-0.5">Included</div>
                    <div className="text-[11px] text-slate-500">Experienced & Verified Driver</div>
                  </div>
                  <div className="bg-white rounded-xl p-3 border border-slate-200">
                    <div className="text-xs text-slate-500 font-medium">Outstation Standard Min</div>
                    <div className="text-lg font-extrabold text-slate-900 mt-0.5">{vehicle ? getVehicleOutstationMinKm(vehicle) : 250} km / day</div>
                    <div className="text-[11px] text-slate-400">Tolls & Taxes at Actuals</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Pricing & Booking Widget */}
          <div className="space-y-6">
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xl sticky top-24">
              <div className="flex items-baseline justify-between mb-4 pb-4 border-b border-slate-100">
                <div>
                  <div className="text-xs uppercase font-bold text-slate-400">Trip Fare</div>
                  <div className="flex items-baseline gap-1 mt-0.5">
                    <span className="text-3xl font-black text-slate-900">₹{ratePerKm}</span>
                    <span className="text-sm font-bold text-slate-500">/ km</span>
                  </div>
                </div>
                <Badge variant={isBookable ? "default" : "secondary"}>
                  {isBookable ? "Available for Booking" : "Assigned"}
                </Badge>
              </div>

              {/* Interactive Distance & Fare Calculator */}
              <div className="space-y-4 mb-6">
                <div>
                  <div className="flex justify-between items-center text-xs font-bold text-slate-700 mb-1.5">
                    <span>Estimated Journey Distance:</span>
                    <span className="text-blue-600 font-black text-sm">{distanceKm} KM</span>
                  </div>

                  {/* Number Input with controls */}
                  <div className="flex items-center gap-2 mb-3">
                    <input
                      type="number"
                      min="20"
                      max="2000"
                      step="10"
                      value={distanceKm}
                      onChange={(e) => setDistanceKm(Math.max(20, Number(e.target.value) || 20))}
                      className="w-full h-11 px-3 text-base font-bold text-slate-900 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none"
                    />
                    <span className="text-xs font-bold text-slate-500">KM</span>
                  </div>

                  {/* Slider */}
                  <input
                    type="range"
                    min="20"
                    max="1000"
                    step="10"
                    value={distanceKm}
                    onChange={(e) => setDistanceKm(Number(e.target.value))}
                    className="w-full accent-blue-600 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                    <span>20 km (Local)</span>
                    <span>{vehicle ? getVehicleOutstationMinKm(vehicle) : 250} km (1-Day Min)</span>
                    <span>1,000 km (Round Trip)</span>
                  </div>
                </div>

                {/* Estimate Breakdown in INR */}
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-2 text-xs">
                  <div className="flex justify-between text-slate-700">
                    <span>Base Trip Fare (₹{ratePerKm} × {distanceKm} km)</span>
                    <span className="font-bold text-slate-900">₹{(ratePerKm * distanceKm).toLocaleString("en-IN")}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Professional Driver & Allowance</span>
                    <span className="font-semibold text-emerald-600">Included</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Sanitized AC Vehicle & Fuel</span>
                    <span className="font-semibold text-emerald-600">Included</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>24/7 Roadside & Dispatch Support</span>
                    <span className="font-semibold text-emerald-600">Included</span>
                  </div>
                  <div className="pt-2 border-t border-slate-200 flex justify-between text-sm font-black text-slate-900">
                    <span>Estimated Total Fare</span>
                    <span className="text-blue-600 text-lg">₹{estimatedTotal}</span>
                  </div>
                  <p className="text-[10px] text-slate-400 pt-1">
                    * Tolls, state border taxes, and parking fees extra as per actual receipts.
                  </p>
                </div>
              </div>

              {/* Action Button */}
              {isBookable ? (
                <Button
                  id="proceed-booking-btn"
                  className="w-full h-12 text-base font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-lg shadow-blue-500/20 gap-2"
                  onClick={() => setIsBookingOpen(true)}
                >
                  Book This Cab (₹{estimatedTotal}) <ArrowRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  disabled
                  className="w-full h-12 text-sm font-bold bg-slate-200 text-slate-500 rounded-xl cursor-not-allowed"
                >
                  Vehicle Not Available ({vehicle.status})
                </Button>
              )}

              <p className="text-[11px] text-slate-400 text-center mt-3">
                Free cancellation up to 24 hours before pickup. Instant booking confirmation.
              </p>
            </div>
          </div>
        </div>

        {vehicle && (
          <BookingFlowModal
            vehicle={vehicle}
            isOpen={isBookingOpen}
            onClose={() => setIsBookingOpen(false)}
            defaultPickupLocationId={vehicle.location_id || undefined}
            initialPickupAddress={searchPickup}
            initialDropAddress={searchDrop}
            estimatedKm={distanceKm}
          />
        )}
      </div>
    </div>
  );
}
