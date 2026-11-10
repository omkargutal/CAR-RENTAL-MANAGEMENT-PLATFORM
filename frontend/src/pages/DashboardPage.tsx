import { Link } from "react-router-dom";
import {
  Car, TrendingUp, Calendar, IndianRupee, Clock, MapPin,
  Star, Bell, ChevronRight, ArrowUpRight
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/context/AuthContext";

const STATS = [
  { label: "Total Bookings", value: "12", change: "+2 this month", Icon: Calendar, color: "text-blue-600 bg-blue-50" },
  { label: "Total Spent", value: "₹32,400", change: "+₹4,800 this month", Icon: IndianRupee, color: "text-emerald-600 bg-emerald-50" },
  { label: "KM Traveled", value: "4,280", change: "Across 12 trips", Icon: TrendingUp, color: "text-purple-600 bg-purple-50" },
  { label: "Reward Points", value: "1,850", change: "Redeem anytime", Icon: Star, color: "text-amber-600 bg-amber-50" },
];

const RECENT_BOOKINGS = [
  {
    id: "BK-2041",
    car: "Toyota Innova Crysta",
    dates: "Oct 15 – Oct 18, 2026",
    location: "Pune to Mumbai Airport",
    status: "completed",
    amount: "₹5,670",
    img: "/assets/vehicles/toyota-innova-crysta/toyota-innova-crysta.png",
  },
  {
    id: "BK-2039",
    car: "White Maruti Suzuki Dzire",
    dates: "Oct 5 – Oct 7, 2026",
    location: "Local City Cab (Pune)",
    status: "completed",
    amount: "₹2,580",
    img: "/assets/vehicles/maruti-suzuki-dzire/white-maruti-suzuki-dzire.png",
  },
  {
    id: "BK-2047",
    car: "Hyundai Aura",
    dates: "Nov 20 – Nov 23, 2026",
    location: "Mumbai Airport Transfer",
    status: "upcoming",
    amount: "₹4,770",
    img: "/assets/vehicles/hyundai-aura/hyundai-aura.png",
  },
];

const statusVariant: Record<string, "success" | "default" | "warning"> = {
  completed: "success",
  upcoming: "default",
  cancelled: "warning",
};

export function DashboardPage() {
  const { user } = useAuth();
  const firstName = user?.full_name ? user.full_name.split(" ")[0] : "Traveler";

  return (
    <div className="min-h-screen bg-slate-50 pt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900">Good day, {firstName}! 👋</h1>
            <p className="text-slate-500 mt-1">Here's what's happening with your trips</p>
          </div>
          <div className="flex items-center gap-3">
            <button className="relative h-10 w-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:text-blue-600 hover:border-blue-300 transition-all shadow-sm">
              <Bell className="h-5 w-5" />
              <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-red-500" />
            </button>
            <Link to="/cars">
              <Button className="gap-2">
                <Car className="h-4 w-4" />
                Book a Cab
              </Button>
            </Link>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
          {STATS.map(({ label, value, change, Icon, color }) => (
            <Card key={label} className="border-slate-100 shadow-sm card-hover">
              <CardContent className="pt-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">{label}</p>
                    <p className="text-3xl font-extrabold text-slate-900">{value}</p>
                    <p className="text-xs text-slate-400 mt-1">{change}</p>
                  </div>
                  <div className={`h-11 w-11 rounded-xl flex items-center justify-center ${color}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Bookings */}
          <div className="lg:col-span-2">
            <Card className="border-slate-100 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle className="text-lg">Recent Bookings</CardTitle>
                <Link to="/bookings" className="text-sm text-blue-600 hover:underline flex items-center gap-1">
                  View all <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </CardHeader>
              <CardContent className="space-y-3">
                {RECENT_BOOKINGS.map((b) => (
                  <div key={b.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors group">
                    <img
                      src={b.img}
                      alt={b.car}
                      className="h-14 w-20 rounded-xl object-cover shrink-0 bg-slate-100"
                      onError={(e) => { (e.target as HTMLImageElement).src = `https://placehold.co/80x56/e2e8f0/94a3b8?text=Car` }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-900 text-sm truncate">{b.car}</p>
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
                        <Calendar className="h-3 w-3" />
                        {b.dates}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-0.5">
                        <MapPin className="h-3 w-3" />
                        {b.location}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-bold text-slate-900 text-sm">{b.amount}</p>
                      <Badge variant={statusVariant[b.status]} className="mt-1 text-xs capitalize">{b.status}</Badge>
                    </div>
                    <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-blue-500 transition-colors" />
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Right sidebar */}
          <div className="space-y-5">
            {/* Profile Summary */}
            <Card className="border-slate-100 shadow-sm">
              <CardContent className="pt-5">
                <div className="flex items-center gap-4 mb-4">
                  <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xl font-black shadow-lg shadow-blue-500/30">
                    JD
                  </div>
                  <div>
                    <p className="font-bold text-slate-900">John Doe</p>
                    <p className="text-sm text-slate-500">john.doe@example.com</p>
                    <Badge variant="gold" className="mt-1 text-xs">Gold Member</Badge>
                  </div>
                </div>
                <div className="space-y-2">
                  <Link to="/profile">
                    <Button variant="outline" size="sm" className="w-full justify-between">
                      Edit Profile <ArrowUpRight className="h-3.5 w-3.5" />
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>

            {/* Upcoming */}
            <Card className="border-slate-100 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold text-slate-700 uppercase tracking-wide">Next Booking</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-blue-50 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="h-4 w-4 text-blue-500" />
                    <span className="text-xs font-semibold text-blue-700">In 18 days</span>
                  </div>
                  <p className="font-bold text-slate-900">Mercedes E-Class</p>
                  <p className="text-xs text-slate-500 mt-1">Nov 20 – Nov 23, 2026</p>
                  <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                    <MapPin className="h-3 w-3" /> Oakland Airport
                  </p>
                  <div className="mt-3">
                    <Button size="sm" variant="outline" className="w-full text-xs">Manage Booking</Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card className="border-slate-100 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold text-slate-700 uppercase tracking-wide">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {[
                  { label: "Book a Car", href: "/cars", Icon: Car },
                  { label: "My Bookings", href: "/bookings", Icon: Calendar },
                  { label: "Edit Profile", href: "/profile", Icon: Star },
                ].map(({ label, href, Icon }) => (
                  <Link key={label} to={href}>
                    <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-slate-700 hover:bg-blue-50 hover:text-blue-700 transition-colors text-left">
                      <Icon className="h-4 w-4 text-blue-500" />
                      {label}
                    </button>
                  </Link>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
