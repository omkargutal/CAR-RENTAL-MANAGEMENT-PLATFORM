import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  Search, SlidersHorizontal, X, ChevronDown, Users, Fuel, Gauge,
  ArrowRight, Sparkles, AlertCircle, RefreshCw,
  ShieldAlert, ChevronLeft, ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { vehiclesApi, Vehicle, VehicleCategory } from "@/core/api";
import { sortVehiclesByRequiredSequence, getVehicleSeatingLabel } from "@/utils/vehicleSorting";
import { getVehiclePerKmRate } from "@/data/cars";

const PRICE_TIERS = [
  { label: "All Rates", min: undefined, max: undefined },
  { label: "Economy Cabs (₹14 - ₹16 / km)", min: 0, max: 4200 },
  { label: "Family & Mid SUV (₹18 / km)", min: 4200, max: 5000 },
  { label: "Executive & Rugged (₹22 / km)", min: 5000, max: 7000 },
  { label: "Group Van & Coach (₹30+ / km)", min: 7000, max: undefined },
];

const TRANSMISSIONS = ["Any", "Automatic", "Manual"];
const FUELS = ["Any", "Gasoline", "Diesel", "Electric", "Hybrid"];
const SEAT_OPTIONS = [
  { label: "Any Capacity", seats: undefined },
  { label: "4+ Seats", seats: 4 },
  { label: "5+ Seats", seats: 5 },
  { label: "7+ Seats", seats: 7 },
  { label: "8+ Seats", seats: 8 },
  { label: "12+ Seats", seats: 12 },
  { label: "30+ Seats", seats: 30 },
];

export function CarsPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [categories, setCategories] = useState<VehicleCategory[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters state
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [brand, setBrand] = useState("All");
  const [priceTierIndex, setPriceTierIndex] = useState(0);
  const [transmission, setTransmission] = useState("Any");
  const [fuel, setFuel] = useState("Any");
  const [seatMin, setSeatMin] = useState<number | undefined>(undefined);
  const [availableOnly, setAvailableOnly] = useState(false);
  const [sortBy, setSortBy] = useState<"capacity" | "price_asc" | "price_desc" | "newest" | "popularity">("capacity");
  const [page, setPage] = useState(1);
  const pageSize = 12;

  const [filtersOpen, setFiltersOpen] = useState(false);

  // Fetch categories on mount
  useEffect(() => {
    vehiclesApi.listCategories()
      .then((cats) => setCategories(cats))
      .catch((err) => console.error("Failed to load categories:", err));
  }, []);

  // Fetch catalog vehicles
  const loadFleet = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const selectedTier = PRICE_TIERS[priceTierIndex];
      const res = await vehiclesApi.listVehicles({
        skip: (page - 1) * pageSize,
        limit: pageSize,
        search: search.trim() || undefined,
        category: category !== "All" ? category : undefined,
        brand: brand !== "All" ? brand : undefined,
        min_price: selectedTier.min,
        max_price: selectedTier.max,
        transmission: transmission !== "Any" ? transmission : undefined,
        fuel_type: fuel !== "Any" ? fuel : undefined,
        seats: seatMin,
        available_only: availableOnly,
        sort_by: sortBy,
      });
      const rawVehicles = res.vehicles || [];
      const orderedVehicles = (sortBy === "capacity" || !sortBy)
        ? sortVehiclesByRequiredSequence(rawVehicles)
        : rawVehicles;
      setVehicles(orderedVehicles);
      setTotal(res.total);
    } catch (err: any) {
      setError(err?.message || "Failed to load vehicle catalog. Please ensure backend services are online.");
    } finally {
      setLoading(false);
    }
  }, [page, search, category, brand, priceTierIndex, transmission, fuel, seatMin, availableOnly, sortBy]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadFleet();
    }, 200);
    return () => clearTimeout(timer);
  }, [loadFleet]);

  const hasActiveFilters =
    category !== "All" ||
    brand !== "All" ||
    priceTierIndex !== 0 ||
    transmission !== "Any" ||
    fuel !== "Any" ||
    seatMin !== undefined ||
    availableOnly ||
    search.trim() !== "";

  const clearFilters = () => {
    setCategory("All");
    setBrand("All");
    setPriceTierIndex(0);
    setTransmission("Any");
    setFuel("Any");
    setSeatMin(undefined);
    setAvailableOnly(false);
    setSortBy("capacity");
    setSearch("");
    setPage(1);
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  // Extract unique brands from loaded vehicles for quick-select
  const availableBrands = Array.from(new Set(vehicles.map((v) => v.make || v.brand).filter(Boolean)));

  return (
    <div className="min-h-screen bg-slate-50 pt-16">
      {/* Page Header Banner */}
      <div className="bg-gradient-to-b from-slate-900 to-slate-800 text-white border-b border-slate-700/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-400 text-xs font-semibold mb-2">
                <Sparkles className="h-3.5 w-3.5" /> Verified Cab & Passenger Fleet
              </div>
              <h1 className="text-3xl lg:text-4xl font-extrabold text-white tracking-tight">Explore Our Fleet</h1>
              <p className="text-blue-400 font-semibold text-sm mt-0.5">Find the Right Ride for Every Journey</p>
              <p className="text-slate-400 mt-1 text-sm">
                Choose the best cab for your journey — whether you are traveling alone, with family, or with a group.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="bg-slate-800/80 backdrop-blur border border-slate-700 rounded-xl px-4 py-2.5 text-center">
                <p className="text-xs text-slate-400 uppercase font-semibold">Available Vehicles</p>
                <p className="text-2xl font-black text-blue-400">{total}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search & Control Bar */}
        <div className="flex flex-col md:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              id="catalog-search-input"
              placeholder="Search by make, model, VIN, or license plate…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="pl-10 h-11 bg-white border-slate-200 focus:ring-blue-500"
            />
            {search && (
              <button
                onClick={() => { setSearch(""); setPage(1); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <Button
            id="toggle-filters-btn"
            variant={filtersOpen ? "default" : "outline"}
            onClick={() => setFiltersOpen(!filtersOpen)}
            className="gap-2 h-11 px-4"
          >
            <SlidersHorizontal className="h-4 w-4" />
            Filter Fleet
            {hasActiveFilters && (
              <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
            )}
          </Button>

          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-slate-500 whitespace-nowrap">Sort By:</label>
            <div className="relative">
              <select
                id="catalog-sort-select"
                value={sortBy}
                onChange={(e) => { setSortBy(e.target.value as any); setPage(1); }}
                className="h-11 pl-3 pr-8 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-800 appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                <option value="capacity">Seating Capacity (Ascending)</option>
                <option value="popularity">Popularity</option>
                <option value="price_asc">Price: Low to High</option>
                <option value="price_desc">Price: High to Low</option>
                <option value="newest">Newest Fleet</option>
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none text-slate-400" />
            </div>
          </div>
        </div>

        {/* Filter Panel */}
        {filtersOpen && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-8 shadow-sm transition-all animate-in fade-in-50">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="h-4 w-4 text-blue-600" />
                <h3 className="font-bold text-slate-900 text-sm">Detailed Fleet Filters</h3>
              </div>
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1"
                >
                  <X className="h-3.5 w-3.5" /> Reset All Filters
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Category Filter */}
              <div>
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider block mb-2">Category</label>
                <select
                  value={category}
                  onChange={(e) => { setCategory(e.target.value); setPage(1); }}
                  className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="All">All Categories</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.slug}>{c.name}</option>
                  ))}
                  {!categories.length && (
                    <>
                      <option value="sedan">Sedan</option>
                      <option value="suv">SUV</option>
                      <option value="van">Van / MUV / Coach</option>
                      <option value="luxury">Luxury</option>
                    </>
                  )}
                </select>
              </div>

              {/* Price Range Filter */}
              <div>
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider block mb-2">Daily Price</label>
                <select
                  value={priceTierIndex}
                  onChange={(e) => { setPriceTierIndex(Number(e.target.value)); setPage(1); }}
                  className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {PRICE_TIERS.map((tier, idx) => (
                    <option key={tier.label} value={idx}>{tier.label}</option>
                  ))}
                </select>
              </div>

              {/* Fuel Type */}
              <div>
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider block mb-2">Fuel Type</label>
                <select
                  value={fuel}
                  onChange={(e) => { setFuel(e.target.value); setPage(1); }}
                  className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {FUELS.map((f) => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
              </div>

              {/* Transmission */}
              <div>
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider block mb-2">Transmission</label>
                <select
                  value={transmission}
                  onChange={(e) => { setTransmission(e.target.value); setPage(1); }}
                  className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {TRANSMISSIONS.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              {/* Minimum Seating Capacity */}
              <div>
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider block mb-2">Seating Capacity</label>
                <select
                  value={seatMin ?? ""}
                  onChange={(e) => { setSeatMin(e.target.value ? Number(e.target.value) : undefined); setPage(1); }}
                  className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {SEAT_OPTIONS.map((opt) => (
                    <option key={opt.label} value={opt.seats ?? ""}>{opt.label}</option>
                  ))}
                </select>
              </div>

              {/* Brand Filter */}
              <div>
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider block mb-2">Brand / Make</label>
                <select
                  value={brand}
                  onChange={(e) => { setBrand(e.target.value); setPage(1); }}
                  className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="All">All Brands</option>
                  {availableBrands.map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>

              {/* Bookability Toggle */}
              <div className="sm:col-span-2 flex items-center gap-3 pt-6">
                <input
                  type="checkbox"
                  id="avail-only-toggle"
                  checked={availableOnly}
                  onChange={(e) => { setAvailableOnly(e.target.checked); setPage(1); }}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
                <label htmlFor="avail-only-toggle" className="text-sm font-semibold text-slate-800 cursor-pointer">
                  Show Immediately Available Vehicles Only
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Loading Skeleton */}
        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="bg-white rounded-2xl border border-slate-200 p-4 animate-pulse space-y-4">
                <div className="h-48 bg-slate-200 rounded-xl" />
                <div className="h-4 bg-slate-200 rounded w-1/3" />
                <div className="h-6 bg-slate-200 rounded w-2/3" />
                <div className="grid grid-cols-3 gap-2 pt-2">
                  <div className="h-4 bg-slate-100 rounded" />
                  <div className="h-4 bg-slate-100 rounded" />
                  <div className="h-4 bg-slate-100 rounded" />
                </div>
                <div className="flex justify-between items-center pt-2">
                  <div className="h-6 bg-slate-200 rounded w-1/4" />
                  <div className="h-8 bg-slate-200 rounded w-1/3" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Error State */}
        {!loading && error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center my-8">
            <AlertCircle className="h-10 w-10 text-red-500 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-red-900 mb-1">Unable to Load Vehicles</h3>
            <p className="text-sm text-red-700 max-w-md mx-auto mb-4">{error}</p>
            <Button onClick={loadFleet} variant="outline" className="gap-2">
              <RefreshCw className="h-4 w-4" /> Try Again
            </Button>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && vehicles.length === 0 && (
          <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center my-8 shadow-sm">
            <div className="text-5xl mb-4">🚗</div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">No Matching Vehicles Found</h3>
            <p className="text-slate-500 text-sm max-w-md mx-auto mb-6">
              We couldn't find any vehicles matching your current search and filter criteria. Try adjusting your parameters.
            </p>
            <Button onClick={clearFilters} variant="default" className="gap-2">
              <RefreshCw className="h-4 w-4" /> Reset Filters
            </Button>
          </div>
        )}

        {/* Vehicle Grid */}
        {!loading && !error && vehicles.length > 0 && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {vehicles.map((v) => {
                const primaryImage = v.primary_image_url || v.image_url || (v.images?.[0]?.url) ||
                  `https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=800&auto=format&fit=crop&q=80`;
                const isBookable = v.is_bookable !== false && v.status === "AVAILABLE";

                return (
                  <div
                    key={v.id}
                    className="group bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col"
                  >
                    {/* Image Area */}
                    <div className="relative aspect-[16/10] bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-3 overflow-hidden">
                      <img
                        src={primaryImage}
                        alt={`${v.make} ${v.model}`}
                        className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = `/assets/vehicles/mahindra-thar/mahindra-thar-4x4.png`;
                        }}
                      />

                      {/* Status indicator only if unavailable */}
                      {!isBookable && (
                        <div className="absolute top-3 right-3">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-600/90 text-white backdrop-blur shadow-sm">
                            <ShieldAlert className="h-3 w-3" />
                            {v.status === "MAINTENANCE" ? "In Service" : v.status}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Card Body */}
                    <div className="p-5 flex-1 flex flex-col justify-between">
                      <div>
                        {/* Title & Make */}
                        <div className="mb-2">
                          <span className="text-xs font-bold uppercase tracking-wider text-blue-600">{v.make || v.brand}</span>
                          <h3 className="text-lg font-extrabold text-slate-900 group-hover:text-blue-600 transition-colors">
                            {v.model}
                          </h3>
                        </div>

                        {/* Description snippet */}
                        {v.description && (
                          <p className="text-xs text-slate-500 line-clamp-2 mt-1 mb-3">
                            {v.description}
                          </p>
                        )}

                        {/* Specs row */}
                        <div className="grid grid-cols-3 gap-2 py-2.5 my-2 border-y border-slate-100 text-xs text-slate-600">
                          <div className="flex items-center gap-1.5 font-semibold text-slate-800" title="Seating Capacity">
                            <Users className="h-3.5 w-3.5 text-blue-600" />
                            <span>{getVehicleSeatingLabel(v)}</span>
                          </div>
                          <div className="flex items-center gap-1.5" title="Transmission">
                            <Gauge className="h-3.5 w-3.5 text-slate-400" />
                            <span className="capitalize">{v.transmission?.toLowerCase() || "Auto"}</span>
                          </div>
                          <div className="flex items-center gap-1.5" title="Fuel Type">
                            <Fuel className="h-3.5 w-3.5 text-slate-400" />
                            <span className="capitalize">{v.fuel_type?.toLowerCase() || "Gas"}</span>
                          </div>
                        </div>
                      </div>

                      {/* Pricing and Action */}
                      <div className="pt-3 border-t border-slate-100 flex items-center justify-between mt-auto">
                        <div>
                          <div className="flex items-baseline gap-1">
                            <span className="text-2xl font-black text-slate-900">
                              ₹{getVehiclePerKmRate(v)}
                            </span>
                            <span className="text-xs font-bold text-slate-500">/ km</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-[11px] text-emerald-600 font-semibold">
                            <span>Driver & Fuel Included</span>
                          </div>
                        </div>

                        <Link to={`/cars/${v.id}${window.location.search}`}>
                          <Button
                            size="sm"
                            disabled={!isBookable}
                            className={`gap-1.5 font-semibold ${
                              isBookable
                                ? "bg-blue-600 hover:bg-blue-700 text-white"
                                : "bg-slate-200 text-slate-500 cursor-not-allowed"
                            }`}
                          >
                            {isBookable ? "Details & Book" : "Unavailable"}
                            <ArrowRight className="h-3.5 w-3.5" />
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-10 border-t border-slate-200 mt-8">
                <p className="text-sm text-slate-500">
                  Showing <span className="font-semibold text-slate-800">{(page - 1) * pageSize + 1}</span> to{" "}
                  <span className="font-semibold text-slate-800">{Math.min(page * pageSize, total)}</span> of{" "}
                  <span className="font-semibold text-slate-800">{total}</span> vehicles
                </p>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage(page - 1)}
                    className="gap-1"
                  >
                    <ChevronLeft className="h-4 w-4" /> Previous
                  </Button>
                  <span className="text-sm font-semibold px-3 py-1 bg-white border border-slate-200 rounded-lg">
                    {page} / {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages}
                    onClick={() => setPage(page + 1)}
                    className="gap-1"
                  >
                    Next <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
