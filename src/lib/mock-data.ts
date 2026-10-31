export interface MockEvent {
  id: string;
  title: string;
  slug: string;
  organizer: string;
  category: string;
  faculty: string;
  venue: string;
  date: string;
  time: string;
  status: "Published" | "Pending Approval" | "Draft" | "Unpublished";
  isFree: boolean;
  price: number;
  capacity: number;
  registered: number;
  available: number;
  image: string;
  description: string;
  highlights: string[];
}

export const MOCK_EVENTS: MockEvent[] = [
  {
    id: "evt-1",
    title: "OAU Tech Summit 2025",
    slug: "oau-tech-summit-2025",
    organizer: "OAU Computer Science Dept.",
    category: "Tech & Innovation",
    faculty: "Science",
    venue: "Engineering Auditorium",
    date: "May 15, 2025",
    time: "9:00 AM - 4:00 PM",
    status: "Published",
    isFree: false,
    price: 3500,
    capacity: 500,
    registered: 350,
    available: 150,
    image: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&auto=format&fit=crop&q=80",
    description: "Join us for an inspiring day of innovation, hands-on workshops, and keynote addresses from industry experts. The Student Tech Symposium brings together passionate students, innovators, and tech leaders to explore the future of technology and its impact on society.",
    highlights: ["Hands-on experience with AI tools", "Guidance from experienced engineers", "Networking opportunities with top tech firms"],
  },
  {
    id: "evt-2",
    title: "Creative Writing Workshop",
    slug: "creative-writing-workshop",
    organizer: "OAU English Dept.",
    category: "Arts & Culture",
    faculty: "Arts",
    venue: "Arts Building, Room 101",
    date: "May 20, 2025",
    time: "2:00 PM - 5:00 PM",
    status: "Published",
    isFree: true,
    price: 0,
    capacity: 120,
    registered: 96,
    available: 24,
    image: "https://images.unsplash.com/photo-1455390582262-044cdead277a?w=800&auto=format&fit=crop&q=80",
    description: "Unlock your narrative potential with renowned authors and essayists. This interactive session focuses on storytelling techniques, publishing insights, and peer critique.",
    highlights: ["Writing critique circles", "Publishing guidance", "Certificate of participation"],
  },
  {
    id: "evt-3",
    title: "Robotics & Embedded Systems Workshop",
    slug: "robotics-workshop",
    organizer: "OAU Engineering Faculty",
    category: "Tech & Innovation",
    faculty: "Technology",
    venue: "Engineering Lab 2",
    date: "May 28, 2025",
    time: "10:00 AM - 3:00 PM",
    status: "Pending Approval",
    isFree: false,
    price: 2500,
    capacity: 80,
    registered: 65,
    available: 15,
    image: "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=800&auto=format&fit=crop&q=80",
    description: "Practical hands-on microcontroller programming and hardware prototyping using Arduino and Raspberry Pi. Designed for aspiring robotics engineers.",
    highlights: ["Hardware starter kit provided", "Live prototyping demo", "Team project challenge"],
  },
  {
    id: "evt-4",
    title: "Mental Health Awareness Symposium",
    slug: "mental-health-awareness",
    organizer: "OAU Student Union",
    category: "Health & Wellness",
    faculty: "Basic Medical Sciences",
    venue: "Health Sciences Auditorium",
    date: "Jun 2, 2025",
    time: "11:00 AM - 2:00 PM",
    status: "Published",
    isFree: true,
    price: 0,
    capacity: 250,
    registered: 180,
    available: 70,
    image: "https://images.unsplash.com/photo-1573497620053-ea5300f94f21?w=800&auto=format&fit=crop&q=80",
    description: "Promoting psychological well-being, stress management for university students, and peer support networks on Great Ife campus.",
    highlights: ["Counseling psychologists panel", "Safe space Q&A", "Free mindfulness resources"],
  },
  {
    id: "evt-5",
    title: "OAU Annual Career & Internship Fair 2025",
    slug: "career-fair-2025",
    organizer: "OAU Career Services",
    category: "Career & Professional",
    faculty: "Administration",
    venue: "Oduduwa Hall",
    date: "Jun 10, 2025",
    time: "9:00 AM - 5:00 PM",
    status: "Draft",
    isFree: true,
    price: 0,
    capacity: 1000,
    registered: 410,
    available: 590,
    image: "https://images.unsplash.com/photo-1515187029135-18ee286d815b?w=800&auto=format&fit=crop&q=80",
    description: "Connect directly with top employers in finance, tech, law, and engineering for graduate trainee positions and student internships.",
    highlights: ["CV review clinic", "On-site mock interviews", "50+ hiring company booths"],
  },
  {
    id: "evt-6",
    title: "Great Ife Music & Culture Concert",
    slug: "music-concert-2025",
    organizer: "OAU Student Union & Entertainment",
    category: "Music & Concerts",
    faculty: "Arts",
    venue: "Amphi Theatre",
    date: "Jun 18, 2025",
    time: "6:00 PM - 11:00 PM",
    status: "Published",
    isFree: false,
    price: 1500,
    capacity: 2500,
    registered: 1850,
    available: 650,
    image: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800&auto=format&fit=crop&q=80",
    description: "An unforgettable night celebrating student artistry, live musical performances, drama presentations, and campus culture under the stars at Amphi Theatre.",
    highlights: ["Live campus indie bands", "Cultural dance displays", "Celebrity guest performance"],
  },
];

export const MOCK_PENDING_APPROVALS = [
  {
    id: "app-1",
    type: "Organizer Application",
    applicant: "Tech Innovation Club OAU",
    submittedBy: "Bamidele Adebayo (CSC/2020/0912)",
    faculty: "Faculty of Science",
    time: "2 hours ago",
  },
  {
    id: "app-2",
    type: "Event Submission",
    applicant: "Robotics & Embedded Systems Workshop",
    submittedBy: "OAU Engineering Faculty",
    faculty: "Faculty of Technology",
    time: "3 hours ago",
  },
  {
    id: "app-3",
    type: "Organizer Application",
    applicant: "OAU Literary & Debating Society",
    submittedBy: "Kehinde Alao (LAW/2021/0312)",
    faculty: "Faculty of Law",
    time: "1 day ago",
  },
];

export const MOCK_ADMIN_METRICS = {
  totalEvents: 48,
  totalEventsGrowth: "+12%",
  publishedEvents: 36,
  publishedEventsGrowth: "+20%",
  totalBookings: 1248,
  totalBookingsGrowth: "+48%",
  totalRevenue: 2560000,
  activeOrganizers: 18,
  pendingApprovals: MOCK_PENDING_APPROVALS.length,
};

export const MOCK_ORGANIZER_METRICS = {
  totalEvents: 5,
  totalBookings: 248,
  totalRevenue: 820000,
  upcomingEvents: 2,
};

export const MOCK_STUDENT_METRICS = {
  upcomingEvents: 3,
  myTickets: 2,
  eventsAttended: 4,
  savedEvents: 4,
};

export const MOCK_STUDENT_TICKETS = [
  {
    id: "tkt-1",
    ticketCode: "NOT-OAU-8F32K",
    eventTitle: "Innovation & Impact: Student Tech Symposium 2025",
    eventDate: "Sat, Nov 15, 2025 • 9:00 AM",
    venue: "Engineering Auditorium",
    tierName: "General Admission",
    status: "Confirmed",
    qrCode: "MOCK_QR_NOT_OAU_8F32K",
    pricePaid: 3500,
  },
  {
    id: "tkt-2",
    ticketCode: "NOT-OAU-9X71P",
    eventTitle: "Creative Writing Workshop",
    eventDate: "May 2, 2025 • 2:00 PM",
    venue: "Arts Building, Room 101",
    tierName: "Student Free Pass",
    status: "Confirmed",
    qrCode: "MOCK_QR_NOT_OAU_9X71P",
    pricePaid: 0,
  },
  {
    id: "tkt-3",
    ticketCode: "NOT-OAU-1C45M",
    eventTitle: "Great Ife Music & Culture Concert",
    eventDate: "Apr 26, 2025 • 6:00 PM",
    venue: "Amphi Theatre",
    tierName: "Regular Pass",
    status: "Confirmed",
    qrCode: "MOCK_QR_NOT_OAU_1C45M",
    pricePaid: 1500,
  },
];

export const MOCK_RECENT_ACTIVITY = [
  {
    id: "act-1",
    title: "New organizer application",
    description: "Tech Innovation Club",
    time: "2 hours ago",
    type: "organizer",
  },
  {
    id: "act-2",
    title: "Event submitted for approval",
    description: "Robotics Workshop",
    time: "3 hours ago",
    type: "event",
  },
  {
    id: "act-3",
    title: "New user registered",
    description: "adebayo@oau.edu.ng",
    time: "4 hours ago",
    type: "user",
  },
  {
    id: "act-4",
    title: "Payment received",
    description: "₦15,000 • OAU Tech Summit 2025",
    time: "5 hours ago",
    type: "payment",
  },
  {
    id: "act-5",
    title: "Event published",
    description: "Creative Writing Workshop",
    time: "6 hours ago",
    type: "event",
  },
];
