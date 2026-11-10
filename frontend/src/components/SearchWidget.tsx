import { useState, useEffect } from "react";
import {
  MapPin, Calendar, Clock, Search, ChevronDown,
  Plane, Compass, Repeat, Building2, Navigation
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import {
  getStoredPopularDestinations,
  getStoredAirportTerminals,
  SEARCH_CONFIG_EVENT,
  AirportTerminalOption,
} from "@/data/searchWidgetConfig";

export type JourneyType =
  | "local"
  | "outstation_one_way"
  | "outstation_round_trip"
  | "airport_transfer"
  | "corporate";

interface SearchWidgetProps {
  dark?: boolean;
}

export function SearchWidget({ dark = false }: SearchWidgetProps) {
  const navigate = useNavigate();
  const [journeyType, setJourneyType] = useState<JourneyType>("local");

  // Dynamic Popular Hubs & Airport Terminals (editable via Admin Control)
  const [popularHubs, setPopularHubs] = useState<string[]>(getStoredPopularDestinations);
  const [airports, setAirports] = useState<AirportTerminalOption[]>(getStoredAirportTerminals);

  // Form Fields - Start clean with NO dummy or test station prefill
  const [pickup, setPickup] = useState("");
  const [destination, setDestination] = useState("");
  const [pickupDate, setPickupDate] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split("T")[0];
  });
  const [returnDate, setReturnDate] = useState(() => {
    const after = new Date();
    after.setDate(after.getDate() + 3);
    return after.toISOString().split("T")[0];
  });
  const [pickupTime, setPickupTime] = useState("09:00");
  const [returnTime, setReturnTime] = useState("18:00");
  const [passengers] = useState<number>(4);

  // Airport transfer specific
  const [airportDirection, setAirportDirection] = useState<"to_airport" | "from_airport">("to_airport");
  const [selectedAirport, setSelectedAirport] = useState(() => airports[0]?.name || "Pune International Airport (PNQ)");

  // Corporate specific
  const [companyName, setCompanyName] = useState("");
  const [shiftTime, setShiftTime] = useState("09:00 AM (General Shift)");

  // Validation & Feedback
  const [validationError, setValidationError] = useState<string | null>(null);

  // Synchronize dynamic popular destinations and airport terminals if updated in Admin Dashboard
  useEffect(() => {
    const syncConfig = () => {
      const hubs = getStoredPopularDestinations();
      const terms = getStoredAirportTerminals();
      setPopularHubs(hubs);
      setAirports(terms);
      if (terms.length > 0 && !terms.some((a) => a.name === selectedAirport)) {
        setSelectedAirport(terms[0].name);
      }
    };

    window.addEventListener(SEARCH_CONFIG_EVENT, syncConfig);
    window.addEventListener("storage", syncConfig);
    return () => {
      window.removeEventListener(SEARCH_CONFIG_EVENT, syncConfig);
      window.removeEventListener("storage", syncConfig);
    };
  }, [selectedAirport]);

  const inputBase = dark
    ? "bg-slate-900/90 border-slate-700 text-white placeholder:text-slate-400 focus:border-blue-500 focus:ring-blue-500"
    : "bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:ring-blue-500";

  const labelBase = dark ? "text-slate-300 font-bold" : "text-slate-700 font-bold";
  const iconBase = "text-blue-600";

  const handleSearch = () => {
    setValidationError(null);

    // Validation
    if (!pickup.trim()) {
      setValidationError("Please specify a pickup location, area or city.");
      return;
    }

    if (journeyType === "outstation_one_way" || journeyType === "outstation_round_trip") {
      if (!destination.trim()) {
        setValidationError("Please specify a destination city or circuit.");
        return;
      }
    }

    if (journeyType === "outstation_round_trip" && returnDate < pickupDate) {
      setValidationError("Return date cannot be earlier than departure date.");
      return;
    }

    // Persist search data so vehicle details and booking modal can pre-fill automatically
    const searchData = {
      journeyType,
      pickup: pickup.trim(),
      destination: destination.trim(),
      pickupDate,
      pickupTime,
      returnDate,
      returnTime,
      passengers,
      selectedAirport,
      airportDirection,
    };
    try {
      localStorage.setItem("autofleet_journey_search", JSON.stringify(searchData));
      localStorage.setItem("autofleet_last_pickup", pickup.trim());
      if (destination.trim()) {
        localStorage.setItem("autofleet_last_destination", destination.trim());
      }
    } catch (e) {
      console.warn("Could not save journey search", e);
    }

    // Build query params
    const params = new URLSearchParams();
    params.set("journey", journeyType);
    params.set("pickup", pickup.trim());
    if (destination.trim()) params.set("destination", destination.trim());
    params.set("date", pickupDate);
    params.set("time", pickupTime);
    if (journeyType === "outstation_round_trip") {
      params.set("return_date", returnDate);
      params.set("return_time", returnTime);
    }
    if (journeyType === "airport_transfer") {
      params.set("airport", selectedAirport);
      params.set("direction", airportDirection);
    }
    params.set("seats", String(passengers));

    navigate(`/cars?${params.toString()}`);
  };

  const handleCorporateEnquiry = () => {
    const params = new URLSearchParams({
      service: "corporate-mobility",
      company: companyName || "Corporate Client",
      pickup: pickup || "Main Office",
      shift: shiftTime,
    });
    navigate(`/contact?${params.toString()}`);
  };

  return (
    <div
      id="booking-panel"
      className={
        dark
          ? "bg-slate-900/95 backdrop-blur-xl rounded-2xl sm:rounded-3xl border border-slate-800 p-5 sm:p-7 lg:p-8 shadow-2xl overflow-hidden w-full max-w-full"
          : "bg-white rounded-2xl sm:rounded-3xl shadow-xl shadow-slate-200/60 border border-slate-200/80 p-5 sm:p-7 lg:p-8 overflow-hidden w-full max-w-full"
      }
    >
      {/* ─── JOURNEY TYPE SELECTOR TABS ─── */}
      <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-6 scrollbar-none border-b border-slate-100 dark:border-slate-800">
        <button
          type="button"
          onClick={() => { setJourneyType("local"); setValidationError(null); }}
          className={`h-11 px-4 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap flex items-center gap-2 transition-all ${
            journeyType === "local"
              ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
              : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
          }`}
        >
          <Navigation className="h-4 w-4" />
          Local Cab
        </button>

        <button
          type="button"
          onClick={() => { setJourneyType("outstation_one_way"); setValidationError(null); }}
          className={`h-11 px-4 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap flex items-center gap-2 transition-all ${
            journeyType === "outstation_one_way"
              ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
              : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
          }`}
        >
          <Compass className="h-4 w-4" />
          Outstation One Way
        </button>

        <button
          type="button"
          onClick={() => { setJourneyType("outstation_round_trip"); setValidationError(null); }}
          className={`h-11 px-4 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap flex items-center gap-2 transition-all ${
            journeyType === "outstation_round_trip"
              ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
              : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
          }`}
        >
          <Repeat className="h-4 w-4" />
          Outstation Round Trip
        </button>

        <button
          type="button"
          onClick={() => { setJourneyType("airport_transfer"); setValidationError(null); }}
          className={`h-11 px-4 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap flex items-center gap-2 transition-all ${
            journeyType === "airport_transfer"
              ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
              : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
          }`}
        >
          <Plane className="h-4 w-4" />
          Airport Transfer
        </button>

        <button
          type="button"
          onClick={() => { setJourneyType("corporate"); setValidationError(null); }}
          className={`h-11 px-4 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap flex items-center gap-2 transition-all ${
            journeyType === "corporate"
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
              : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
          }`}
        >
          <Building2 className="h-4 w-4" />
          Corporate Mobility
        </button>
      </div>

      {/* ─── ERROR FEEDBACK ─── */}
      {validationError && (
        <div className="mb-5 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center gap-2">
          <span>⚠️ {validationError}</span>
        </div>
      )}

      {/* ─── TAB 1: LOCAL CAB ─── */}
      {journeyType === "local" && (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
          <div className="space-y-1.5 md:col-span-6 lg:col-span-4">
            <label className={`text-xs uppercase tracking-wider block ${labelBase}`}>Pickup Location / Area</label>
            <div className="relative">
              <MapPin className={`absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 ${iconBase}`} />
              <input
                type="text"
                placeholder="House / Flat No., Street, Area, Landmark or City (e.g. Viman Nagar, Pune)"
                value={pickup}
                onChange={(e) => setPickup(e.target.value)}
                className={`w-full pl-10 pr-3 h-12 rounded-xl border text-sm focus:outline-none focus:ring-2 ${inputBase}`}
              />
            </div>
          </div>

          <div className="space-y-1.5 md:col-span-6 lg:col-span-4">
            <label className={`text-xs uppercase tracking-wider block ${labelBase}`}>Drop Location (Optional)</label>
            <div className="relative">
              <MapPin className={`absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400`} />
              <input
                type="text"
                placeholder="Drop Landmark, Office, Mall, Station (Optional)"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                className={`w-full pl-10 pr-3 h-12 rounded-xl border text-sm focus:outline-none focus:ring-2 ${inputBase}`}
              />
            </div>
          </div>

          <div className="space-y-1.5 md:col-span-12 lg:col-span-4">
            <label className={`text-xs uppercase tracking-wider block ${labelBase}`}>Pickup Date & Time</label>
            <div className="grid grid-cols-2 gap-2 w-full">
              <div className="relative min-w-0">
                <Calendar className={`absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 h-4 w-4 ${iconBase}`} />
                <input
                  type="date"
                  value={pickupDate}
                  onChange={(e) => setPickupDate(e.target.value)}
                  className={`w-full pl-8 sm:pl-9 pr-1 sm:pr-2 h-12 rounded-xl border text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 ${inputBase}`}
                />
              </div>
              <div className="relative min-w-0">
                <Clock className={`absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 h-4 w-4 ${iconBase}`} />
                <input
                  type="time"
                  value={pickupTime}
                  onChange={(e) => setPickupTime(e.target.value)}
                  className={`w-full pl-8 sm:pl-9 pr-1 sm:pr-2 h-12 rounded-xl border text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 ${inputBase}`}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB 2: OUTSTATION ONE WAY ─── */}
      {journeyType === "outstation_one_way" && (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
          <div className="space-y-1.5 md:col-span-6 lg:col-span-4">
            <label className={`text-xs uppercase tracking-wider block ${labelBase}`}>Pickup City / Area</label>
            <div className="relative">
              <MapPin className={`absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 ${iconBase}`} />
              <input
                type="text"
                placeholder="Pickup House / Street / Area, City (e.g. Bandra West, Mumbai or Baner, Pune)"
                value={pickup}
                onChange={(e) => setPickup(e.target.value)}
                className={`w-full pl-10 pr-3 h-12 rounded-xl border text-sm focus:outline-none focus:ring-2 ${inputBase}`}
              />
            </div>
          </div>

          <div className="space-y-1.5 md:col-span-6 lg:col-span-4">
            <label className={`text-xs uppercase tracking-wider block ${labelBase}`}>Destination City</label>
            <div className="relative">
              <MapPin className={`absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-500`} />
              <input
                type="text"
                placeholder="Destination City, Locality or Hotel (e.g. FC Road, Pune)"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                className={`w-full pl-10 pr-3 h-12 rounded-xl border text-sm focus:outline-none focus:ring-2 ${inputBase}`}
              />
            </div>
          </div>

          <div className="space-y-1.5 md:col-span-12 lg:col-span-4">
            <label className={`text-xs uppercase tracking-wider block ${labelBase}`}>Travel Date & Time</label>
            <div className="grid grid-cols-2 gap-2 w-full">
              <div className="relative min-w-0">
                <Calendar className={`absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 h-4 w-4 ${iconBase}`} />
                <input
                  type="date"
                  value={pickupDate}
                  onChange={(e) => setPickupDate(e.target.value)}
                  className={`w-full pl-8 sm:pl-9 pr-1 sm:pr-2 h-12 rounded-xl border text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 ${inputBase}`}
                />
              </div>
              <div className="relative min-w-0">
                <Clock className={`absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 h-4 w-4 ${iconBase}`} />
                <input
                  type="time"
                  value={pickupTime}
                  onChange={(e) => setPickupTime(e.target.value)}
                  className={`w-full pl-8 sm:pl-9 pr-1 sm:pr-2 h-12 rounded-xl border text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 ${inputBase}`}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB 3: OUTSTATION ROUND TRIP ─── */}
      {journeyType === "outstation_round_trip" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
          <div className="space-y-1.5">
            <label className={`text-xs uppercase tracking-wider block ${labelBase}`}>Pickup City / Origin</label>
            <div className="relative">
              <MapPin className={`absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 ${iconBase}`} />
              <input
                type="text"
                placeholder="Pickup Area / Origin City (e.g. Pune, Mumbai)"
                value={pickup}
                onChange={(e) => setPickup(e.target.value)}
                className={`w-full pl-10 pr-3 h-12 rounded-xl border text-sm focus:outline-none focus:ring-2 ${inputBase}`}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className={`text-xs uppercase tracking-wider block ${labelBase}`}>Destination / Circuit</label>
            <div className="relative">
              <MapPin className={`absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-500`} />
              <input
                type="text"
                placeholder="Destination / Circuit (e.g. Mahabaleshwar)"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                className={`w-full pl-10 pr-3 h-12 rounded-xl border text-sm focus:outline-none focus:ring-2 ${inputBase}`}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className={`text-xs uppercase tracking-wider block ${labelBase}`}>Departure Date & Time</label>
            <div className="grid grid-cols-2 gap-2 w-full">
              <div className="relative min-w-0">
                <Calendar className={`absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 h-4 w-4 ${iconBase}`} />
                <input
                  type="date"
                  value={pickupDate}
                  onChange={(e) => setPickupDate(e.target.value)}
                  className={`w-full pl-8 sm:pl-9 pr-1 sm:pr-2 h-12 rounded-xl border text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 ${inputBase}`}
                />
              </div>
              <div className="relative min-w-0">
                <Clock className={`absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 h-4 w-4 ${iconBase}`} />
                <input
                  type="time"
                  value={pickupTime}
                  onChange={(e) => setPickupTime(e.target.value)}
                  className={`w-full pl-8 sm:pl-9 pr-1 sm:pr-2 h-12 rounded-xl border text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 ${inputBase}`}
                />
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className={`text-xs uppercase tracking-wider block ${labelBase}`}>Return Date & Time</label>
            <div className="grid grid-cols-2 gap-2 w-full">
              <div className="relative min-w-0">
                <Calendar className={`absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 h-4 w-4 ${iconBase}`} />
                <input
                  type="date"
                  value={returnDate}
                  onChange={(e) => setReturnDate(e.target.value)}
                  className={`w-full pl-8 sm:pl-9 pr-1 sm:pr-2 h-12 rounded-xl border text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 ${inputBase}`}
                />
              </div>
              <div className="relative min-w-0">
                <Clock className={`absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 h-4 w-4 ${iconBase}`} />
                <input
                  type="time"
                  value={returnTime}
                  onChange={(e) => setReturnTime(e.target.value)}
                  className={`w-full pl-8 sm:pl-9 pr-1 sm:pr-2 h-12 rounded-xl border text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 ${inputBase}`}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB 4: AIRPORT TRANSFER ─── */}
      {journeyType === "airport_transfer" && (
        <div className="space-y-4">
          <div className="inline-flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200/70 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setAirportDirection("to_airport")}
              className={`px-5 py-2 text-xs font-bold rounded-lg transition-all ${
                airportDirection === "to_airport"
                  ? "bg-white text-blue-600 shadow-sm dark:bg-slate-700 dark:text-white"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              Drop to Airport 🛫
            </button>
            <button
              type="button"
              onClick={() => setAirportDirection("from_airport")}
              className={`px-5 py-2 text-xs font-bold rounded-lg transition-all ${
                airportDirection === "from_airport"
                  ? "bg-white text-blue-600 shadow-sm dark:bg-slate-700 dark:text-white"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              Pickup from Airport 🛬
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
            <div className="space-y-1.5 md:col-span-6 lg:col-span-4">
              <label className={`text-xs uppercase tracking-wider block ${labelBase}`}>Airport Terminal</label>
              <div className="relative">
                <Plane className={`absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 ${iconBase}`} />
                <select
                  value={selectedAirport}
                  onChange={(e) => setSelectedAirport(e.target.value)}
                  className={`w-full pl-10 pr-8 h-12 rounded-xl border text-xs sm:text-sm appearance-none focus:outline-none focus:ring-2 cursor-pointer ${inputBase}`}
                >
                  {airports.map((a) => (
                    <option key={a.code} value={a.name}>
                      {a.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
              </div>
            </div>

            <div className="space-y-1.5 md:col-span-6 lg:col-span-4">
              <label className={`text-xs uppercase tracking-wider block ${labelBase}`}>
                {airportDirection === "to_airport" ? "City Pickup Address" : "City Drop Address"}
              </label>
              <div className="relative">
                <MapPin className={`absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-500`} />
                <input
                  type="text"
                  placeholder="House / Flat No., Street, Area, City (e.g. 204, Regent Court, Baner, Pune)"
                  value={pickup}
                  onChange={(e) => setPickup(e.target.value)}
                  className={`w-full pl-10 pr-3 h-12 rounded-xl border text-sm focus:outline-none focus:ring-2 ${inputBase}`}
                />
              </div>
            </div>

            <div className="space-y-1.5 md:col-span-12 lg:col-span-4">
              <label className={`text-xs uppercase tracking-wider block ${labelBase}`}>Travel Date & Time</label>
              <div className="grid grid-cols-2 gap-2 w-full">
                <div className="relative min-w-0">
                  <Calendar className={`absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 h-4 w-4 ${iconBase}`} />
                  <input
                    type="date"
                    value={pickupDate}
                    onChange={(e) => setPickupDate(e.target.value)}
                    className={`w-full pl-8 sm:pl-9 pr-1 sm:pr-2 h-12 rounded-xl border text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 ${inputBase}`}
                  />
                </div>
                <div className="relative min-w-0">
                  <Clock className={`absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 h-4 w-4 ${iconBase}`} />
                  <input
                    type="time"
                    value={pickupTime}
                    onChange={(e) => setPickupTime(e.target.value)}
                    className={`w-full pl-8 sm:pl-9 pr-1 sm:pr-2 h-12 rounded-xl border text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 ${inputBase}`}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB 5: CORPORATE TRANSPORTATION ─── */}
      {journeyType === "corporate" && (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
          <div className="space-y-1.5 md:col-span-6 lg:col-span-4">
            <label className={`text-xs uppercase tracking-wider block ${labelBase}`}>Company / Org Name</label>
            <div className="relative">
              <Building2 className={`absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 ${iconBase}`} />
              <input
                type="text"
                placeholder="e.g. Tech Mahindra / Infosys"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className={`w-full pl-10 pr-3 h-12 rounded-xl border text-sm focus:outline-none focus:ring-2 ${inputBase}`}
              />
            </div>
          </div>

          <div className="space-y-1.5 md:col-span-6 lg:col-span-4">
            <label className={`text-xs uppercase tracking-wider block ${labelBase}`}>Office / Facility Hub</label>
            <div className="relative">
              <MapPin className={`absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-indigo-500`} />
              <input
                type="text"
                placeholder="e.g. Hinjawadi IT Park / BKC Mumbai"
                value={pickup}
                onChange={(e) => setPickup(e.target.value)}
                className={`w-full pl-10 pr-3 h-12 rounded-xl border text-sm focus:outline-none focus:ring-2 ${inputBase}`}
              />
            </div>
          </div>

          <div className="space-y-1.5 md:col-span-12 lg:col-span-4">
            <label className={`text-xs uppercase tracking-wider block ${labelBase}`}>Shift Timing</label>
            <div className="relative">
              <select
                value={shiftTime}
                onChange={(e) => setShiftTime(e.target.value)}
                className={`w-full px-3.5 pr-8 h-12 rounded-xl border text-xs sm:text-sm appearance-none focus:outline-none focus:ring-2 cursor-pointer ${inputBase}`}
              >
                <option value="09:00 AM (General Shift)">09:00 AM – General Shift</option>
                <option value="07:00 AM (Morning Shift)">07:00 AM – Morning Shift</option>
                <option value="03:00 PM (Afternoon Shift)">03:00 PM – Afternoon Shift</option>
                <option value="11:00 PM (Night Shift)">11:00 PM – Night Shift</option>
                <option value="24/7 Multi-Shift Roster">24/7 Multi-Shift Roster</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            </div>
          </div>
        </div>
      )}

      {/* ─── BOTTOM CONTROLS & ACTION CTA ─── */}
      <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        {/* Popular Route Badges for Quick selection */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
          <span className="font-bold text-slate-700 dark:text-slate-300 shrink-0 text-xs mr-1">Popular:</span>
          {popularHubs.map((hub) => (
            <button
              key={hub}
              type="button"
              onClick={() => {
                if (journeyType === "local") setPickup(hub);
                else setDestination(hub);
              }}
              className="px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-slate-700 dark:hover:text-blue-400 text-xs font-medium border border-slate-200/60 dark:border-slate-700 transition-colors shrink-0"
            >
              {hub}
            </button>
          ))}
        </div>

        {/* CTA Buttons */}
        <div className="w-full md:w-auto md:ml-auto flex items-center shrink-0">
          {journeyType === "corporate" ? (
            <Button
              id="corporate-enquiry-btn"
              onClick={handleCorporateEnquiry}
              className="w-full md:w-auto h-12 px-7 gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-600/20 text-sm"
            >
              <Building2 className="h-4 w-4" />
              Enquire Corporate Fleet
            </Button>
          ) : (
            <Button
              id="search-cabs-btn"
              onClick={handleSearch}
              className="w-full md:w-auto h-12 px-7 gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-600/25 text-sm"
            >
              <Search className="h-4 w-4" />
              Find Available Cabs
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
