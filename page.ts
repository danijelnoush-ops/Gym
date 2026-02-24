"use client";

import { useState, useEffect } from "react";
import { 
  Users, 
  Calendar, 
  LayoutDashboard, 
  BarChart3, 
  Archive, 
  Package,
  Search,
  Bell,
  Dumbbell,
  TrendingUp,
  Clock,
  Activity,
  Menu,
  X,
  UserPlus,
  Lock,
  Save,
  Download,
  Edit2,
  Trash2,
  DollarSign,
  Percent,
  LogIn,
  Mail,
  AlertCircle,
  CheckCircle,
  Calendar as CalendarIcon,
  Sun,
  Moon,
  Cloud,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { v4 as uuidv4 } from 'uuid';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Client, TrainingSession, Package as PackageType, ArchiveRecord, RevenueStats, OccupancyStats, EmailLog } from './types';
import { emailService } from './services/emailService';

const APP_PASSWORD = "2222";

const TIME_SLOTS = [
  "08:00", "09:00", "10:00", "11:00", "12:00", "13:00",
  "14:00", "15:00", "16:00", "17:00", "18:00", "19:00"
];

const WORKING_DAYS = [1, 2, 3, 4, 5, 6];
const DAY_NAMES = ['Ned', 'Pon', 'Uto', 'Sre', 'Čet', 'Pet', 'Sub'];

const PACKAGES: PackageType[] = [
  { id: 'promo', name: 'Promo', price: 0, sessions: 0, durationDays: 30 },
  { id: 'basic', name: 'Basic', price: 0, sessions: 0, durationDays: 30 },
  { id: 'premium', name: 'Premium', price: 0, sessions: 0, durationDays: 30 }
];

const DAILY_CAPACITY = 36;
const MONTHLY_CAPACITY = 936;

const MONTHS = [
  'Januar', 'Februar', 'Mart', 'April', 'Maj', 'Jun',
  'Jul', 'Avgust', 'Septembar', 'Oktobar', 'Novembar', 'Decembar'
];

const YEARS = Array.from({ length: 2050 - 2026 + 1 }, (_, i) => 2026 + i);

export default function Home() {
  const [activeMenu, setActiveMenu] = useState("dashboard");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [pendingAction, setPendingAction] = useState<{ type: string; data?: any } | null>(null);
  const [showAuth, setShowAuth] = useState(true);
  
  const [clients, setClients] = useState<Client[]>([]);
  const [sessions, setSessions] = useState<TrainingSession[]>([]);
  const [archive, setArchive] = useState<ArchiveRecord[]>([]);
  const [emailLogs, setEmailLogs] = useState<EmailLog[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [editingSession, setEditingSession] = useState<TrainingSession | null>(null);
  const [showClientForm, setShowClientForm] = useState(false);
  const [showSessionForm, setShowSessionForm] = useState(false);
  const [sessionClientInput, setSessionClientInput] = useState("");
  const [selectedClientForSession, setSelectedClientForSession] = useState<Client | null>(null);
  const [emailNotifications, setEmailNotifications] = useState<{clientId: string; sent: boolean}[]>([]);
  const [suggestions, setSuggestions] = useState<Client[]>([]);

  useEffect(() => {
    const savedClients = localStorage.getItem('gym_clients');
    const savedSessions = localStorage.getItem('gym_sessions');
    const savedArchive = localStorage.getItem('gym_archive');
    const savedEmailLogs = localStorage.getItem('gym_email_logs');
    
    if (savedClients) {
      const parsed = JSON.parse(savedClients);
      setClients(parsed.map((c: any) => ({
        ...c,
        membershipStartDate: new Date(c.membershipStartDate),
        membershipEndDate: new Date(c.membershipEndDate),
        createdAt: new Date(c.createdAt),
        lastEmailSent: c.lastEmailSent ? new Date(c.lastEmailSent) : undefined
      })));
    }
    if (savedSessions) {
      const parsed = JSON.parse(savedSessions);
      setSessions(parsed.map((s: any) => ({
        ...s,
        createdAt: new Date(s.createdAt)
      })));
    }
    if (savedArchive) {
      const parsed = JSON.parse(savedArchive);
      setArchive(parsed.map((a: any) => ({
        ...a,
        archivedAt: new Date(a.archivedAt),
        originalDate: new Date(a.originalDate)
      })));
    }
    if (savedEmailLogs) {
      const parsed = JSON.parse(savedEmailLogs);
      setEmailLogs(parsed.map((e: any) => ({
        ...e,
        sentAt: new Date(e.sentAt),
        membershipEndDate: new Date(e.membershipEndDate)
      })));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('gym_clients', JSON.stringify(clients));
  }, [clients]);

  useEffect(() => {
    localStorage.setItem('gym_sessions', JSON.stringify(sessions));
  }, [sessions]);

  useEffect(() => {
    localStorage.setItem('gym_archive', JSON.stringify(archive));
  }, [archive]);

  useEffect(() => {
    localStorage.setItem('gym_email_logs', JSON.stringify(emailLogs));
  }, [emailLogs]);

  useEffect(() => {
    checkMembershipExpiry();
    const interval = setInterval(checkMembershipExpiry, 6 * 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, [clients, emailLogs]);

  useEffect(() => {
    archiveOldSessions();
  }, []);

  const checkMembershipExpiry = async () => {
    const today = new Date();
    const fiveDaysFromNow = new Date(today);
    fiveDaysFromNow.setDate(today.getDate() + 5);

    for (const client of clients) {
      const expiryDate = new Date(client.membershipEndDate);
      const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysUntilExpiry === 5) {
        const lastEmail = emailLogs.find(
          log => log.clientId === client.id && 
          log.type === 'membership_expiry' &&
          new Date(log.sentAt).getTime() > today.getTime() - 24 * 60 * 60 * 1000
        );

        if (!lastEmail) {
          const sent = await emailService.sendMembershipExpiryReminder(
            client.email,
            `${client.name} ${client.surname}`,
            expiryDate
          );

          if (sent) {
            const newEmailLog: EmailLog = {
              id: uuidv4(),
              clientId: client.id,
              clientEmail: client.email,
              sentAt: new Date(),
              type: 'membership_expiry',
              membershipEndDate: expiryDate
            };

            setEmailLogs(prev => [...prev, newEmailLog]);
            setClients(prev => prev.map(c => 
              c.id === client.id ? { ...c, lastEmailSent: new Date() } : c
            ));
            setEmailNotifications(prev => [...prev, { clientId: client.id, sent: true }]);
            
            setTimeout(() => {
              setEmailNotifications(prev => prev.filter(n => n.clientId !== client.id));
            }, 5000);
          }
        }
      }
    }
  };

  const archiveOldSessions = () => {
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
    
    const oldSessions = sessions.filter(s => new Date(s.date) < sixtyDaysAgo);
    const newSessions = sessions.filter(s => new Date(s.date) >= sixtyDaysAgo);
    
    if (oldSessions.length > 0) {
      const archiveRecords: ArchiveRecord[] = oldSessions.map(session => ({
        id: uuidv4(),
        type: 'session',
        data: session,
        archivedAt: new Date(),
        originalDate: new Date(session.date)
      }));
      
      setArchive(prev => [...prev, ...archiveRecords]);
      setSessions(newSessions);
      
      const activeClientIds = new Set(newSessions.map(s => s.clientId));
      const clientsToArchive = clients.filter(c => 
        c.remainingSessions === 0 && !activeClientIds.has(c.id)
      );
      
      if (clientsToArchive.length > 0) {
        const clientArchiveRecords: ArchiveRecord[] = clientsToArchive.map(client => ({
          id: uuidv4(),
          type: 'client',
          data: client,
          archivedAt: new Date(),
          originalDate: new Date(client.createdAt)
        }));
        
        setArchive(prev => [...prev, ...clientArchiveRecords]);
        setClients(prev => prev.filter(c => !clientsToArchive.find(a => a.id === c.id)));
      }
    }
  };

  const isWorkingDay = (date: Date): boolean => {
    const day = date.getDay();
    const ourDay = day === 0 ? 6 : day - 1;
    return WORKING_DAYS.includes(ourDay);
  };

  const calculateMembershipEndDate = (startDate: Date, packageId: string): Date => {
    const package_ = PACKAGES.find(p => p.id === packageId);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + (package_?.durationDays || 30));
    return endDate;
  };

  const handlePasswordSubmit = () => {
    if (password === APP_PASSWORD) {
      setPasswordModalOpen(false);
      setPassword("");
      setShowAuth(false);
      if (pendingAction) {
        executeAction(pendingAction);
        setPendingAction(null);
      }
    } else {
      alert("Pogrešna lozinka!");
    }
  };

  const requireAuth = (action: { type: string; data?: any }) => {
    setPendingAction(action);
    setPasswordModalOpen(true);
  };

  const executeAction = (action: { type: string; data?: any }) => {
    switch(action.type) {
      case 'addClient':
        handleAddClient(action.data);
        break;
      case 'editClient':
        handleUpdateClient(action.data);
        break;
      case 'deleteClient':
        handleDeleteClient(action.data);
        break;
      case 'addSession':
        handleAddSession(action.data);
        break;
      case 'editSession':
        handleUpdateSession(action.data);
        break;
      case 'deleteSession':
        handleDeleteSession(action.data);
        break;
    }
  };

  const handleAddClient = (clientData: any) => {
    const startDate = new Date();
    const endDate = calculateMembershipEndDate(startDate, clientData.package);
    
    const newClient: Client = {
      ...clientData,
      id: uuidv4(),
      membershipStartDate: startDate,
      membershipEndDate: endDate,
      createdAt: new Date()
    };
    setClients(prev => [...prev, newClient]);
    setShowClientForm(false);
  };

  const handleUpdateClient = (updatedClient: Client) => {
    setClients(prev => prev.map(c => c.id === updatedClient.id ? updatedClient : c));
    setEditingClient(null);
  };

  const handleDeleteClient = (clientId: string) => {
    const client = clients.find(c => c.id === clientId);
    if (client) {
      const archiveRecord: ArchiveRecord = {
        id: uuidv4(),
        type: 'client',
        data: client,
        archivedAt: new Date(),
        originalDate: new Date(client.createdAt)
      };
      setArchive(prev => [...prev, archiveRecord]);
    }
    setClients(prev => prev.filter(c => c.id !== clientId));
  };

  const handleAddSession = (sessionData: any) => {
    const sessionDate = new Date(sessionData.date);
    
    if (!isWorkingDay(sessionDate)) {
      alert("Ponedeljkom ne radimo! Izaberite drugi dan (Utorak - Nedelja).");
      return;
    }

    const sessionsAtTime = sessions.filter(s => 
      s.date === sessionData.date && s.time === sessionData.time
    );
    
    if (sessionsAtTime.length >= 3) {
      alert("Ovaj termin je već popunjen! Maksimalno 3 termina istovremeno.");
      return;
    }

    const client = clients.find(c => c.id === sessionData.clientId);
    if (!client) return;

    const newSession: TrainingSession = {
      ...sessionData,
      clientEmail: client.email,
      id: uuidv4(),
      createdAt: new Date()
    };
    
    setSessions(prev => [...prev, newSession]);
    
    const updatedClient = {
      ...client,
      remainingSessions: client.remainingSessions - 1
    };
    setClients(prev => prev.map(c => c.id === client.id ? updatedClient : c));
    
    setShowSessionForm(false);
    setSelectedClientForSession(null);
    setSessionClientInput("");
  };

  const handleUpdateSession = (updatedSession: TrainingSession) => {
    setSessions(prev => prev.map(s => s.id === updatedSession.id ? updatedSession : s));
    setEditingSession(null);
  };

  const handleDeleteSession = (sessionId: string) => {
    const session = sessions.find(s => s.id === sessionId);
    if (session) {
      const client = clients.find(c => c.id === session.clientId);
      if (client) {
        const updatedClient = {
          ...client,
          remainingSessions: client.remainingSessions + 1
        };
        setClients(prev => prev.map(c => c.id === client.id ? updatedClient : c));
      }
      
      const archiveRecord: ArchiveRecord = {
        id: uuidv4(),
        type: 'session',
        data: session,
        archivedAt: new Date(),
        originalDate: new Date(session.date)
      };
      setArchive(prev => [...prev, archiveRecord]);
    }
    setSessions(prev => prev.filter(s => s.id !== sessionId));
  };

  const exportToPDF = (data: any[], title: string) => {
    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text(title, 14, 22);
    
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Datum izvoza: ${new Date().toLocaleDateString('sr-RS')}`, 14, 30);
    
    if (data.length > 0) {
      const headers = Object.keys(data[0]).filter(key => 
        !['id', 'createdAt', 'archivedAt', 'originalDate', 'clientEmail'].includes(key)
      );
      
      const rows = data.map(item => 
        headers.map(header => {
          const value = item[header];
          if (value instanceof Date) return value.toLocaleDateString('sr-RS');
          if (typeof value === 'boolean') return value ? 'Da' : 'Ne';
          return String(value);
        })
      );
      
      autoTable(doc, {
        head: [headers.map(h => {
          const translations: {[key: string]: string} = {
            name: 'Ime',
            surname: 'Prezime',
            phone: 'Telefon',
            birthYear: 'Godište',
            email: 'Email',
            package: 'Paket',
            packagePaid: 'Plaćeno',
            totalSessions: 'Ukupno termina',
            remainingSessions: 'Preostalo',
            membershipStartDate: 'Početak',
            membershipEndDate: 'Istek',
            date: 'Datum',
            time: 'Vreme',
            clientName: 'Ime klijenta',
            clientSurname: 'Prezime klijenta'
          };
          return translations[h] || h;
        })],
        body: rows,
        startY: 40,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [57, 255, 20] }
      });
    }
    
    doc.save(`${title}_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const getRevenueStats = (): RevenueStats => {
    const today = new Date().toISOString().split('T')[0];
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    let daily = 0;
    let monthly = 0;
    let yearly = 0;
    const byMonth: { [key: string]: number } = {};
    const byYear: { [key: string]: number } = {};
    
    sessions.forEach(session => {
      const sessionClient = clients.find(c => c.id === session.clientId);
      if (!sessionClient) return;
      
      const packagePrice = PACKAGES.find(p => p.id === sessionClient.package)?.price || 0;
      const pricePerSession = sessionClient.totalSessions > 0 ? packagePrice / sessionClient.totalSessions : 0;
      
      if (session.date === today) {
        daily += pricePerSession;
      }
      
      const sessionDate = new Date(session.date);
      const monthKey = `${sessionDate.getFullYear()}-${sessionDate.getMonth() + 1}`;
      const yearKey = sessionDate.getFullYear().toString();
      
      byMonth[monthKey] = (byMonth[monthKey] || 0) + pricePerSession;
      byYear[yearKey] = (byYear[yearKey] || 0) + pricePerSession;
      
      if (sessionDate.getMonth() === currentMonth && sessionDate.getFullYear() === currentYear) {
        monthly += pricePerSession;
      }
      
      if (sessionDate.getFullYear() === currentYear) {
        yearly += pricePerSession;
      }
    });
    
    return { daily, monthly, yearly, byMonth, byYear };
  };

  const getOccupancyStats = (): OccupancyStats => {
    const today = new Date().toISOString().split('T')[0];
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    const todaySessions = sessions.filter(s => s.date === today).length;
    const monthlySessions = sessions.filter(s => {
      const date = new Date(s.date);
      return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
    }).length;
    
    const weeklyByDay: { [key: string]: number } = {};
    WORKING_DAYS.forEach(day => {
      const daySessions = sessions.filter(s => {
        const date = new Date(s.date);
        const ourDay = date.getDay() === 0 ? 6 : date.getDay() - 1;
        return ourDay === day && 
               date.getMonth() === currentMonth && 
               date.getFullYear() === currentYear;
      }).length;
      
      const dayCapacity = DAILY_CAPACITY * 4;
      weeklyByDay[DAY_NAMES[day + 1]] = dayCapacity > 0 ? Number(((daySessions / dayCapacity) * 100).toFixed(2)) : 0;
    });
    
    return {
      daily: DAILY_CAPACITY > 0 ? Number(((todaySessions / DAILY_CAPACITY) * 100).toFixed(2)) : 0,
      monthly: MONTHLY_CAPACITY > 0 ? Number(((monthlySessions / MONTHLY_CAPACITY) * 100).toFixed(2)) : 0,
      dailyCapacity: DAILY_CAPACITY,
      monthlyCapacity: MONTHLY_CAPACITY,
      weeklyByDay
    };
  };

  const ClientForm = ({ client, onSubmit, onCancel }: { client?: Client; onSubmit: (data: any) => void; onCancel: () => void }) => {
    const [formData, setFormData] = useState({
      name: client?.name || '',
      surname: client?.surname || '',
      phone: client?.phone || '',
      birthYear: client?.birthYear || new Date().getFullYear() - 30,
      email: client?.email || '',
      package: client?.package || 'basic' as const,
      packagePaid: client?.packagePaid || false,
      totalSessions: client?.totalSessions || 0,
      remainingSessions: client?.remainingSessions || 0
    });

    const handlePackageChange = (packageId: 'promo' | 'basic' | 'premium') => {
      setFormData({
        ...formData,
        package: packageId,
        totalSessions: 0,
        remainingSessions: 0
      });
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-card rounded-xl border border-gray-800 p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
          <h3 className="text-xl font-bold mb-4">{client ? 'Izmeni klijenta' : 'Novi klijent'}</h3>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Ime</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full bg-gray-900 border border-gray-800 rounded-lg px-4 py-2 focus:border-neon-green focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Prezime</label>
                <input
                  type="text"
                  value={formData.surname}
                  onChange={(e) => setFormData({...formData, surname: e.target.value})}
                  className="w-full bg-gray-900 border border-gray-800 rounded-lg px-4 py-2 focus:border-neon-green focus:outline-none"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">Telefon</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
                className="w-full bg-gray-900 border border-gray-800 rounded-lg px-4 py-2 focus:border-neon-green focus:outline-none"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Godište</label>
                <input
                  type="number"
                  value={formData.birthYear}
                  onChange={(e) => setFormData({...formData, birthYear: parseInt(e.target.value)})}
                  className="w-full bg-gray-900 border border-gray-800 rounded-lg px-4 py-2 focus:border-neon-green focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className="w-full bg-gray-900 border border-gray-800 rounded-lg px-4 py-2 focus:border-neon-green focus:outline-none"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">Paket</label>
              <select
                value={formData.package}
                onChange={(e) => handlePackageChange(e.target.value as any)}
                className="w-full bg-gray-900 border border-gray-800 rounded-lg px-4 py-2 focus:border-neon-green focus:outline-none"
              >
                {PACKAGES.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="packagePaid"
                checked={formData.packagePaid}
                onChange={(e) => setFormData({...formData, packagePaid: e.target.checked})}
                className="w-4 h-4 accent-neon-green"
              />
              <label htmlFor="packagePaid" className="text-sm text-gray-400">Paket plaćen</label>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">Ukupno termina</label>
              <input
                type="number"
                value={formData.totalSessions}
                onChange={(e) => setFormData({...formData, totalSessions: parseInt(e.target.value) || 0})}
                className="w-full bg-gray-900 border border-gray-800 rounded-lg px-4 py-2 focus:border-neon-green focus:outline-none"
                placeholder="Unesite broj termina"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">Preostalo termina</label>
              <input
                type="number"
                value={formData.remainingSessions}
                onChange={(e) => setFormData({...formData, remainingSessions: parseInt(e.target.value) || 0})}
                className="w-full bg-gray-900 border border-gray-800 rounded-lg px-4 py-2 focus:border-neon-green focus:outline-none"
                placeholder="Unesite preostale termine"
              />
            </div>

            <div className="bg-gray-900 p-3 rounded-lg">
              <p className="text-sm text-neon-green mb-1">Članarina važi do:</p>
              <p className="text-lg font-semibold">
                {calculateMembershipEndDate(new Date(), formData.package).toLocaleDateString('sr-RS')}
              </p>
            </div>

            <div className="flex gap-2 pt-4">
              <button
                onClick={() => onSubmit(formData)}
                className="flex-1 bg-neon-green text-dark px-4 py-2 rounded-lg font-semibold hover:bg-opacity-80 transition-all"
              >
                Sačuvaj
              </button>
              <button
                onClick={onCancel}
                className="flex-1 bg-gray-800 text-white px-4 py-2 rounded-lg font-semibold hover:bg-gray-700 transition-all"
              >
                Otkaži
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const SessionForm = ({ session, onCancel }: { session?: TrainingSession; onCancel: () => void }) => {
    const [formData, setFormData] = useState({
      clientId: session?.clientId || '',
      date: session?.date || selectedDate,
      time: session?.time || TIME_SLOTS[0]
    });

    const [clientInput, setClientInput] = useState(session?.clientName ? `${session.clientName} ${session.clientSurname}` : '');
    const [localSuggestions, setLocalSuggestions] = useState<Client[]>([]);
    const [selectedDateObj, setSelectedDateObj] = useState(new Date(formData.date));

    useEffect(() => {
      setSelectedDateObj(new Date(formData.date));
    }, [formData.date]);

    useEffect(() => {
      if (clientInput.length >= 2) {
        const searchLower = clientInput.toLowerCase();
        const filtered = clients.filter(c => 
          `${c.name} ${c.surname}`.toLowerCase().includes(searchLower) ||
          c.name.toLowerCase().includes(searchLower) ||
          c.surname.toLowerCase().includes(searchLower)
        );
        setLocalSuggestions(filtered);
      } else {
        setLocalSuggestions([]);
      }
    }, [clientInput]);

    const handleClientSelect = (client: Client) => {
      setFormData({...formData, clientId: client.id});
      setClientInput(`${client.name} ${client.surname}`);
      setLocalSuggestions([]);
    };

    const sessionsAtTime = sessions.filter(s => 
      s.date === formData.date && s.time === formData.time && s.id !== session?.id
    ).length;

    const isSlotAvailable = sessionsAtTime < 3 || session;
    const isWorking = isWorkingDay(selectedDateObj);

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-card rounded-xl border border-gray-800 p-6 max-w-md w-full">
          <h3 className="text-xl font-bold mb-4">{session ? 'Izmeni termin' : 'Novi termin'}</h3>
          
          <div className="space-y-4">
            <div className="relative">
              <label className="block text-sm text-gray-400 mb-1">Klijent</label>
              <input
                type="text"
                value={clientInput}
                onChange={(e) => setClientInput(e.target.value)}
                placeholder="Unesite ime (minimum 2 karaktera)"
                className="w-full bg-gray-900 border border-gray-800 rounded-lg px-4 py-2 focus:border-neon-green focus:outline-none"
              />
              {localSuggestions.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-gray-900 border border-gray-800 rounded-lg max-h-48 overflow-y-auto">
                  {localSuggestions.map(client => (
                    <button
                      key={client.id}
                      onClick={() => handleClientSelect(client)}
                      className="w-full text-left px-4 py-2 hover:bg-gray-800 transition-colors"
                    >
                      <div>
                        <span className="font-medium">{client.name} {client.surname}</span>
                        <span className="text-xs text-gray-400 ml-2">Preostalo: {client.remainingSessions}</span>
                      </div>
                      <div className="text-xs text-neon-green">
                        Članarina do: {new Date(client.membershipEndDate).toLocaleDateString('sr-RS')}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">Datum</label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({...formData, date: e.target.value})}
                min={new Date().toISOString().split('T')[0]}
                className="w-full bg-gray-900 border border-gray-800 rounded-lg px-4 py-2 focus:border-neon-green focus:outline-none"
              />
              {!isWorking && (
                <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
                  <AlertCircle size={14} />
                  Ponedeljkom ne radimo!
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">Vreme</label>
              <select
                value={formData.time}
                onChange={(e) => setFormData({...formData, time: e.target.value})}
                className="w-full bg-gray-900 border border-gray-800 rounded-lg px-4 py-2 focus:border-neon-green focus:outline-none"
              >
                {TIME_SLOTS.map(time => (
                  <option key={time} value={time}>{time}</option>
                ))}
              </select>
              {!isSlotAvailable && (
                <p className="text-red-500 text-sm mt-1">Ovaj termin je popunjen!</p>
              )}
              <p className="text-gray-400 text-sm mt-1">
                Zauzeto: {sessionsAtTime}/3 termina
              </p>
            </div>

            <div className="flex gap-2 pt-4">
              <button
                onClick={() => {
                  const client = clients.find(c => c.id === formData.clientId);
                  if (!client) {
                    alert('Molimo izaberite klijenta');
                    return;
                  }
                  if (!isSlotAvailable) {
                    alert('Ovaj termin nije dostupan');
                    return;
                  }
                  if (!isWorking) {
                    alert('Ponedeljkom ne radimo!');
                    return;
                  }
                  if (!session && client.remainingSessions <= 0) {
                    alert('Klijent nema preostalih termina!');
                    return;
                  }
                  if (new Date(client.membershipEndDate) < new Date()) {
                    alert('Klijentu je istekla članarina!');
                    return;
                  }
                  
                  const sessionData = {
                    clientId: client.id,
                    clientName: client.name,
                    clientSurname: client.surname,
                    date: formData.date,
                    time: formData.time
                  };
                  
                  if (session) {
                    handleUpdateSession({...session, ...sessionData});
                  } else {
                    handleAddSession(sessionData);
                  }
                  onCancel();
                }}
                disabled={!formData.clientId || !isSlotAvailable || !isWorking}
                className="flex-1 bg-neon-green text-dark px-4 py-2 rounded-lg font-semibold hover:bg-opacity-80 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Sačuvaj
              </button>
              <button
                onClick={onCancel}
                className="flex-1 bg-gray-800 text-white px-4 py-2 rounded-lg font-semibold hover:bg-gray-700 transition-all"
              >
                Otkaži
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const menuItems = [
    { id: "dashboard", label: "Dashboard", icon: <LayoutDashboard size={20} /> },
    { id: "clients", label: "Client list", icon: <Users size={20} /> },
    { id: "kalendar", label: "Kalendar", icon: <Calendar size={20} /> },
    { id: "statistika", label: "Statistika", icon: <BarChart3 size={20} /> },
    { id: "arhiva", label: "Arhiva", icon: <Archive size={20} /> },
    { id: "paketi", label: "Paketi", icon: <Package size={20} /> },
  ];

  if (showAuth) {
    return (
      <div className="min-h-screen bg-dark flex items-center justify-center p-4">
        <div className="bg-card p-8 rounded-xl border border-gray-800 max-w-md w-full">
          <div className="text-center mb-8">
            <Dumbbell size={48} className="text-neon-green mx-auto mb-4" />
            <h1 className="text-2xl font-bold">Gym Dashboard</h1>
            <p className="text-gray-400">Unesite lozinku za pristup</p>
          </div>
          
          <div className="space-y-4">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Lozinka"
              className="w-full bg-gray-900 border border-gray-800 rounded-lg px-4 py-3 focus:border-neon-green focus:outline-none"
              onKeyPress={(e) => e.key === 'Enter' && handlePasswordSubmit()}
            />
            <button
              onClick={handlePasswordSubmit}
              className="w-full bg-neon-green text-dark py-3 rounded-lg font-semibold hover:bg-opacity-80 transition-all flex items-center justify-center gap-2"
            >
              <LogIn size={20} />
              Pristupi
            </button>
          </div>
        </div>
      </div>
    );
  }

  const renderContent = () => {
    switch(activeMenu) {
      case "dashboard":
        const revenue = getRevenueStats();
        const occupancy = getOccupancyStats();
        
        return (
          <div className="space-y-6">
            {emailNotifications.map(notification => (
              <div key={notification.clientId} className="bg-green-500 bg-opacity-20 border border-green-500 rounded-lg p-4 flex items-center gap-3 animate-pulse">
                <Mail className="text-green-500" size={20} />
                <p className="text-green-500">Email podsetnik uspešno poslat klijentu</p>
              </div>
            ))}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-card p-6 rounded-xl border border-gray-800 hover:border-neon-green transition-all neon-glow">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">Dnevni prihod</p>
                    <p className="text-3xl font-bold mt-2">{revenue.daily.toFixed(2)}€</p>
                  </div>
                  <div className="text-neon-green bg-neon-green bg-opacity-10 p-3 rounded-lg">
                    <DollarSign size={24} />
                  </div>
                </div>
              </div>

              <div className="bg-card p-6 rounded-xl border border-gray-800 hover:border-neon-green transition-all neon-glow">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">Mesečni prihod</p>
                    <p className="text-3xl font-bold mt-2">{revenue.monthly.toFixed(2)}€</p>
                  </div>
                  <div className="text-neon-green bg-neon-green bg-opacity-10 p-3 rounded-lg">
                    <TrendingUp size={24} />
                  </div>
                </div>
              </div>

              <div className="bg-card p-6 rounded-xl border border-gray-800 hover:border-neon-green transition-all neon-glow">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">Dnevna popunjenost</p>
                    <p className="text-3xl font-bold mt-2">{occupancy.daily}%</p>
                  </div>
                  <div className="text-neon-green bg-neon-green bg-opacity-10 p-3 rounded-lg">
                    <Percent size={24} />
                  </div>
                </div>
              </div>

              <div className="bg-card p-6 rounded-xl border border-gray-800 hover:border-neon-green transition-all neon-glow">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">Mesečna popunjenost</p>
                    <p className="text-3xl font-bold mt-2">{occupancy.monthly}%</p>
                  </div>
                  <div className="text-neon-green bg-neon-green bg-opacity-10 p-3 rounded-lg">
                    <Activity size={24} />
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-card p-6 rounded-xl border border-gray-800">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <CalendarIcon size={20} className="text-neon-green" />
                Godišnji prihod
              </h3>
              <div className="space-y-4">
                {Object.entries(revenue.byYear).map(([year, amount]) => (
                  <div key={year} className="flex items-center gap-4">
                    <span className="w-16 text-neon-green">{year}.</span>
                    <div className="flex-1 h-4 bg-gray-800 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-neon-green rounded-full"
                        style={{ width: `${(amount / Math.max(...Object.values(revenue.byYear))) * 100}%` }}
                      />
                    </div>
                    <span className="text-sm font-bold">{amount.toFixed(2)}€</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-card p-6 rounded-xl border border-gray-800">
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-2">
                  <Sun size={20} className="text-neon-green" />
                  <span>Utorak - Petak: 08:00 - 20:00</span>
                </div>
                <div className="flex items-center gap-2">
                  <Cloud size={20} className="text-neon-green" />
                  <span>Subota - Nedelja: 08:00 - 20:00</span>
                </div>
                <div className="flex items-center gap-2">
                  <Moon size={20} className="text-red-500" />
                  <span>Ponedeljak: Neradan dan</span>
                </div>
              </div>
            </div>
          </div>
        );

      case "clients":
        const filteredClients = clients.filter(client => 
          `${client.name} ${client.surname} ${client.email} ${client.phone}`.toLowerCase().includes(searchTerm.toLowerCase())
        );

        return (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <h2 className="text-2xl font-bold">Client list</h2>
              <button
                onClick={() => {
                  setEditingClient(null);
                  setShowClientForm(true);
                }}
                className="bg-neon-green text-dark px-4 py-2 rounded-lg font-semibold hover:bg-opacity-80 transition-all flex items-center gap-2"
              >
                <UserPlus size={20} />
                Add Client
              </button>
            </div>

            {showClientForm && (
              <ClientForm
                client={editingClient || undefined}
                onSubmit={(data) => {
                  if (editingClient) {
                    requireAuth({ type: 'editClient', data: { ...editingClient, ...data } });
                  } else {
                    requireAuth({ type: 'addClient', data });
                  }
                }}
                onCancel={() => {
                  setShowClientForm(false);
                  setEditingClient(null);
                }}
              />
            )}

            <div className="bg-card rounded-xl border border-gray-800 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1000px]">
                  <thead className="bg-gray-900">
                    <tr>
                      <th className="text-left p-4 text-neon-green">Ime i prezime</th>
                      <th className="text-left p-4 text-neon-green">Kontakt</th>
                      <th className="text-left p-4 text-neon-green">Paket</th>
                      <th className="text-left p-4 text-neon-green">Status</th>
                      <th className="text-left p-4 text-neon-green">Termini</th>
                      <th className="text-left p-4 text-neon-green">Članarina</th>
                      <th className="text-left p-4 text-neon-green">Akcije</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredClients.map((client) => {
                      const daysUntilExpiry = Math.ceil((new Date(client.membershipEndDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                      const isExpiringSoon = daysUntilExpiry <= 7 && daysUntilExpiry > 0;
                      
                      return (
                        <tr key={client.id} className="border-t border-gray-800 hover:bg-gray-900 transition-colors">
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-neon-green bg-opacity-10 rounded-full flex items-center justify-center">
                                <Users size={16} className="text-neon-green" />
                              </div>
                              <div>
                                <span className="font-medium">{client.name} {client.surname}</span>
                                <span className="text-xs text-gray-400 block">{client.birthYear}</span>
                              </div>
                            </div>
                          </td>
                          <td className="p-4">
                            <div>
                              <p className="text-sm">{client.phone}</p>
                              <p className="text-xs text-gray-400">{client.email}</p>
                            </div>
                          </td>
                          <td className="p-4">
                            <span className={`px-2 py-1 rounded-full text-xs ${
                              client.package === 'premium' ? 'bg-purple-500 bg-opacity-20 text-purple-500' :
                              client.package === 'basic' ? 'bg-blue-500 bg-opacity-20 text-blue-500' :
                              'bg-green-500 bg-opacity-20 text-green-500'
                            }`}>
                              {client.package.toUpperCase()}
                            </span>
                          </td>
                          <td className="p-4">
                            <div className="space-y-1">
                              <span className={`inline-block px-2 py-1 rounded-full text-xs ${
                                client.packagePaid ? 'bg-green-500 bg-opacity-20 text-green-500' : 'bg-yellow-500 bg-opacity-20 text-yellow-500'
                              }`}>
                                {client.packagePaid ? 'Plaćeno' : 'Nije plaćeno'}
                              </span>
                              {isExpiringSoon && (
                                <span className="inline-block px-2 py-1 rounded-full text-xs bg-orange-500 bg-opacity-20 text-orange-500 ml-2">
                                  Ističe za {daysUntilExpiry} dana
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="space-y-1">
                              <p className="text-sm">
                                Preostalo: <span className="text-neon-green font-bold">{client.remainingSessions}</span> / {client.totalSessions}
                              </p>
                              {client.totalSessions > 0 && (
                                <div className="w-20 h-1 bg-gray-800 rounded-full overflow-hidden">
                                  <div 
                                    className="h-full bg-neon-green rounded-full"
                                    style={{ width: `${(client.remainingSessions / client.totalSessions) * 100}%` }}
                                  />
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="p-4">
                            <div>
                              <p className="text-xs text-gray-400">Do:</p>
                              <p className={`text-sm font-medium ${isExpiringSoon ? 'text-orange-500' : 'text-neon-green'}`}>
                                {new Date(client.membershipEndDate).toLocaleDateString('sr-RS')}
                              </p>
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="flex gap-2">
                              <button
                                onClick={() => {
                                  setEditingClient(client);
                                  setShowClientForm(true);
                                }}
                                className="text-neon-green hover:text-opacity-80 p-1"
                                title="Izmeni"
                              >
                                <Edit2 size={18} />
                              </button>
                              <button
                                onClick={() => {
                                  if (confirm('Da li ste sigurni da želite da arhivirate ovog klijenta?')) {
                                    requireAuth({ type: 'deleteClient', data: client.id });
                                  }
                                }}
                                className="text-red-500 hover:text-opacity-80 p-1"
                                title="Arhiviraj"
                              >
                                <Trash2 size={18} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );

      case "kalendar":
        const getDaysInMonth = (year: number, month: number) => {
          const firstDay = new Date(year, month, 1);
          const lastDay = new Date(year, month + 1, 0);
          
          const days = [];
          for (let d = new Date(firstDay); d <= lastDay; d.setDate(d.getDate() + 1)) {
            days.push(new Date(d));
          }
          return days;
        };

        const daysInMonth = getDaysInMonth(selectedYear, selectedMonth);
        const sessionsByDate = sessions.reduce((acc, session) => {
          if (!acc[session.date]) {
            acc[session.date] = [];
          }
          acc[session.date].push(session);
          return acc;
        }, {} as { [key: string]: TrainingSession[] });

        const handlePrevMonth = () => {
          if (selectedMonth === 0) {
            setSelectedMonth(11);
            setSelectedYear(selectedYear - 1);
          } else {
            setSelectedMonth(selectedMonth - 1);
          }
        };

        const handleNextMonth = () => {
          if (selectedMonth === 11) {
            setSelectedMonth(0);
            setSelectedYear(selectedYear + 1);
          } else {
            setSelectedMonth(selectedMonth + 1);
          }
        };

        return (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <h2 className="text-2xl font-bold">Kalendar</h2>
              <div className="flex gap-2">
                <button
                  onClick={handlePrevMonth}
                  className="p-2 bg-card border border-gray-800 rounded-lg hover:border-neon-green transition-all"
                >
                  <ChevronLeft size={20} />
                </button>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                  className="bg-card border border-gray-800 rounded-lg px-4 py-2 focus:border-neon-green focus:outline-none"
                >
                  {MONTHS.map((month, index) => (
                    <option key={month} value={index}>{month}</option>
                  ))}
                </select>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                  className="bg-card border border-gray-800 rounded-lg px-4 py-2 focus:border-neon-green focus:outline-none"
                >
                  {YEARS.map(year => (
                    <option key={year} value={year}>{year}.</option>
                  ))}
                </select>
                <button
                  onClick={handleNextMonth}
                  className="p-2 bg-card border border-gray-800 rounded-lg hover:border-neon-green transition-all"
                >
                  <ChevronRight size={20} />
                </button>
              </div>
            </div>

            <div className="bg-card p-6 rounded-xl border border-gray-800">
              <div className="grid grid-cols-7 gap-2">
                {['Pon', 'Uto', 'Sre', 'Čet', 'Pet', 'Sub', 'Ned'].map((day) => (
                  <div key={day} className="text-center py-2">
                    <span className={day === 'Pon' ? 'text-red-500' : 'text-neon-green'}>
                      {day}
                    </span>
                  </div>
                ))}
                
                {Array.from({ length: new Date(selectedYear, selectedMonth, 1).getDay() === 0 ? 6 : new Date(selectedYear, selectedMonth, 1).getDay() - 1 }).map((_, i) => (
                  <div key={`empty-${i}`} className="aspect-square bg-gray-900 rounded-lg p-2 opacity-50" />
                ))}

                {daysInMonth.map((date) => {
                  const dateStr = date.toISOString().split('T')[0];
                  const daySessions = sessionsByDate[dateStr] || [];
                  const isWorking = isWorkingDay(date);
                  const isMonday = date.getDay() === 1;

                  return (
                    <div
                      key={dateStr}
                      className={`aspect-square bg-gray-900 rounded-lg p-2 hover:border hover:border-neon-green transition-all cursor-pointer group relative
                        ${isMonday ? 'border border-red-500 border-opacity-30' : ''}
                      `}
                      onClick={() => {
                        if (!isMonday) {
                          setSelectedDate(dateStr);
                          setShowSessionForm(true);
                        }
                      }}
                    >
                      <span className={`text-sm ${isMonday ? 'text-red-500' : 'text-gray-400 group-hover:text-neon-green'}`}>
                        {date.getDate()}
                      </span>
                      
                      {!isMonday && (
                        <div className="mt-1 space-y-1">
                          {daySessions.slice(0, 3).map((session, idx) => (
                            <div
                              key={session.id}
                              className="text-[10px] bg-neon-green bg-opacity-10 text-neon-green rounded px-1 truncate"
                              title={`${session.time} - ${session.clientName} ${session.clientSurname}`}
                            >
                              {session.time} {session.clientName}
                            </div>
                          ))}
                          {daySessions.length > 3 && (
                            <div className="text-[10px] text-gray-400">
                              +{daySessions.length - 3} još
                            </div>
                          )}
                        </div>
                      )}

                      {isMonday && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-red-500 text-xs transform -rotate-12">ZATVORENO</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {showSessionForm && (
              <SessionForm
                session={editingSession || undefined}
                onCancel={() => {
                  setShowSessionForm(false);
                  setEditingSession(null);
                }}
              />
            )}
          </div>
        );

      case "statistika":
        const statsRevenue = getRevenueStats();
        const statsOccupancy = getOccupancyStats();

        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">Statistika</h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-card p-6 rounded-xl border border-gray-800">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <DollarSign size={20} className="text-neon-green" />
                  Dnevni prihod
                </h3>
                <p className="text-3xl font-bold text-neon-green">{statsRevenue.daily.toFixed(2)}€</p>
              </div>

              <div className="bg-card p-6 rounded-xl border border-gray-800">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <TrendingUp size={20} className="text-neon-green" />
                  Mesečni prihod
                </h3>
                <p className="text-3xl font-bold text-neon-green">{statsRevenue.monthly.toFixed(2)}€</p>
              </div>

              <div className="bg-card p-6 rounded-xl border border-gray-800">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Activity size={20} className="text-neon-green" />
                  Godišnji prihod
                </h3>
                <p className="text-3xl font-bold text-neon-green">{statsRevenue.yearly.toFixed(2)}€</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-card p-6 rounded-xl border border-gray-800">
                <h3 className="text-lg font-semibold mb-4">Prihod po mesecima</h3>
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {Object.entries(statsRevenue.byMonth)
                    .sort(([a], [b]) => b.localeCompare(a))
                    .map(([month, amount]) => {
                      const [year, m] = month.split('-');
                      return (
                        <div key={month} className="flex items-center gap-4">
                          <span className="w-24 text-neon-green">{MONTHS[parseInt(m) - 1]} {year}.</span>
                          <div className="flex-1 h-4 bg-gray-800 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-neon-green rounded-full"
                              style={{ width: `${(amount / Math.max(...Object.values(statsRevenue.byMonth))) * 100}%` }}
                            />
                          </div>
                          <span className="text-sm font-bold">{amount.toFixed(2)}€</span>
                        </div>
                      );
                    })}
                </div>
              </div>

              <div className="bg-card p-6 rounded-xl border border-gray-800">
                <h3 className="text-lg font-semibold mb-4">Prihod po godinama</h3>
                <div className="space-y-4">
                  {Object.entries(statsRevenue.byYear)
                    .sort(([a], [b]) => b.localeCompare(a))
                    .map(([year, amount]) => (
                      <div key={year} className="flex items-center gap-4">
                        <span className="w-16 text-neon-green">{year}.</span>
                        <div className="flex-1 h-4 bg-gray-800 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-neon-green rounded-full"
                            style={{ width: `${(amount / Math.max(...Object.values(statsRevenue.byYear))) * 100}%` }}
                          />
                        </div>
                        <span className="text-sm font-bold">{amount.toFixed(2)}€</span>
                      </div>
                    ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-card p-6 rounded-xl border border-gray-800">
                <h3 className="text-lg font-semibold mb-4">Dnevna popunjenost</h3>
                <p className="text-3xl font-bold text-neon-green">{statsOccupancy.daily}%</p>
                <div className="mt-4">
                  <div className="flex justify-between text-sm text-gray-400 mb-1">
                    <span>Iskorišćeno termina</span>
                    <span>{Math.round(statsOccupancy.daily * statsOccupancy.dailyCapacity / 100)} / {statsOccupancy.dailyCapacity}</span>
                  </div>
                  <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-neon-green rounded-full transition-all"
                      style={{ width: `${statsOccupancy.daily}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="bg-card p-6 rounded-xl border border-gray-800">
                <h3 className="text-lg font-semibold mb-4">Mesečna popunjenost</h3>
                <p className="text-3xl font-bold text-neon-green">{statsOccupancy.monthly}%</p>
                <div className="mt-4">
                  <div className="flex justify-between text-sm text-gray-400 mb-1">
                    <span>Iskorišćeno termina</span>
                    <span>{Math.round(statsOccupancy.monthly * statsOccupancy.monthlyCapacity / 100)} / {statsOccupancy.monthlyCapacity}</span>
                  </div>
                  <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-neon-green rounded-full transition-all"
                      style={{ width: `${statsOccupancy.monthly}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-card p-6 rounded-xl border border-gray-800">
              <h3 className="text-lg font-semibold mb-4">Popunjenost po danima u nedelji</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {Object.entries(statsOccupancy.weeklyByDay).map(([day, percentage]) => (
                  <div key={day} className="text-center">
                    <p className="text-neon-green mb-2">{day}</p>
                    <div className="relative h-32 flex items-end justify-center">
                      <div 
                        className="w-12 bg-neon-green rounded-t-lg transition-all"
                        style={{ height: `${percentage}%` }}
                      />
                    </div>
                    <p className="mt-2 font-bold">{percentage}%</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case "arhiva":
        const filteredArchive = archive.filter(record => 
          JSON.stringify(record).toLowerCase().includes(searchTerm.toLowerCase())
        );

        return (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <h2 className="text-2xl font-bold">Arhiva</h2>
              {archive.length > 0 && (
                <button
                  onClick={() => exportToPDF(archive, 'arhiva')}
                  className="bg-neon-green text-dark px-4 py-2 rounded-lg font-semibold hover:bg-opacity-80 transition-all flex items-center gap-2"
                >
                  <Download size={20} />
                  Izvezi u PDF
                </button>
              )}
            </div>

            <div className="bg-card rounded-xl border border-gray-800 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[800px]">
                  <thead className="bg-gray-900">
                    <tr>
                      <th className="text-left p-4 text-neon-green">Tip</th>
                      <th className="text-left p-4 text-neon-green">Podaci</th>
                      <th className="text-left p-4 text-neon-green">Datum arhiviranja</th>
                      <th className="text-left p-4 text-neon-green">Originalni datum</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredArchive.map((record) => (
                      <tr key={record.id} className="border-t border-gray-800 hover:bg-gray-900 transition-colors">
                        <td className="p-4">
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            record.type === 'client' ? 'bg-blue-500 bg-opacity-20 text-blue-500' : 'bg-green-500 bg-opacity-20 text-green-500'
                          }`}>
                            {record.type === 'client' ? 'Klijent' : 'Termin'}
                          </span>
                        </td>
                        <td className="p-4">
                          <pre className="text-xs text-gray-400 max-w-md overflow-x-auto">
                            {JSON.stringify(record.data, null, 2)}
                          </pre>
                        </td>
                        <td className="p-4">
                          {new Date(record.archivedAt).toLocaleDateString('sr-RS')}
                        </td>
                        <td className="p-4">
                          {new Date(record.originalDate).toLocaleDateString('sr-RS')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );

      case "paketi":
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">Paketi</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {PACKAGES.map((paket) => (
                <div key={paket.id} className="bg-card p-6 rounded-xl border border-gray-800 hover:border-neon-green transition-all group">
                  <h3 className="text-2xl font-bold mb-2 text-neon-green">{paket.name}</h3>
                  <p className="text-4xl font-bold mb-4">-</p>
                  
                  <div className="space-y-4 mb-6">
                    <div className="flex items-center gap-2">
                      <CheckCircle size={18} className="text-neon-green" />
                      <span>Broj termina: ___</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle size={18} className="text-neon-green" />
                      <span>Cena: ___ €</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle size={18} className="text-neon-green" />
                      <span>Važi {paket.durationDays} dana</span>
                    </div>
                  </div>

                  <div className="border-t border-gray-800 pt-4">
                    <p className="text-sm text-gray-400 mb-2">Trenutno aktivnih:</p>
                    <p className="text-2xl font-bold text-neon-green">
                      {clients.filter(c => c.package === paket.id).length}
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      setActiveMenu("clients");
                      setShowClientForm(true);
                    }}
                    className="w-full mt-4 bg-neon-green text-dark py-2 rounded-lg font-semibold hover:bg-opacity-80 transition-all opacity-0 group-hover:opacity-100"
                  >
                    Aktiviraj paket
                  </button>
                </div>
              ))}
            </div>

            <div className="bg-card p-6 rounded-xl border border-gray-800">
              <h3 className="text-lg font-semibold mb-4">Informacije o paketima</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-gray-400 mb-2">Svi paketi uključuju:</p>
                  <ul className="space-y-2">
                    <li className="flex items-center gap-2">
                      <CheckCircle size={16} className="text-neon-green" />
                      <span>Pristup teretani u radno vreme</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle size={16} className="text-neon-green" />
                      <span>Stručno vođen trening</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle size={16} className="text-neon-green" />
                      <span>Opremu za vežbanje</span>
                    </li>
                  </ul>
                </div>
                <div>
                  <p className="text-gray-400 mb-2">Radno vreme:</p>
                  <ul className="space-y-2">
                    <li className="flex items-center gap-2">
                      <Sun size={16} className="text-neon-green" />
                      <span>Utorak - Petak: 08:00 - 20:00</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Cloud size={16} className="text-neon-green" />
                      <span>Subota - Nedelja: 08:00 - 20:00</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Moon size={16} className="text-red-500" />
                      <span>Ponedeljak: ZATVORENO</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-dark">
      {passwordModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-card p-6 rounded-xl border border-gray-800 max-w-sm w-full">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Lock size={20} className="text-neon-green" />
              Autorizacija
            </h3>
            <p className="text-gray-400 mb-4">Unesite lozinku za nastavak</p>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Lozinka"
              className="w-full bg-gray-900 border border-gray-800 rounded-lg px-4 py-2 mb-4 focus:border-neon-green focus:outline-none"
              onKeyPress={(e) => e.key === 'Enter' && handlePasswordSubmit()}
            />
            <div className="flex gap-2">
              <button
                onClick={handlePasswordSubmit}
                className="flex-1 bg-neon-green text-dark px-4 py-2 rounded-lg font-semibold hover:bg-opacity-80 transition-all"
              >
                Potvrdi
              </button>
              <button
                onClick={() => {
                  setPasswordModalOpen(false);
                  setPassword("");
                  setPendingAction(null);
                }}
                className="flex-1 bg-gray-800 text-white px-4 py-2 rounded-lg font-semibold hover:bg-gray-700 transition-all"
              >
                Otkaži
              </button>
            </div>
          </div>
        </div>
      )}

      <button
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 bg-card p-2 rounded-lg border border-gray-800"
      >
        {mobileMenuOpen ? <X size={24} className="text-neon-green" /> : <Menu size={24} className="text-neon-green" />}
      </button>

      <aside className={`
        fixed top-0 left-0 h-full w-64 bg-card border-r border-gray-800 z-40
        transition-transform duration-300 overflow-y-auto
        ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="h-16 flex items-center justify-center border-b border-gray-800 sticky top-0 bg-card">
          <Dumbbell size={32} className="text-neon-green mr-2" />
          <span className="text-xl font-bold">
            <span className="text-white">GYM</span>
            <span className="text-neon-green">PRO</span>
          </span>
        </div>

        <nav className="p-4">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setActiveMenu(item.id);
                setMobileMenuOpen(false);
              }}
              className={`
                w-full flex items-center gap-3 px-4 py-3 rounded-lg mb-1
                transition-all hover:bg-gray-800
                ${activeMenu === item.id 
                  ? 'bg-neon-green bg-opacity-10 text-neon-green border-l-4 border-neon-green' 
                  : 'text-gray-400 hover:text-white'
                }
              `}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-800 mt-auto">
          <div className="text-xs text-gray-400 space-y-1">
            <p className="flex items-center gap-1">
              <Sun size={12} className="text-neon-green" />
              <span>Utorak - Petak: 08-20h</span>
            </p>
            <p className="flex items-center gap-1">
              <Cloud size={12} className="text-neon-green" />
              <span>Subota - Nedelja: 08-20h</span>
            </p>
            <p className="flex items-center gap-1">
              <Moon size={12} className="text-red-500" />
              <span>Ponedeljak: ZATVORENO</span>
            </p>
          </div>
        </div>

        <div className="sticky bottom-0 bg-card p-4 border-t border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-neon-green bg-opacity-10 rounded-full flex items-center justify-center">
              <Users size={20} className="text-neon-green" />
            </div>
            <div>
              <p className="font-semibold">Admin</p>
              <p className="text-xs text-gray-400">online</p>
            </div>
          </div>
        </div>
      </aside>

      <main className="lg:ml-64 p-4 lg:p-8 pb-20">
        <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl lg:text-3xl font-bold capitalize">
              {menuItems.find(item => item.id === activeMenu)?.label || 'Dashboard'}
            </h1>
          </div>

          <div className="flex items-center gap-4">
            {(activeMenu === 'clients' || activeMenu === 'arhiva') && (
              <div className="relative">
                <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Pretraži..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-card border border-gray-800 rounded-lg pl-10 pr-4 py-2 focus:border-neon-green focus:outline-none w-full lg:w-64"
                />
              </div>
            )}

            <div className="flex items-center gap-2 text-sm text-gray-400">
              <Save size={16} className="text-neon-green" />
              <span className="hidden sm:inline">Auto-save</span>
            </div>

            <button className="relative p-2 bg-card rounded-lg border border-gray-800 hover:border-neon-green transition-all">
              <Bell size={20} className="text-gray-400" />
              {clients.filter(c => {
                const daysUntil = Math.ceil((new Date(c.membershipEndDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                return daysUntil <= 7 && daysUntil > 0;
              }).length > 0 && (
                <span className="absolute top-0 right-0 w-2 h-2 bg-neon-green rounded-full animate-pulse"></span>
              )}
            </button>
          </div>
        </header>

        {renderContent()}
      </main>
    </div>
  );
}