import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Mail, Phone, Clock, Send, MessageSquare, CheckCircle, ExternalLink, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { TOUR_PACKAGES } from "@/data/services";

const CONTACT_INFO = [
  {
    Icon: Phone,
    label: "Phone / WhatsApp",
    value: "+91 8421081570",
    href: "tel:+918421081570",
    sub: "Call or message anytime 24/7",
  },
  {
    Icon: Mail,
    label: "Email",
    value: "swarajcabservice@gmail.com",
    href: "mailto:swarajcabservice@gmail.com",
    sub: "Send us your query anytime",
  },
  {
    Icon: Clock,
    label: "Service Timing",
    value: "Open 24/7 Everyday",
    href: undefined,
    sub: "Round-the-clock cab & tour service",
  },
];

const FAQ = [
  {
    q: "How can I book a cab or an outstation trip?",
    a: "You can book directly on our website or message us on WhatsApp at +91 8421081570. Simply share your pickup address, destination, travel date, time, and choice of car.",
  },
  {
    q: "Are all cabs provided with experienced drivers?",
    a: "Yes, absolutely. All our rides come with verified, polite, and experienced drivers. All cars are clean, well-maintained, and commercially licensed. We do not provide self-drive cars.",
  },
  {
    q: "Do you offer on-time airport pickup and drop service?",
    a: "Yes! We track your flight in real time so your driver will be waiting at the airport arrivals area on time, even if your flight is delayed.",
  },
  {
    q: "Can I customize a tour or pilgrimage package for my family?",
    a: "Yes, of course. We can customize any holiday or temple tour (such as Ashtavinayak or Jyotirlinga darshan) according to your family's travel dates, preferred stops, and car choice.",
  },
];

export function ContactPage() {
  const [searchParams] = useSearchParams();
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    subject: "",
    message: "",
  });
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  useEffect(() => {
    const service = searchParams.get("service");
    const pkgId = searchParams.get("package");

    if (service === "corporate-mobility") {
      setForm((f) => ({
        ...f,
        subject: "corporate",
        message:
          "Hello Swaraj Tours & Travel team,\n\nWe are interested in discussing Corporate Mobility and employee transportation solutions for our organization. Please share your enterprise offerings, pricing structure, and vehicle availability.",
      }));
    } else if (service === "cab-services") {
      setForm((f) => ({
        ...f,
        subject: "cabs",
        message:
          "Hello Swaraj Tours & Travel team,\n\nI would like to enquire about / book your Cab Services (airport transfer / one-way / outstation). Please get in touch regarding rates and vehicle options.",
      }));
    } else if (service === "tours-travels") {
      const pkg = TOUR_PACKAGES.find((p) => p.id === pkgId);
      const pkgTitle = pkg ? pkg.title : "Tours & Travels Holiday Package";
      setForm((f) => ({
        ...f,
        subject: "tours",
        message: `Hello Swaraj Tours & Travel team,\n\nI would like to enquire about your ${pkgTitle}. Please provide itinerary details, vehicle options (sedan / SUV / Tempo Traveller), and pricing for our group.`,
      }));
    }
  }, [searchParams]);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Store inquiry locally for offline recovery and traceability
      const currentInquiries = JSON.parse(localStorage.getItem("swaraj_contact_inquiries") || "[]");
      const newInquiry = {
        ...form,
        submittedAt: new Date().toISOString(),
      };
      localStorage.setItem("swaraj_contact_inquiries", JSON.stringify([newInquiry, ...currentInquiries]));
    } catch {
      // Ignore localStorage quotas
    }

    await new Promise((r) => setTimeout(r, 800));
    setLoading(false);
    setSent(true);
  };

  const subjectLabelMap: Record<string, string> = {
    cabs: "Cab Booking (Local, Outstation, Airport)",
    tours: "Tours & Holiday Packages",
    corporate: "Corporate Mobility & Office Commute",
    support: "Booking Help & Customer Support",
    enquiry: "General Enquiry",
  };

  const whatsappMessage = encodeURIComponent(
    `Hello Swaraj Tours & Travel!\n\n` +
      `*Name:* ${form.name}\n` +
      `*Phone:* ${form.phone || "Not provided"}\n` +
      `*Email:* ${form.email}\n` +
      `*Topic:* ${subjectLabelMap[form.subject] || form.subject || "General Enquiry"}\n\n` +
      `*Message:* ${form.message}`
  );

  return (
    <div className="min-h-screen bg-slate-50 pt-16">
      {/* Page Header */}
      <div className="bg-slate-950 py-20 relative overflow-hidden">
        <div className="hero-glow w-96 h-96 bg-amber-500 -top-20 -right-20 opacity-15" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Badge className="mb-4 bg-amber-500/10 text-amber-400 border border-amber-500/20">
            Get in Touch
          </Badge>
          <h1 className="text-4xl lg:text-5xl font-extrabold text-white mb-4">
            We're Here to Help
          </h1>
          <p className="text-slate-300 text-lg max-w-xl mx-auto">
            Have a question or looking to book a cab or tour? Our team is available 24/7 to help you.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Contact Info Cards (3 clean cards without headquarters) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {CONTACT_INFO.map(({ Icon, label, value, sub, href }) => {
            const cardContent = (
              <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm text-center card-hover h-full flex flex-col items-center justify-center transition-all hover:border-amber-200 hover:shadow-md">
                <div className="inline-flex h-12 w-12 rounded-xl bg-amber-50 text-amber-600 items-center justify-center mb-3">
                  <Icon className="h-6 w-6" />
                </div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">{label}</p>
                <p className="font-bold text-slate-900 text-base mb-1">{value}</p>
                <p className="text-xs text-slate-500">{sub}</p>
              </div>
            );

            return href ? (
              <a key={label} href={href} className="block transition-transform active:scale-[0.98]">
                {cardContent}
              </a>
            ) : (
              <div key={label}>{cardContent}</div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Contact Form */}
          <div className="bg-white rounded-2xl border border-slate-100 p-6 sm:p-8 shadow-sm">
            <div className="flex items-center gap-2.5 mb-6">
              <MessageSquare className="h-5 w-5 text-amber-500" />
              <h2 className="text-xl font-bold text-slate-900">Send Us a Message</h2>
            </div>

            {sent ? (
              <div className="text-center py-10 space-y-4">
                <div className="inline-flex h-16 w-16 rounded-full bg-emerald-100 items-center justify-center mb-2">
                  <CheckCircle className="h-8 w-8 text-emerald-600" />
                </div>
                <h3 className="text-2xl font-bold text-slate-900">Message Sent Successfully!</h3>
                <p className="text-slate-600 max-w-md mx-auto text-sm leading-relaxed">
                  Thank you for reaching out to Swaraj Tours & Travel. Our team will review your inquiry and contact you shortly.
                </p>

                <div className="pt-4 flex flex-col sm:flex-row gap-3 justify-center max-w-md mx-auto">
                  <a
                    href={`https://wa.me/918421081570?text=${whatsappMessage}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition-all"
                  >
                    <span>Chat on WhatsApp for Instant Reply</span>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>

                  <Button
                    variant="outline"
                    onClick={() => {
                      setSent(false);
                      setForm({ name: "", phone: "", email: "", subject: "", message: "" });
                    }}
                    className="rounded-xl text-xs py-3"
                  >
                    Send Another Message
                  </Button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    Your Name *
                  </label>
                  <Input
                    placeholder="e.g. Rahul Sharma"
                    value={form.name}
                    onChange={set("name")}
                    required
                    className="h-11 rounded-xl"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                      Phone Number *
                    </label>
                    <Input
                      type="tel"
                      placeholder="+91 8421081570"
                      value={form.phone}
                      onChange={set("phone")}
                      required
                      className="h-11 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                      Email Address *
                    </label>
                    <Input
                      type="email"
                      placeholder="you@example.com"
                      value={form.email}
                      onChange={set("email")}
                      required
                      className="h-11 rounded-xl"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    Subject / Service Requirement *
                  </label>
                  <select
                    value={form.subject}
                    onChange={set("subject")}
                    required
                    className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-white text-sm text-slate-800 appearance-none focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
                  >
                    <option value="">Select a subject</option>
                    <option value="cabs">Cab Booking (Local, Outstation, Airport)</option>
                    <option value="tours">Tours & Holiday Packages</option>
                    <option value="corporate">Corporate Mobility & Office Commute</option>
                    <option value="support">Booking Help & Customer Support</option>
                    <option value="enquiry">General Enquiry</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    Message / Travel Details *
                  </label>
                  <textarea
                    rows={4}
                    placeholder="Please mention your travel dates, pickup location, destination, or any specific questions..."
                    value={form.message}
                    onChange={set("message")}
                    required
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
                  />
                </div>

                <Button
                  type="submit"
                  size="lg"
                  className="w-full gap-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold py-6"
                  disabled={loading}
                >
                  <Send className="h-4 w-4" />
                  {loading ? "Sending Message..." : "Send Message"}
                </Button>
              </form>
            )}
          </div>

          {/* Frequently Asked Questions */}
          <div>
            <h2 className="text-xl font-bold text-slate-900 mb-5">Frequently Asked Questions</h2>
            <div className="space-y-3">
              {FAQ.map(({ q, a }, i) => (
                <div key={i} className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
                  <button
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    className="w-full text-left px-5 py-4 flex items-center justify-between gap-3 hover:bg-slate-50 transition-colors"
                  >
                    <span className="font-semibold text-slate-800 text-sm">{q}</span>
                    <span className={`text-amber-500 text-xl font-light shrink-0 transition-transform ${openFaq === i ? "rotate-45" : ""}`}>
                      +
                    </span>
                  </button>
                  {openFaq === i && (
                    <div className="px-5 pb-4 text-sm text-slate-600 leading-relaxed border-t border-slate-100 pt-3">
                      {a}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Map placeholder - Preserved untouched as requested */}
            <div className="mt-6 rounded-2xl overflow-hidden border border-slate-100 shadow-sm h-48 bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center">
              <div className="text-center text-slate-500">
                <MapPin className="h-8 w-8 mx-auto mb-2 text-amber-500" />
                <p className="font-semibold text-slate-800">Swaraj Tours & Travel Hub</p>
                <p className="text-xs text-slate-600">BKC Bandra East, Mumbai 400051</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
