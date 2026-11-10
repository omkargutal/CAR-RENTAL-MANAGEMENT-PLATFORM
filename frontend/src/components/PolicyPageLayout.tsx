import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  ArrowUp,
  Phone,
  Mail,
  MessageCircle,
  ShieldAlert,
  Clock,
  Calendar,
  ChevronRight,
  List,
  Sparkles,
} from "lucide-react";
import { BUSINESS_POLICY_CONFIG } from "@/data/policyConfig";

export interface TocItem {
  id: string;
  label: string;
  badge?: string;
}

interface PolicyPageLayoutProps {
  title: string;
  subtitle: string;
  badgeText: string;
  badgeIcon?: React.ReactNode;
  seoTitle: string;
  seoDescription: string;
  tocItems: TocItem[];
  children: React.ReactNode;
  currentPath: "/safety" | "/cancellation-policy" | "/terms-and-conditions";
}

export function PolicyPageLayout({
  title,
  subtitle,
  badgeText,
  badgeIcon,
  seoTitle,
  seoDescription,
  tocItems,
  children,
  currentPath,
}: PolicyPageLayoutProps) {
  const [activeSection, setActiveSection] = useState<string>(tocItems[0]?.id || "");
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [mobileTocOpen, setMobileTocOpen] = useState(false);

  // Update Page Title and Meta Description for SEO
  useEffect(() => {
    document.title = `${seoTitle} | ${BUSINESS_POLICY_CONFIG.brandName}`;
    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement("meta");
      metaDesc.setAttribute("name", "description");
      document.head.appendChild(metaDesc);
    }
    metaDesc.setAttribute("content", seoDescription);

    // Scroll to top on initial page load
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [seoTitle, seoDescription]);

  // Back to top scroll listener
  useEffect(() => {
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 400);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // IntersectionObserver for Table of Contents Scrollspy
  useEffect(() => {
    if (tocItems.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      {
        rootMargin: "-100px 0px -60% 0px",
        threshold: 0,
      }
    );

    tocItems.forEach((item) => {
      const el = document.getElementById(item.id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [tocItems]);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleTocClick = (id: string) => {
    setActiveSection(id);
    setMobileTocOpen(false);
    const targetEl = document.getElementById(id);
    if (targetEl) {
      const topOffset = 90;
      const elementPosition = targetEl.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - topOffset;
      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth",
      });
    }
  };

  const POLICY_LINKS = [
    {
      title: "Safety Guidelines",
      path: "/safety",
      desc: "Our passenger & journey safety standards, emergency protocols and child safety guidance.",
    },
    {
      title: "Cancellation & Refund Policy",
      path: "/cancellation-policy",
      desc: "Transparent cancellation schedules, refund procedures, no-show rules, and dispute resolution.",
    },
    {
      title: "Terms & Conditions",
      path: "/terms-and-conditions",
      desc: "Binding service terms, pricing structures, customer obligations, and operational provisions.",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pt-20 pb-16">
      {/* Top Banner / Breadcrumb Bar */}
      <div className="bg-slate-900 border-b border-slate-800 text-slate-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
            {/* Breadcrumbs */}
            <nav aria-label="Breadcrumb" className="flex items-center gap-2">
              <Link to="/" className="text-slate-400 hover:text-white transition-colors">
                Home
              </Link>
              <ChevronRight className="h-4 w-4 text-slate-600" />
              <span className="text-blue-400 font-medium">{title}</span>
            </nav>

            {/* Quick Return to Home Button */}
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg border border-slate-700 transition-all"
            >
              <ArrowLeft className="h-3.5 w-3.5 text-blue-400" />
              <span>Back to Home</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Hero Section */}
      <header className="bg-gradient-to-b from-slate-950 via-slate-900 to-slate-900 text-white border-b border-slate-800 py-12 md:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-900/60 border border-blue-500/30 text-blue-300 text-xs font-semibold mb-4 backdrop-blur-sm">
              {badgeIcon || <Sparkles className="h-3.5 w-3.5 text-blue-400" />}
              <span>{badgeText}</span>
            </div>

            {/* H1 Title */}
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white mb-4 leading-tight">
              {title}
            </h1>

            {/* Subtitle */}
            <p className="text-base sm:text-lg text-slate-300 leading-relaxed max-w-3xl mb-8">
              {subtitle}
            </p>

            {/* Metadata Bar */}
            <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-xs text-slate-400 pt-4 border-t border-slate-800/80">
              <div className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-blue-400" />
                <span>Effective Date: <strong className="text-slate-200">{BUSINESS_POLICY_CONFIG.effectiveDate}</strong></span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-amber-400" />
                <span>Last Updated: <strong className="text-slate-200">{BUSINESS_POLICY_CONFIG.lastUpdated}</strong></span>
              </div>
              <div className="flex items-center gap-1.5">
                <ShieldAlert className="h-3.5 w-3.5 text-emerald-400" />
                <span>Jurisdiction: <strong className="text-slate-200">India (Courts of Maharashtra)</strong></span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Table of Contents Accordion Toggle */}
      <div className="lg:hidden sticky top-16 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 py-3 shadow-sm">
        <button
          type="button"
          onClick={() => setMobileTocOpen(!mobileTocOpen)}
          className="w-full flex items-center justify-between text-left text-sm font-bold text-slate-800"
          aria-expanded={mobileTocOpen}
        >
          <span className="flex items-center gap-2">
            <List className="h-4 w-4 text-blue-600" />
            <span>Table of Contents ({tocItems.length} Sections)</span>
          </span>
          <span className="text-xs text-blue-600 font-semibold underline">
            {mobileTocOpen ? "Hide" : "Jump to Section"}
          </span>
        </button>

        {mobileTocOpen && (
          <nav className="mt-3 pt-3 border-t border-slate-200 max-h-72 overflow-y-auto space-y-1">
            {tocItems.map((item, idx) => (
              <button
                key={item.id}
                type="button"
                onClick={() => handleTocClick(item.id)}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors flex items-center justify-between ${
                  activeSection === item.id
                    ? "bg-blue-50 text-blue-700 font-bold border-l-4 border-blue-600"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                <span className="truncate pr-2">
                  <span className="text-slate-400 mr-1.5">{idx + 1}.</span>
                  {item.label}
                </span>
                {item.badge && (
                  <span className="text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded">
                    {item.badge}
                  </span>
                )}
              </button>
            ))}
          </nav>
        )}
      </div>

      {/* Main Two-Column Layout */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Desktop Sticky Table of Contents */}
          <aside className="hidden lg:block lg:col-span-4 sticky top-24">
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-5 overflow-hidden">
              <div className="flex items-center justify-between pb-3.5 mb-3 border-b border-slate-100">
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                  <List className="h-4 w-4 text-blue-600" />
                  Table of Contents
                </h2>
                <span className="text-[11px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                  {tocItems.length} Sections
                </span>
              </div>

              <nav className="space-y-1 max-h-[calc(100vh-220px)] overflow-y-auto pr-1 text-sm custom-scrollbar">
                {tocItems.map((item, index) => {
                  const isActive = activeSection === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleTocClick(item.id)}
                      aria-current={isActive ? "true" : undefined}
                      className={`w-full text-left px-3 py-2 rounded-xl text-xs font-medium transition-all flex items-center justify-between group ${
                        isActive
                          ? "bg-blue-600 text-white font-bold shadow-sm"
                          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                      }`}
                    >
                      <span className="truncate pr-2">
                        <span
                          className={`mr-1.5 font-bold ${
                            isActive ? "text-blue-100" : "text-slate-400 group-hover:text-slate-600"
                          }`}
                        >
                          {index + 1}.
                        </span>
                        {item.label}
                      </span>
                      {item.badge && (
                        <span
                          className={`text-[9px] px-1.5 py-0.5 rounded uppercase font-semibold shrink-0 ${
                            isActive ? "bg-blue-700 text-blue-100" : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </nav>

              {/* Quick Helpline Box inside sticky TOC */}
              <div className="mt-6 pt-4 border-t border-slate-100 bg-slate-50/80 -mx-5 -mb-5 p-4 rounded-b-2xl">
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Direct Helpline
                </p>
                <div className="space-y-1.5 text-xs">
                  <a
                    href={`tel:${BUSINESS_POLICY_CONFIG.primaryPhone.replace(/\s+/g, "")}`}
                    className="flex items-center gap-2 text-slate-700 hover:text-blue-600 font-semibold transition-colors"
                  >
                    <Phone className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                    <span>{BUSINESS_POLICY_CONFIG.primaryPhone}</span>
                  </a>
                  <a
                    href={`https://wa.me/${BUSINESS_POLICY_CONFIG.whatsappPhone.replace(/\D/g, "")}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 text-emerald-700 hover:text-emerald-800 font-semibold transition-colors"
                  >
                    <MessageCircle className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                    <span>WhatsApp: {BUSINESS_POLICY_CONFIG.whatsappPhone}</span>
                  </a>
                </div>
              </div>
            </div>
          </aside>

          {/* Main Content Area */}
          <article className="lg:col-span-8 space-y-8">{children}</article>
        </div>

        {/* Support & Dispute Resolution Callout Banner */}
        <section className="mt-16 bg-gradient-to-r from-slate-900 to-slate-950 rounded-3xl p-6 sm:p-10 text-white shadow-xl border border-slate-800">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
            <div className="md:col-span-7 space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-semibold">
                <span>Verified Business Support</span>
              </div>
              <h3 className="text-2xl sm:text-3xl font-extrabold text-white">
                Have questions or need assistance?
              </h3>
              <p className="text-sm text-slate-300 leading-relaxed">
                Our support team is available to assist you with booking queries, journey safety,
                cancellations, refund tracking, and official invoice records.
              </p>
            </div>

            <div className="md:col-span-5 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <a
                href={`tel:${BUSINESS_POLICY_CONFIG.primaryPhone.replace(/\s+/g, "")}`}
                className="bg-slate-800/80 hover:bg-blue-600 p-3.5 rounded-xl border border-slate-700/80 transition-all flex flex-col justify-between group"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-slate-400 group-hover:text-blue-100 font-medium">Phone Support</span>
                  <Phone className="h-4 w-4 text-blue-400 group-hover:text-white" />
                </div>
                <span className="font-bold text-white text-sm">{BUSINESS_POLICY_CONFIG.primaryPhone}</span>
              </a>

              <a
                href={`https://wa.me/${BUSINESS_POLICY_CONFIG.whatsappPhone.replace(/\D/g, "")}`}
                target="_blank"
                rel="noreferrer"
                className="bg-slate-800/80 hover:bg-emerald-600 p-3.5 rounded-xl border border-slate-700/80 transition-all flex flex-col justify-between group"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-slate-400 group-hover:text-emerald-100 font-medium">WhatsApp Support</span>
                  <MessageCircle className="h-4 w-4 text-emerald-400 group-hover:text-white" />
                </div>
                <span className="font-bold text-white text-sm">{BUSINESS_POLICY_CONFIG.whatsappPhone}</span>
              </a>

              <a
                href={`mailto:${BUSINESS_POLICY_CONFIG.supportEmail}`}
                className="bg-slate-800/80 hover:bg-slate-700 p-3.5 rounded-xl border border-slate-700/80 transition-all flex flex-col justify-between sm:col-span-2 group"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-slate-400 group-hover:text-slate-200 font-medium">Official Email</span>
                  <Mail className="h-4 w-4 text-amber-400 group-hover:text-white" />
                </div>
                <span className="font-bold text-white text-sm">{BUSINESS_POLICY_CONFIG.supportEmail}</span>
              </a>
            </div>
          </div>
        </section>

        {/* Cross-Link Related Policies Section */}
        <section className="mt-12 bg-white rounded-2xl border border-slate-200/90 p-6 sm:p-8">
          <div className="mb-6">
            <h3 className="text-base font-bold text-slate-900 mb-1">Related Policy Documents</h3>
            <p className="text-xs text-slate-500">
              Please review all accompanying policies to understand your rights and our commitments.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {POLICY_LINKS.map((link) => {
              const isCurrent = link.path === currentPath;
              return (
                <div
                  key={link.path}
                  className={`p-4 rounded-xl border transition-all flex flex-col justify-between ${
                    isCurrent
                      ? "bg-blue-50/70 border-blue-200 ring-2 ring-blue-500/20"
                      : "bg-slate-50/60 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <h4 className="text-sm font-bold text-slate-900">{link.title}</h4>
                      {isCurrent && (
                        <span className="text-[10px] font-bold uppercase bg-blue-600 text-white px-2 py-0.5 rounded-full">
                          Current Page
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed mb-4">{link.desc}</p>
                  </div>

                  {!isCurrent ? (
                    <Link
                      to={link.path}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors"
                    >
                      <span>Read Policy</span>
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Link>
                  ) : (
                    <span className="text-xs font-semibold text-slate-400">Currently viewing</span>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      </main>

      {/* Floating Back To Top Button */}
      {showBackToTop && (
        <button
          type="button"
          onClick={scrollToTop}
          aria-label="Scroll back to top"
          className="fixed bottom-6 left-6 z-40 p-3 rounded-xl bg-slate-900 hover:bg-blue-600 text-white shadow-lg border border-slate-700 transition-all duration-300 hover:scale-105"
        >
          <ArrowUp className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
