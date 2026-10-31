import React from "react";
import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/auth";
import { connectToDatabase } from "@/lib/database/mongoose";
import { User, Ticket, Bookmark as BookmarkModel } from "@/models";
import { USER_ROLES } from "@/constants/roles";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/shared/status-pill";
import {
  Calendar,
  Ticket as TicketIcon,
  CheckCircle2,
  Bookmark,
  Compass,
  User as UserIcon,
  Clock,
  ChevronRight,
  Sparkles,
  School,
  GraduationCap,
  Mail,
  ShieldCheck,
  ArrowRight,
} from "lucide-react";

export default async function StudentDashboardPage() {
  // 1. Authenticate user server-side
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/student");
  }

  // 2. Enforce strict role authorization
  const role = (session.user as { role?: string }).role;
  if (role !== USER_ROLES.STUDENT) {
    if (role === USER_ROLES.ADMIN) {
      redirect("/admin");
    } else if (role === USER_ROLES.ORGANIZER) {
      redirect("/organizer");
    } else {
      redirect("/login");
    }
  }

  // 3. Connect to MongoDB and query the real student document
  await connectToDatabase();
  const student = await User.findById(session.user.id).select("-password").lean();

  if (!student) {
    redirect("/login?callbackUrl=/student");
  }

  // 4. Query genuine student ticket statistics & registrations from MongoDB
  let totalTicketsCount = 0;
  let attendedCount = 0;
  let savedEventsCount = 0;
  let upcomingTickets: Array<{
    _id: string;
    tierName: string;
    ticketCode: string;
    isCheckedIn: boolean;
    createdAt: Date;
    eventId?: {
      _id: string;
      title: string;
      slug: string;
      organizerName: string;
      startDate: Date;
      venue: string;
      flyerUrl?: string;
      category: string;
    } | null;
  }> = [];

  try {
    const studentObjectId = student._id;

    const [totalTickets, attendedTickets, activeTickets, savedCount] = await Promise.all([
      Ticket.countDocuments({ userId: studentObjectId }),
      Ticket.countDocuments({ userId: studentObjectId, isCheckedIn: true }),
      Ticket.find({ userId: studentObjectId, isCheckedIn: false })
        .populate("eventId")
        .sort({ createdAt: -1 })
        .limit(3)
        .lean(),
      BookmarkModel.countDocuments({ userId: studentObjectId }),
    ]);

    totalTicketsCount = totalTickets;
    attendedCount = attendedTickets;
    savedEventsCount = savedCount;
    upcomingTickets = activeTickets as unknown as typeof upcomingTickets;
  } catch (error) {
    console.error("❌ Failed to query student tickets:", error);
  }

  const upcomingCount = upcomingTickets.length;

  // 5. Time-of-day greeting
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const firstName = student.name ? student.name.split(" ")[0] : "Student";
  const studentInitials =
    student.name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "ST";

  // Next upcoming event (if any)
  const nextTicket = upcomingTickets[0];
  const nextEvent = nextTicket?.eventId;

  return (
    <div className="space-y-8">
      {/* 1. Welcome Header & Greeting */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-notari-dark tracking-tight">
            {greeting}, {firstName}! 👋
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Welcome to your NOTARI student portal. Discover campus activities, manage passes, and track university events.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/events">
            <Button size="sm" className="rounded-xl h-10 text-xs font-semibold gap-2 shadow-sm">
              <Compass className="w-4 h-4" />
              <span>Explore Events</span>
            </Button>
          </Link>
          <Link href="/student/tickets">
            <Button size="sm" variant="outline" className="rounded-xl h-10 text-xs font-semibold gap-2">
              <TicketIcon className="w-4 h-4 text-emerald-600" />
              <span>My Passes</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* 2. Authenticated Student Identity & Profile Snapshot Card */}
      <Card className="p-4 sm:p-5 border-slate-200/80 shadow-sm bg-white rounded-2xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5 sm:gap-4">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-indigo-50 text-notari-primary border border-indigo-100 flex items-center justify-center font-bold text-base sm:text-lg shrink-0">
              {studentInitials}
            </div>

            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-bold text-notari-dark truncate">
                  {student.name}
                </h3>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 text-notari-primary border border-indigo-200/70">
                  <ShieldCheck className="w-3 h-3" />
                  <span>Student • OAU</span>
                </span>
                {student.isVerified && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Verified
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                <span className="flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  <span className="truncate">{student.email}</span>
                </span>
                {student.matricNumber && (
                  <span className="flex items-center gap-1.5">
                    <GraduationCap className="w-3.5 h-3.5 text-slate-400" />
                    <span className="font-mono font-medium text-slate-700">{student.matricNumber}</span>
                  </span>
                )}
                {(student.faculty || student.department) && (
                  <span className="flex items-center gap-1.5">
                    <School className="w-3.5 h-3.5 text-slate-400" />
                    <span className="truncate">
                      {[student.department, student.faculty].filter(Boolean).join(" • ")}
                    </span>
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-3 md:pt-0 border-t md:border-t-0 border-slate-100 justify-end shrink-0">
            <Link href="/student/settings">
              <Button size="sm" variant="ghost" className="h-9 text-xs font-semibold text-slate-600 hover:text-notari-dark gap-1.5">
                <UserIcon className="w-3.5 h-3.5" />
                <span>Profile Settings</span>
              </Button>
            </Link>
          </div>
        </div>
      </Card>

      {/* 3. Real Student Metric Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Upcoming Events */}
        <Card className="p-3.5 sm:p-5 border-slate-200/80 shadow-sm bg-white">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-indigo-50 text-notari-primary flex items-center justify-center shrink-0">
              <Calendar className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] sm:text-xs text-slate-400 font-medium truncate">Upcoming</p>
              <h3 className="text-lg sm:text-xl font-bold text-notari-dark">{upcomingCount}</h3>
            </div>
          </div>
        </Card>

        {/* Card 2: My Tickets */}
        <Card className="p-3.5 sm:p-5 border-slate-200/80 shadow-sm bg-white">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <TicketIcon className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] sm:text-xs text-slate-400 font-medium truncate">My Tickets</p>
              <h3 className="text-lg sm:text-xl font-bold text-notari-dark">{totalTicketsCount}</h3>
            </div>
          </div>
        </Card>

        {/* Card 3: Events Attended */}
        <Card className="p-3.5 sm:p-5 border-slate-200/80 shadow-sm bg-white">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] sm:text-xs text-slate-400 font-medium truncate">Attended</p>
              <h3 className="text-lg sm:text-xl font-bold text-notari-dark">{attendedCount}</h3>
            </div>
          </div>
        </Card>

        {/* Card 4: Saved Events */}
        <Link href="/student/saved" className="block">
          <Card className="p-3.5 sm:p-5 border-slate-200/80 shadow-sm bg-white hover:border-purple-300 hover:shadow-md transition-all cursor-pointer h-full">
            <div className="flex items-center gap-2.5 sm:gap-3">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                <Bookmark className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] sm:text-xs text-slate-400 font-medium truncate">Saved Events</p>
                <h3 className="text-lg sm:text-xl font-bold text-notari-dark">{savedEventsCount}</h3>
              </div>
            </div>
          </Card>
        </Link>
      </div>

      {/* 4. Main Content Grid: Upcoming Events + Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Real Upcoming Events or Clean Empty State */}
        <div className="lg:col-span-8 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-notari-dark">Upcoming Events</h2>
            {upcomingCount > 0 && (
              <Link
                href="/student/my-events"
                className="text-xs font-semibold text-notari-primary hover:underline flex items-center gap-1"
              >
                <span>View all</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            )}
          </div>

          {upcomingCount > 0 ? (
            <div className="space-y-3">
              {upcomingTickets.map((tkt) => {
                const evt = tkt.eventId;
                if (!evt) return null;

                const eventDateFormatted = evt.startDate
                  ? new Date(evt.startDate).toLocaleDateString("en-NG", {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                    })
                  : "Date TBA";

                return (
                  <Card
                    key={tkt._id.toString()}
                    className="p-4 border-slate-200/80 bg-white hover:border-slate-300 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-xl"
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-slate-100 shrink-0">
                        {evt.flyerUrl ? (
                          <Image
                            src={evt.flyerUrl}
                            alt={evt.title}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-indigo-50 text-notari-primary font-bold text-sm">
                            {evt.category?.slice(0, 2).toUpperCase() || "EV"}
                          </div>
                        )}
                      </div>

                      <div className="space-y-1 min-w-0">
                        <h4 className="text-sm font-bold text-notari-dark truncate">{evt.title}</h4>
                        <p className="text-xs text-slate-500 truncate">{evt.organizerName}</p>
                        <div className="flex items-center gap-2 text-xs text-slate-400 flex-wrap">
                          <span>{eventDateFormatted}</span>
                          <span>•</span>
                          <span className="truncate">{evt.venue}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end pt-2 sm:pt-0 border-t sm:border-0 border-slate-100 shrink-0">
                      <StatusPill status="confirmed" />
                      <Link href={`/events/${evt.slug}`}>
                        <Button size="sm" variant="outline" className="h-8 text-xs rounded-lg">
                          View Event
                        </Button>
                      </Link>
                    </div>
                  </Card>
                );
              })}
            </div>
          ) : (
            /* Clean Empty State when user has no active tickets */
            <Card className="p-8 border-slate-200/80 bg-white text-center space-y-4 rounded-2xl">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-notari-primary flex items-center justify-center mx-auto">
                <Calendar className="w-6 h-6" />
              </div>
              <div className="space-y-1.5 max-w-md mx-auto">
                <h3 className="text-base font-bold text-notari-dark">No upcoming events yet</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  You haven&apos;t registered for any campus events yet. Explore upcoming academic conferences, departmental workshops, and student gatherings across Great Ife.
                </p>
              </div>
              <div className="pt-2">
                <Link href="/events">
                  <Button className="rounded-xl text-xs font-semibold gap-2 shadow-sm">
                    <Compass className="w-4 h-4" />
                    <span>Explore Campus Events</span>
                  </Button>
                </Link>
              </div>
            </Card>
          )}
        </div>

        {/* Right Column: Quick Actions & Context Banner */}
        <div className="lg:col-span-4 space-y-6">
          {/* Quick Actions Card */}
          <Card className="p-5 sm:p-6 border-slate-200/80 shadow-sm bg-white space-y-4 rounded-2xl">
            <h3 className="text-xs font-bold text-notari-dark uppercase tracking-wider text-slate-400">
              Quick Actions
            </h3>
            <div className="space-y-2">
              <Link href="/events" className="block">
                <Button variant="outline" className="w-full justify-between h-11 text-xs font-semibold rounded-xl hover:border-indigo-200 hover:bg-indigo-50/50">
                  <span className="flex items-center gap-2.5">
                    <Compass className="w-4 h-4 text-notari-primary" />
                    <span>Browse Campus Events</span>
                  </span>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                </Button>
              </Link>
              <Link href="/student/tickets" className="block">
                <Button variant="outline" className="w-full justify-between h-11 text-xs font-semibold rounded-xl hover:border-emerald-200 hover:bg-emerald-50/50">
                  <span className="flex items-center gap-2.5">
                    <TicketIcon className="w-4 h-4 text-emerald-600" />
                    <span>My Active Passes</span>
                  </span>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                </Button>
              </Link>
              <Link href="/student/my-events" className="block">
                <Button variant="outline" className="w-full justify-between h-11 text-xs font-semibold rounded-xl hover:border-indigo-200 hover:bg-indigo-50/50">
                  <span className="flex items-center gap-2.5">
                    <Calendar className="w-4 h-4 text-notari-primary" />
                    <span>My Registered Events</span>
                  </span>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                </Button>
              </Link>
              <Link href="/student/saved" className="block">
                <Button variant="outline" className="w-full justify-between h-11 text-xs font-semibold rounded-xl hover:border-purple-200 hover:bg-purple-50/50">
                  <span className="flex items-center gap-2.5">
                    <Bookmark className="w-4 h-4 text-purple-600" />
                    <span>Saved Events</span>
                  </span>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                </Button>
              </Link>
              <Link href="/student/history" className="block">
                <Button variant="outline" className="w-full justify-between h-11 text-xs font-semibold rounded-xl hover:border-amber-200 hover:bg-amber-50/50">
                  <span className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-amber-600" />
                    <span>Event History</span>
                  </span>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                </Button>
              </Link>
              <Link href="/student/settings" className="block">
                <Button variant="outline" className="w-full justify-between h-11 text-xs font-semibold rounded-xl hover:border-slate-300">
                  <span className="flex items-center gap-2.5">
                    <UserIcon className="w-4 h-4 text-slate-600" />
                    <span>Profile & Settings</span>
                  </span>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                </Button>
              </Link>
            </div>
          </Card>

          {/* Context Banner: Next Event Reminder or OAU Campus Life Prompt */}
          {nextEvent ? (
            <Card className="p-6 bg-gradient-to-br from-indigo-700 via-indigo-800 to-purple-900 text-white border-0 shadow-md space-y-3 rounded-2xl">
              <div className="flex items-center gap-2 text-indigo-200 text-xs font-semibold uppercase tracking-wider">
                <Clock className="w-4 h-4" />
                <span>Next Upcoming Event</span>
              </div>
              <h4 className="text-lg font-bold leading-snug line-clamp-2">
                {nextEvent.title}
              </h4>
              <p className="text-xs text-indigo-100 leading-relaxed">
                Venue: {nextEvent.venue}. Make sure to download or screenshot your QR check-in pass.
              </p>
              <div className="pt-2">
                <Link href="/student/tickets">
                  <Button size="sm" variant="secondary" className="w-full text-xs font-bold rounded-lg shadow gap-2">
                    <span>Access Digital Pass</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                </Link>
              </div>
            </Card>
          ) : (
            <Card className="p-6 bg-gradient-to-br from-indigo-700 via-indigo-800 to-purple-900 text-white border-0 shadow-md space-y-3 rounded-2xl">
              <div className="flex items-center gap-2 text-indigo-200 text-xs font-semibold uppercase tracking-wider">
                <Sparkles className="w-4 h-4" />
                <span>Campus Experience</span>
              </div>
              <h4 className="text-lg font-bold leading-snug">
                Connect With Great Ife Events
              </h4>
              <p className="text-xs text-indigo-100 leading-relaxed">
                Stay updated with faculty symposiums, hackathons, concerts, and leadership summits happening at OAU.
              </p>
              <div className="pt-2">
                <Link href="/events">
                  <Button size="sm" variant="secondary" className="w-full text-xs font-bold rounded-lg shadow gap-2">
                    <Compass className="w-4 h-4" />
                    <span>Browse All Events</span>
                  </Button>
                </Link>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
