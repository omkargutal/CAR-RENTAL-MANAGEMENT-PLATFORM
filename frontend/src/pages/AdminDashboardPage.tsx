import { useState, useEffect } from "react";
import {
  Car, Users, Calendar, MapPin, Settings, FileText,
  BarChart3, RefreshCw, Plus, Archive,
  Upload, Wrench, Search, X, Check, Eye, AlertCircle,
  IndianRupee, TrendingUp, Download, ShieldCheck,
  CheckCircle2, XCircle, RotateCcw, Clock,
  FileSpreadsheet, ShieldAlert, MessageSquare,
  Compass, Edit3, Trash2, ExternalLink, Sparkles, Star
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  authApi, vehiclesApi, locationsApi, bookingsApi, customersApi, settingsApi, reportsApi, adminApi,
  Vehicle, Location, VehicleCategory, Booking, Customer, BusinessSettingsData,
  PlatformExecutiveOverview, ReportAnalyticsResponse, AuditLog, User
} from "@/core/api";
import { AdminWhatsAppSection } from "@/components/admin/AdminWhatsAppSection";
import { AdminTestimonialsSection } from "@/components/admin/AdminTestimonialsSection";
import { sortVehiclesByRequiredSequence, getVehicleSeatingLabel } from "@/utils/vehicleSorting";
import {
  TourPackage,
  getStoredTourPackages,
  saveStoredTourPackages,
  resetStoredTourPackages
} from "@/data/services";
import {
  getStoredPopularDestinations,
  saveStoredPopularDestinations,
  getStoredAirportTerminals,
  saveStoredAirportTerminals,
  resetSearchWidgetDefaults,
  AirportTerminalOption,
} from "@/data/searchWidgetConfig";


type NavTab = "overview" | "fleet" | "bookings" | "tours" | "whatsapp" | "testimonials" | "customers" | "locations" | "settings" | "reports" | "audit";

const NAV_ITEMS: { id: NavTab; label: string; Icon: any }[] = [
  { id: "overview", label: "Executive Overview", Icon: BarChart3 },
  { id: "fleet", label: "Cab Fleet & Vehicles", Icon: Car },
  { id: "bookings", label: "Trip Bookings & Dispatch", Icon: Calendar },
  { id: "tours", label: "Tours & Travel Packages", Icon: Compass },
  { id: "testimonials", label: "Manage Testimonials", Icon: Star },
  { id: "whatsapp", label: "WhatsApp Business", Icon: MessageSquare },
  { id: "customers", label: "Customer Management", Icon: Users },
  { id: "locations", label: "Pickup / Drop-off Hubs", Icon: MapPin },
  { id: "settings", label: "Business Settings", Icon: Settings },
  { id: "reports", label: "Analytics & Exports", Icon: FileSpreadsheet },
  { id: "audit", label: "Security & Audit Logs", Icon: ShieldAlert },
];

const TOUR_IMAGE_PRESETS = [
  { label: "Ashtavinayak Darshan", url: "/assets/services/tours-travels/pilgrimage/ashtavinayak-darshan.png", category: "Pilgrimage Trips" as const },
  { label: "5 Jyotirlinga Darshan", url: "/assets/services/tours-travels/pilgrimage/jyotirlinga-darshan.png", category: "Pilgrimage Trips" as const },
  { label: "Lonavala & Khandala", url: "/assets/services/tours-travels/weekend-getaways/lonavala.png", category: "Weekend Getaways" as const },
  { label: "Mahabaleshwar Points", url: "/assets/services/tours-travels/sightseeing/mahabaleshwar-points.png", category: "Sightseeing Tours" as const },
  { label: "Mumbai Heritage & Coastal", url: "/assets/services/tours-travels/outstation-travel/mumbai-tour.png", category: "Outstation Travel" as const },
  { label: "Pune Heritage & Forts", url: "/assets/services/tours-travels/sightseeing/pune-tour.png", category: "Sightseeing Tours" as const },
];

export function AdminDashboardPage() {
  const [activeTab, setActiveTab] = useState<NavTab>("overview");
  const [sidebarOpen] = useState(true);

  // Current logged in user
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Global loading and feedback
  const [syncing, setSyncing] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // 1. Overview & Reporting State
  const [overview, setOverview] = useState<PlatformExecutiveOverview | null>(null);
  const [analytics, setAnalytics] = useState<ReportAnalyticsResponse | null>(null);

  // 2. Bookings State
  const [adminBookings, setAdminBookings] = useState<Booking[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(false);
  const [bookingStatusFilter, setBookingStatusFilter] = useState("ALL");
  const [bookingSearch, setBookingSearch] = useState("");
  const [selectedBookingForModal, setSelectedBookingForModal] = useState<Booking | null>(null);
  const [cancelModalBooking, setCancelModalBooking] = useState<Booking | null>(null);
  const [cancellationReason, setCancellationReason] = useState("");

  // 3. Customers State
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [customerSearch, setCustomerSearch] = useState("");
  const [customerFilter, setCustomerFilter] = useState<"ALL" | "VERIFIED" | "UNVERIFIED">("ALL");
  const [selectedCustomerModal, setSelectedCustomerModal] = useState<Customer | null>(null);
  const [verificationNotes, setVerificationNotes] = useState("");

  // 4. Fleet State
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [categories, setCategories] = useState<VehicleCategory[]>([]);
  const [fleetSearch, setFleetSearch] = useState("");

  // Modals for Fleet
  const [showAddVehicleModal, setShowAddVehicleModal] = useState(false);
  const [showEditVehicleModal, setShowEditVehicleModal] = useState<Vehicle | null>(null);
  const [showAddLocationModal, setShowAddLocationModal] = useState(false);
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
  const [showMaintenanceModal, setShowMaintenanceModal] = useState<Vehicle | null>(null);
  const [showImageUploadModal, setShowImageUploadModal] = useState<Vehicle | null>(null);
  const [showRentalHistoryModal, setShowRentalHistoryModal] = useState<Vehicle | null>(null);
  const [rentalHistory, setRentalHistory] = useState<any[]>([]);

  // 4b. Tour & Travel Packages State
  const [tourPackages, setTourPackages] = useState<TourPackage[]>(() => getStoredTourPackages());
  const [tourCategoryFilter, setTourCategoryFilter] = useState<string>("ALL");
  const [tourSearch, setTourSearch] = useState("");
  const [showTourModal, setShowTourModal] = useState(false);
  const [editingTourId, setEditingTourId] = useState<string | null>(null);
  const [tourForm, setTourForm] = useState({
    title: "",
    category: "Pilgrimage Trips" as "Pilgrimage Trips" | "Weekend Getaways" | "Sightseeing Tours" | "Outstation Travel" | "Family Tours",
    destination: "",
    duration: "2–3 Days Circuit",
    tag: "Sacred Pilgrimage",
    image: "/assets/services/tours-travels/pilgrimage/ashtavinayak-darshan.png",
    description: "",
    highlights: "Doorstep Pickup & Safe Return\nElderly-Friendly Pacing & Rest Breaks\nSanitized AC Fleet with Driver",
    price: "₹8,499",
  });

  // 5. Business Settings State
  const [settingsData, setSettingsData] = useState<BusinessSettingsData | null>(null);
  const [loadingSettings, setLoadingSettings] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [adminPopularDestinations, setAdminPopularDestinations] = useState<string[]>(getStoredPopularDestinations);
  const [newPopularInput, setNewPopularInput] = useState("");
  const [adminAirportTerminals, setAdminAirportTerminals] = useState<AirportTerminalOption[]>(getStoredAirportTerminals);
  const [newAirportCode, setNewAirportCode] = useState("");
  const [newAirportName, setNewAirportName] = useState("");


  // 6. Audit Logs State
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loadingAudit, setLoadingAudit] = useState(false);
  const [auditFilterType, setAuditFilterType] = useState<string>("ALL");

  // Form states
  const [vehForm, setVehForm] = useState({
    make: "",
    model: "",
    year: 2024,
    vin: "",
    license_plate: "",
    category: "SEDAN",
    fuel_type: "GASOLINE",
    transmission: "AUTOMATIC",
    seats: 5,
    daily_rate: 95.0,
    weekly_rate: 570.0,
    monthly_rate: 1900.0,
    description: "",
    location_id: "",
    outstation_min_km: 250,
    features: "AC, Music System, Clean Interior",
  });

  const [editVehForm, setEditVehForm] = useState({
    make: "",
    model: "",
    year: 2024,
    license_plate: "",
    category: "SEDAN",
    status: "AVAILABLE",
    fuel_type: "GASOLINE",
    transmission: "MANUAL",
    seats: 5,
    daily_rate: 3500,
    outstation_min_km: 250,
    description: "",
    features: "",
  });

  const [locForm, setLocForm] = useState({
    name: "",
    code: "",
    address: "",
    city: "",
    state: "NY",
    country: "US",
    postal_code: "",
    phone: "",
    email: "",
  });

  const [catForm, setCatForm] = useState({
    name: "",
    code: "",
    description: "",
  });

  const [maintForm, setMaintForm] = useState({
    service_type: "ROUTINE_OIL_CHANGE",
    description: "",
    cost: 150.0,
    performed_by: "Fleet Service Team",
  });

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imageCaption, setImageCaption] = useState("");
  const [isPrimaryImage, setIsPrimaryImage] = useState(true);

  // Helper notification timer
  const showFeedback = (msg: string, isError = false) => {
    if (isError) {
      setActionError(msg);
      setActionMessage(null);
    } else {
      setActionMessage(msg);
      setActionError(null);
    }
    setTimeout(() => {
      setActionMessage(null);
      setActionError(null);
    }, 5000);
  };

  // Initial Load: User & Overview
  useEffect(() => {
    authApi.getMe()
      .then((u) => setCurrentUser(u))
      .catch(() => setCurrentUser(null));
  }, []);

  // Fetch overview data
  const loadOverviewData = async () => {
    setSyncing(true);
    try {
      const [ov, an] = await Promise.all([
        reportsApi.getOverview(),
        reportsApi.getAnalytics(),
      ]);
      setOverview(ov);
      setAnalytics(an);
    } catch (err: any) {
      console.error("Overview error", err);
    } finally {
      setSyncing(false);
    }
  };

  // Fetch fleet data
  const loadFleetData = async () => {
    try {
      const [vRes, lRes, cRes] = await Promise.all([
        vehiclesApi.listVehicles({ limit: 100, include_archived: true }),
        locationsApi.listLocations(),
        vehiclesApi.listCategories(),
      ]);
      setVehicles(sortVehiclesByRequiredSequence(vRes.vehicles));
      setLocations(lRes);
      setCategories(cRes);
      if (lRes.length > 0 && !vehForm.location_id) {
        setVehForm((prev) => ({ ...prev, location_id: lRes[0].id }));
      }
    } catch (err: any) {
      console.error("Fleet error", err);
    }
  };

  // Fetch bookings
  const loadBookingsData = async () => {
    setLoadingBookings(true);
    try {
      const bList = await bookingsApi.listAllBookings();
      setAdminBookings(bList);
    } catch (err: any) {
      console.error("Bookings error", err);
    } finally {
      setLoadingBookings(false);
    }
  };

  // Fetch customers
  const loadCustomersData = async () => {
    setLoadingCustomers(true);
    try {
      const cList = await customersApi.listCustomers({ limit: 100 });
      setCustomers(cList);
    } catch (err: any) {
      console.error("Customers error", err);
    } finally {
      setLoadingCustomers(false);
    }
  };

  // Fetch settings
  const loadSettingsData = async () => {
    setLoadingSettings(true);
    try {
      const s = await settingsApi.getSettings();
      setSettingsData(s);
    } catch (err: any) {
      console.error("Settings error", err);
    } finally {
      setLoadingSettings(false);
    }
  };

  // Fetch audit logs
  const loadAuditData = async () => {
    setLoadingAudit(true);
    try {
      const logs = await adminApi.getAuditLogs({ limit: 100 });
      setAuditLogs(logs);
    } catch (err: any) {
      console.error("Audit error", err);
    } finally {
      setLoadingAudit(false);
    }
  };

  // Reactive tab switcher
  useEffect(() => {
    if (activeTab === "overview") {
      loadOverviewData();
      loadFleetData();
    } else if (activeTab === "fleet") {
      loadFleetData();
    } else if (activeTab === "bookings") {
      loadBookingsData();
    } else if (activeTab === "customers") {
      loadCustomersData();
    } else if (activeTab === "locations") {
      loadFleetData();
    } else if (activeTab === "settings") {
      loadSettingsData();
    } else if (activeTab === "reports") {
      loadOverviewData();
    } else if (activeTab === "audit") {
      loadAuditData();
    } else if (activeTab === "tours") {
      setTourPackages(getStoredTourPackages());
    }
  }, [activeTab]);

  // ---------------------------------------------------------------------------
  // Action Handlers
  // ---------------------------------------------------------------------------

  // Tour Package Action Handlers
  const handleOpenAddTour = () => {
    setEditingTourId(null);
    setTourForm({
      title: "",
      category: "Pilgrimage Trips",
      destination: "",
      duration: "2–3 Days Circuit",
      tag: "Sacred Pilgrimage",
      image: "/assets/services/tours-travels/pilgrimage/ashtavinayak-darshan.png",
      description: "",
      highlights: "Complete Holy Circuit\nElderly-Friendly Pacing & Rest Breaks\nClean AC Fleet with Driver\nDoorstep Pickup & Safe Return",
      price: "₹8,499",
    });
    setShowTourModal(true);
  };

  const handleOpenEditTour = (pkg: TourPackage) => {
    setEditingTourId(pkg.id);
    setTourForm({
      title: pkg.title,
      category: pkg.category,
      destination: pkg.destination,
      duration: pkg.duration,
      tag: pkg.tag,
      image: pkg.image,
      description: pkg.description,
      highlights: pkg.highlights.join("\n"),
      price: pkg.price || "",
    });
    setShowTourModal(true);
  };

  const handleTourImageFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const result = uploadEvent.target?.result as string;
      if (result) {
        setTourForm((prev) => ({ ...prev, image: result }));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveTourPackage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tourForm.title.trim()) {
      showFeedback("Package title is required.", true);
      return;
    }
    if (!tourForm.destination.trim()) {
      showFeedback("Destination or circuit detail is required.", true);
      return;
    }
    if (!tourForm.image.trim()) {
      showFeedback("Package image is required.", true);
      return;
    }

    const highlightsList = tourForm.highlights
      .split("\n")
      .map((h) => h.trim())
      .filter((h) => h.length > 0);

    let updatedList: TourPackage[];

    if (editingTourId) {
      updatedList = tourPackages.map((p) =>
        p.id === editingTourId
          ? {
              ...p,
              title: tourForm.title.trim(),
              category: tourForm.category,
              destination: tourForm.destination.trim(),
              duration: tourForm.duration.trim() || "1–2 Days",
              tag: tourForm.tag.trim() || "Tour Package",
              image: tourForm.image.trim(),
              description: tourForm.description.trim(),
              highlights: highlightsList.length > 0 ? highlightsList : ["Doorstep Pickup & Safe Return"],
              price: tourForm.price.trim() || undefined,
            }
          : p
      );
      showFeedback(`Tour package "${tourForm.title}" updated successfully.`);
    } else {
      const newId =
        tourForm.title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)/g, "") +
        "-" +
        Date.now().toString(36);

      const newPackage: TourPackage = {
        id: newId,
        title: tourForm.title.trim(),
        category: tourForm.category,
        destination: tourForm.destination.trim(),
        duration: tourForm.duration.trim() || "1–2 Days",
        tag: tourForm.tag.trim() || "Tour Package",
        image: tourForm.image.trim(),
        description: tourForm.description.trim(),
        highlights: highlightsList.length > 0 ? highlightsList : ["Doorstep Pickup & Safe Return"],
        price: tourForm.price.trim() || undefined,
      };

      updatedList = [newPackage, ...tourPackages];
      showFeedback(`New Tour & Travel package "${tourForm.title}" published successfully!`);
    }

    setTourPackages(updatedList);
    saveStoredTourPackages(updatedList);
    setShowTourModal(false);
  };

  const handleDeleteTour = (id: string, title: string) => {
    if (!window.confirm(`Are you sure you want to delete tour package "${title}"?`)) {
      return;
    }
    const updatedList = tourPackages.filter((p) => p.id !== id);
    setTourPackages(updatedList);
    saveStoredTourPackages(updatedList);
    showFeedback(`Tour package "${title}" deleted.`);
  };

  const handleResetAllTours = () => {
    if (!window.confirm("Reset all tour packages back to original default packages?")) {
      return;
    }
    const defaults = resetStoredTourPackages();
    setTourPackages(defaults);
    showFeedback("Tour packages restored to default catalog.");
  };


  const handleTransitionBooking = async (bookingId: string, newStatus: string, reason?: string) => {
    try {
      await bookingsApi.transitionStatus(bookingId, newStatus, reason);
      showFeedback(`Booking transitioned to ${newStatus} successfully.`);
      await loadBookingsData();
      if (selectedBookingForModal && selectedBookingForModal.id === bookingId) {
        const updated = await bookingsApi.getBooking(bookingId);
        setSelectedBookingForModal(updated);
      }
    } catch (err: any) {
      showFeedback(err?.message || "Status transition rejected by server.", true);
    }
  };

  const handleCancelBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancelModalBooking) return;
    try {
      await bookingsApi.cancelBooking(cancelModalBooking.id, cancellationReason || "Admin administrative cancellation");
      showFeedback(`Booking ${cancelModalBooking.booking_reference} cancelled.`);
      setCancelModalBooking(null);
      setCancellationReason("");
      await loadBookingsData();
    } catch (err: any) {
      showFeedback(err?.message || "Failed to cancel booking.", true);
    }
  };

  const handleToggleCustomerVerification = async (customer: Customer, newStatus: boolean) => {
    try {
      const updated = await customersApi.verifyCustomer(customer.id, {
        is_identity_verified: newStatus,
        verification_notes: verificationNotes || (newStatus ? "Verified by administrator" : "Unverified by administrator"),
      });
      showFeedback(`Customer identity verification set to ${newStatus ? "VERIFIED" : "UNVERIFIED"}.`);
      setVerificationNotes("");
      setCustomers((prev) => prev.map((c) => (c.id === customer.id ? updated : c)));
      if (selectedCustomerModal && selectedCustomerModal.id === customer.id) {
        setSelectedCustomerModal(updated);
      }
    } catch (err: any) {
      showFeedback(err?.message || "Failed to update verification status.", true);
    }
  };

  const handleToggleUserAccountStatus = async (userId: string, is_active: boolean) => {
    try {
      await adminApi.changeUserStatus(userId, is_active, "Administrative account management");
      showFeedback(`User account ${is_active ? "activated" : "suspended"}.`);
      await loadCustomersData();
    } catch (err: any) {
      showFeedback(err?.message || "Failed to update user account status.", true);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settingsData) return;
    setSavingSettings(true);
    try {
      saveStoredPopularDestinations(adminPopularDestinations);
      saveStoredAirportTerminals(adminAirportTerminals);
      const updated = await settingsApi.updateSettings(settingsData);
      setSettingsData(updated);
      showFeedback("Business settings, policies, and homepage search options saved successfully.");
    } catch (err: any) {
      showFeedback(err?.message || "Failed to save business settings.", true);
    } finally {
      setSavingSettings(false);
    }
  };

  const handleAddPopularDestination = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newPopularInput.trim()) return;
    const parts = newPopularInput.split(",").map((p) => p.trim()).filter(Boolean);
    const updated = Array.from(new Set([...adminPopularDestinations, ...parts]));
    setAdminPopularDestinations(updated);
    saveStoredPopularDestinations(updated);
    setNewPopularInput("");
    showFeedback(`Added ${parts.join(", ")} to popular destinations.`);
  };

  const handleRemovePopularDestination = (target: string) => {
    const updated = adminPopularDestinations.filter((d) => d !== target);
    setAdminPopularDestinations(updated);
    saveStoredPopularDestinations(updated);
    showFeedback(`Removed "${target}" from popular destinations.`);
  };

  const handleResetSearchWidgetDefaults = () => {
    resetSearchWidgetDefaults();
    setAdminPopularDestinations(getStoredPopularDestinations());
    setAdminAirportTerminals(getStoredAirportTerminals());
    showFeedback("Restored default popular destinations and airport terminals.");
  };

  const handleAddAirportTerminal = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newAirportCode.trim() || !newAirportName.trim()) {
      showFeedback("Please provide both airport code and display name.", true);
      return;
    }
    const updated = [
      ...adminAirportTerminals,
      { code: newAirportCode.trim().toUpperCase(), name: newAirportName.trim() },
    ];
    setAdminAirportTerminals(updated);
    saveStoredAirportTerminals(updated);
    setNewAirportCode("");
    setNewAirportName("");
    showFeedback("Airport terminal option added successfully.");
  };

  const handleRemoveAirportTerminal = (code: string) => {
    if (adminAirportTerminals.length <= 1) {
      showFeedback("At least one airport terminal must remain available.", true);
      return;
    }
    const updated = adminAirportTerminals.filter((a) => a.code !== code);
    setAdminAirportTerminals(updated);
    saveStoredAirportTerminals(updated);
    showFeedback("Airport terminal removed.");
  };


  // Fleet Actions
  const handleCreateVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const featureList = vehForm.features.split(",").map((s) => s.trim()).filter(Boolean);
      await vehiclesApi.createVehicle({
        ...vehForm,
        category: vehForm.category as any,
        fuel_type: vehForm.fuel_type as any,
        transmission: vehForm.transmission as any,
        features: featureList,
        daily_rate: Number(vehForm.daily_rate),
        weekly_rate: Number(vehForm.weekly_rate),
        monthly_rate: Number(vehForm.monthly_rate),
        location_id: vehForm.location_id || locations[0]?.id,
        specs: {
          outstation_min_km: Number(vehForm.outstation_min_km) || 250,
        },
      });
      showFeedback("Vehicle added to catalog.");
      setShowAddVehicleModal(false);
      await loadFleetData();
    } catch (err: any) {
      showFeedback(err?.message || "Failed to add vehicle", true);
    }
  };

  const handleOpenEditVehicle = (veh: Vehicle) => {
    setShowEditVehicleModal(veh);
    setEditVehForm({
      make: veh.make,
      model: veh.model,
      year: veh.year,
      license_plate: veh.license_plate,
      category: veh.category,
      status: veh.status,
      fuel_type: veh.fuel_type,
      transmission: veh.transmission,
      seats: veh.seats || veh.seating_capacity || 5,
      daily_rate: Number(veh.daily_rate) || 3500,
      outstation_min_km: Number(veh.specs?.outstation_min_km) || 250,
      description: veh.description || "",
      features: (veh.features || []).join(", "),
    });
  };

  const handleUpdateVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showEditVehicleModal) return;
    try {
      const featureList = editVehForm.features ? editVehForm.features.split(",").map((s) => s.trim()).filter(Boolean) : [];
      const existingSpecs = showEditVehicleModal.specs || {};
      const updatedSpecs = {
        ...existingSpecs,
        outstation_min_km: Number(editVehForm.outstation_min_km) || 250,
      };

      await vehiclesApi.updateVehicle(showEditVehicleModal.id, {
        make: editVehForm.make,
        model: editVehForm.model,
        year: Number(editVehForm.year),
        license_plate: editVehForm.license_plate,
        category: editVehForm.category as any,
        status: editVehForm.status as any,
        fuel_type: editVehForm.fuel_type as any,
        transmission: editVehForm.transmission as any,
        seats: Number(editVehForm.seats),
        daily_rate: Number(editVehForm.daily_rate),
        description: editVehForm.description,
        features: featureList,
        specs: updatedSpecs,
      });

      showFeedback("Vehicle updated successfully.");
      setShowEditVehicleModal(null);
      await loadFleetData();
    } catch (err: any) {
      showFeedback(err?.message || "Failed to update vehicle", true);
    }
  };

  const handleArchiveVehicle = async (vehicleId: string) => {
    if (!confirm("Are you sure you want to remove / archive this vehicle from active bookings?")) return;
    try {
      await vehiclesApi.archiveVehicle(vehicleId);
      showFeedback("Vehicle archived / removed from active catalog.");
      await loadFleetData();
    } catch (err: any) {
      showFeedback(err?.message || "Failed to archive vehicle", true);
    }
  };

  const handleCreateLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await locationsApi.createLocation({
        ...locForm,
        is_active: true,
      });
      showFeedback("Pickup / Drop-off location created.");
      setShowAddLocationModal(false);
      await loadFleetData();
    } catch (err: any) {
      showFeedback(err?.message || "Failed to create location", true);
    }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await vehiclesApi.createCategory(catForm);
      showFeedback("Custom vehicle category created.");
      setShowAddCategoryModal(false);
      await loadFleetData();
    } catch (err: any) {
      showFeedback(err?.message || "Failed to create category", true);
    }
  };

  const handleScheduleMaintenance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showMaintenanceModal) return;
    try {
      await vehiclesApi.scheduleMaintenance(showMaintenanceModal.id, {
        service_type: maintForm.service_type,
        description: maintForm.description,
        cost: Number(maintForm.cost),
        performed_by: maintForm.performed_by,
        set_vehicle_in_maintenance: true,
      });
      showFeedback(`Maintenance scheduled for ${showMaintenanceModal.make} ${showMaintenanceModal.model}. Vehicle is now blocked from booking.`);
      setShowMaintenanceModal(null);
      await loadFleetData();
    } catch (err: any) {
      showFeedback(err?.message || "Failed to schedule maintenance", true);
    }
  };

  const handleUploadImage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showImageUploadModal || !selectedFile) return;
    try {
      await vehiclesApi.uploadImage(showImageUploadModal.id, selectedFile, isPrimaryImage, imageCaption);
      showFeedback("Image uploaded to MinIO storage successfully.");
      setShowImageUploadModal(null);
      setSelectedFile(null);
      setImageCaption("");
      await loadFleetData();
    } catch (err: any) {
      showFeedback(err?.message || "Failed to upload image", true);
    }
  };

  const handleOpenRentalHistory = async (veh: Vehicle) => {
    setShowRentalHistoryModal(veh);
    try {
      const history = await vehiclesApi.getRentalHistory(veh.id);
      setRentalHistory(history);
    } catch (err) {
      setRentalHistory([]);
    }
  };

  // Filtered Bookings
  const filteredBookings = adminBookings.filter((b) => {
    const matchStatus = bookingStatusFilter === "ALL" || b.status === bookingStatusFilter;
    const matchSearch =
      !bookingSearch.trim() ||
      b.booking_reference.toLowerCase().includes(bookingSearch.toLowerCase()) ||
      (b.customer_name && b.customer_name.toLowerCase().includes(bookingSearch.toLowerCase())) ||
      (b.customer_email && b.customer_email.toLowerCase().includes(bookingSearch.toLowerCase())) ||
      (b.vehicle && `${b.vehicle.brand} ${b.vehicle.model}`.toLowerCase().includes(bookingSearch.toLowerCase()));
    return matchStatus && matchSearch;
  });

  // Filtered Customers
  const filteredCustomers = customers.filter((c) => {
    const matchStatus =
      customerFilter === "ALL" ||
      (customerFilter === "VERIFIED" && c.is_identity_verified) ||
      (customerFilter === "UNVERIFIED" && !c.is_identity_verified);
    const matchSearch =
      !customerSearch.trim() ||
      c.driver_license_number.toLowerCase().includes(customerSearch.toLowerCase()) ||
      (c.user && c.user.full_name.toLowerCase().includes(customerSearch.toLowerCase())) ||
      (c.user && c.user.email.toLowerCase().includes(customerSearch.toLowerCase()));
    return matchStatus && matchSearch;
  });

  // Filtered Audit Logs
  const filteredAuditLogs = auditLogs.filter((l) => {
    if (auditFilterType === "ALL") return true;
    return l.target_type.toLowerCase() === auditFilterType.toLowerCase();
  });

  // Helper status color map
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "CONFIRMED":
        return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">Confirmed</Badge>;
      case "AWAITING_PAYMENT":
        return <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30">Awaiting Payment</Badge>;
      case "ACTIVE":
        return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">Active / On Road</Badge>;
      case "COMPLETED":
        return <Badge className="bg-slate-700 text-slate-300 border-slate-600">Completed</Badge>;
      case "CANCELLED":
        return <Badge className="bg-rose-500/20 text-rose-400 border-rose-500/30">Cancelled</Badge>;
      case "REJECTED":
        return <Badge className="bg-rose-900/40 text-rose-300 border-rose-800">Rejected</Badge>;
      case "REFUND_PENDING":
        return <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30">Refund Pending</Badge>;
      case "REFUNDED":
        return <Badge className="bg-slate-800 text-slate-400 border-slate-700">Refunded</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="h-screen overflow-hidden bg-slate-950 text-slate-100 flex flex-col md:flex-row font-sans">
      {/* SIDEBAR NAVIGATION */}
      <aside
        className={`${
          sidebarOpen ? "w-full md:w-64" : "hidden"
        } bg-slate-900/90 backdrop-blur border-r border-slate-800 shrink-0 p-4 flex flex-col justify-between overflow-y-auto`}
      >
        <div className="space-y-6">
          {/* Brand header */}
          <div className="flex items-center gap-2.5 px-2 py-1">
            <img
              src="/assets/brand/logo-circle.png"
              alt="Swaraj Tours & Travel"
              className="h-10 w-10 object-contain rounded-full ring-1 ring-amber-400/40 shadow-sm shrink-0"
            />
            <div className="min-w-0">
              <div className="font-extrabold text-xs tracking-tight text-white flex items-center gap-1.5 flex-wrap">
                <span><span className="text-amber-400">Swaraj</span> Tours & Travel</span>
                <Badge className="text-[9px] bg-amber-500/20 text-amber-400 border-amber-500/30 px-1 py-0">ADMIN</Badge>
              </div>
              <div className="text-[10px] text-slate-400 truncate">Tours & Fleet Operations</div>
            </div>
          </div>

          {/* Navigation Items */}
          <nav className="space-y-1">
            {NAV_ITEMS.map(({ id, label, Icon }) => {
              const active = activeTab === id;
              return (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    active
                      ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                  }`}
                >
                  <Icon className={`h-4 w-4 ${active ? "text-white" : "text-slate-400"}`} />
                  <span>{label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* User profile & backend enforcement badge */}
        <div className="pt-4 border-t border-slate-800 px-2 space-y-2">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-slate-400">User Role:</span>
            <span className="font-bold text-emerald-400 uppercase">
              {currentUser?.role || "ADMIN (Live)"}
            </span>
          </div>
          <div className="text-[10px] text-slate-500 flex items-center gap-1">
            <ShieldCheck className="h-3 w-3 text-emerald-400" />
            Backend RBAC Enforced
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 space-y-6 overflow-y-auto">
        {/* TOP STATUS BAR */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight capitalize">
              {NAV_ITEMS.find((n) => n.id === activeTab)?.label}
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Real-time platform operations, database-backed inventory, and transactional controls.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (activeTab === "overview") loadOverviewData();
                else if (activeTab === "fleet") loadFleetData();
                else if (activeTab === "bookings") loadBookingsData();
                else if (activeTab === "customers") loadCustomersData();
                else if (activeTab === "settings") loadSettingsData();
                else if (activeTab === "audit") loadAuditData();
                else if (activeTab === "tours") setTourPackages(getStoredTourPackages());
              }}
              className="bg-slate-900 border-slate-800 text-slate-300 hover:text-white text-xs gap-1.5 h-9"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${syncing ? "animate-spin text-blue-400" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* FEEDBACK BANNERS */}
        {actionMessage && (
          <div className="p-3 bg-emerald-950/60 border border-emerald-800/80 rounded-xl text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            <span>{actionMessage}</span>
          </div>
        )}
        {actionError && (
          <div className="p-3 bg-rose-950/60 border border-rose-800/80 rounded-xl text-rose-300 text-xs flex items-center gap-2 animate-in fade-in">
            <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />
            <span>{actionError}</span>
          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 1: EXECUTIVE OVERVIEW */}
        {/* =================================================================== */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* KPI STAT CARDS */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Total Vehicles */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Fleet Size</span>
                <div className="text-3xl font-black text-white mt-1">
                  {overview?.fleet.total_vehicles ?? vehicles.length}
                </div>
                <div className="text-xs text-slate-400 mt-1 flex items-center gap-2">
                  <span className="text-emerald-400 font-semibold">{overview?.fleet.available_vehicles ?? 0} available</span>
                  <span>•</span>
                  <span className="text-blue-400 font-semibold">{overview?.fleet.rented_vehicles ?? 0} on trip / dispatched</span>
                </div>
              </div>

              {/* Maintenance */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Maintenance Status</span>
                <div className="text-3xl font-black text-amber-400 mt-1">
                  {overview?.fleet.maintenance_vehicles ?? 0}
                </div>
                <div className="text-xs text-slate-400 mt-1">
                  Utilization: <span className="font-semibold text-white">{overview?.fleet.utilization_rate_percentage ?? 0}%</span>
                </div>
              </div>

              {/* Total Bookings */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Total Trip Bookings</span>
                <div className="text-3xl font-black text-blue-400 mt-1">
                  {overview?.bookings.total_bookings ?? adminBookings.length}
                </div>
                <div className="text-xs text-slate-400 mt-1 flex items-center gap-2">
                  <span className="text-emerald-400">{overview?.bookings.confirmed_bookings ?? 0} confirmed</span>
                  <span>•</span>
                  <span className="text-amber-400">{overview?.bookings.awaiting_payment_bookings ?? 0} pending</span>
                </div>
              </div>

              {/* Total Revenue */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Trip Revenue (Gross)</span>
                <div className="text-3xl font-black text-emerald-400 mt-1">
                  ₹{Number(overview?.revenue.total_revenue ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </div>
                <div className="text-xs text-slate-400 mt-1">
                  Monthly: <span className="font-semibold text-emerald-300">₹{Number(overview?.revenue.monthly_revenue ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>

            {/* SECONDARY STAT ROW: DETAILED STATUS COUNTS & CUSTOMERS */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
              <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl">
                <span className="text-[10px] text-slate-400 uppercase font-bold">Total Customers</span>
                <p className="text-xl font-black text-white mt-0.5">{overview?.total_customers ?? customers.length}</p>
              </div>
              <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl">
                <span className="text-[10px] text-emerald-400 uppercase font-bold">Confirmed</span>
                <p className="text-xl font-black text-emerald-400 mt-0.5">{overview?.bookings.confirmed_bookings ?? 0}</p>
              </div>
              <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl">
                <span className="text-[10px] text-blue-400 uppercase font-bold">Active / On Road</span>
                <p className="text-xl font-black text-blue-400 mt-0.5">{overview?.bookings.active_bookings ?? 0}</p>
              </div>
              <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl">
                <span className="text-[10px] text-slate-400 uppercase font-bold">Completed</span>
                <p className="text-xl font-black text-white mt-0.5">{overview?.bookings.completed_bookings ?? 0}</p>
              </div>
              <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl">
                <span className="text-[10px] text-rose-400 uppercase font-bold">Cancelled</span>
                <p className="text-xl font-black text-rose-400 mt-0.5">{overview?.bookings.cancelled_bookings ?? 0}</p>
              </div>
              <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl">
                <span className="text-[10px] text-purple-400 uppercase font-bold">Operating Hubs</span>
                <p className="text-xl font-black text-purple-400 mt-0.5">{overview?.total_locations ?? locations.length}</p>
              </div>
            </div>

            {/* POPULAR VEHICLES LEADERBOARD */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-emerald-400" />
                    Top Performing Fleet Vehicles
                  </h3>
                  <p className="text-xs text-slate-400">Ranked by actual booking reservations and revenue generation.</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => setActiveTab("fleet")} className="text-xs border-slate-700 bg-slate-800 text-slate-300">
                  Manage Fleet
                </Button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="p-3">Rank</th>
                      <th className="p-3">Vehicle</th>
                      <th className="p-3">Category</th>
                      <th className="p-3">Daily Rate</th>
                      <th className="p-3">Bookings</th>
                      <th className="p-3">Gross Generated</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {overview?.popular_vehicles && overview.popular_vehicles.length > 0 ? (
                      overview.popular_vehicles.map((pv, idx) => (
                        <tr key={pv.vehicle_id} className="hover:bg-slate-800/40">
                          <td className="p-3 font-bold text-slate-400">#{idx + 1}</td>
                          <td className="p-3 font-bold text-white">{pv.make} {pv.model}</td>
                          <td className="p-3"><Badge variant="outline">{pv.category}</Badge></td>
                          <td className="p-3 text-slate-300">₹{pv.daily_rate}</td>
                          <td className="p-3 font-bold text-blue-400">{pv.booking_count} trips</td>
                          <td className="p-3 font-bold text-emerald-400">₹{Number(pv.total_revenue).toFixed(2)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="p-6 text-center text-slate-500">
                          No fleet booking history recorded yet. Bookings will automatically generate leaderboard metrics.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 2: FLEET MANAGEMENT */}
        {/* =================================================================== */}
        {activeTab === "fleet" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="relative flex-1 max-w-md w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <Input
                  placeholder="Search by make, model, VIN or plate…"
                  value={fleetSearch}
                  onChange={(e) => setFleetSearch(e.target.value)}
                  className="pl-9 bg-slate-900 border-slate-800 text-white text-xs"
                />
              </div>
              <div className="flex gap-2 w-full sm:w-auto">
                <Button onClick={() => setShowAddCategoryModal(true)} variant="outline" className="bg-slate-900 border-slate-800 text-xs gap-1.5 text-slate-200">
                  <Plus className="h-3.5 w-3.5" /> New Category
                </Button>
                <Button onClick={() => setShowAddVehicleModal(true)} className="bg-blue-600 hover:bg-blue-700 text-white text-xs gap-1.5">
                  <Plus className="h-3.5 w-3.5" /> Add Vehicle
                </Button>
              </div>
            </div>

            {/* Categories Bar */}
            {categories.length > 0 && (
              <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
                <span className="text-slate-500 font-semibold shrink-0">Categories:</span>
                {categories.map((c) => (
                  <span key={c.id} className="bg-slate-900 border border-slate-800 text-slate-300 px-3 py-1 rounded-lg shrink-0">
                    {c.name}
                  </span>
                ))}
              </div>
            )}

            {/* Vehicles Table */}
            <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="p-4">Vehicle</th>
                      <th className="p-4">Category</th>
                      <th className="p-4">VIN / Plate</th>
                      <th className="p-4">Daily Rate</th>
                      <th className="p-4">Status</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-slate-300">
                    {vehicles
                      .filter((v) =>
                        !fleetSearch.trim() ||
                        v.make.toLowerCase().includes(fleetSearch.toLowerCase()) ||
                        v.model.toLowerCase().includes(fleetSearch.toLowerCase()) ||
                        v.vin.toLowerCase().includes(fleetSearch.toLowerCase()) ||
                        v.license_plate.toLowerCase().includes(fleetSearch.toLowerCase())
                      )
                      .map((veh) => (
                        <tr key={veh.id} className="hover:bg-slate-800/40">
                          <td className="p-4 font-bold text-white">
                            <div className="flex items-center gap-3">
                              <img
                                src={veh.primary_image_url || veh.image_url || "/assets/vehicles/mahindra-thar/mahindra-thar-4x4.png"}
                                alt={veh.model}
                                className="w-12 h-8 object-contain rounded bg-slate-900 border border-slate-700 p-0.5 shrink-0"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = "/assets/vehicles/mahindra-thar/mahindra-thar-4x4.png";
                                }}
                              />
                              <div>
                                <div>{veh.make} {veh.model}</div>
                                <div className="text-[10px] text-slate-400 font-medium">{getVehicleSeatingLabel(veh)} • {veh.year} • {veh.transmission}</div>
                              </div>
                            </div>
                          </td>
                          <td className="p-4"><Badge variant="outline">{veh.category}</Badge></td>
                          <td className="p-4 font-mono text-[11px] text-slate-400">
                            <div>{veh.license_plate}</div>
                            <div className="text-[10px] text-slate-600">{veh.vin}</div>
                          </td>
                          <td className="p-4">
                            <div className="font-bold text-emerald-400">₹{veh.daily_rate}/day</div>
                            <div className="text-[10px] text-slate-400">Min: {veh.specs?.outstation_min_km || 250} km/day</div>
                          </td>
                          <td className="p-4">
                            <select
                              value={veh.status}
                              onChange={async (e) => {
                                const newStatus = e.target.value;
                                try {
                                  await vehiclesApi.updateVehicleAvailability(veh.id, newStatus);
                                  setVehicles((prev) =>
                                    prev.map((v) => (v.id === veh.id ? { ...v, status: newStatus as any, is_bookable: newStatus === "AVAILABLE" } : v))
                                  );
                                  showFeedback(`Vehicle availability set to ${newStatus}`);
                                } catch (err: any) {
                                  showFeedback(err?.message || "Failed to update availability", true);
                                }
                              }}
                              className={`text-xs font-semibold px-2.5 py-1 rounded-full border cursor-pointer outline-none transition-colors ${
                                veh.status === "AVAILABLE"
                                  ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                                  : veh.status === "UNAVAILABLE"
                                  ? "bg-rose-500/20 text-rose-400 border-rose-500/30"
                                  : veh.status === "MAINTENANCE"
                                  ? "bg-amber-500/20 text-amber-300 border-amber-500/30"
                                  : "bg-slate-700/50 text-slate-300 border-slate-600"
                              }`}
                            >
                              <option value="AVAILABLE" className="bg-slate-900 text-emerald-400">Available</option>
                              <option value="UNAVAILABLE" className="bg-slate-900 text-rose-400">Unavailable</option>
                              <option value="MAINTENANCE" className="bg-slate-900 text-amber-300">Maintenance</option>
                              <option value="RENTED" className="bg-slate-900 text-blue-400">Rented</option>
                              <option value="OUT_OF_SERVICE" className="bg-slate-900 text-rose-400">Out of Service</option>
                            </select>
                          </td>
                          <td className="p-4 text-right">
                            <div className="flex justify-end gap-1.5">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleOpenEditVehicle(veh)}
                                title="Edit Vehicle & Rates"
                                className="h-7 px-2 text-[11px] border-slate-700 bg-slate-800 text-blue-400 hover:text-white"
                              >
                                <Edit3 className="h-3 w-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setShowImageUploadModal(veh)}
                                title="Upload Photo"
                                className="h-7 px-2 text-[11px] border-slate-700 bg-slate-800 text-slate-300"
                              >
                                <Upload className="h-3 w-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setShowMaintenanceModal(veh)}
                                title="Schedule Maintenance"
                                className="h-7 px-2 text-[11px] border-slate-700 bg-slate-800 text-amber-400"
                              >
                                <Wrench className="h-3 w-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleOpenRentalHistory(veh)}
                                title="Trip History"
                                className="h-7 px-2 text-[11px] border-slate-700 bg-slate-800 text-blue-400"
                              >
                                <Clock className="h-3 w-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleArchiveVehicle(veh.id)}
                                title="Archive Vehicle"
                                className="h-7 px-2 text-[11px] border-slate-700 bg-slate-800 text-rose-400"
                              >
                                <Archive className="h-3 w-3" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 3: BOOKINGS MANAGEMENT */}
        {/* =================================================================== */}
        {activeTab === "bookings" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="relative flex-1 max-w-md w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <Input
                  placeholder="Search reference, vehicle, customer..."
                  value={bookingSearch}
                  onChange={(e) => setBookingSearch(e.target.value)}
                  className="pl-9 bg-slate-900 border-slate-800 text-white text-xs"
                />
              </div>

              {/* Status Filter Tabs */}
              <div className="flex items-center gap-1 overflow-x-auto pb-1 text-xs w-full sm:w-auto">
                {["ALL", "AWAITING_PAYMENT", "CONFIRMED", "ACTIVE", "COMPLETED", "CANCELLED", "REFUND_PENDING", "REFUNDED"].map((st) => (
                  <button
                    key={st}
                    onClick={() => setBookingStatusFilter(st)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                      bookingStatusFilter === st
                        ? "bg-blue-600 text-white"
                        : "bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
                    }`}
                  >
                    {st.replace("_", " ")}
                  </button>
                ))}
              </div>
            </div>

            {/* Bookings Table */}
            <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="p-4">Reference</th>
                      <th className="p-4">Customer</th>
                      <th className="p-4">Vehicle</th>
                      <th className="p-4">Trip Window</th>
                      <th className="p-4">Fare Amount</th>
                      <th className="p-4">Status</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-slate-300">
                    {filteredBookings.length > 0 ? (
                      filteredBookings.map((b) => (
                        <tr key={b.id} className="hover:bg-slate-800/40">
                          <td className="p-4 font-mono font-bold text-blue-400">
                            {b.booking_reference}
                          </td>
                          <td className="p-4">
                            <div className="font-bold text-white">{b.customer_name || "Guest Customer"}</div>
                            <div className="text-[11px] text-slate-500">{b.customer_email || "No email"}</div>
                          </td>
                          <td className="p-4">
                            {b.vehicle ? (
                              <div>
                                <span className="font-bold text-white">{b.vehicle.brand} {b.vehicle.model}</span>
                                <div className="text-[10px] text-slate-500">{b.vehicle.category} • {b.vehicle.license_plate}</div>
                              </div>
                            ) : (
                              <span className="text-slate-500">Vehicle ID: {b.vehicle_id.slice(0, 8)}...</span>
                            )}
                          </td>
                          <td className="p-4 text-[11px]">
                            <div>From: {new Date(b.start_datetime).toLocaleDateString()}</div>
                            <div className="text-slate-500">To: {new Date(b.end_datetime).toLocaleDateString()}</div>
                          </td>
                          <td className="p-4">
                            <p className="font-bold text-emerald-400 text-sm">₹{b.total_amount}</p>
                            <p className="text-[10px] text-slate-500">Dep: ₹{b.deposit_amount}</p>
                          </td>
                          <td className="p-4">
                            {getStatusBadge(b.status)}
                          </td>
                          <td className="p-4 text-right">
                            <div className="flex justify-end gap-1.5">
                              {/* Detail Modal View */}
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setSelectedBookingForModal(b)}
                                title="View Details"
                                className="h-7 px-2 border-slate-700 bg-slate-800 text-slate-300"
                              >
                                <Eye className="h-3 w-3" />
                              </Button>

                              {/* State Machine Transition Actions */}
                              {b.status === "AWAITING_PAYMENT" && (
                                <Button
                                  size="sm"
                                  onClick={() => handleTransitionBooking(b.id, "CONFIRMED")}
                                  className="h-7 px-2 text-[11px] bg-emerald-600 hover:bg-emerald-700 text-white"
                                  title="Approve / Confirm Reservation"
                                >
                                  <Check className="h-3 w-3 mr-1" /> Approve
                                </Button>
                              )}

                              {b.status === "CONFIRMED" && (
                                <Button
                                  size="sm"
                                  onClick={() => handleTransitionBooking(b.id, "ACTIVE")}
                                  className="h-7 px-2 text-[11px] bg-blue-600 hover:bg-blue-700 text-white"
                                  title="Handover Vehicle (Mark Active)"
                                >
                                  Handover
                                </Button>
                              )}

                              {b.status === "ACTIVE" && (
                                <Button
                                  size="sm"
                                  onClick={() => handleTransitionBooking(b.id, "COMPLETED")}
                                  className="h-7 px-2 text-[11px] bg-indigo-600 hover:bg-indigo-700 text-white"
                                  title="Receive Vehicle (Complete Return)"
                                >
                                  Return
                                </Button>
                              )}

                              {b.status === "REFUND_PENDING" && (
                                <Button
                                  size="sm"
                                  onClick={() => handleTransitionBooking(b.id, "REFUNDED")}
                                  className="h-7 px-2 text-[11px] bg-purple-600 hover:bg-purple-700 text-white"
                                  title="Process Final Refund"
                                >
                                  <RotateCcw className="h-3 w-3 mr-1" /> Refund
                                </Button>
                              )}

                              {["PENDING", "AWAITING_PAYMENT", "CONFIRMED"].includes(b.status) && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setCancelModalBooking(b)}
                                  className="h-7 px-2 text-[11px] border-slate-700 bg-slate-800 text-rose-400"
                                  title="Cancel Reservation"
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-slate-500">
                          {loadingBookings ? "Loading bookings..." : "No matching bookings found."}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* TAB: TOURS & TRAVEL PACKAGES MANAGEMENT */}
        {/* =================================================================== */}
        {activeTab === "tours" && (
          <div className="space-y-6 animate-in fade-in">
            {/* Top Header Card */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-6 bg-slate-900 border border-slate-800 rounded-3xl shadow-xl">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="h-7 w-7 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
                    <Compass className="h-4 w-4" />
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                    Tours & Travel Packages Management
                  </h2>
                </div>
                <p className="text-xs sm:text-sm text-slate-400">
                  Add, customize, and manage Pilgrimage, Weekend, Sightseeing, and Outstation packages published live to customers.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleResetAllTours}
                  className="bg-slate-800/80 border-slate-700 text-slate-300 hover:text-white text-xs gap-1.5 h-10"
                >
                  <RotateCcw className="h-3.5 w-3.5 text-slate-400" />
                  Reset Defaults
                </Button>
                <Button
                  size="sm"
                  onClick={handleOpenAddTour}
                  className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs gap-2 h-10 px-4 shadow-lg shadow-amber-500/20"
                >
                  <Plus className="h-4 w-4" />
                  + Add New Tour Package
                </Button>
              </div>
            </div>

            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-2xl">
                <div className="text-xs text-slate-400 font-semibold mb-1">Total Packages</div>
                <div className="text-2xl font-black text-white">{tourPackages.length}</div>
              </div>
              <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-2xl">
                <div className="text-xs text-amber-400 font-semibold mb-1">Pilgrimage Circuits</div>
                <div className="text-2xl font-black text-amber-300">
                  {tourPackages.filter((p) => p.category === "Pilgrimage Trips").length}
                </div>
              </div>
              <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-2xl">
                <div className="text-xs text-emerald-400 font-semibold mb-1">Weekend Getaways</div>
                <div className="text-2xl font-black text-emerald-300">
                  {tourPackages.filter((p) => p.category === "Weekend Getaways").length}
                </div>
              </div>
              <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-2xl">
                <div className="text-xs text-blue-400 font-semibold mb-1">Sightseeing & Outstation</div>
                <div className="text-2xl font-black text-blue-300">
                  {tourPackages.filter((p) => p.category === "Sightseeing Tours" || p.category === "Outstation Travel").length}
                </div>
              </div>
            </div>

            {/* Controls Bar: Search & Category Filter Pills */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
              <div className="relative flex-1 max-w-md w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <Input
                  placeholder="Search package title, destination, or highlights..."
                  value={tourSearch}
                  onChange={(e) => setTourSearch(e.target.value)}
                  className="pl-9 bg-slate-900 border-slate-800 text-white text-xs h-10"
                />
                {tourSearch && (
                  <button
                    onClick={() => setTourSearch("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              {/* Category Filter Pills */}
              <div className="flex flex-wrap gap-1.5">
                {[
                  { id: "ALL", label: "All Packages" },
                  { id: "Pilgrimage Trips", label: "Pilgrimage Trips" },
                  { id: "Weekend Getaways", label: "Weekend Getaways" },
                  { id: "Sightseeing Tours", label: "Sightseeing Tours" },
                  { id: "Outstation Travel", label: "Outstation Travel" },
                  { id: "Family Tours", label: "Family Tours" },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setTourCategoryFilter(item.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                      tourCategoryFilter === item.id
                        ? "bg-amber-400 text-slate-950 font-bold shadow-md"
                        : "bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Packages Grid */}
            {tourPackages
              .filter((pkg) => {
                const matchesCat =
                  tourCategoryFilter === "ALL" ||
                  pkg.category.toLowerCase().includes(tourCategoryFilter.toLowerCase());
                const query = tourSearch.toLowerCase().trim();
                const matchesSearch =
                  !query ||
                  pkg.title.toLowerCase().includes(query) ||
                  pkg.destination.toLowerCase().includes(query) ||
                  pkg.description.toLowerCase().includes(query) ||
                  pkg.tag.toLowerCase().includes(query) ||
                  pkg.highlights.some((h) => h.toLowerCase().includes(query));
                return matchesCat && matchesSearch;
              })
              .length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {tourPackages
                  .filter((pkg) => {
                    const matchesCat =
                      tourCategoryFilter === "ALL" ||
                      pkg.category.toLowerCase().includes(tourCategoryFilter.toLowerCase());
                    const query = tourSearch.toLowerCase().trim();
                    const matchesSearch =
                      !query ||
                      pkg.title.toLowerCase().includes(query) ||
                      pkg.destination.toLowerCase().includes(query) ||
                      pkg.description.toLowerCase().includes(query) ||
                      pkg.tag.toLowerCase().includes(query) ||
                      pkg.highlights.some((h) => h.toLowerCase().includes(query));
                    return matchesCat && matchesSearch;
                  })
                  .map((pkg) => (
                    <div
                      key={pkg.id}
                      className="bg-slate-900 border border-slate-800 hover:border-amber-400/50 rounded-3xl overflow-hidden shadow-lg transition-all duration-300 flex flex-col justify-between group"
                    >
                      {/* Image Preview Container */}
                      <div className="relative w-full h-48 bg-slate-950 overflow-hidden">
                        <img
                          src={pkg.image}
                          alt={pkg.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).src =
                              "/assets/services/tours-travels/pilgrimage/ashtavinayak-darshan.png";
                          }}
                        />
                        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wide backdrop-blur-md shadow-md ${
                              pkg.category === "Pilgrimage Trips"
                                ? "bg-amber-500/90 text-slate-950"
                                : pkg.category === "Weekend Getaways"
                                ? "bg-emerald-500/90 text-slate-950"
                                : pkg.category === "Sightseeing Tours"
                                ? "bg-sky-500/90 text-slate-950"
                                : "bg-purple-500/90 text-slate-950"
                            }`}
                          >
                            {pkg.category}
                          </span>
                        </div>
                        <div className="absolute top-3 right-3 bg-slate-950/80 backdrop-blur-md px-2.5 py-1 rounded-full text-[10px] font-semibold text-slate-200 border border-white/10 flex items-center gap-1">
                          <Clock className="h-3 w-3 text-amber-400" />
                          {pkg.duration}
                        </div>
                      </div>

                      {/* Content Body */}
                      <div className="p-5 flex-1 flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between gap-2 mb-1.5">
                            <span className="text-[11px] font-semibold text-amber-300 flex items-center gap-1">
                              <Sparkles className="h-3 w-3 text-amber-400" />
                              {pkg.tag}
                            </span>
                            {pkg.price && (
                              <span className="text-xs font-black text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-md border border-amber-400/20">
                                {pkg.price}
                              </span>
                            )}
                          </div>

                          <h3 className="text-lg font-bold text-white group-hover:text-amber-300 transition-colors mb-1 line-clamp-1">
                            {pkg.title}
                          </h3>

                          <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-3">
                            <MapPin className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                            <span className="truncate">{pkg.destination}</span>
                          </div>

                          <p className="text-xs text-slate-300 line-clamp-3 leading-relaxed mb-4">
                            {pkg.description}
                          </p>

                          {/* Highlights Preview */}
                          <div className="space-y-1 pt-3 border-t border-slate-800/80 mb-4">
                            {pkg.highlights.slice(0, 3).map((h, i) => (
                              <div key={i} className="flex items-center gap-1.5 text-[11px] text-slate-400">
                                <span className="h-1.5 w-1.5 rounded-full bg-amber-400 shrink-0" />
                                <span className="truncate">{h}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-2 pt-3 border-t border-slate-800">
                          <Button
                            size="sm"
                            onClick={() => handleOpenEditTour(pkg)}
                            className="flex-1 bg-slate-800 hover:bg-slate-700 text-white text-xs gap-1.5 h-9"
                          >
                            <Edit3 className="h-3.5 w-3.5 text-amber-400" />
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDeleteTour(pkg.id, pkg.title)}
                            className="bg-red-950/40 hover:bg-red-900/60 text-red-300 border-red-800/60 text-xs px-3 h-9"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                          <a
                            href="/services#tours-travels"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors border border-slate-700/60"
                            title="View on Customer Website"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="p-12 text-center bg-slate-900 border border-slate-800 rounded-3xl">
                <Compass className="h-10 w-10 text-slate-600 mx-auto mb-3" />
                <h3 className="text-base font-bold text-white mb-1">No Tour Packages Found</h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto mb-4">
                  No packages matched your search or category filter. Try clearing the filter or add a new package.
                </p>
                <Button
                  size="sm"
                  onClick={handleOpenAddTour}
                  className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs gap-1.5"
                >
                  <Plus className="h-4 w-4" /> Add New Tour Package
                </Button>
              </div>
            )}
          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 4: CUSTOMER MANAGEMENT */}
        {/* =================================================================== */}
        {activeTab === "customers" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="relative flex-1 max-w-md w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <Input
                  placeholder="Search customer name, email, license number..."
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  className="pl-9 bg-slate-900 border-slate-800 text-white text-xs"
                />
              </div>

              <div className="flex items-center gap-1.5 text-xs">
                {(["ALL", "VERIFIED", "UNVERIFIED"] as const).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setCustomerFilter(filter)}
                    className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                      customerFilter === filter
                        ? "bg-blue-600 text-white"
                        : "bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
                    }`}
                  >
                    {filter}
                  </button>
                ))}
              </div>
            </div>

            {/* Customers Table */}
            <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="p-4">Customer Name</th>
                      <th className="p-4">Contact</th>
                      <th className="p-4">Driver License</th>
                      <th className="p-4">Identity Status</th>
                      <th className="p-4">Account Access</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-slate-300">
                    {filteredCustomers.length > 0 ? (
                      filteredCustomers.map((c) => (
                        <tr key={c.id} className="hover:bg-slate-800/40">
                          <td className="p-4 font-bold text-white">
                            <div>{c.user?.full_name || "Registered Customer"}</div>
                            <div className="text-[10px] text-slate-500">ID: {c.id.slice(0, 8)}...</div>
                          </td>
                          <td className="p-4">
                            <div>{c.user?.email || "No email"}</div>
                            <div className="text-[10px] text-slate-500">{c.user?.phone_number || "No phone"}</div>
                          </td>
                          <td className="p-4 font-mono">
                            <div className="font-bold text-slate-300">{c.driver_license_number}</div>
                            <div className="text-[10px] text-slate-500">Country: {c.driver_license_country} • Exp: {c.driver_license_expiry}</div>
                          </td>
                          <td className="p-4">
                            {c.is_identity_verified ? (
                              <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 gap-1">
                                <CheckCircle2 className="h-3 w-3" /> Verified
                              </Badge>
                            ) : (
                              <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 gap-1">
                                <XCircle className="h-3 w-3" /> Unverified
                              </Badge>
                            )}
                          </td>
                          <td className="p-4">
                            {c.user ? (
                              c.user.is_active ? (
                                <span className="text-emerald-400 font-semibold">Active</span>
                              ) : (
                                <span className="text-rose-400 font-semibold">Suspended</span>
                              )
                            ) : (
                              <span className="text-slate-500">N/A</span>
                            )}
                          </td>
                          <td className="p-4 text-right">
                            <div className="flex justify-end gap-1.5">
                              {/* Open Profile Modal */}
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setSelectedCustomerModal(c)}
                                title="View Customer Profile & Documents"
                                className="h-7 px-2 border-slate-700 bg-slate-800 text-slate-300 text-[11px]"
                              >
                                <Eye className="h-3 w-3 mr-1" /> Profile
                              </Button>

                              {/* Toggle Verification */}
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleToggleCustomerVerification(c, !c.is_identity_verified)}
                                className={`h-7 px-2 text-[11px] border-slate-700 bg-slate-800 ${
                                  c.is_identity_verified ? "text-amber-400" : "text-emerald-400"
                                }`}
                                title={c.is_identity_verified ? "Revoke Verification" : "Approve Verification"}
                              >
                                {c.is_identity_verified ? "Revoke" : "Verify"}
                              </Button>

                              {/* Account Access Toggle */}
                              {c.user && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleToggleUserAccountStatus(c.user!.id, !c.user!.is_active)}
                                  className={`h-7 px-2 text-[11px] border-slate-700 bg-slate-800 ${
                                    c.user.is_active ? "text-rose-400" : "text-emerald-400"
                                  }`}
                                  title={c.user.is_active ? "Suspend Account" : "Activate Account"}
                                >
                                  {c.user.is_active ? "Suspend" : "Activate"}
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-slate-500">
                          {loadingCustomers ? "Loading customer profiles..." : "No customer records found."}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 5: PICKUP / DROP-OFF HUBS */}
        {/* =================================================================== */}
        {activeTab === "locations" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white">Fleet Operating Locations</h3>
                <p className="text-xs text-slate-400">Configure pickup and drop-off hubs, addresses, and contacts.</p>
              </div>
              <Button onClick={() => setShowAddLocationModal(true)} className="bg-blue-600 hover:bg-blue-700 text-white text-xs gap-1.5">
                <Plus className="h-3.5 w-3.5" /> Add Location
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {locations.map((loc) => (
                <div key={loc.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-bold text-white text-sm">{loc.name}</h4>
                      <Badge variant="outline" className="text-[10px] mt-1">{loc.code}</Badge>
                    </div>
                    <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">Active Hub</Badge>
                  </div>
                  <div className="text-xs text-slate-400 space-y-1">
                    <p>{loc.address}</p>
                    <p>{loc.city}, {loc.state} {loc.postal_code}, {loc.country}</p>
                    <p className="text-blue-400 font-mono">{loc.phone || "No phone"} • {loc.email || "No email"}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 6: BUSINESS SETTINGS */}
        {/* =================================================================== */}
        {activeTab === "settings" && (
          <div className="space-y-6 max-w-4xl">
            {loadingSettings || !settingsData ? (
              <div className="p-8 text-center text-slate-500">Loading business configuration...</div>
            ) : (
              <form onSubmit={handleSaveSettings} className="space-y-6">
                {/* 1. PRICING & DEPOSITS */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <IndianRupee className="h-4 w-4 text-emerald-400" />
                    Trip Fare Multipliers & Booking Deposits
                  </h3>
                  <p className="text-xs text-slate-400">
                    Control global rate multipliers and refundable security deposit holds per vehicle category.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                    <div>
                      <label className="text-xs text-slate-300 block mb-1">Global Rate Multiplier (Seasonal / Surge)</label>
                      <Input
                        type="number"
                        step="0.05"
                        min="0.5"
                        max="3.0"
                        value={settingsData.pricing.rate_multiplier}
                        onChange={(e) =>
                          setSettingsData({
                            ...settingsData,
                            pricing: { ...settingsData.pricing, rate_multiplier: parseFloat(e.target.value) || 1.0 },
                          })
                        }
                        className="bg-slate-800 border-slate-700 text-white text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-300 block mb-1">Turnaround Buffer Time (Minutes)</label>
                      <Input
                        type="number"
                        min="0"
                        max="720"
                        value={settingsData.turnaround_buffer_minutes}
                        onChange={(e) =>
                          setSettingsData({
                            ...settingsData,
                            turnaround_buffer_minutes: parseInt(e.target.value) || 60,
                          })
                        }
                        className="bg-slate-800 border-slate-700 text-white text-xs"
                      />
                    </div>
                  </div>

                  {/* Deposits By Category */}
                  <div className="pt-3 border-t border-slate-800">
                    <label className="text-xs text-slate-300 font-semibold block mb-2">Refundable Category Deposits (₹)</label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {Object.entries(settingsData.pricing.category_deposits).map(([cat, amount]) => (
                        <div key={cat}>
                          <span className="text-[10px] text-slate-400 uppercase font-bold">{cat}</span>
                          <Input
                            type="number"
                            value={amount}
                            onChange={(e) => {
                              const val = parseInt(e.target.value) || 0;
                              setSettingsData({
                                ...settingsData,
                                pricing: {
                                  ...settingsData.pricing,
                                  category_deposits: {
                                    ...settingsData.pricing.category_deposits,
                                    [cat]: val,
                                  },
                                },
                              });
                            }}
                            className="bg-slate-800 border-slate-700 text-white text-xs mt-1"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* 2. CANCELLATION POLICIES */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Clock className="h-4 w-4 text-blue-400" />
                    Cancellation Policies & Penalties
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-slate-300 block mb-1">Free Cancellation Window (Hours Prior)</label>
                      <Input
                        type="number"
                        value={settingsData.cancellation_policy.free_cancellation_hours}
                        onChange={(e) =>
                          setSettingsData({
                            ...settingsData,
                            cancellation_policy: {
                              ...settingsData.cancellation_policy,
                              free_cancellation_hours: parseInt(e.target.value) || 24,
                            },
                          })
                        }
                        className="bg-slate-800 border-slate-700 text-white text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-300 block mb-1">Late Cancellation Penalty (%)</label>
                      <Input
                        type="number"
                        value={settingsData.cancellation_policy.fee_percentage_after_deadline}
                        onChange={(e) =>
                          setSettingsData({
                            ...settingsData,
                            cancellation_policy: {
                              ...settingsData.cancellation_policy,
                              fee_percentage_after_deadline: parseFloat(e.target.value) || 20.0,
                            },
                          })
                        }
                        className="bg-slate-800 border-slate-700 text-white text-xs"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-slate-300 block mb-1">Policy Description Displayed to Customers</label>
                    <textarea
                      rows={2}
                      value={settingsData.cancellation_policy.policy_text}
                      onChange={(e) =>
                        setSettingsData({
                          ...settingsData,
                          cancellation_policy: {
                            ...settingsData.cancellation_policy,
                            policy_text: e.target.value,
                          },
                        })
                      }
                      className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs"
                    />
                  </div>
                </div>

                {/* 3. TAXES & PROMO DISCOUNTS */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <FileText className="h-4 w-4 text-purple-400" />
                    Taxes & Active Promo Discounts
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-slate-300 block mb-1">Standard Sales & Tourism Tax Rate (%)</label>
                      <Input
                        type="number"
                        step="0.1"
                        value={settingsData.tax_and_discounts.tax_rate_percent}
                        onChange={(e) =>
                          setSettingsData({
                            ...settingsData,
                            tax_and_discounts: {
                              ...settingsData.tax_and_discounts,
                              tax_rate_percent: parseFloat(e.target.value) || 10.0,
                            },
                          })
                        }
                        className="bg-slate-800 border-slate-700 text-white text-xs"
                      />
                    </div>
                  </div>

                  {/* Active promo codes list */}
                  <div className="pt-2">
                    <label className="text-xs text-slate-300 font-semibold block mb-2">Active Promo Codes</label>
                    <div className="space-y-2">
                      {settingsData.tax_and_discounts.active_promo_codes.map((promo, idx) => (
                        <div key={idx} className="flex items-center gap-3 p-3 bg-slate-800/60 rounded-xl border border-slate-700 text-xs">
                          <span className="font-mono font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded">
                            {promo.code}
                          </span>
                          <span className="font-bold text-white">{promo.discount_percent}% Off</span>
                          <span className="text-slate-400 flex-1">{promo.description}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* 4. BUSINESS CONTACT INFORMATION */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-indigo-400" />
                    Business Contact Information
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-slate-300 block mb-1">Company Name</label>
                      <Input
                        value={settingsData.contact_info.company_name}
                        onChange={(e) =>
                          setSettingsData({
                            ...settingsData,
                            contact_info: { ...settingsData.contact_info, company_name: e.target.value },
                          })
                        }
                        className="bg-slate-800 border-slate-700 text-white text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-300 block mb-1">Concierge Email</label>
                      <Input
                        value={settingsData.contact_info.support_email}
                        onChange={(e) =>
                          setSettingsData({
                            ...settingsData,
                            contact_info: { ...settingsData.contact_info, support_email: e.target.value },
                          })
                        }
                        className="bg-slate-800 border-slate-700 text-white text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-300 block mb-1">Phone Number</label>
                      <Input
                        value={settingsData.contact_info.phone}
                        onChange={(e) =>
                          setSettingsData({
                            ...settingsData,
                            contact_info: { ...settingsData.contact_info, phone: e.target.value },
                          })
                        }
                        className="bg-slate-800 border-slate-700 text-white text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-300 block mb-1">Headquarters Address</label>
                      <Input
                        value={settingsData.contact_info.address}
                        onChange={(e) =>
                          setSettingsData({
                            ...settingsData,
                            contact_info: { ...settingsData.contact_info, address: e.target.value },
                          })
                        }
                        className="bg-slate-800 border-slate-700 text-white text-xs"
                      />
                    </div>
                  </div>
                </div>

                {/* 5. HOMEPAGE SEARCH WIDGET POPULAR DESTINATIONS & AIRPORT OPTIONS */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h3 className="text-base font-bold text-white flex items-center gap-2">
                        <Compass className="h-4 w-4 text-amber-400" />
                        Homepage Search Widget Popular Destinations & Airport Terminals
                      </h3>
                      <p className="text-xs text-slate-400 mt-1">
                        Control the quick-select route pills (Popular: Pune Mumbai Mahabaleshwar...) and airport dropdown options.
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleResetSearchWidgetDefaults}
                      className="border-slate-700 text-slate-300 hover:text-white text-xs h-8 self-start sm:self-auto"
                    >
                      <RotateCcw className="h-3.5 w-3.5 mr-1" />
                      Restore Defaults
                    </Button>
                  </div>

                  {/* Popular Destinations Editor */}
                  <div className="space-y-3 pt-2 border-t border-slate-800">
                    <label className="text-xs font-semibold text-slate-200 block">
                      Active Popular Destinations (Shown on Homepage booking widget)
                    </label>
                    <div className="flex flex-wrap gap-2 min-h-[42px] p-3 bg-slate-800/80 rounded-xl border border-slate-700">
                      {adminPopularDestinations.map((dest) => (
                        <span
                          key={dest}
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-blue-950 text-blue-300 border border-blue-700/60"
                        >
                          {dest}
                          <button
                            type="button"
                            onClick={() => handleRemovePopularDestination(dest)}
                            className="hover:text-red-400 ml-0.5"
                            title={`Remove ${dest}`}
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                    </div>

                    <div className="flex gap-2">
                      <Input
                        value={newPopularInput}
                        onChange={(e) => setNewPopularInput(e.target.value)}
                        placeholder="Add destination (e.g. Alibaug, Lavasa or comma-separated)"
                        className="bg-slate-800 border-slate-700 text-white text-xs flex-1"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleAddPopularDestination();
                          }
                        }}
                      />
                      <Button
                        type="button"
                        onClick={() => handleAddPopularDestination()}
                        className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-9 px-4 rounded-xl font-semibold"
                      >
                        <Plus className="h-3.5 w-3.5 mr-1" />
                        Add
                      </Button>
                    </div>
                  </div>

                  {/* Airport Terminals Editor */}
                  <div className="space-y-3 pt-4 border-t border-slate-800">
                    <label className="text-xs font-semibold text-slate-200 block">
                      Allowed Airport Terminals (Airport Transfer Tab)
                    </label>
                    <div className="space-y-2">
                      {adminAirportTerminals.map((airport) => (
                        <div
                          key={airport.code}
                          className="flex items-center justify-between p-2.5 bg-slate-800/60 rounded-xl border border-slate-700 text-xs text-white"
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold bg-slate-900 px-2 py-0.5 rounded text-blue-400">
                              {airport.code}
                            </span>
                            <span>{airport.name}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveAirportTerminal(airport.code)}
                            className="text-slate-400 hover:text-red-400 px-2 py-1"
                            title={`Remove ${airport.name}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <Input
                        value={newAirportCode}
                        onChange={(e) => setNewAirportCode(e.target.value)}
                        placeholder="Code (e.g. IXC)"
                        className="bg-slate-800 border-slate-700 text-white text-xs"
                      />
                      <Input
                        value={newAirportName}
                        onChange={(e) => setNewAirportName(e.target.value)}
                        placeholder="Display Name (e.g. Chandigarh International Airport)"
                        className="bg-slate-800 border-slate-700 text-white text-xs sm:col-span-2"
                      />
                    </div>
                    <div className="flex justify-end">
                      <Button
                        type="button"
                        onClick={() => handleAddAirportTerminal()}
                        className="bg-slate-800 hover:bg-slate-700 text-white text-xs h-8 px-3 rounded-lg"
                      >
                        <Plus className="h-3.5 w-3.5 mr-1" />
                        Add Airport Terminal
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Save Button */}
                <div className="flex justify-end pt-2">

                  <Button
                    type="submit"
                    disabled={savingSettings}
                    className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-6 py-2 h-10 rounded-xl shadow-lg shadow-blue-600/30 font-bold"
                  >
                    {savingSettings ? "Saving Settings..." : "Save Business Settings & Policies"}
                  </Button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 7: REPORTS & EXPORTS */}
        {/* =================================================================== */}
        {activeTab === "reports" && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <FileSpreadsheet className="h-5 w-5 text-emerald-400" />
                    Operational & Financial Reports
                  </h3>
                  <p className="text-xs text-slate-400">Download formatted CSV exports for auditing, accounting, and tax compliance.</p>
                </div>

                <div className="flex gap-2">
                  <a
                    href={reportsApi.getExportBookingsUrl()}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-600/20 transition-all"
                  >
                    <Download className="h-4 w-4" /> Export Bookings CSV
                  </a>
                </div>
              </div>

              {/* Status Distribution Visual Chart */}
              {analytics && (
                <div className="pt-4 border-t border-slate-800 space-y-3">
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Booking Status Distribution</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {Object.entries(analytics.status_distribution).map(([st, cnt]) => (
                      <div key={st} className="p-3 bg-slate-800/80 rounded-xl border border-slate-700">
                        <span className="text-[10px] text-slate-400 uppercase font-bold block">{st.replace("_", " ")}</span>
                        <p className="text-lg font-black text-white mt-0.5">{cnt} trips</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Revenue Timeline */}
              {analytics && analytics.revenue_chart.length > 0 && (
                <div className="pt-4 border-t border-slate-800 space-y-3">
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Historical Monthly Revenue</h4>
                  <div className="space-y-2">
                    {analytics.revenue_chart.map((point) => (
                      <div key={point.period} className="flex items-center gap-4 text-xs">
                        <span className="font-mono text-slate-400 w-20">{point.period}</span>
                        <div className="flex-1 bg-slate-800 rounded-full h-3 overflow-hidden">
                          <div
                            className="bg-blue-600 h-full rounded-full"
                            style={{
                              width: `${Math.min(100, (Number(point.revenue) / (overview?.revenue.total_revenue || 1)) * 100)}%`,
                            }}
                          />
                        </div>
                        <span className="font-bold text-emerald-400 w-24 text-right">₹{point.revenue}</span>
                        <span className="text-slate-500 w-16 text-right">{point.bookings_count} bks</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 8: AUDIT TRAIL */}
        {/* =================================================================== */}
        {activeTab === "audit" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <ShieldAlert className="h-5 w-5 text-amber-400" />
                  Security & Administrative Audit Logs
                </h3>
                <p className="text-xs text-slate-400">Chronological trail of sensitive operations, status updates, cancellations, and settings mutations.</p>
              </div>

              {/* Filter by target type */}
              <div className="flex gap-1 text-xs">
                {["ALL", "BOOKING", "VEHICLE", "USER", "CUSTOMER", "BUSINESS_SETTINGS"].map((tp) => (
                  <button
                    key={tp}
                    onClick={() => setAuditFilterType(tp)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                      auditFilterType === tp
                        ? "bg-blue-600 text-white"
                        : "bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
                    }`}
                  >
                    {tp.replace("_", " ")}
                  </button>
                ))}
              </div>
            </div>

            {/* Audit Logs Table */}
            <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="p-4">Timestamp</th>
                      <th className="p-4">Action</th>
                      <th className="p-4">Target Type</th>
                      <th className="p-4">Target ID</th>
                      <th className="p-4">IP Address</th>
                      <th className="p-4">Audit Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-slate-300">
                    {filteredAuditLogs.length > 0 ? (
                      filteredAuditLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-slate-800/40 font-mono text-[11px]">
                          <td className="p-4 text-slate-400">{new Date(log.created_at).toLocaleString()}</td>
                          <td className="p-4">
                            <span className="font-bold text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded">
                              {log.action}
                            </span>
                          </td>
                          <td className="p-4 text-slate-300 font-sans">{log.target_type}</td>
                          <td className="p-4 text-blue-400">{log.target_id || "N/A"}</td>
                          <td className="p-4 text-slate-400">{log.ip_address || "127.0.0.1"}</td>
                          <td className="p-4 text-slate-300 max-w-xs truncate font-sans text-[11px]">
                            {log.details ? JSON.stringify(log.details) : "—"}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-slate-500">
                          {loadingAudit ? "Loading audit trail..." : "No audit events logged for this filter."}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* 9. WHATSAPP BUSINESS INTEGRATION TAB */}
        {activeTab === "whatsapp" && (
          <AdminWhatsAppSection />
        )}

        {/* 10. MANAGE TESTIMONIALS TAB */}
        {activeTab === "testimonials" && (
          <AdminTestimonialsSection />
        )}

      </main>

      {/* =================================================================== */}
      {/* GLOBAL MODALS */}
      {/* =================================================================== */}

      {/* MODAL: BOOKING DETAIL VIEW */}
      {selectedBookingForModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  Booking Details
                  <span className="font-mono text-sm text-blue-400">({selectedBookingForModal.booking_reference})</span>
                </h3>
                <p className="text-xs text-slate-400">Placed on {new Date(selectedBookingForModal.created_at).toLocaleString()}</p>
              </div>
              <button onClick={() => setSelectedBookingForModal(null)} className="text-slate-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between items-center p-3 bg-slate-800/80 rounded-xl">
                <span className="text-slate-400">Current Status:</span>
                <div>{getStatusBadge(selectedBookingForModal.status)}</div>
              </div>

              {/* Customer Info */}
              <div className="p-3 bg-slate-800/50 rounded-xl space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Customer Information</span>
                <p className="font-bold text-white text-sm">{selectedBookingForModal.customer_name || "Guest Customer"}</p>
                <p className="text-slate-300">{selectedBookingForModal.customer_email || "No email"} • {selectedBookingForModal.customer_phone || "No phone"}</p>
                <p className="text-slate-400 font-mono">Driver License: {selectedBookingForModal.driver_license_number || "Not provided"}</p>
              </div>

              {/* Vehicle & Trip Info */}
              <div className="p-3 bg-slate-800/50 rounded-xl space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Vehicle & Trip Window</span>
                <p className="font-bold text-white">
                  {selectedBookingForModal.vehicle ? `${selectedBookingForModal.vehicle.brand} ${selectedBookingForModal.vehicle.model}` : "Reserved Vehicle"}
                </p>
                <div className="grid grid-cols-2 gap-2 text-slate-300 pt-1">
                  <div>
                    <span className="text-slate-500 block">Pickup:</span>
                    <span>{new Date(selectedBookingForModal.start_datetime).toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Return:</span>
                    <span>{new Date(selectedBookingForModal.end_datetime).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Authoritative Financial Breakdown */}
              <div className="p-3 bg-slate-800/50 rounded-xl space-y-1.5">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Authoritative Minor-Unit Pricing</span>
                <div className="flex justify-between">
                  <span className="text-slate-400">Daily Rate (₹{selectedBookingForModal.daily_rate} × {selectedBookingForModal.total_days}d):</span>
                  <span className="font-semibold text-white">₹{selectedBookingForModal.base_amount}</span>
                </div>
                {Number(selectedBookingForModal.location_fee) > 0 && (
                  <div className="flex justify-between text-amber-300">
                    <span>One-Way Surcharge:</span>
                    <span className="font-semibold">+₹{selectedBookingForModal.location_fee}</span>
                  </div>
                )}
                {Number(selectedBookingForModal.discount_amount) > 0 && (
                  <div className="flex justify-between text-emerald-400">
                    <span>Promo Discount:</span>
                    <span className="font-semibold">-₹{selectedBookingForModal.discount_amount}</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-400">
                  <span>Taxes (10%):</span>
                  <span className="font-semibold text-white">₹{selectedBookingForModal.tax_amount}</span>
                </div>
                <div className="flex justify-between text-slate-400 border-t border-slate-700 pt-1">
                  <span>Security Deposit (Refundable Hold):</span>
                  <span className="font-semibold text-slate-300">₹{selectedBookingForModal.deposit_amount}</span>
                </div>
                <div className="flex justify-between items-baseline pt-2 border-t border-slate-700 text-sm font-bold text-white">
                  <span>Total Calculated Amount:</span>
                  <span className="text-lg font-black text-emerald-400">₹{selectedBookingForModal.total_amount}</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-800">
              <Button onClick={() => setSelectedBookingForModal(null)} className="bg-slate-800 hover:bg-slate-700 text-white">
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CUSTOMER PROFILE & VERIFICATION */}
      {selectedCustomerModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-lg font-bold text-white">{selectedCustomerModal.user?.full_name || "Customer Profile"}</h3>
                <p className="text-xs text-slate-400">{selectedCustomerModal.user?.email || "Registered customer profile"}</p>
              </div>
              <button onClick={() => setSelectedCustomerModal(null)} className="text-slate-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              {/* Identity & Status */}
              <div className="p-3 bg-slate-800/80 rounded-xl flex items-center justify-between">
                <span className="text-slate-400">Identity Verification Status:</span>
                {selectedCustomerModal.is_identity_verified ? (
                  <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">Verified</Badge>
                ) : (
                  <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30">Unverified</Badge>
                )}
              </div>

              {/* Driver License Document Card */}
              <div className="p-3 bg-slate-800/50 rounded-xl space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Submitted Driver's License</span>
                <p className="font-mono text-base font-bold text-white mt-1">{selectedCustomerModal.driver_license_number}</p>
                <div className="grid grid-cols-2 gap-2 text-slate-300 pt-1">
                  <div>
                    <span className="text-slate-500 block">Country:</span>
                    <span>{selectedCustomerModal.driver_license_country}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Expiration Date:</span>
                    <span>{selectedCustomerModal.driver_license_expiry}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Date of Birth:</span>
                    <span>{selectedCustomerModal.date_of_birth}</span>
                  </div>
                </div>
              </div>

              {/* Notes input */}
              <div>
                <label className="text-slate-400 block mb-1">Administrative Review Notes</label>
                <textarea
                  rows={2}
                  placeholder="Notes on document review..."
                  value={verificationNotes}
                  onChange={(e) => setVerificationNotes(e.target.value)}
                  className="w-full p-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2 border-t border-slate-800">
                <Button
                  onClick={() => handleToggleCustomerVerification(selectedCustomerModal, !selectedCustomerModal.is_identity_verified)}
                  className={`flex-1 text-xs ${
                    selectedCustomerModal.is_identity_verified
                      ? "bg-amber-600 hover:bg-amber-700 text-white"
                      : "bg-emerald-600 hover:bg-emerald-700 text-white"
                  }`}
                >
                  {selectedCustomerModal.is_identity_verified ? "Revoke Identity Verification" : "Approve & Mark Verified"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CANCEL BOOKING DIALOG */}
      {cancelModalBooking && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-white">Cancel Reservation</h3>
            <p className="text-xs text-slate-400">
              Are you sure you want to cancel booking <strong className="text-white">{cancelModalBooking.booking_reference}</strong>?
              This will release the reserved vehicle interval immediately.
            </p>

            <form onSubmit={handleCancelBookingSubmit} className="space-y-3">
              <div>
                <label className="text-xs text-slate-300 block mb-1">Cancellation Reason (Audited)</label>
                <Input
                  required
                  placeholder="e.g. Customer requested cancellation due to travel delay"
                  value={cancellationReason}
                  onChange={(e) => setCancellationReason(e.target.value)}
                  className="bg-slate-800 border-slate-700 text-white text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <Button type="button" variant="outline" onClick={() => setCancelModalBooking(null)} className="bg-slate-800 text-white border-slate-700">
                  Keep Booking
                </Button>
                <Button type="submit" className="bg-rose-600 hover:bg-rose-700 text-white font-bold">
                  Confirm Cancellation
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD VEHICLE */}
      {showAddVehicleModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-lg font-bold text-white">Add Vehicle to Fleet</h3>
              <button onClick={() => setShowAddVehicleModal(false)} className="text-slate-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateVehicle} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Make / Brand</label>
                  <Input required value={vehForm.make} onChange={(e) => setVehForm({ ...vehForm, make: e.target.value })} placeholder="e.g. Maruti Suzuki" className="bg-slate-800 border-slate-700 text-white" />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Model</label>
                  <Input required value={vehForm.model} onChange={(e) => setVehForm({ ...vehForm, model: e.target.value })} placeholder="e.g. Dzire VXi" className="bg-slate-800 border-slate-700 text-white" />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Year</label>
                  <Input type="number" required value={vehForm.year} onChange={(e) => setVehForm({ ...vehForm, year: parseInt(e.target.value) || 2024 })} className="bg-slate-800 border-slate-700 text-white" />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">License Plate</label>
                  <Input required value={vehForm.license_plate} onChange={(e) => setVehForm({ ...vehForm, license_plate: e.target.value.toUpperCase() })} placeholder="e.g. MH-12-AB-1234" className="bg-slate-800 border-slate-700 text-white font-mono" />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">VIN Number</label>
                  <Input required value={vehForm.vin} onChange={(e) => setVehForm({ ...vehForm, vin: e.target.value.toUpperCase() })} placeholder="17-character VIN" className="bg-slate-800 border-slate-700 text-white font-mono" />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Category</label>
                  <select value={vehForm.category} onChange={(e) => setVehForm({ ...vehForm, category: e.target.value })} className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white">
                    <option value="SEDAN">SEDAN</option>
                    <option value="SUV">SUV</option>
                    <option value="VAN">VAN / MUV / COACH</option>
                    <option value="LUXURY">LUXURY</option>
                  </select>
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Seating Capacity</label>
                  <Input type="number" required min="1" max="60" value={vehForm.seats} onChange={(e) => setVehForm({ ...vehForm, seats: parseInt(e.target.value) || 5 })} className="bg-slate-800 border-slate-700 text-white" />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Trip Base Rate / Daily Rate (₹)</label>
                  <Input type="number" step="1" required value={vehForm.daily_rate} onChange={(e) => setVehForm({ ...vehForm, daily_rate: parseFloat(e.target.value) || 3500 })} className="bg-slate-800 border-slate-700 text-white" />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Outstation Standard Min (KM)</label>
                  <Input type="number" step="10" required value={vehForm.outstation_min_km} onChange={(e) => setVehForm({ ...vehForm, outstation_min_km: parseInt(e.target.value) || 250 })} className="bg-slate-800 border-slate-700 text-white" />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Assigned Hub</label>
                  <select value={vehForm.location_id} onChange={(e) => setVehForm({ ...vehForm, location_id: e.target.value })} className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white">
                    {locations.map((loc) => (
                      <option key={loc.id} value={loc.id}>{loc.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Overview / Description (Simple English)</label>
                <Input value={vehForm.description} onChange={(e) => setVehForm({ ...vehForm, description: e.target.value })} placeholder="e.g. Comfortable 5-seater sedan with good AC, perfect for city and outstation trips." className="bg-slate-800 border-slate-700 text-white" />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Features (comma separated)</label>
                <Input value={vehForm.features} onChange={(e) => setVehForm({ ...vehForm, features: e.target.value })} className="bg-slate-800 border-slate-700 text-white" />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <Button type="button" variant="outline" onClick={() => setShowAddVehicleModal(false)} className="bg-slate-800 text-white border-slate-700">Cancel</Button>
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white">Save Vehicle</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDIT VEHICLE */}
      {showEditVehicleModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-lg font-bold text-white">Edit Fleet Vehicle</h3>
                <p className="text-xs text-slate-400">{showEditVehicleModal.make} {showEditVehicleModal.model} ({showEditVehicleModal.license_plate})</p>
              </div>
              <button onClick={() => setShowEditVehicleModal(null)} className="text-slate-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateVehicle} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Make / Brand</label>
                  <Input required value={editVehForm.make} onChange={(e) => setEditVehForm({ ...editVehForm, make: e.target.value })} className="bg-slate-800 border-slate-700 text-white" />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Model</label>
                  <Input required value={editVehForm.model} onChange={(e) => setEditVehForm({ ...editVehForm, model: e.target.value })} className="bg-slate-800 border-slate-700 text-white" />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Year</label>
                  <Input type="number" required value={editVehForm.year} onChange={(e) => setEditVehForm({ ...editVehForm, year: parseInt(e.target.value) || 2024 })} className="bg-slate-800 border-slate-700 text-white" />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">License Plate</label>
                  <Input required value={editVehForm.license_plate} onChange={(e) => setEditVehForm({ ...editVehForm, license_plate: e.target.value.toUpperCase() })} className="bg-slate-800 border-slate-700 text-white font-mono" />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Category</label>
                  <select value={editVehForm.category} onChange={(e) => setEditVehForm({ ...editVehForm, category: e.target.value })} className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white">
                    <option value="SEDAN">SEDAN</option>
                    <option value="SUV">SUV</option>
                    <option value="VAN">VAN / MUV / COACH</option>
                    <option value="LUXURY">LUXURY</option>
                  </select>
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Status</label>
                  <select value={editVehForm.status} onChange={(e) => setEditVehForm({ ...editVehForm, status: e.target.value })} className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white">
                    <option value="AVAILABLE">Available</option>
                    <option value="UNAVAILABLE">Unavailable</option>
                    <option value="MAINTENANCE">Maintenance</option>
                    <option value="RENTED">Rented / On Trip</option>
                    <option value="OUT_OF_SERVICE">Out of Service</option>
                    <option value="ARCHIVED">Archived</option>
                  </select>
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Seating Capacity</label>
                  <Input type="number" required min="1" max="60" value={editVehForm.seats} onChange={(e) => setEditVehForm({ ...editVehForm, seats: parseInt(e.target.value) || 5 })} className="bg-slate-800 border-slate-700 text-white" />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Trip Base Rate / Daily Rate (₹)</label>
                  <Input type="number" step="1" required value={editVehForm.daily_rate} onChange={(e) => setEditVehForm({ ...editVehForm, daily_rate: parseFloat(e.target.value) || 3500 })} className="bg-slate-800 border-slate-700 text-white" />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Outstation Standard Min (KM)</label>
                  <Input type="number" step="10" required value={editVehForm.outstation_min_km} onChange={(e) => setEditVehForm({ ...editVehForm, outstation_min_km: parseInt(e.target.value) || 250 })} className="bg-slate-800 border-slate-700 text-white" />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Fuel Type</label>
                  <select value={editVehForm.fuel_type} onChange={(e) => setEditVehForm({ ...editVehForm, fuel_type: e.target.value })} className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white">
                    <option value="DIESEL">Diesel</option>
                    <option value="GASOLINE">Gasoline / Petrol</option>
                    <option value="HYBRID">Hybrid</option>
                    <option value="ELECTRIC">Electric</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Overview / Description (Simple English)</label>
                <Input value={editVehForm.description} onChange={(e) => setEditVehForm({ ...editVehForm, description: e.target.value })} placeholder="e.g. Clean and comfortable sedan for outstation trips" className="bg-slate-800 border-slate-700 text-white" />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Features (comma separated)</label>
                <Input value={editVehForm.features} onChange={(e) => setEditVehForm({ ...editVehForm, features: e.target.value })} className="bg-slate-800 border-slate-700 text-white" />
              </div>

              <div className="flex justify-between items-center pt-3 border-t border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    handleArchiveVehicle(showEditVehicleModal.id);
                    setShowEditVehicleModal(null);
                  }}
                  className="bg-rose-950/40 text-rose-400 border-rose-800/60 hover:bg-rose-900/60"
                >
                  <Archive className="h-3.5 w-3.5 mr-1" /> Remove / Archive
                </Button>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={() => setShowEditVehicleModal(null)} className="bg-slate-800 text-white border-slate-700">Cancel</Button>
                  <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-bold">Save Changes</Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD LOCATION */}
      {showAddLocationModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-white">Add Operating Location</h3>
            <form onSubmit={handleCreateLocation} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Location Name</label>
                <Input required value={locForm.name} onChange={(e) => setLocForm({ ...locForm, name: e.target.value })} placeholder="e.g. JFK Airport Terminal Hub" className="bg-slate-800 border-slate-700 text-white" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-400 block mb-1">Code</label>
                  <Input required value={locForm.code} onChange={(e) => setLocForm({ ...locForm, code: e.target.value.toUpperCase() })} placeholder="e.g. JFK-HUB" className="bg-slate-800 border-slate-700 text-white font-mono" />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">City</label>
                  <Input required value={locForm.city} onChange={(e) => setLocForm({ ...locForm, city: e.target.value })} placeholder="e.g. New York" className="bg-slate-800 border-slate-700 text-white" />
                </div>
              </div>
              <div>
                <label className="text-slate-400 block mb-1">Address</label>
                <Input required value={locForm.address} onChange={(e) => setLocForm({ ...locForm, address: e.target.value })} placeholder="Street Address" className="bg-slate-800 border-slate-700 text-white" />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <Button type="button" variant="outline" onClick={() => setShowAddLocationModal(false)} className="bg-slate-800 text-white border-slate-700">Cancel</Button>
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white">Create Location</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD CATEGORY */}
      {showAddCategoryModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-white">Create Custom Category</h3>
            <form onSubmit={handleCreateCategory} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Category Name</label>
                <Input required value={catForm.name} onChange={(e) => setCatForm({ ...catForm, name: e.target.value })} placeholder="e.g. Electric Hypercars" className="bg-slate-800 border-slate-700 text-white" />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">Category Code</label>
                <Input value={catForm.code} onChange={(e) => setCatForm({ ...catForm, code: e.target.value.toLowerCase() })} placeholder="e.g. electric-hypercars" className="bg-slate-800 border-slate-700 text-white font-mono" />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <Button type="button" variant="outline" onClick={() => setShowAddCategoryModal(false)} className="bg-slate-800 text-white border-slate-700">Cancel</Button>
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white">Create Category</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: SCHEDULE MAINTENANCE */}
      {showMaintenanceModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-white">Schedule Maintenance</h3>
            <p className="text-xs text-amber-400 font-semibold">{showMaintenanceModal.make} {showMaintenanceModal.model} ({showMaintenanceModal.license_plate})</p>
            <form onSubmit={handleScheduleMaintenance} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Service Type</label>
                <select value={maintForm.service_type} onChange={(e) => setMaintForm({ ...maintForm, service_type: e.target.value })} className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white">
                  <option value="ROUTINE_OIL_CHANGE">Routine Oil & Filter Change</option>
                  <option value="BRAKE_SERVICE">Brake Pads & Rotor Inspection</option>
                  <option value="TIRE_ROTATION">Tire Rotation & Wheel Alignment</option>
                  <option value="DETAIL_CLEANING">Deep Concierge Detailing</option>
                  <option value="SAFETY_RECALL">Manufacturer Safety Recall</option>
                </select>
              </div>
              <div>
                <label className="text-slate-400 block mb-1">Description & Notes</label>
                <Input value={maintForm.description} onChange={(e) => setMaintForm({ ...maintForm, description: e.target.value })} placeholder="Scheduled inspection notes..." className="bg-slate-800 border-slate-700 text-white" />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <Button type="button" variant="outline" onClick={() => setShowMaintenanceModal(null)} className="bg-slate-800 text-white border-slate-700">Cancel</Button>
                <Button type="submit" className="bg-amber-600 hover:bg-amber-700 text-white">Schedule & Block Availability</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: IMAGE UPLOAD */}
      {showImageUploadModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-white">Upload Vehicle Image</h3>
            <p className="text-xs text-blue-400">{showImageUploadModal.make} {showImageUploadModal.model}</p>
            <form onSubmit={handleUploadImage} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Select File</label>
                <input type="file" accept="image/*" required onChange={(e) => setSelectedFile(e.target.files?.[0] || null)} className="w-full p-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-300" />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">Caption</label>
                <Input value={imageCaption} onChange={(e) => setImageCaption(e.target.value)} placeholder="e.g. Front 3/4 Exterior Angle" className="bg-slate-800 border-slate-700 text-white" />
              </div>
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="primary-image-check"
                  checked={isPrimaryImage}
                  onChange={(e) => setIsPrimaryImage(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-800 text-blue-600"
                />
                <label htmlFor="primary-image-check" className="text-slate-300 cursor-pointer">
                  Set as primary catalog cover image
                </label>
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <Button type="button" variant="outline" onClick={() => setShowImageUploadModal(null)} className="bg-slate-800 text-white border-slate-700">Cancel</Button>
                <Button type="submit" disabled={!selectedFile} className="bg-blue-600 hover:bg-blue-700 text-white">Upload to MinIO</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: RENTAL HISTORY */}
      {showRentalHistoryModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-xl w-full p-6 space-y-4 max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-lg font-bold text-white">Vehicle Trip History</h3>
              <button onClick={() => setShowRentalHistoryModal(null)} className="text-slate-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto space-y-2 text-xs">
              {rentalHistory.length > 0 ? (
                rentalHistory.map((item, idx) => (
                  <div key={idx} className="p-3 bg-slate-800 rounded-xl border border-slate-700 flex justify-between items-center">
                    <div>
                      <div className="font-bold text-white">{item.booking_reference || `Booking #${idx + 1}`}</div>
                      <div className="text-slate-400">{item.start_datetime} to {item.end_datetime}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-emerald-400">₹{item.total_amount}</div>
                      <Badge variant="outline">{item.status}</Badge>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-slate-500">No historical reservations for this vehicle yet.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ADD / EDIT TOUR & TRAVEL PACKAGE */}
      {showTourModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full p-6 space-y-5 max-h-[90vh] overflow-y-auto shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                  <Compass className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white">
                    {editingTourId ? "Edit Tour & Travel Package" : "Add New Tour & Travel Package"}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Publish or update package category, cover image, route details, and highlights.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowTourModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveTourPackage} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Title */}
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">
                    Package Title <span className="text-red-400">*</span>
                  </label>
                  <Input
                    required
                    value={tourForm.title}
                    onChange={(e) => setTourForm({ ...tourForm, title: e.target.value })}
                    placeholder="e.g. Ashtavinayak Darshan or Shirdi Tour"
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                </div>

                {/* Category Dropdown (Pilgrimage, Weekend, Sightseeing, Outstation) */}
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">
                    Package Category <span className="text-red-400">*</span>
                  </label>
                  <select
                    value={tourForm.category}
                    onChange={(e) =>
                      setTourForm({
                        ...tourForm,
                        category: e.target.value as any,
                      })
                    }
                    className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white font-medium focus:outline-none focus:border-amber-400"
                  >
                    <option value="Pilgrimage Trips">Pilgrimage Trips (Temples & Shrines)</option>
                    <option value="Weekend Getaways">Weekend Getaways (Hills & Escapes)</option>
                    <option value="Sightseeing Tours">Sightseeing Tours (City & Landmarks)</option>
                    <option value="Outstation Travel">Outstation Travel (Intercity Tours)</option>
                    <option value="Family Tours">Family Tours (Custom Group Packages)</option>
                  </select>
                </div>

                {/* Destination / Circuit */}
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">
                    Destination / Circuit Route <span className="text-red-400">*</span>
                  </label>
                  <Input
                    required
                    value={tourForm.destination}
                    onChange={(e) => setTourForm({ ...tourForm, destination: e.target.value })}
                    placeholder="e.g. 8 Sacred Ganesha Temples or Sahyadri Hills"
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                </div>

                {/* Duration */}
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">
                    Duration / Timeline
                  </label>
                  <Input
                    value={tourForm.duration}
                    onChange={(e) => setTourForm({ ...tourForm, duration: e.target.value })}
                    placeholder="e.g. 2–3 Days Circuit or 1–2 Days Trip"
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                </div>

                {/* Tag / Badge */}
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">
                    Tag / Badge Text
                  </label>
                  <Input
                    value={tourForm.tag}
                    onChange={(e) => setTourForm({ ...tourForm, tag: e.target.value })}
                    placeholder="e.g. Sacred Pilgrimage or Refreshing Escape"
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                </div>

                {/* Package Price */}
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">
                    Starting Package Fare / Price (Optional)
                  </label>
                  <Input
                    value={tourForm.price}
                    onChange={(e) => setTourForm({ ...tourForm, price: e.target.value })}
                    placeholder="e.g. ₹8,499 or ₹14/km"
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                </div>
              </div>

              {/* Package Image Controls */}
              <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-slate-200 font-bold block">
                    Package Cover Image <span className="text-red-400">*</span>
                  </label>
                  <span className="text-[11px] text-slate-400">
                    URL, preset gallery, or upload from device
                  </span>
                </div>

                {/* Custom URL Input */}
                <Input
                  required
                  value={tourForm.image}
                  onChange={(e) => setTourForm({ ...tourForm, image: e.target.value })}
                  placeholder="Enter image URL (https://... or /assets/services/...)"
                  className="bg-slate-800 border-slate-700 text-white"
                />

                {/* Quick Presets Picker */}
                <div>
                  <span className="text-[11px] font-semibold text-slate-400 block mb-1.5">
                    Quick Preset Images:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {TOUR_IMAGE_PRESETS.map((preset) => (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() =>
                          setTourForm((prev) => ({
                            ...prev,
                            image: preset.url,
                            category: preset.category,
                          }))
                        }
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-medium transition-all ${
                          tourForm.image === preset.url
                            ? "bg-amber-400 text-slate-950 font-bold"
                            : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* File Upload Option */}
                <div className="flex items-center gap-3 pt-1">
                  <label className="cursor-pointer px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 flex items-center gap-1.5 transition-colors">
                    <Upload className="h-3.5 w-3.5 text-amber-400" />
                    Upload from Computer
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleTourImageFileUpload}
                      className="hidden"
                    />
                  </label>
                  <span className="text-[11px] text-slate-400">
                    Supports JPG, PNG, WEBP
                  </span>
                </div>

                {/* Live Image Preview */}
                {tourForm.image && (
                  <div className="mt-2 pt-2 border-t border-slate-800">
                    <span className="text-[11px] text-slate-400 block mb-1 font-semibold">
                      Live Image Preview:
                    </span>
                    <div className="w-full h-36 rounded-xl overflow-hidden bg-slate-900 border border-slate-700">
                      <img
                        src={tourForm.image}
                        alt="Preview"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src =
                            "/assets/services/tours-travels/pilgrimage/ashtavinayak-darshan.png";
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Description */}
              <div>
                <label className="text-slate-300 font-semibold block mb-1">
                  Package Description <span className="text-red-400">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={tourForm.description}
                  onChange={(e) => setTourForm({ ...tourForm, description: e.target.value })}
                  placeholder="Describe the holiday itinerary, spiritual significance, scenic route, and passenger comfort..."
                  className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white font-medium focus:outline-none focus:border-amber-400 text-xs"
                />
              </div>

              {/* Highlights */}
              <div>
                <label className="text-slate-300 font-semibold block mb-1">
                  Key Highlights (Enter one bullet point per line)
                </label>
                <textarea
                  rows={3}
                  value={tourForm.highlights}
                  onChange={(e) => setTourForm({ ...tourForm, highlights: e.target.value })}
                  placeholder="Complete Holy Circuit&#10;Elderly-Friendly Pacing & Rest Breaks&#10;Clean AC Fleet with Driver&#10;Doorstep Pickup & Safe Return"
                  className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white font-medium focus:outline-none focus:border-amber-400 text-xs"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowTourModal(false)}
                  className="bg-slate-800 text-slate-300 hover:text-white border-slate-700 text-xs h-10 px-4"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs h-10 px-5 gap-1.5 shadow-lg shadow-amber-500/20"
                >
                  <Compass className="h-4 w-4" />
                  {editingTourId ? "Save Changes" : "Publish Tour Package"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
