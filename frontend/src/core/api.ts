export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: "ADMIN" | "MANAGER" | "STAFF" | "CUSTOMER" | "admin" | "manager" | "staff" | "customer";
  is_active: boolean;
  is_verified: boolean;
  phone_number?: string | null;
  documents?: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface AuthTokenResponse {
  access_token: string;
  token_type: string;
  expires_in_minutes: number;
  refresh_token?: string;
  user: User;
}

export interface SessionInfo {
  id: string;
  ip_address?: string | null;
  user_agent?: string | null;
  is_revoked: boolean;
  created_at: string;
  expires_at: string;
}

export interface AuditLog {
  id: string;
  actor_id?: string | null;
  action: string;
  target_type: string;
  target_id?: string | null;
  details?: Record<string, unknown> | null;
  ip_address?: string | null;
  created_at: string;
}

const TOKEN_KEY = "carrental_access_token";

export function getStoredAccessToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredAccessToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearStoredAccessToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

/**
 * Base fetch wrapper with automatic bearer token attachment and JSON parsing.
 */
export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const headers = new Headers(options.headers || {});
  if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const token = getStoredAccessToken();
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const res = await fetch(endpoint, {
    ...options,
    headers,
    credentials: "include", // Send HttpOnly refresh cookies
  });

  const json: ApiResponse<T> = await res.json().catch(() => ({
    success: false,
    data: null as unknown as T,
    error: { code: "INVALID_JSON", message: "Server returned non-JSON response" },
  }));

  if (!res.ok || json.success === false) {
    const errorMsg = json.error?.message || `Request failed with status ${res.status}`;
    const err = new Error(errorMsg);
    (err as unknown as { code: string }).code = json.error?.code || "REQUEST_FAILED";
    (err as unknown as { status: number }).status = res.status;
    throw err;
  }

  return json.data;
}

export const authApi = {
  async register(data: {
    email: string;
    password: string;
    full_name: string;
    phone_number?: string;
  }): Promise<AuthTokenResponse> {
    const res = await apiRequest<AuthTokenResponse>("/api/v1/auth/register", {
      method: "POST",
      body: JSON.stringify(data),
    });
    setStoredAccessToken(res.access_token);
    return res;
  },

  async login(data: { email: string; password: string }): Promise<AuthTokenResponse> {
    const res = await apiRequest<AuthTokenResponse>("/api/v1/auth/login", {
      method: "POST",
      body: JSON.stringify(data),
    });
    setStoredAccessToken(res.access_token);
    return res;
  },

  async refresh(refreshToken?: string): Promise<AuthTokenResponse> {
    const res = await apiRequest<AuthTokenResponse>("/api/v1/auth/refresh", {
      method: "POST",
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    setStoredAccessToken(res.access_token);
    return res;
  },

  async logout(): Promise<void> {
    try {
      await apiRequest<{ message: string }>("/api/v1/auth/logout", {
        method: "POST",
      });
    } finally {
      clearStoredAccessToken();
    }
  },

  async getMe(): Promise<User> {
    return apiRequest<User>("/api/v1/auth/me");
  },

  async updateProfile(data: {
    full_name?: string;
    phone_number?: string;
  }): Promise<User> {
    return apiRequest<User>("/api/v1/auth/me", {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },

  async updateDocuments(data: {
    driver_license_number?: string;
    driver_license_state?: string;
    driver_license_country?: string;
    driver_license_expiry?: string;
    document_urls?: string[];
  }): Promise<User> {
    return apiRequest<User>("/api/v1/auth/documents", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async forgotPassword(email: string): Promise<{ message: string; reset_token?: string }> {
    return apiRequest<{ message: string; reset_token?: string }>(
      "/api/v1/auth/forgot-password",
      {
        method: "POST",
        body: JSON.stringify({ email }),
      }
    );
  },

  async resetPassword(data: { token: string; new_password: string }): Promise<void> {
    await apiRequest<{ message: string }>("/api/v1/auth/reset-password", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async verifyEmail(token: string): Promise<void> {
    await apiRequest<{ message: string }>("/api/v1/auth/verify-email", {
      method: "POST",
      body: JSON.stringify({ token }),
    });
  },

  async listSessions(): Promise<SessionInfo[]> {
    return apiRequest<SessionInfo[]>("/api/v1/auth/sessions");
  },

  async revokeSession(sessionId: string): Promise<void> {
    await apiRequest<{ message: string }>(`/api/v1/auth/sessions/${sessionId}`, {
      method: "DELETE",
    });
  },
};

export const usersApi = {
  async listUsers(params?: {
    skip?: number;
    limit?: number;
    role?: string;
    search?: string;
  }): Promise<User[]> {
    const q = new URLSearchParams();
    if (params?.skip) q.set("skip", String(params.skip));
    if (params?.limit) q.set("limit", String(params.limit));
    if (params?.role) q.set("role", params.role);
    if (params?.search) q.set("search", params.search);
    const queryString = q.toString() ? `?${q.toString()}` : "";
    return apiRequest<User[]>(`/api/v1/users${queryString}`);
  },

  async changeRole(userId: string, role: string, reason?: string): Promise<User> {
    return apiRequest<User>(`/api/v1/users/${userId}/role`, {
      method: "PATCH",
      body: JSON.stringify({ role, reason }),
    });
  },

  async changeStatus(userId: string, isActive: boolean, reason?: string): Promise<User> {
    return apiRequest<User>(`/api/v1/users/${userId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ is_active: isActive, reason }),
    });
  },

  async getAuditLogs(params?: {
    skip?: number;
    limit?: number;
    target_type?: string;
  }): Promise<AuditLog[]> {
    const q = new URLSearchParams();
    if (params?.skip) q.set("skip", String(params.skip));
    if (params?.limit) q.set("limit", String(params.limit));
    if (params?.target_type) q.set("target_type", params.target_type);
    const queryString = q.toString() ? `?${q.toString()}` : "";
    return apiRequest<AuditLog[]>(`/api/v1/users/audit-logs${queryString}`);
  },
};

export interface VehicleImage {
  id: string;
  vehicle_id: string;
  url: string;
  is_primary: boolean;
  display_order: number;
  caption?: string | null;
  created_at: string;
}

export interface VehicleMaintenanceRecord {
  id: string;
  vehicle_id: string;
  service_type: string;
  description?: string | null;
  cost?: number | string | null;
  service_date: string;
  completed_date?: string | null;
  performed_by?: string | null;
  mileage_at_service?: number | null;
  is_completed: boolean;
  created_at: string;
}

export interface VehicleCategory {
  id: string;
  name: string;
  slug: string;
  code?: string;
  description?: string | null;
  icon?: string | null;
  display_order: number;
  is_active: boolean;
}

export interface Vehicle {
  id: string;
  vin: string;
  make: string;
  model: string;
  brand: string;
  year: number;
  license_plate: string;
  category: string;
  status: "AVAILABLE" | "UNAVAILABLE" | "RENTED" | "MAINTENANCE" | "RESERVED" | "OUT_OF_SERVICE" | "ARCHIVED";
  fuel_type: "GASOLINE" | "DIESEL" | "ELECTRIC" | "HYBRID";
  transmission: "AUTOMATIC" | "MANUAL";
  seats: number;
  seating_capacity: number;
  sort_order?: number;
  seating_capacity_label?: string;
  doors: number;
  suitcases: number;
  mileage: number;
  daily_rate: number | string;
  weekly_rate?: number | string | null;
  monthly_rate?: number | string | null;
  effective_weekly_rate: number | string;
  effective_monthly_rate: number | string;
  description?: string | null;
  features: string[];
  specs: Record<string, any>;
  image_url?: string | null;
  primary_image_url?: string | null;
  location_id: string;
  is_bookable: boolean;
  popularity_score: number;
  images: VehicleImage[];
  maintenance_records?: VehicleMaintenanceRecord[];
  created_at: string;
  updated_at: string;
}

export interface Location {
  id: string;
  name: string;
  code: string;
  address: string;
  city: string;
  state: string;
  country: string;
  postal_code: string;
  latitude?: number | null;
  longitude?: number | null;
  phone?: string | null;
  email?: string | null;
  is_active: boolean;
}

export const vehiclesApi = {
  async listVehicles(params?: {
    skip?: number;
    limit?: number;
    min_price?: number;
    max_price?: number;
    category?: string;
    brand?: string;
    fuel_type?: string;
    transmission?: string;
    seats?: number;
    location_id?: string;
    available_only?: boolean;
    sort_by?: "capacity" | "capacity_asc" | "price_asc" | "price_desc" | "newest" | "popularity";
    search?: string;
    include_archived?: boolean;
  }): Promise<{ vehicles: Vehicle[]; total: number }> {
    const q = new URLSearchParams();
    if (params?.skip !== undefined) q.set("skip", String(params.skip));
    if (params?.limit !== undefined) q.set("limit", String(params.limit));
    if (params?.min_price !== undefined) q.set("min_price", String(params.min_price));
    if (params?.max_price !== undefined) q.set("max_price", String(params.max_price));
    if (params?.category && params.category !== "All") q.set("category", params.category.toUpperCase());
    if (params?.brand && params.brand !== "All") q.set("brand", params.brand);
    if (params?.fuel_type && params.fuel_type !== "Any") q.set("fuel_type", params.fuel_type.toUpperCase());
    if (params?.transmission && params.transmission !== "Any") q.set("transmission", params.transmission.toUpperCase());
    if (params?.seats !== undefined && params.seats > 0) q.set("seats", String(params.seats));
    if (params?.location_id) q.set("location_id", params.location_id);
    if (params?.available_only) q.set("available_only", "true");
    if (params?.sort_by) q.set("sort_by", params.sort_by);
    if (params?.search) q.set("search", params.search);
    if (params?.include_archived) q.set("include_archived", "true");

    const qs = q.toString() ? `?${q.toString()}` : "";
    const res = await fetch(`/api/v1/vehicles${qs}`, {
      headers: {
        ...(getStoredAccessToken() ? { Authorization: `Bearer ${getStoredAccessToken()}` } : {}),
      },
    });
    const json = await res.json();
    if (!res.ok || json.success === false) {
      throw new Error(json.error?.message || "Failed to list vehicles");
    }
    return {
      vehicles: json.data || [],
      total: json.meta?.total ?? (json.data?.length || 0),
    };
  },

  async getVehicle(id: string): Promise<Vehicle> {
    return apiRequest<Vehicle>(`/api/v1/vehicles/${id}`);
  },

  async createVehicle(payload: Partial<Vehicle>): Promise<Vehicle> {
    return apiRequest<Vehicle>("/api/v1/vehicles", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async updateVehicle(id: string, payload: Partial<Vehicle>): Promise<Vehicle> {
    return apiRequest<Vehicle>(`/api/v1/vehicles/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },

  async updateVehicleAvailability(id: string, status: "AVAILABLE" | "UNAVAILABLE" | "MAINTENANCE" | string): Promise<Vehicle> {
    return apiRequest<Vehicle>(`/api/v1/vehicles/${id}/availability`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
  },

  async archiveVehicle(id: string): Promise<Vehicle> {
    return apiRequest<Vehicle>(`/api/v1/vehicles/${id}/archive`, {
      method: "POST",
    });
  },

  async updatePricing(id: string, rates: { daily_rate: number; weekly_rate?: number; monthly_rate?: number }): Promise<Vehicle> {
    return apiRequest<Vehicle>(`/api/v1/vehicles/${id}/pricing`, {
      method: "PUT",
      body: JSON.stringify(rates),
    });
  },

  async uploadImage(vehicleId: string, file: File, isPrimary: boolean = false, caption?: string): Promise<VehicleImage> {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("is_primary", isPrimary ? "true" : "false");
    if (caption) formData.append("caption", caption);

    return apiRequest<VehicleImage>(`/api/v1/vehicles/${vehicleId}/images`, {
      method: "POST",
      body: formData,
    });
  },

  async setPrimaryImage(vehicleId: string, imageId: string): Promise<VehicleImage> {
    return apiRequest<VehicleImage>(`/api/v1/vehicles/${vehicleId}/images/${imageId}/primary`, {
      method: "PATCH",
    });
  },

  async deleteImage(imageId: string): Promise<void> {
    await apiRequest<{ deleted: boolean }>(`/api/v1/vehicles/images/${imageId}`, {
      method: "DELETE",
    });
  },

  async listCategories(): Promise<VehicleCategory[]> {
    return apiRequest<VehicleCategory[]>("/api/v1/vehicles/categories");
  },

  async createCategory(payload: { name: string; code?: string; slug?: string; description?: string }): Promise<VehicleCategory> {
    return apiRequest<VehicleCategory>("/api/v1/vehicles/categories", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async scheduleMaintenance(vehicleId: string, payload: {
    service_type: string;
    description?: string;
    cost?: number;
    service_date?: string;
    performed_by?: string;
    mileage_at_service?: number;
    set_vehicle_in_maintenance?: boolean;
  }): Promise<VehicleMaintenanceRecord> {
    return apiRequest<VehicleMaintenanceRecord>(`/api/v1/vehicles/${vehicleId}/maintenance`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async listMaintenance(vehicleId: string): Promise<VehicleMaintenanceRecord[]> {
    return apiRequest<VehicleMaintenanceRecord[]>(`/api/v1/vehicles/${vehicleId}/maintenance`);
  },

  async updateMaintenance(recordId: string, payload: {
    is_completed?: boolean;
    set_vehicle_available?: boolean;
    notes?: string;
    description?: string;
    cost?: number;
  }): Promise<VehicleMaintenanceRecord> {
    return apiRequest<VehicleMaintenanceRecord>(`/api/v1/vehicles/maintenance/${recordId}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },

  async getRentalHistory(vehicleId: string): Promise<any[]> {
    return apiRequest<any[]>(`/api/v1/vehicles/${vehicleId}/rental-history`);
  },
};

export const locationsApi = {
  async listLocations(params?: { skip?: number; limit?: number }): Promise<Location[]> {
    const q = new URLSearchParams();
    if (params?.skip !== undefined) q.set("skip", String(params.skip));
    if (params?.limit !== undefined) q.set("limit", String(params.limit));
    const qs = q.toString() ? `?${q.toString()}` : "";
    return apiRequest<Location[]>(`/api/v1/locations${qs}`);
  },

  async getLocation(id: string): Promise<Location> {
    return apiRequest<Location>(`/api/v1/locations/${id}`);
  },

  async createLocation(payload: Partial<Location>): Promise<Location> {
    return apiRequest<Location>("/api/v1/locations", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async updateLocation(id: string, payload: Partial<Location>): Promise<Location> {
    return apiRequest<Location>(`/api/v1/locations/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },

  async deleteLocation(id: string): Promise<void> {
    await apiRequest<{ deleted: boolean }>(`/api/v1/locations/${id}`, {
      method: "DELETE",
    });
  },
};

export interface PricingBreakdown {
  currency: string;
  duration_days: number;
  duration_hours: number;
  daily_rate_cents: number;
  daily_rate: number;
  base_amount_cents: number;
  base_amount: number;
  location_fee_cents: number;
  location_fee: number;
  tax_amount_cents: number;
  tax_amount: number;
  discount_amount_cents: number;
  discount_amount: number;
  deposit_amount_cents: number;
  deposit_amount: number;
  total_amount_cents: number;
  total_amount: number;
  is_one_way: boolean;
}

export interface AvailabilityCheckRequest {
  vehicle_id: string;
  start_datetime: string;
  end_datetime: string;
  buffer_minutes?: number;
}

export interface AvailabilityCheckResponse {
  is_available: boolean;
  vehicle_id: string;
  start_datetime: string;
  end_datetime: string;
  buffer_minutes: number;
  reason?: string | null;
}

export interface BookingQuoteRequest {
  vehicle_id: string;
  pickup_location_id: string;
  return_location_id: string;
  start_datetime: string;
  end_datetime: string;
  promo_code?: string;
  estimated_km?: number;
}

export interface BookingQuoteResponse {
  pricing: PricingBreakdown;
  vehicle_name: string;
  pickup_location_name?: string | null;
  return_location_name?: string | null;
}

export interface BookingCreatePayload {
  vehicle_id: string;
  pickup_location_id: string;
  return_location_id: string;
  start_datetime: string;
  end_datetime: string;
  customer_id?: string;
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  driver_license_number?: string;
  promo_code?: string;
  idempotency_key?: string;
  buffer_minutes?: number;
  estimated_km?: number;
}

export interface Booking {
  id: string;
  booking_reference: string;
  customer_id?: string | null;
  vehicle_id: string;
  pickup_location_id: string;
  return_location_id: string;
  start_datetime: string;
  end_datetime: string;
  status:
    | "PENDING"
    | "AWAITING_PAYMENT"
    | "CONFIRMED"
    | "ACTIVE"
    | "COMPLETED"
    | "CANCELLED"
    | "REJECTED"
    | "REFUND_PENDING"
    | "REFUNDED";
  customer_name?: string | null;
  customer_email?: string | null;
  customer_phone?: string | null;
  driver_license_number?: string | null;
  currency: string;
  daily_rate_cents: number;
  daily_rate: number;
  base_amount_cents: number;
  base_amount: number;
  location_fee_cents: number;
  location_fee: number;
  tax_amount_cents: number;
  tax_amount: number;
  discount_amount_cents: number;
  discount_amount: number;
  deposit_amount_cents: number;
  deposit_amount: number;
  total_amount_cents: number;
  total_amount: number;
  total_days: number;
  buffer_minutes: number;
  expires_at?: string | null;
  cancellation_reason?: string | null;
  idempotency_key?: string | null;
  created_at: string;
  updated_at: string;
  vehicle?: {
    id: string;
    brand: string;
    model: string;
    category: string;
    year: number;
    license_plate: string;
  } | null;
  pickup_location?: {
    id: string;
    name: string;
    code: string;
    city: string;
  } | null;
  return_location?: {
    id: string;
    name: string;
    code: string;
    city: string;
  } | null;
}

export const bookingsApi = {
  async checkAvailability(payload: AvailabilityCheckRequest): Promise<AvailabilityCheckResponse> {
    return apiRequest<AvailabilityCheckResponse>("/api/v1/bookings/check-availability", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async getQuote(payload: BookingQuoteRequest): Promise<BookingQuoteResponse> {
    return apiRequest<BookingQuoteResponse>("/api/v1/bookings/quote", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async createBooking(payload: BookingCreatePayload, idempotencyKey?: string): Promise<Booking> {
    const headers: Record<string, string> = {};
    if (idempotencyKey) {
      headers["Idempotency-Key"] = idempotencyKey;
    }
    return apiRequest<Booking>("/api/v1/bookings", {
      method: "POST",
      headers,
      body: JSON.stringify({
        ...payload,
        idempotency_key: idempotencyKey || payload.idempotency_key,
      }),
    });
  },

  async getBooking(bookingId: string): Promise<Booking> {
    return apiRequest<Booking>(`/api/v1/bookings/${bookingId}`);
  },

  async getBookingByReference(reference: string): Promise<Booking> {
    return apiRequest<Booking>(`/api/v1/bookings/reference/${reference.trim().toUpperCase()}`);
  },

  async listMyBookings(): Promise<Booking[]> {
    return apiRequest<Booking[]>("/api/v1/bookings/my-bookings");
  },

  async cancelBooking(bookingId: string, cancellation_reason: string): Promise<Booking> {
    return apiRequest<Booking>(`/api/v1/bookings/${bookingId}/cancel`, {
      method: "POST",
      body: JSON.stringify({ cancellation_reason }),
    });
  },

  async transitionStatus(bookingId: string, status: string, reason?: string): Promise<Booking> {
    return apiRequest<Booking>(`/api/v1/bookings/${bookingId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status, reason }),
    });
  },

  async listAllBookings(params?: { customer_id?: string; vehicle_id?: string; status?: string }): Promise<Booking[]> {
    const q = new URLSearchParams();
    if (params?.customer_id) q.set("customer_id", params.customer_id);
    if (params?.vehicle_id) q.set("vehicle_id", params.vehicle_id);
    if (params?.status) q.set("status", params.status);
    const qs = q.toString() ? `?${q.toString()}` : "";
    return apiRequest<Booking[]>(`/api/v1/bookings${qs}`);
  },
};

export interface FleetUtilizationKpi {
  total_vehicles: number;
  available_vehicles: number;
  rented_vehicles: number;
  maintenance_vehicles: number;
  utilization_rate_percentage: number;
}

export interface BookingBreakdownKpi {
  total_bookings: number;
  pending_bookings: number;
  awaiting_payment_bookings: number;
  confirmed_bookings: number;
  active_bookings: number;
  completed_bookings: number;
  cancelled_bookings: number;
  rejected_bookings: number;
  refund_pending_bookings: number;
  refunded_bookings: number;
}

export interface RevenueSummaryKpi {
  total_revenue: number;
  monthly_revenue: number;
  total_bookings: number;
  average_booking_value: number;
  currency: string;
}

export interface PopularVehicleKpi {
  vehicle_id: string;
  make: string;
  model: string;
  category: string;
  booking_count: number;
  total_revenue: number;
  daily_rate: number;
}

export interface TimeSeriesDataPoint {
  period: string;
  revenue: number;
  bookings_count: number;
}

export interface PlatformExecutiveOverview {
  fleet: FleetUtilizationKpi;
  revenue: RevenueSummaryKpi;
  bookings: BookingBreakdownKpi;
  popular_vehicles: PopularVehicleKpi[];
  total_customers: number;
  total_locations: number;
}

export interface ReportAnalyticsResponse {
  overview: PlatformExecutiveOverview;
  revenue_chart: TimeSeriesDataPoint[];
  status_distribution: Record<string, number>;
}

export interface PricingSettings {
  rate_multiplier: number;
  category_deposits: Record<string, number>;
}

export interface CancellationPolicySettings {
  free_cancellation_hours: number;
  fee_percentage_after_deadline: number;
  policy_text: string;
}

export interface PromoCode {
  code: string;
  discount_percent: number;
  description?: string;
}

export interface TaxAndDiscountsSettings {
  tax_rate_percent: number;
  active_promo_codes: PromoCode[];
}

export interface BusinessContactSettings {
  company_name: string;
  support_email: string;
  phone: string;
  address: string;
  support_hours: string;
}

export interface BusinessSettingsData {
  pricing: PricingSettings;
  cancellation_policy: CancellationPolicySettings;
  tax_and_discounts: TaxAndDiscountsSettings;
  contact_info: BusinessContactSettings;
  turnaround_buffer_minutes: number;
}

export interface CustomerUserSummary {
  id: string;
  email: string;
  full_name: string;
  phone_number?: string | null;
  role: string;
  is_active: boolean;
  is_verified: boolean;
  documents?: Record<string, unknown> | null;
}

export interface Customer {
  id: string;
  user_id: string;
  driver_license_number: string;
  driver_license_expiry: string;
  driver_license_country: string;
  date_of_birth: string;
  is_identity_verified: boolean;
  notes?: string | null;
  user?: CustomerUserSummary | null;
  bookings?: Booking[];
  created_at: string;
  updated_at: string;
}

export const reportsApi = {
  async getOverview(): Promise<PlatformExecutiveOverview> {
    return apiRequest<PlatformExecutiveOverview>("/api/v1/reports/overview");
  },
  async getAnalytics(params?: { start_date?: string; end_date?: string }): Promise<ReportAnalyticsResponse> {
    const q = new URLSearchParams();
    if (params?.start_date) q.set("start_date", params.start_date);
    if (params?.end_date) q.set("end_date", params.end_date);
    const qs = q.toString() ? `?${q.toString()}` : "";
    return apiRequest<ReportAnalyticsResponse>(`/api/v1/reports/analytics${qs}`);
  },
  getExportBookingsUrl(params?: { start_date?: string; end_date?: string; status?: string }): string {
    const q = new URLSearchParams();
    if (params?.start_date) q.set("start_date", params.start_date);
    if (params?.end_date) q.set("end_date", params.end_date);
    if (params?.status && params.status !== "ALL") q.set("status", params.status);
    const qs = q.toString() ? `?${q.toString()}` : "";
    return `/api/v1/reports/export/bookings${qs}`;
  },
};

export const settingsApi = {
  async getSettings(): Promise<BusinessSettingsData> {
    return apiRequest<BusinessSettingsData>("/api/v1/settings");
  },
  async updateSettings(data: Partial<BusinessSettingsData>): Promise<BusinessSettingsData> {
    return apiRequest<BusinessSettingsData>("/api/v1/settings", {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },
};

export const customersApi = {
  async listCustomers(params?: { skip?: number; limit?: number }): Promise<Customer[]> {
    const q = new URLSearchParams();
    if (params?.skip) q.set("skip", String(params.skip));
    if (params?.limit) q.set("limit", String(params.limit));
    const qs = q.toString() ? `?${q.toString()}` : "";
    return apiRequest<Customer[]>(`/api/v1/customers${qs}`);
  },
  async getCustomer(customerId: string): Promise<Customer> {
    return apiRequest<Customer>(`/api/v1/customers/${customerId}`);
  },
  async verifyCustomer(customerId: string, data: { is_identity_verified: boolean; verification_notes?: string }): Promise<Customer> {
    return apiRequest<Customer>(`/api/v1/customers/${customerId}/verify`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },
  async getCustomerBookings(customerId: string): Promise<Booking[]> {
    return apiRequest<Booking[]>(`/api/v1/customers/${customerId}/bookings`);
  },
};

export const adminApi = {
  async listUsers(params?: { role?: string; search?: string }): Promise<User[]> {
    const q = new URLSearchParams();
    if (params?.role && params.role !== "ALL") q.set("role", params.role);
    if (params?.search) q.set("search", params.search);
    const qs = q.toString() ? `?${q.toString()}` : "";
    return apiRequest<User[]>(`/api/v1/users${qs}`);
  },
  async changeUserStatus(userId: string, is_active: boolean, reason?: string): Promise<User> {
    return apiRequest<User>(`/api/v1/users/${userId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ is_active, reason }),
    });
  },
  async changeUserRole(userId: string, role: string, reason?: string): Promise<User> {
    return apiRequest<User>(`/api/v1/users/${userId}/role`, {
      method: "PATCH",
      body: JSON.stringify({ role, reason }),
    });
  },
  async getAuditLogs(params?: { limit?: number; target_type?: string }): Promise<AuditLog[]> {
    const q = new URLSearchParams();
    if (params?.limit) q.set("limit", String(params.limit));
    if (params?.target_type) q.set("target_type", params.target_type);
    const qs = q.toString() ? `?${q.toString()}` : "";
    return apiRequest<AuditLog[]>(`/api/v1/users/audit-logs${qs}`);
  },
};

export interface PaymentOrderResponse {
  order_id: string;
  order_db_id: string;
  booking_id: string;
  amount_cents: number;
  amount: number;
  currency: string;
  key_id: string;
  payment_type: string;
  receipt_number: string;
  status: string;
}

export interface PaymentVerifyRequest {
  order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

export interface PaymentVerifyResponse {
  payment_id: string;
  transaction_reference: string;
  status: string;
  receipt_number: string;
  booking_id: string;
  booking_status: string;
  amount: number;
  currency: string;
  message: string;
}

export interface PaymentReceiptItem {
  description: string;
  amount: number;
}

export interface PaymentReceiptResponse {
  receipt_number: string;
  payment_id: string;
  order_reference?: string;
  transaction_reference: string;
  payment_method: string;
  status: string;
  date: string;
  customer_name?: string;
  customer_email?: string;
  booking_reference: string;
  vehicle_name: string;
  start_datetime: string;
  end_datetime: string;
  base_amount: number;
  deposit_amount: number;
  tax_amount: number;
  discount_amount: number;
  total_paid: number;
  currency: string;
  line_items: PaymentReceiptItem[];
}

export interface PaymentRead {
  id: string;
  booking_id: string;
  order_id?: string;
  transaction_reference: string;
  provider: string;
  amount: number;
  amount_cents?: number;
  currency: string;
  status: string;
  payment_method: string;
  receipt_number?: string;
  payment_type: string;
  gateway_order_id?: string;
  gateway_payment_id?: string;
  card_network?: string;
  card_last4?: string;
  failure_reason?: string;
  captured_at?: string;
  created_at: string;
}

export interface PaymentRefundResponse {
  refund_id: string;
  refund_reference: string;
  payment_id: string;
  booking_id: string;
  amount_cents: number;
  amount: number;
  currency: string;
  status: string;
  gateway_refund_id?: string;
  created_at: string;
}

export interface PaymentTransactionRead {
  id: string;
  payment_id?: string;
  order_id?: string;
  booking_id?: string;
  transaction_type: string;
  amount_cents: number;
  amount: number;
  currency: string;
  status: string;
  gateway_reference?: string;
  created_at: string;
}

export const paymentsApi = {
  async createOrder(payload: { booking_id: string; payment_type?: "FULL" | "ADVANCE" | "SECURITY_DEPOSIT"; amount_cents?: number }): Promise<PaymentOrderResponse> {
    return apiRequest<PaymentOrderResponse>("/api/v1/payments/orders", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async verifyPayment(payload: PaymentVerifyRequest): Promise<PaymentVerifyResponse> {
    return apiRequest<PaymentVerifyResponse>("/api/v1/payments/verify", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async reportFailure(payload: { order_id: string; error_code?: string; error_description?: string }): Promise<{ status: string }> {
    return apiRequest<{ status: string }>("/api/v1/payments/failure", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async getReceipt(paymentId: string): Promise<PaymentReceiptResponse> {
    return apiRequest<PaymentReceiptResponse>(`/api/v1/payments/${paymentId}/receipt`);
  },

  async listPayments(params?: { booking_id?: string; status?: string; skip?: number; limit?: number }): Promise<PaymentRead[]> {
    const q = new URLSearchParams();
    if (params?.booking_id) q.set("booking_id", params.booking_id);
    if (params?.status) q.set("status", params.status);
    if (params?.skip) q.set("skip", String(params.skip));
    if (params?.limit) q.set("limit", String(params.limit));
    const qs = q.toString() ? `?${q.toString()}` : "";
    return apiRequest<PaymentRead[]>(`/api/v1/payments${qs}`);
  },

  async listTransactions(paymentId: string): Promise<PaymentTransactionRead[]> {
    return apiRequest<PaymentTransactionRead[]>(`/api/v1/payments/${paymentId}/transactions`);
  },

  async refundPayment(paymentId: string, payload: { amount_cents?: number; reason: string }): Promise<PaymentRefundResponse> {
    return apiRequest<PaymentRefundResponse>(`/api/v1/payments/${paymentId}/refund`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
};

// ==========================================
// WhatsApp Business Cloud API Integration
// ==========================================

export interface WhatsAppPublicConfig {
  floating_button_enabled: boolean;
  business_phone_number: string | null;
  display_phone_number: string | null;
  floating_button_greeting: string;
  wa_me_url: string | null;
}

export interface WhatsAppNotificationPreferences {
  customer: {
    booking_confirmation: boolean;
    payment_success: boolean;
    cancellation: boolean;
    reminders: boolean;
  };
  admin: {
    new_booking: boolean;
    payment_success: boolean;
    cancellation: boolean;
    human_support: boolean;
  };
}

export interface WhatsAppConfigResponse {
  id: string;
  phone_number_id: string | null;
  waba_id: string | null;
  business_phone_number: string | null;
  display_phone_number: string | null;
  verify_token: string | null;
  app_id: string | null;
  access_token_masked: string | null;
  app_secret_masked: string | null;
  has_access_token: boolean;
  has_app_secret: boolean;
  floating_button_enabled: boolean;
  floating_button_greeting: string;
  status: "NOT_CONFIGURED" | "INCOMPLETE" | "CONNECTED" | "ERROR";
  status_details: string | null;
  admin_notification_phone: string | null;
  notification_preferences: WhatsAppNotificationPreferences;
  webhook_url: string;
  wa_me_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface WhatsAppConfigUpdate {
  phone_number_id?: string | null;
  waba_id?: string | null;
  business_phone_number?: string | null;
  display_phone_number?: string | null;
  access_token?: string | null;
  verify_token?: string | null;
  app_id?: string | null;
  app_secret?: string | null;
  floating_button_enabled?: boolean;
  floating_button_greeting?: string;
  admin_notification_phone?: string | null;
  notification_preferences?: WhatsAppNotificationPreferences;
}

export interface WhatsAppConnectionTestResult {
  connected: boolean;
  status: string;
  message: string;
  phone_number_id?: string | null;
  details?: Record<string, unknown> | null;
}

export interface WhatsAppMessageResponse {
  id: string;
  conversation_id: string;
  wamid: string | null;
  direction: "INBOUND" | "OUTBOUND";
  message_type: string;
  sender_phone: string;
  recipient_phone: string;
  content: string;
  template_name?: string | null;
  status: "PENDING" | "SENT" | "DELIVERED" | "READ" | "FAILED";
  error_code?: string | null;
  error_description?: string | null;
  created_at: string;
}

export interface WhatsAppConversationResponse {
  id: string;
  phone_number: string;
  customer_id?: string | null;
  customer_name?: string | null;
  status: "BOT" | "HUMAN_AGENT" | "CLOSED";
  last_message_at: string;
  unread_admin_count: number;
  notes?: string | null;
  last_message?: WhatsAppMessageResponse | null;
  created_at: string;
}

export interface WhatsAppConversationDetailResponse extends WhatsAppConversationResponse {
  messages: WhatsAppMessageResponse[];
}

export const whatsappApi = {
  async getPublicConfig(): Promise<WhatsAppPublicConfig> {
    return apiRequest<WhatsAppPublicConfig>("/api/v1/whatsapp/public-config");
  },

  async getAdminConfig(): Promise<WhatsAppConfigResponse> {
    return apiRequest<WhatsAppConfigResponse>("/api/v1/whatsapp/config");
  },

  async updateAdminConfig(payload: WhatsAppConfigUpdate): Promise<WhatsAppConfigResponse> {
    return apiRequest<WhatsAppConfigResponse>("/api/v1/whatsapp/config", {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  async testConnection(): Promise<WhatsAppConnectionTestResult> {
    return apiRequest<WhatsAppConnectionTestResult>("/api/v1/whatsapp/test-connection", {
      method: "POST",
    });
  },

  async sendTestMessage(recipientPhone: string, message?: string): Promise<WhatsAppMessageResponse> {
    return apiRequest<WhatsAppMessageResponse>("/api/v1/whatsapp/test-message", {
      method: "POST",
      body: JSON.stringify({ recipient_phone: recipientPhone, message }),
    });
  },

  async listConversations(params?: { status?: string; page?: number; page_size?: number }): Promise<WhatsAppConversationResponse[]> {
    const q = new URLSearchParams();
    if (params?.status && params.status !== "ALL") q.set("status", params.status);
    if (params?.page) q.set("page", String(params.page));
    if (params?.page_size) q.set("page_size", String(params.page_size));
    const qs = q.toString() ? `?${q.toString()}` : "";
    return apiRequest<WhatsAppConversationResponse[]>(`/api/v1/whatsapp/conversations${qs}`);
  },

  async getConversationThread(convId: string): Promise<WhatsAppConversationDetailResponse> {
    return apiRequest<WhatsAppConversationDetailResponse>(`/api/v1/whatsapp/conversations/${convId}`);
  },

  async sendManualReply(convId: string, message: string): Promise<WhatsAppMessageResponse> {
    return apiRequest<WhatsAppMessageResponse>(`/api/v1/whatsapp/conversations/${convId}/reply`, {
      method: "POST",
      body: JSON.stringify({ message }),
    });
  },

  async updateHandoverStatus(convId: string, status: "BOT" | "HUMAN_AGENT" | "CLOSED", notes?: string): Promise<WhatsAppConversationResponse> {
    return apiRequest<WhatsAppConversationResponse>(`/api/v1/whatsapp/conversations/${convId}/handover`, {
      method: "PUT",
      body: JSON.stringify({ status, notes }),
    });
  },

  async listMessages(params?: { page?: number; page_size?: number }): Promise<WhatsAppMessageResponse[]> {
    const q = new URLSearchParams();
    if (params?.page) q.set("page", String(params.page));
    if (params?.page_size) q.set("page_size", String(params.page_size));
    const qs = q.toString() ? `?${q.toString()}` : "";
    return apiRequest<WhatsAppMessageResponse[]>(`/api/v1/whatsapp/messages${qs}`);
  },
};

export interface Testimonial {
  id: string;
  name: string;
  designation: string;
  review: string;
  rating: number;
  image_url?: string | null;
  is_active: boolean;
  sort_order?: number;
  created_at?: string;
  updated_at?: string;
}

export interface TestimonialCreatePayload {
  name: string;
  designation: string;
  review: string;
  rating: number;
  image_url?: string | null;
  is_active?: boolean;
  sort_order?: number;
}

export interface TestimonialUpdatePayload {
  name?: string;
  designation?: string;
  review?: string;
  rating?: number;
  image_url?: string | null;
  is_active?: boolean;
  sort_order?: number;
}

export const testimonialsApi = {
  async getActive(): Promise<Testimonial[]> {
    return apiRequest<Testimonial[]>("/api/v1/testimonials");
  },

  async getAdminAll(): Promise<Testimonial[]> {
    return apiRequest<Testimonial[]>("/api/v1/testimonials/admin/all");
  },

  async getById(id: string): Promise<Testimonial> {
    return apiRequest<Testimonial>(`/api/v1/testimonials/${id}`);
  },

  async create(data: TestimonialCreatePayload): Promise<Testimonial> {
    return apiRequest<Testimonial>("/api/v1/testimonials", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async update(id: string, data: TestimonialUpdatePayload): Promise<Testimonial> {
    return apiRequest<Testimonial>(`/api/v1/testimonials/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  async toggleStatus(id: string, is_active: boolean): Promise<Testimonial> {
    return apiRequest<Testimonial>(`/api/v1/testimonials/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ is_active }),
    });
  },

  async delete(id: string): Promise<{ deleted: boolean }> {
    return apiRequest<{ deleted: boolean }>(`/api/v1/testimonials/${id}`, {
      method: "DELETE",
    });
  },

  async uploadImage(file: File): Promise<{ url: string }> {
    const formData = new FormData();
    formData.append("file", file);
    return apiRequest<{ url: string }>("/api/v1/testimonials/upload-image", {
      method: "POST",
      body: formData,
    });
  },
};


