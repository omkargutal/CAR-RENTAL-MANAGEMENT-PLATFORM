import { Link } from "react-router-dom";
import { Mail, Phone, MapPin, Instagram, Facebook } from "lucide-react";

const FOOTER_LINKS = {
  Company: [
    { label: "About Us", href: "/about" },
    { label: "Contact", href: "/contact" },
  ],
  Services: [
    { label: "Explore Fleet", href: "/cars" },
    { label: "Corporate Mobility", href: "/services#corporate-mobility" },
    { label: "Cab Services", href: "/services#cab-services" },
    { label: "Tours & Travels", href: "/services#tours-travels" },
  ],
  Support: [
    { label: "Help Center", href: "/contact" },
    { label: "Safety Guidelines", href: "/safety" },
    { label: "Cancellation & Refund Policy", href: "/cancellation-policy" },
    { label: "Terms & Conditions", href: "/terms-and-conditions" },
  ],
};

const SOCIAL = [
  { Icon: Instagram, href: "#", label: "Instagram", colorClass: "text-pink-400 hover:border-pink-500/50 hover:bg-pink-950/30" },
  { Icon: Facebook, href: "#", label: "Facebook", colorClass: "text-blue-400 hover:border-blue-500/50 hover:bg-blue-950/30" },
];

export function Footer() {
  return (
    <footer className="bg-slate-950 text-slate-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 mb-12">
          {/* Brand */}
          <div className="lg:col-span-2">
            <Link to="/" className="flex items-center gap-2.5 mb-4 group">
              <img
                src="/assets/brand/logo-circle.png"
                alt="Swaraj Tours & Travel"
                className="h-10 w-10 object-contain rounded-full ring-1 ring-amber-400/40 shadow-sm transition-transform group-hover:scale-105"
              />
              <div className="flex flex-col leading-none">
                <span className="text-lg font-black tracking-wide text-amber-500 group-hover:text-amber-400 transition-colors">
                  SWARAJ
                </span>
                <span className="text-[10px] font-extrabold tracking-widest uppercase text-slate-300 mt-0.5">
                  TOURS & TRAVEL
                </span>
              </div>
            </Link>
            <p className="text-sm text-slate-400 leading-relaxed mb-6 max-w-xs">
              Your trusted travel & mobility partner. Providing comfortable cabs, outstation taxis, airport transfers, corporate transportation and memorable tour packages.
            </p>
            <div className="space-y-2 text-sm mb-6">
              <div className="flex items-center gap-2 text-slate-400">
                <MapPin className="h-4 w-4 text-amber-400 shrink-0" />
                <span>Swaraj Tours & Travel Hub, BKC Bandra East, Mumbai 400051</span>
              </div>
              <div className="flex items-center gap-2 text-slate-400">
                <Phone className="h-4 w-4 text-amber-400 shrink-0" />
                <a href="tel:+918421081570" className="hover:text-white transition-colors">+91 8421081570</a>
              </div>
              <div className="flex items-center gap-2 text-slate-400">
                <Mail className="h-4 w-4 text-amber-400 shrink-0" />
                <a href="mailto:swarajcabservice@gmail.com" className="hover:text-white transition-colors">swarajcabservice@gmail.com</a>
              </div>
            </div>

            {/* Social Links: Instagram & Facebook */}
            <div className="pt-2">
              <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400 block mb-2.5">
                Connect With Us
              </span>
              <div className="flex items-center gap-2.5">
                {SOCIAL.map(({ Icon, href, label, colorClass }) => (
                  <a
                    key={label}
                    href={href}
                    aria-label={label}
                    className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white ${colorClass} transition-all text-xs font-semibold shadow-sm group`}
                  >
                    <Icon className="h-4 w-4 group-hover:scale-110 transition-transform" />
                    <span>{label}</span>
                  </a>
                ))}
              </div>
            </div>
          </div>

          {/* Links */}
          {Object.entries(FOOTER_LINKS).map(([category, links]) => (
            <div key={category}>
              <h4 className="text-white font-semibold mb-4">{category}</h4>
              <ul className="space-y-2.5">
                {links.map((link) => (
                  <li key={link.label}>
                    <Link to={link.href} className="text-sm text-slate-400 hover:text-white transition-colors">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom */}
        <div className="pt-8 border-t border-slate-800 text-xs text-slate-500">
          <p>
            © {new Date().getFullYear()} Swaraj Tours & Travel. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
