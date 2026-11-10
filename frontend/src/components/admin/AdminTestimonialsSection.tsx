import { useState, useEffect } from "react";
import {
  Star, Plus, Search, Edit3, Trash2, CheckCircle2, XCircle,
  Eye, EyeOff, AlertCircle, RefreshCw, MessageSquare, X
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  testimonialsApi,
  Testimonial,
  TestimonialCreatePayload,
  TestimonialUpdatePayload,
} from "@/core/api";

export function AdminTestimonialsSection() {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");

  // Notifications
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Modal State for Add / Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Testimonial | null>(null);
  const [saving, setSaving] = useState(false);

  // Form Fields (No photo required)
  const [formName, setFormName] = useState("");
  const [formDesignation, setFormDesignation] = useState("");
  const [formReview, setFormReview] = useState("");
  const [formRating, setFormRating] = useState(5);
  const [formIsActive, setFormIsActive] = useState(true);
  const [formSortOrder, setFormSortOrder] = useState(1);

  // Delete Confirmation Modal
  const [deleteConfirmItem, setDeleteConfirmItem] = useState<Testimonial | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchTestimonials = async () => {
    setLoading(true);
    setActionError(null);
    try {
      const data = await testimonialsApi.getAdminAll();
      setTestimonials(data);
    } catch (err: any) {
      console.error("Failed to load testimonials:", err);
      setActionError(err.message || "Failed to load testimonials from database.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTestimonials();
  }, []);

  const openAddModal = () => {
    setEditingItem(null);
    setFormName("");
    setFormDesignation("");
    setFormReview("");
    setFormRating(5);
    setFormIsActive(true);
    setFormSortOrder(testimonials.length + 1);
    setIsModalOpen(true);
  };

  const openEditModal = (t: Testimonial) => {
    setEditingItem(t);
    setFormName(t.name);
    setFormDesignation(t.designation);
    setFormReview(t.review);
    setFormRating(t.rating);
    setFormIsActive(t.is_active);
    setFormSortOrder(t.sort_order ?? 0);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      setActionError("Customer Name is required.");
      return;
    }
    if (!formDesignation.trim()) {
      setActionError("Customer Designation is required.");
      return;
    }
    if (!formReview.trim() || formReview.trim().length < 5) {
      setActionError("Customer Review must be at least 5 characters.");
      return;
    }

    setSaving(true);
    setActionError(null);
    try {
      if (editingItem) {
        const payload: TestimonialUpdatePayload = {
          name: formName.trim(),
          designation: formDesignation.trim(),
          review: formReview.trim(),
          rating: formRating,
          is_active: formIsActive,
          sort_order: Number(formSortOrder) || 0,
        };
        await testimonialsApi.update(editingItem.id, payload);
        setActionSuccess(`Story for "${formName}" updated successfully.`);
      } else {
        const payload: TestimonialCreatePayload = {
          name: formName.trim(),
          designation: formDesignation.trim(),
          review: formReview.trim(),
          rating: formRating,
          is_active: formIsActive,
          sort_order: Number(formSortOrder) || 0,
        };
        await testimonialsApi.create(payload);
        setActionSuccess(`New story for "${formName}" added successfully.`);
      }

      setIsModalOpen(false);
      await fetchTestimonials();
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: any) {
      console.error("Failed to save testimonial:", err);
      setActionError(err.message || "Failed to save testimonial.");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (t: Testimonial) => {
    const nextStatus = !t.is_active;
    try {
      await testimonialsApi.toggleStatus(t.id, nextStatus);
      setTestimonials((prev) =>
        prev.map((item) => (item.id === t.id ? { ...item, is_active: nextStatus } : item))
      );
      setActionSuccess(
        `Story by ${t.name} is now ${nextStatus ? "Active (Visible on Website)" : "Inactive (Hidden)"}.`
      );
      setTimeout(() => setActionSuccess(null), 3000);
    } catch (err: any) {
      console.error("Failed to toggle status:", err);
      setActionError(err.message || "Failed to toggle status.");
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirmItem) return;
    setDeleting(true);
    setActionError(null);
    try {
      await testimonialsApi.delete(deleteConfirmItem.id);
      setTestimonials((prev) => prev.filter((item) => item.id !== deleteConfirmItem.id));
      setActionSuccess(`Story by ${deleteConfirmItem.name} was removed.`);
      setDeleteConfirmItem(null);
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: any) {
      console.error("Failed to delete testimonial:", err);
      setActionError(err.message || "Failed to delete testimonial.");
    } finally {
      setDeleting(false);
    }
  };

  // Filtered testimonials
  const filtered = testimonials.filter((t) => {
    const matchesSearch =
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.designation.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.review.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;
    if (statusFilter === "ACTIVE") return t.is_active;
    if (statusFilter === "INACTIVE") return !t.is_active;
    return true;
  });

  const totalCount = testimonials.length;
  const activeCount = testimonials.filter((t) => t.is_active).length;
  const inactiveCount = totalCount - activeCount;
  const avgRating = totalCount > 0 ? (testimonials.reduce((acc, t) => acc + t.rating, 0) / totalCount).toFixed(1) : "5.0";

  return (
    <div className="space-y-6">
      {/* Feedback Messages */}
      {actionSuccess && (
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-sm flex items-center justify-between animate-fade-in shadow-sm">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span className="font-medium">{actionSuccess}</span>
          </div>
          <button onClick={() => setActionSuccess(null)} className="text-emerald-600 hover:text-emerald-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {actionError && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-sm flex items-center justify-between animate-fade-in shadow-sm">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />
            <span className="font-medium">{actionError}</span>
          </div>
          <button onClick={() => setActionError(null)} className="text-rose-600 hover:text-rose-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header & Metric Cards */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 border-0">
              Public Website Content
            </Badge>
          </div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Manage Testimonials & Passenger Stories
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Control the "What Our Travelers Say" carousel on the home page. Changes reflect live on the website.
          </p>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchTestimonials}
            disabled={loading}
            className="gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>

          <Button
            onClick={openAddModal}
            size="sm"
            className="gap-2 bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-600/20"
          >
            <Plus className="w-4 h-4" />
            Add Testimonial
          </Button>
        </div>
      </div>

      {/* Quick Statistics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Stories</p>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-black text-slate-900 dark:text-white">{totalCount}</span>
            <span className="text-xs text-blue-600 font-bold">Database</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active on Website</p>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{activeCount}</span>
            <span className="text-xs text-emerald-600 font-bold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Live
            </span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Inactive / Draft</p>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-black text-amber-600 dark:text-amber-400">{inactiveCount}</span>
            <span className="text-xs text-amber-600 font-bold">Hidden</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Average Rating</p>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-black text-amber-500">{avgRating} ★</span>
            <span className="text-xs text-slate-400 font-medium">5-star scale</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search customer, role, or review..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-10 text-sm"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto">
          <button
            onClick={() => setStatusFilter("ALL")}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all ${
              statusFilter === "ALL"
                ? "bg-blue-600 text-white shadow-sm"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900"
            }`}
          >
            All ({totalCount})
          </button>
          <button
            onClick={() => setStatusFilter("ACTIVE")}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all ${
              statusFilter === "ACTIVE"
                ? "bg-emerald-600 text-white shadow-sm"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900"
            }`}
          >
            Active ({activeCount})
          </button>
          <button
            onClick={() => setStatusFilter("INACTIVE")}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all ${
              statusFilter === "INACTIVE"
                ? "bg-amber-600 text-white shadow-sm"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900"
            }`}
          >
            Inactive ({inactiveCount})
          </button>
        </div>
      </div>

      {/* Testimonials List / Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        {loading && testimonials.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <RefreshCw className="w-8 h-8 mx-auto mb-3 animate-spin text-blue-600" />
            <p className="text-sm font-semibold">Loading testimonials from database...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="text-base font-bold text-slate-700 dark:text-slate-300">No stories found</p>
            <p className="text-xs text-slate-500 mt-1">
              {searchQuery ? "Try refining your search terms." : "Click 'Add Testimonial' to create the first one."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200/80 dark:border-slate-800 text-slate-500 uppercase text-[11px] font-bold tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Passenger / Customer</th>
                  <th className="py-3.5 px-4">Designation / Role</th>
                  <th className="py-3.5 px-4">Rating</th>
                  <th className="py-3.5 px-4">Review Preview</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filtered.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                    {/* Customer Info (Initials badge, no photo needed) */}
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xs ring-1 ring-blue-200 dark:ring-blue-900 shrink-0">
                          {t.name.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 dark:text-white">{t.name}</p>
                          <span className="text-[11px] text-slate-400 font-mono">Order: #{t.sort_order ?? 0}</span>
                        </div>
                      </div>
                    </td>

                    {/* Designation */}
                    <td className="py-4 px-4 font-medium text-slate-600 dark:text-slate-300">
                      {t.designation}
                    </td>

                    {/* Rating */}
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-1">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={`w-3.5 h-3.5 ${
                              i < t.rating ? "fill-amber-400 text-amber-400" : "text-slate-300 dark:text-slate-700"
                            }`}
                          />
                        ))}
                        <span className="ml-1 text-xs font-bold text-slate-700 dark:text-slate-300">
                          {t.rating}.0
                        </span>
                      </div>
                    </td>

                    {/* Review Preview */}
                    <td className="py-4 px-4 max-w-xs lg:max-w-md">
                      <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 italic">
                        "{t.review}"
                      </p>
                    </td>

                    {/* Status */}
                    <td className="py-4 px-4">
                      <button
                        onClick={() => handleToggleStatus(t)}
                        title="Click to toggle status"
                        className="focus:outline-none"
                      >
                        {t.is_active ? (
                          <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-0 hover:bg-emerald-200 cursor-pointer">
                            <CheckCircle2 className="w-3 h-3 mr-1" /> Active
                          </Badge>
                        ) : (
                          <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-0 hover:bg-amber-200 cursor-pointer">
                            <XCircle className="w-3 h-3 mr-1" /> Inactive
                          </Badge>
                        )}
                      </button>
                    </td>

                    {/* Actions */}
                    <td className="py-4 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleStatus(t)}
                          title={t.is_active ? "Deactivate (Hide from website)" : "Activate (Show on website)"}
                          className="h-8 w-8 p-0 text-slate-500 hover:text-slate-900 dark:hover:text-white"
                        >
                          {t.is_active ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4 text-emerald-600" />}
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditModal(t)}
                          className="h-8 w-8 p-0 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/50"
                        >
                          <Edit3 className="w-4 h-4" />
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteConfirmItem(t)}
                          className="h-8 w-8 p-0 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ─── ADD / EDIT MODAL ────────────────────────────────────── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200/80 dark:border-slate-800 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                  {editingItem ? "Edit Story" : "Add New Passenger Story"}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Provide customer story details to display in the public carousel.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-5 mt-5">
              {/* Customer Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Customer / Passenger Name *
                </label>
                <Input
                  required
                  placeholder="e.g. Sarah Mitchell"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="h-11"
                />
              </div>

              {/* Designation / Role */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Customer Designation / Journey Type *
                </label>
                <Input
                  required
                  placeholder="e.g. Corporate Mobility Lead / Frequent Airport Commuter / Family Traveler"
                  value={formDesignation}
                  onChange={(e) => setFormDesignation(e.target.value)}
                  className="h-11"
                />
              </div>

              {/* Star Rating */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Star Rating (1 to 5)
                </label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setFormRating(star)}
                      className="p-1 focus:outline-none hover:scale-110 transition-transform"
                    >
                      <Star
                        className={`w-7 h-7 ${
                          star <= formRating
                            ? "fill-amber-400 text-amber-400"
                            : "text-slate-300 dark:text-slate-700"
                        }`}
                      />
                    </button>
                  ))}
                  <span className="ml-2 font-bold text-sm text-amber-600 dark:text-amber-400">
                    {formRating} Star{formRating > 1 ? "s" : ""}
                  </span>
                </div>
              </div>

              {/* Customer Review */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Passenger Story / Review *
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder="Write the customer's review or experience here..."
                  value={formReview}
                  onChange={(e) => setFormReview(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Status & Sort Order */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850">
                  <input
                    type="checkbox"
                    id="is_active_toggle"
                    checked={formIsActive}
                    onChange={(e) => setFormIsActive(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 cursor-pointer"
                  />
                  <label htmlFor="is_active_toggle" className="text-xs font-bold text-slate-700 dark:text-slate-200 cursor-pointer">
                    Active (Show on Website)
                  </label>
                </div>

                <div className="flex items-center gap-2">
                  <label className="text-xs font-bold text-slate-500 whitespace-nowrap">Sort Order:</label>
                  <Input
                    type="number"
                    min={0}
                    value={formSortOrder}
                    onChange={(e) => setFormSortOrder(Number(e.target.value) || 0)}
                    className="h-10 text-xs"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsModalOpen(false)}
                  disabled={saving}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={saving}
                  className="bg-blue-600 hover:bg-blue-700 text-white min-w-[120px]"
                >
                  {saving ? "Saving..." : editingItem ? "Update Story" : "Save Story"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── DELETE CONFIRMATION DIALOG ──────────────────────────── */}
      {deleteConfirmItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200/80 dark:border-slate-800">
            <div className="w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 flex items-center justify-center mb-4">
              <Trash2 className="w-6 h-6" />
            </div>

            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              Delete Passenger Story?
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
              Are you sure you want to delete the story for <strong className="text-slate-800 dark:text-slate-200">{deleteConfirmItem.name}</strong>?
              This will remove it from the public website carousel and the admin list.
            </p>

            <div className="mt-6 flex items-center justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setDeleteConfirmItem(null)}
                disabled={deleting}
              >
                Cancel
              </Button>
              <Button
                onClick={handleDelete}
                disabled={deleting}
                className="bg-rose-600 hover:bg-rose-700 text-white"
              >
                {deleting ? "Deleting..." : "Yes, Delete Story"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
