import {
  Activity,
  ArchiveRestore,
  BarChart3,
  Building2,
  ClipboardList,
  CloudUpload,
  DatabaseBackup,
  Gauge,
  HardDrive,
  Headphones,
  Laptop,
  LucideIcon,
  Network,
  Radar,
  Settings,
  ShieldAlert,
  Ticket,
  Users,
} from "lucide-react";
import { slugify } from "./utils";

export type Status = "Online" | "Offline" | "Critical" | "Warning" | "Healthy" | "Resolved";
export type Severity = "Critical" | "High" | "Medium" | "Low" | "Resolved";

export const brand = {
  company: "N-SCOPE Netware Pvt Ltd",
  product: "N-SCOPE Command Center",
  logoPath: "/logo/nscope-logo.png",
  footer: "(c) 2026 N-SCOPE Netware Pvt Ltd. All Rights Reserved.",
};

export const navItems: Array<{ title: string; href: string; icon: LucideIcon }> = [
  { title: "Dashboard", href: "/dashboard", icon: Gauge },
  { title: "Clients", href: "/clients", icon: Building2 },
  { title: "Sites", href: "/sites", icon: Network },
  { title: "Devices", href: "/devices", icon: Laptop },
  { title: "Network Discovery", href: "/network-discovery", icon: Radar },
  { title: "Agent Deployment", href: "/agent-deployment", icon: CloudUpload },
  { title: "Remote Access", href: "/remote-access", icon: Headphones },
  { title: "Backup & Recovery", href: "/backup-recovery", icon: DatabaseBackup },
  { title: "Monitoring", href: "/monitoring", icon: ShieldAlert },
  { title: "Assets", href: "/assets", icon: HardDrive },
  { title: "Tickets", href: "/tickets", icon: Ticket },
  { title: "Client Portal", href: "/client-portal", icon: Users },
  { title: "Reports", href: "/reports", icon: BarChart3 },
  { title: "Settings", href: "/settings", icon: Settings },
];

export const clients = [
  {
    name: "ABC Pvt Ltd",
    contact: "Ritesh Shah",
    email: "ritesh@abcpvt.example",
    phone: "+91 79 4000 1122",
    sites: 3,
    devices: 128,
    tickets: 9,
    status: "Healthy",
    sla: "Gold 24x7",
    industry: "Manufacturing",
  },
  {
    name: "DC Jewellers",
    contact: "Dhruv Choksi",
    email: "dhruv@dcjewellers.example",
    phone: "+91 281 401 7788",
    sites: 4,
    devices: 86,
    tickets: 7,
    status: "Warning",
    sla: "Silver Business Hours",
    industry: "Retail",
  },
  {
    name: "TechPontis",
    contact: "Neha Patel",
    email: "neha@techpontis.example",
    phone: "+91 22 4888 9021",
    sites: 2,
    devices: 64,
    tickets: 4,
    status: "Healthy",
    sla: "Platinum 24x7",
    industry: "Technology",
  },
  {
    name: "White Canvas Tech",
    contact: "Karan Mehta",
    email: "karan@whitecanvas.example",
    phone: "+91 261 405 2233",
    sites: 2,
    devices: 42,
    tickets: 3,
    status: "Critical",
    sla: "Gold 24x7",
    industry: "Creative Services",
  },
].map((client) => ({ ...client, id: slugify(client.name) }));

export const sites = [
  { name: "Ahmedabad HQ", client: "ABC Pvt Ltd", location: "Ahmedabad", deviceCount: 74, range: "10.10.10.0/24", status: "Healthy" },
  { name: "Rajkot Retail", client: "DC Jewellers", location: "Rajkot", deviceCount: 32, range: "10.22.30.0/24", status: "Warning" },
  { name: "Mumbai NOC", client: "TechPontis", location: "Mumbai", deviceCount: 44, range: "172.18.0.0/23", status: "Healthy" },
  { name: "Surat Studio", client: "White Canvas Tech", location: "Surat", deviceCount: 28, range: "192.168.88.0/24", status: "Critical" },
  { name: "Ahmedabad DR", client: "ABC Pvt Ltd", location: "Ahmedabad", deviceCount: 21, range: "10.10.40.0/24", status: "Healthy" },
];

export const devices = [
  {
    hostname: "ABC-W11-042",
    client: "ABC Pvt Ltd",
    site: "Ahmedabad HQ",
    os: "Windows 11 Pro",
    ip: "10.10.10.42",
    mac: "80:FA:5B:12:A8:42",
    status: "Online",
    lastSeen: "2 min ago",
    agent: "2.8.14",
    user: "Priya Shah",
    type: "Workstation",
    cpu: "Intel Core i7-12700",
    memory: "32 GB",
    disk: "1 TB NVMe, 68% used",
  },
  {
    hostname: "ABC-SRV-DC01",
    client: "ABC Pvt Ltd",
    site: "Ahmedabad HQ",
    os: "Windows Server 2022",
    ip: "10.10.10.8",
    mac: "00:15:5D:01:B2:10",
    status: "Online",
    lastSeen: "1 min ago",
    agent: "2.8.14",
    user: "Domain Services",
    type: "Server",
    cpu: "AMD EPYC 7313",
    memory: "64 GB",
    disk: "2.4 TB RAID10, 52% used",
  },
  {
    hostname: "DCJ-FW-RJT01",
    client: "DC Jewellers",
    site: "Rajkot Retail",
    os: "FortiOS 7.2",
    ip: "10.22.30.1",
    mac: "70:4C:A5:93:11:08",
    status: "Critical",
    lastSeen: "18 min ago",
    agent: "SNMP",
    user: "Network Edge",
    type: "Firewall",
    cpu: "Network ASIC",
    memory: "8 GB",
    disk: "128 GB flash",
  },
  {
    hostname: "TPC-UBU-API02",
    client: "TechPontis",
    site: "Mumbai NOC",
    os: "Ubuntu Server 24.04 LTS",
    ip: "172.18.1.22",
    mac: "52:54:00:AA:4E:22",
    status: "Online",
    lastSeen: "3 min ago",
    agent: "2.8.11",
    user: "API Runtime",
    type: "Server",
    cpu: "Intel Xeon Silver",
    memory: "48 GB",
    disk: "800 GB SSD, 61% used",
  },
  {
    hostname: "WCT-PRN-SUR01",
    client: "White Canvas Tech",
    site: "Surat Studio",
    os: "Printer Firmware",
    ip: "192.168.88.45",
    mac: "3C:2A:F4:18:67:45",
    status: "Offline",
    lastSeen: "2 hours ago",
    agent: "SNMP",
    user: "Design Floor",
    type: "Printer",
    cpu: "Embedded",
    memory: "512 MB",
    disk: "N/A",
  },
  {
    hostname: "ABC-SW-AHD03",
    client: "ABC Pvt Ltd",
    site: "Ahmedabad DR",
    os: "Cisco IOS XE",
    ip: "10.10.40.2",
    mac: "00:1B:54:0B:63:19",
    status: "Warning",
    lastSeen: "6 min ago",
    agent: "SNMP",
    user: "Network Core",
    type: "Switch",
    cpu: "Embedded",
    memory: "4 GB",
    disk: "2 GB flash",
  },
].map((device) => ({ ...device, id: slugify(device.hostname) }));

export const tickets = [
  { id: "NSC-2401", client: "ABC Pvt Ltd", device: "ABC-SRV-DC01", subject: "Domain controller replication warning", priority: "High", status: "In Progress", engineer: "Pushpendra", created: "Jun 15, 2026", due: "Today 6:00 PM" },
  { id: "NSC-2398", client: "DC Jewellers", device: "DCJ-FW-RJT01", subject: "WAN failover unstable", priority: "Critical", status: "Open", engineer: "Mehul", created: "Jun 15, 2026", due: "Today 2:30 PM" },
  { id: "NSC-2394", client: "TechPontis", device: "TPC-UBU-API02", subject: "Patch window approval required", priority: "Medium", status: "Waiting Client", engineer: "Archan", created: "Jun 14, 2026", due: "Jun 17, 2026" },
  { id: "NSC-2388", client: "White Canvas Tech", device: "WCT-PRN-SUR01", subject: "Printer unavailable on studio VLAN", priority: "Low", status: "Open", engineer: "Pushpendra", created: "Jun 13, 2026", due: "Jun 18, 2026" },
];

export const assets = [
  { tag: "AST-AHD-1042", serial: "DLX94A42", type: "Windows 11 Workstation", client: "ABC Pvt Ltd", site: "Ahmedabad HQ", user: "Priya Shah", location: "Finance", purchase: "Jan 12, 2025", warranty: "Jan 11, 2028", status: "Active" },
  { tag: "AST-RJT-0871", serial: "FGT80F9321", type: "Firewall", client: "DC Jewellers", site: "Rajkot Retail", user: "Network Edge", location: "Server Room", purchase: "Aug 04, 2024", warranty: "Aug 03, 2027", status: "At Risk" },
  { tag: "AST-MUM-0630", serial: "HPE7N92", type: "Ubuntu Server", client: "TechPontis", site: "Mumbai NOC", user: "API Runtime", location: "Rack B4", purchase: "Mar 20, 2025", warranty: "Mar 19, 2028", status: "Active" },
  { tag: "AST-SUR-0418", serial: "HPPRN8872", type: "Printer", client: "White Canvas Tech", site: "Surat Studio", user: "Design Floor", location: "Studio", purchase: "Nov 07, 2023", warranty: "Nov 06, 2026", status: "Service Due" },
];

export const alerts = [
  { hostname: "DCJ-FW-RJT01", client: "DC Jewellers", site: "Rajkot Retail", issue: "Packet loss above 18% on primary WAN", severity: "Critical", time: "12 min ago", status: "Open" },
  { hostname: "ABC-SW-AHD03", client: "ABC Pvt Ltd", site: "Ahmedabad DR", issue: "Switch temperature above threshold", severity: "High", time: "28 min ago", status: "Acknowledged" },
  { hostname: "ABC-SRV-DC01", client: "ABC Pvt Ltd", site: "Ahmedabad HQ", issue: "Backup verification delayed", severity: "Medium", time: "1 hour ago", status: "Investigating" },
  { hostname: "TPC-UBU-API02", client: "TechPontis", site: "Mumbai NOC", issue: "Security updates pending reboot", severity: "Low", time: "3 hours ago", status: "Scheduled" },
  { hostname: "WCT-PRN-SUR01", client: "White Canvas Tech", site: "Surat Studio", issue: "Device unreachable", severity: "Resolved", time: "Yesterday", status: "Resolved" },
];

export const backups = [
  { device: "ABC-SRV-DC01", type: "Full Backup", last: "Today 01:00 AM", next: "Tomorrow 01:00 AM", size: "812 GB", retention: "30 daily / 12 monthly", status: "Successful" },
  { device: "TPC-UBU-API02", type: "Incremental Backup", last: "Today 02:15 AM", next: "Today 10:15 PM", size: "126 GB", retention: "14 daily / 6 monthly", status: "Successful" },
  { device: "DCJ-FW-RJT01", type: "Config Backup", last: "Yesterday 11:30 PM", next: "Today 11:30 PM", size: "28 MB", retention: "90 daily", status: "Failed" },
  { device: "ABC-W11-042", type: "Differential Backup", last: "Today 03:40 AM", next: "Tomorrow 03:40 AM", size: "94 GB", retention: "14 daily", status: "Successful" },
];

export const discoveryResults = [
  { ip: "10.22.30.1", hostname: "dcj-fw-rjt01", mac: "70:4C:A5:93:11:08", vendor: "Fortinet", type: "Firewall", ports: "22, 443, 541", status: "Known" },
  { ip: "10.22.30.11", hostname: "dcj-sw-floor01", mac: "00:1B:54:12:45:31", vendor: "Cisco", type: "Switch", ports: "22, 80, 443, 161", status: "New" },
  { ip: "10.22.30.24", hostname: "dcj-nas-vault", mac: "24:5E:BE:01:82:44", vendor: "Synology", type: "NAS", ports: "22, 5000, 5001", status: "New" },
  { ip: "10.22.30.40", hostname: "dcj-ups-rack01", mac: "28:29:86:12:73:99", vendor: "APC", type: "UPS", ports: "80, 161", status: "New" },
  { ip: "10.22.30.61", hostname: "dcj-ap-sales", mac: "B4:FB:E4:19:21:11", vendor: "Ubiquiti", type: "Access Point", ports: "22, 443, 8080", status: "Known" },
  { ip: "10.22.30.80", hostname: "dcj-prn-accounts", mac: "3C:2A:F4:11:20:62", vendor: "HP", type: "Printer", ports: "80, 9100", status: "New" },
];

export const dashboardStats = [
  { label: "Total Clients", value: "4", change: "+1 this quarter", tone: "blue", icon: Users },
  { label: "Total Sites", value: "11", change: "4 cities covered", tone: "cyan", icon: Network },
  { label: "Total Devices", value: "320", change: "+18 discovered", tone: "blue", icon: Laptop },
  { label: "Online Devices", value: "286", change: "89.4% online", tone: "green", icon: Activity },
  { label: "Offline Devices", value: "23", change: "7 require action", tone: "amber", icon: Activity },
  { label: "Critical Alerts", value: "6", change: "2 SLA risks", tone: "red", icon: ShieldAlert },
  { label: "Open Tickets", value: "23", change: "8 high priority", tone: "amber", icon: ClipboardList },
  { label: "Patch Compliance", value: "91%", change: "+4% last week", tone: "green", icon: ArchiveRestore },
  { label: "Backup Success Rate", value: "96%", change: "4 failures", tone: "green", icon: DatabaseBackup },
  { label: "Active Remote Sessions", value: "5", change: "NOC live now", tone: "blue", icon: Headphones },
];

export const chartData = {
  deviceStatus: [
    { name: "Online", value: 286, fill: "#22C55E" },
    { name: "Offline", value: 23, fill: "#F59E0B" },
    { name: "Critical", value: 11, fill: "#EF4444" },
  ],
  alertTrend: [
    { day: "Mon", critical: 5, warning: 14 },
    { day: "Tue", critical: 4, warning: 11 },
    { day: "Wed", critical: 7, warning: 18 },
    { day: "Thu", critical: 3, warning: 12 },
    { day: "Fri", critical: 6, warning: 15 },
    { day: "Sat", critical: 2, warning: 7 },
    { day: "Sun", critical: 1, warning: 5 },
  ],
  clientDistribution: [
    { client: "ABC", devices: 128 },
    { client: "DCJ", devices: 86 },
    { client: "TechPontis", devices: 64 },
    { client: "WCT", devices: 42 },
  ],
  ticketStatus: [
    { name: "Open", value: 9 },
    { name: "In Progress", value: 6 },
    { name: "Waiting", value: 4 },
    { name: "Resolved", value: 12 },
  ],
};

export const reportCards = [
  "Device Inventory Report",
  "Patch Compliance Report",
  "Alert Summary Report",
  "Ticket SLA Report",
  "Backup Success Report",
  "Asset Warranty Report",
  "Client Monthly Report",
];

export const userRoles = ["Super Admin", "NOC Engineer", "Support Engineer", "Client Admin", "Client Viewer"];
