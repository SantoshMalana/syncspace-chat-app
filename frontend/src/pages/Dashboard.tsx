import { useState } from "react";
import { useNavigate } from "react-router-dom";

// Types
interface User {
  id: string;
  fullName: string;
  email: string;
  role: "admin" | "member";
  avatar?: string;
  status: "online" | "away" | "offline";
}

interface Meeting {
  id: string;
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  organizer: string;
  participants: string[];
  meetingLink?: string;
  status: "upcoming" | "ongoing" | "completed";
}

interface Task {
  id: string;
  title: string;
  description: string;
  assignedTo: string[];
  deadline: string;
  priority: "high" | "medium" | "low";
  status: "pending" | "in-progress" | "completed";
  createdBy: string;
}

interface MeetingRequest {
  id: string;
  requestedBy: string;
  requestedWith: string[];
  purpose: string;
  preferredTime: string;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const [darkMode, setDarkMode] = useState(true);
  const [currentUser] = useState<User>({
    id: "1",
    fullName: "John Doe",
    email: "john@company.com",
    role: "admin", // Change to "member" to test member view
    status: "online",
  });

  const [meetings] = useState<Meeting[]>([
    {
      id: "1",
      title: "Sprint Planning Meeting",
      description: "Planning for Q1 2025 sprint objectives",
      startTime: "2025-02-07T10:00:00",
      endTime: "2025-02-07T11:30:00",
      organizer: "Sarah Johnson",
      participants: ["john@company.com", "sarah@company.com", "mike@company.com"],
      status: "upcoming",
    },
    {
      id: "2",
      title: "Client Presentation",
      description: "Product demo for ABC Corp",
      startTime: "2025-02-07T14:00:00",
      endTime: "2025-02-07T15:00:00",
      organizer: "John Doe",
      participants: ["john@company.com", "client@abc.com"],
      status: "upcoming",
    },
  ]);

  const [tasks] = useState<Task[]>([
    {
      id: "1",
      title: "Complete Q1 Report",
      description: "Compile all metrics and submit to management",
      assignedTo: ["john@company.com"],
      deadline: "2025-02-10T23:59:00",
      priority: "high",
      status: "in-progress",
      createdBy: "sarah@company.com",
    },
    {
      id: "2",
      title: "Review Pull Requests",
      description: "Review and merge pending PRs in repository",
      assignedTo: ["john@company.com", "mike@company.com"],
      deadline: "2025-02-08T17:00:00",
      priority: "medium",
      status: "pending",
      createdBy: "john@company.com",
    },
  ]);

  const [meetingRequests, setMeetingRequests] = useState<MeetingRequest[]>([
    {
      id: "1",
      requestedBy: "jane@company.com",
      requestedWith: ["john@company.com", "hr@company.com"],
      purpose: "Discuss career progression opportunities",
      preferredTime: "2025-02-08T15:00:00",
      status: "pending",
      createdAt: "2025-02-06T09:00:00",
    },
  ]);

  const [_showMeetingModal, setShowMeetingModal] = useState(false);
  const [_showRequestModal, setShowRequestModal] = useState(false);
  const [_showTaskModal, setShowTaskModal] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "meetings" | "tasks" | "requests">("overview");

  // Toggle dark mode
  const toggleTheme = () => {
    setDarkMode(!darkMode);
  };

  // Get upcoming meetings
  const upcomingMeetings = meetings
    .filter((m) => new Date(m.startTime) > new Date() && m.status === "upcoming")
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
    .slice(0, 3);

  // Get urgent tasks
  const urgentTasks = tasks
    .filter((t) => t.priority === "high" && t.status !== "completed")
    .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())
    .slice(0, 3);

  // Calculate time until meeting
  const getTimeUntil = (dateString: string) => {
    const now = new Date();
    const meetingTime = new Date(dateString);
    const diffMs = meetingTime.getTime() - now.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    if (diffHours < 0) return "Past";
    if (diffHours === 0) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h ${diffMins}m`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ${diffHours % 24}h`;
  };

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Handle logout
  const handleLogout = () => {
    // TODO: Clear auth tokens
    navigate("/login");
  };

  return (
    <div className={`min-h-screen ${darkMode ? "dark bg-[#0f0f0f]" : "bg-gray-50"}`}>
      <div className="flex h-screen">

        {/* Sidebar */}
        <aside className={`w-64 ${darkMode ? "bg-[#141414] border-[#1f1f1f]" : "bg-white border-gray-200"} border-r flex flex-col`}>

          {/* Logo */}
          <div className={`p-6 ${darkMode ? "border-[#1f1f1f]" : "border-gray-200"} border-b`}>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              SyncSpace
            </h1>
            <p className={`text-xs mt-1 ${darkMode ? "text-gray-500" : "text-gray-600"}`}>
              {currentUser.role === "admin" ? "Admin Dashboard" : "Member Dashboard"}
            </p>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1">
            <button
              onClick={() => setActiveTab("overview")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${activeTab === "overview"
                  ? darkMode
                    ? "bg-primary/10 text-primary"
                    : "bg-primary/10 text-primary"
                  : darkMode
                    ? "text-gray-400 hover:bg-[#1a1a1a]"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
              <span className="font-medium">Overview</span>
            </button>

            <button
              onClick={() => setActiveTab("meetings")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${activeTab === "meetings"
                  ? darkMode
                    ? "bg-primary/10 text-primary"
                    : "bg-primary/10 text-primary"
                  : darkMode
                    ? "text-gray-400 hover:bg-[#1a1a1a]"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="font-medium">Meetings</span>
              {upcomingMeetings.length > 0 && (
                <span className="ml-auto bg-primary text-white text-xs px-2 py-0.5 rounded-full">
                  {upcomingMeetings.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab("tasks")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${activeTab === "tasks"
                  ? darkMode
                    ? "bg-primary/10 text-primary"
                    : "bg-primary/10 text-primary"
                  : darkMode
                    ? "text-gray-400 hover:bg-[#1a1a1a]"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <span className="font-medium">Tasks</span>
              {urgentTasks.length > 0 && (
                <span className="ml-auto bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                  {urgentTasks.length}
                </span>
              )}
            </button>

            {currentUser.role === "admin" && (
              <button
                onClick={() => setActiveTab("requests")}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${activeTab === "requests"
                    ? darkMode
                      ? "bg-primary/10 text-primary"
                      : "bg-primary/10 text-primary"
                    : darkMode
                      ? "text-gray-400 hover:bg-[#1a1a1a]"
                      : "text-gray-600 hover:bg-gray-100"
                  }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                <span className="font-medium">Requests</span>
                {meetingRequests.filter((r) => r.status === "pending").length > 0 && (
                  <span className="ml-auto bg-yellow-500 text-white text-xs px-2 py-0.5 rounded-full">
                    {meetingRequests.filter((r) => r.status === "pending").length}
                  </span>
                )}
              </button>
            )}

            <div className={`my-4 border-t ${darkMode ? "border-[#1f1f1f]" : "border-gray-200"}`}></div>

            <button
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${darkMode ? "text-gray-400 hover:bg-[#1a1a1a]" : "text-gray-600 hover:bg-gray-100"
                }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="font-medium">Settings</span>
            </button>
          </nav>

          {/* User Profile */}
          <div className={`p-4 ${darkMode ? "border-[#1f1f1f]" : "border-gray-200"} border-t`}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-semibold">
                {currentUser.fullName.split(" ").map((n) => n[0]).join("")}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`font-medium truncate ${darkMode ? "text-gray-200" : "text-gray-900"}`}>
                  {currentUser.fullName}
                </p>
                <p className={`text-xs truncate ${darkMode ? "text-gray-500" : "text-gray-600"}`}>
                  {currentUser.email}
                </p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className={`w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg transition-all ${darkMode
                  ? "bg-red-500/10 text-red-400 hover:bg-red-500/20"
                  : "bg-red-50 text-red-600 hover:bg-red-100"
                }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Logout
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 flex flex-col overflow-hidden">

          {/* Header */}
          <header className={`${darkMode ? "bg-[#0a0a0a] border-[#1f1f1f]" : "bg-white border-gray-200"} border-b px-8 py-4 flex items-center justify-between`}>
            <div>
              <h2 className={`text-2xl font-bold ${darkMode ? "text-gray-100" : "text-gray-900"}`}>
                {activeTab === "overview" && "Dashboard Overview"}
                {activeTab === "meetings" && "Meetings"}
                {activeTab === "tasks" && "Tasks & Deadlines"}
                {activeTab === "requests" && "Meeting Requests"}
              </h2>
              <p className={`text-sm mt-1 ${darkMode ? "text-gray-500" : "text-gray-600"}`}>
                {new Date().toLocaleDateString("en-US", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </div>

            <div className="flex items-center gap-3">
              {/* Theme Toggle */}
              <button
                onClick={toggleTheme}
                className={`p-2 rounded-lg transition-all ${darkMode ? "bg-[#1a1a1a] text-gray-400 hover:text-gray-200" : "bg-gray-100 text-gray-600 hover:text-gray-900"
                  }`}
              >
                {darkMode ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                  </svg>
                )}
              </button>

              {/* Notifications */}
              <button className={`p-2 rounded-lg transition-all relative ${darkMode ? "bg-[#1a1a1a] text-gray-400 hover:text-gray-200" : "bg-gray-100 text-gray-600 hover:text-gray-900"
                }`}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              </button>
            </div>
          </header>

          {/* Content Area */}
          <div className={`flex-1 overflow-y-auto p-8 ${darkMode ? "bg-[#0f0f0f]" : "bg-gray-50"}`}>

            {/* Overview Tab */}
            {activeTab === "overview" && (
              <div className="space-y-6">

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className={`${darkMode ? "bg-[#141414] border-[#1f1f1f]" : "bg-white border-gray-200"} border rounded-xl p-6`}>
                    <div className="flex items-center justify-between mb-4">
                      <div className={`p-3 rounded-lg ${darkMode ? "bg-blue-500/10" : "bg-blue-50"}`}>
                        <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    </div>
                    <h3 className={`text-2xl font-bold ${darkMode ? "text-gray-100" : "text-gray-900"}`}>
                      {upcomingMeetings.length}
                    </h3>
                    <p className={`text-sm ${darkMode ? "text-gray-500" : "text-gray-600"}`}>Upcoming Meetings</p>
                  </div>

                  <div className={`${darkMode ? "bg-[#141414] border-[#1f1f1f]" : "bg-white border-gray-200"} border rounded-xl p-6`}>
                    <div className="flex items-center justify-between mb-4">
                      <div className={`p-3 rounded-lg ${darkMode ? "bg-red-500/10" : "bg-red-50"}`}>
                        <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                    </div>
                    <h3 className={`text-2xl font-bold ${darkMode ? "text-gray-100" : "text-gray-900"}`}>
                      {urgentTasks.length}
                    </h3>
                    <p className={`text-sm ${darkMode ? "text-gray-500" : "text-gray-600"}`}>Urgent Tasks</p>
                  </div>

                  <div className={`${darkMode ? "bg-[#141414] border-[#1f1f1f]" : "bg-white border-gray-200"} border rounded-xl p-6`}>
                    <div className="flex items-center justify-between mb-4">
                      <div className={`p-3 rounded-lg ${darkMode ? "bg-green-500/10" : "bg-green-50"}`}>
                        <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                    </div>
                    <h3 className={`text-2xl font-bold ${darkMode ? "text-gray-100" : "text-gray-900"}`}>
                      {tasks.filter((t) => t.status === "completed").length}
                    </h3>
                    <p className={`text-sm ${darkMode ? "text-gray-500" : "text-gray-600"}`}>Completed Tasks</p>
                  </div>

                  {currentUser.role === "admin" && (
                    <div className={`${darkMode ? "bg-[#141414] border-[#1f1f1f]" : "bg-white border-gray-200"} border rounded-xl p-6`}>
                      <div className="flex items-center justify-between mb-4">
                        <div className={`p-3 rounded-lg ${darkMode ? "bg-yellow-500/10" : "bg-yellow-50"}`}>
                          <svg className="w-6 h-6 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                          </svg>
                        </div>
                      </div>
                      <h3 className={`text-2xl font-bold ${darkMode ? "text-gray-100" : "text-gray-900"}`}>
                        {meetingRequests.filter((r) => r.status === "pending").length}
                      </h3>
                      <p className={`text-sm ${darkMode ? "text-gray-500" : "text-gray-600"}`}>Pending Requests</p>
                    </div>
                  )}
                </div>

                {/* Two Column Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                  {/* Upcoming Meetings */}
                  <div className={`${darkMode ? "bg-[#141414] border-[#1f1f1f]" : "bg-white border-gray-200"} border rounded-xl p-6`}>
                    <div className="flex items-center justify-between mb-6">
                      <h3 className={`text-lg font-semibold ${darkMode ? "text-gray-100" : "text-gray-900"}`}>
                        Upcoming Meetings
                      </h3>
                      <button
                        onClick={() => setActiveTab("meetings")}
                        className="text-primary hover:text-primary/80 text-sm font-medium"
                      >
                        View All
                      </button>
                    </div>
                    <div className="space-y-4">
                      {upcomingMeetings.length === 0 ? (
                        <p className={`text-center py-8 ${darkMode ? "text-gray-500" : "text-gray-600"}`}>
                          No upcoming meetings
                        </p>
                      ) : (
                        upcomingMeetings.map((meeting) => (
                          <div
                            key={meeting.id}
                            className={`p-4 rounded-lg ${darkMode ? "bg-[#1a1a1a] border-[#2a2a2a]" : "bg-gray-50 border-gray-200"} border`}
                          >
                            <div className="flex items-start justify-between mb-2">
                              <h4 className={`font-semibold ${darkMode ? "text-gray-100" : "text-gray-900"}`}>
                                {meeting.title}
                              </h4>
                              <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                                {getTimeUntil(meeting.startTime)}
                              </span>
                            </div>
                            <p className={`text-sm ${darkMode ? "text-gray-500" : "text-gray-600"} mb-2`}>
                              {meeting.description}
                            </p>
                            <div className="flex items-center justify-between text-xs">
                              <span className={darkMode ? "text-gray-500" : "text-gray-600"}>
                                {formatDate(meeting.startTime)}
                              </span>
                              <span className={darkMode ? "text-gray-500" : "text-gray-600"}>
                                {meeting.participants.length} participants
                              </span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Urgent Tasks */}
                  <div className={`${darkMode ? "bg-[#141414] border-[#1f1f1f]" : "bg-white border-gray-200"} border rounded-xl p-6`}>
                    <div className="flex items-center justify-between mb-6">
                      <h3 className={`text-lg font-semibold ${darkMode ? "text-gray-100" : "text-gray-900"}`}>
                        Urgent Tasks
                      </h3>
                      <button
                        onClick={() => setActiveTab("tasks")}
                        className="text-primary hover:text-primary/80 text-sm font-medium"
                      >
                        View All
                      </button>
                    </div>
                    <div className="space-y-4">
                      {urgentTasks.length === 0 ? (
                        <p className={`text-center py-8 ${darkMode ? "text-gray-500" : "text-gray-600"}`}>
                          No urgent tasks
                        </p>
                      ) : (
                        urgentTasks.map((task) => (
                          <div
                            key={task.id}
                            className={`p-4 rounded-lg ${darkMode ? "bg-[#1a1a1a] border-[#2a2a2a]" : "bg-gray-50 border-gray-200"} border`}
                          >
                            <div className="flex items-start justify-between mb-2">
                              <h4 className={`font-semibold ${darkMode ? "text-gray-100" : "text-gray-900"}`}>
                                {task.title}
                              </h4>
                              <span className={`text-xs px-2 py-1 rounded ${task.priority === "high"
                                  ? "bg-red-500/10 text-red-500"
                                  : task.priority === "medium"
                                    ? "bg-yellow-500/10 text-yellow-500"
                                    : "bg-green-500/10 text-green-500"
                                }`}>
                                {task.priority}
                              </span>
                            </div>
                            <p className={`text-sm ${darkMode ? "text-gray-500" : "text-gray-600"} mb-2`}>
                              {task.description}
                            </p>
                            <div className="flex items-center justify-between text-xs">
                              <span className={darkMode ? "text-gray-500" : "text-gray-600"}>
                                Due: {formatDate(task.deadline)}
                              </span>
                              <span className={`px-2 py-1 rounded ${task.status === "in-progress"
                                  ? darkMode ? "bg-blue-500/10 text-blue-400" : "bg-blue-50 text-blue-600"
                                  : darkMode ? "bg-gray-700 text-gray-400" : "bg-gray-100 text-gray-600"
                                }`}>
                                {task.status}
                              </span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Meetings Tab */}
            {activeTab === "meetings" && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className={`text-xl font-semibold ${darkMode ? "text-gray-100" : "text-gray-900"}`}>
                      All Meetings
                    </h3>
                    <p className={`text-sm ${darkMode ? "text-gray-500" : "text-gray-600"}`}>
                      Manage your upcoming meetings and schedules
                    </p>
                  </div>
                  {currentUser.role === "admin" ? (
                    <button
                      onClick={() => setShowMeetingModal(true)}
                      className="px-4 py-2 bg-gradient-to-r from-primary to-secondary text-white rounded-lg font-medium hover:shadow-lg transition-all"
                    >
                      Schedule Meeting
                    </button>
                  ) : (
                    <button
                      onClick={() => setShowRequestModal(true)}
                      className="px-4 py-2 bg-gradient-to-r from-primary to-secondary text-white rounded-lg font-medium hover:shadow-lg transition-all"
                    >
                      Request Meeting
                    </button>
                  )}
                </div>

                <div className="space-y-4">
                  {meetings.map((meeting) => (
                    <div
                      key={meeting.id}
                      className={`${darkMode ? "bg-[#141414] border-[#1f1f1f]" : "bg-white border-gray-200"} border rounded-xl p-6`}
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h4 className={`text-lg font-semibold ${darkMode ? "text-gray-100" : "text-gray-900"} mb-1`}>
                            {meeting.title}
                          </h4>
                          <p className={`text-sm ${darkMode ? "text-gray-500" : "text-gray-600"}`}>
                            {meeting.description}
                          </p>
                        </div>
                        <span className={`px-3 py-1 rounded-lg text-sm font-medium ${meeting.status === "upcoming"
                            ? "bg-blue-500/10 text-blue-500"
                            : meeting.status === "ongoing"
                              ? "bg-green-500/10 text-green-500"
                              : "bg-gray-500/10 text-gray-500"
                          }`}>
                          {meeting.status}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <svg className={`w-4 h-4 ${darkMode ? "text-gray-500" : "text-gray-600"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span className={darkMode ? "text-gray-400" : "text-gray-700"}>
                            {formatDate(meeting.startTime)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <svg className={`w-4 h-4 ${darkMode ? "text-gray-500" : "text-gray-600"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          <span className={darkMode ? "text-gray-400" : "text-gray-700"}>
                            Organizer: {meeting.organizer}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <svg className={`w-4 h-4 ${darkMode ? "text-gray-500" : "text-gray-600"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                          </svg>
                          <span className={darkMode ? "text-gray-400" : "text-gray-700"}>
                            {meeting.participants.length} participants
                          </span>
                        </div>
                      </div>
                      {meeting.meetingLink && (
                        <div className="mt-4">
                          <a
                            href={meeting.meetingLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 text-primary hover:text-primary/80 text-sm font-medium"
                          >
                            Join Meeting
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                          </a>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tasks Tab */}
            {activeTab === "tasks" && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className={`text-xl font-semibold ${darkMode ? "text-gray-100" : "text-gray-900"}`}>
                      All Tasks
                    </h3>
                    <p className={`text-sm ${darkMode ? "text-gray-500" : "text-gray-600"}`}>
                      Track and manage your tasks and deadlines
                    </p>
                  </div>
                  {currentUser.role === "admin" && (
                    <button
                      onClick={() => setShowTaskModal(true)}
                      className="px-4 py-2 bg-gradient-to-r from-primary to-secondary text-white rounded-lg font-medium hover:shadow-lg transition-all"
                    >
                      Create Task
                    </button>
                  )}
                </div>

                <div className="space-y-4">
                  {tasks.map((task) => (
                    <div
                      key={task.id}
                      className={`${darkMode ? "bg-[#141414] border-[#1f1f1f]" : "bg-white border-gray-200"} border rounded-xl p-6`}
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h4 className={`text-lg font-semibold ${darkMode ? "text-gray-100" : "text-gray-900"}`}>
                              {task.title}
                            </h4>
                            <span className={`px-2 py-1 rounded text-xs font-medium ${task.priority === "high"
                                ? "bg-red-500/10 text-red-500"
                                : task.priority === "medium"
                                  ? "bg-yellow-500/10 text-yellow-500"
                                  : "bg-green-500/10 text-green-500"
                              }`}>
                              {task.priority}
                            </span>
                          </div>
                          <p className={`text-sm ${darkMode ? "text-gray-500" : "text-gray-600"}`}>
                            {task.description}
                          </p>
                        </div>
                        <span className={`px-3 py-1 rounded-lg text-sm font-medium whitespace-nowrap ml-4 ${task.status === "completed"
                            ? "bg-green-500/10 text-green-500"
                            : task.status === "in-progress"
                              ? "bg-blue-500/10 text-blue-500"
                              : "bg-gray-500/10 text-gray-500"
                          }`}>
                          {task.status}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <svg className={`w-4 h-4 ${darkMode ? "text-gray-500" : "text-gray-600"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <span className={darkMode ? "text-gray-400" : "text-gray-700"}>
                            Due: {formatDate(task.deadline)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <svg className={`w-4 h-4 ${darkMode ? "text-gray-500" : "text-gray-600"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          <span className={darkMode ? "text-gray-400" : "text-gray-700"}>
                            Assigned: {task.assignedTo.length} member(s)
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <svg className={`w-4 h-4 ${darkMode ? "text-gray-500" : "text-gray-600"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                          </svg>
                          <span className={darkMode ? "text-gray-400" : "text-gray-700"}>
                            Created by: {task.createdBy}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Requests Tab (Admin Only) */}
            {activeTab === "requests" && currentUser.role === "admin" && (
              <div className="space-y-6">
                <div>
                  <h3 className={`text-xl font-semibold ${darkMode ? "text-gray-100" : "text-gray-900"}`}>
                    Meeting Requests
                  </h3>
                  <p className={`text-sm ${darkMode ? "text-gray-500" : "text-gray-600"}`}>
                    Review and approve meeting requests from team members
                  </p>
                </div>

                <div className="space-y-4">
                  {meetingRequests.map((request) => (
                    <div
                      key={request.id}
                      className={`${darkMode ? "bg-[#141414] border-[#1f1f1f]" : "bg-white border-gray-200"} border rounded-xl p-6`}
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h4 className={`text-lg font-semibold ${darkMode ? "text-gray-100" : "text-gray-900"}`}>
                              Meeting Request from {request.requestedBy}
                            </h4>
                            <span className={`px-2 py-1 rounded text-xs font-medium ${request.status === "pending"
                                ? "bg-yellow-500/10 text-yellow-500"
                                : request.status === "approved"
                                  ? "bg-green-500/10 text-green-500"
                                  : "bg-red-500/10 text-red-500"
                              }`}>
                              {request.status}
                            </span>
                          </div>
                          <p className={`text-sm ${darkMode ? "text-gray-500" : "text-gray-600"} mb-3`}>
                            {request.purpose}
                          </p>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mb-4">
                        <div className="flex items-center gap-2">
                          <svg className={`w-4 h-4 ${darkMode ? "text-gray-500" : "text-gray-600"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <span className={darkMode ? "text-gray-400" : "text-gray-700"}>
                            Preferred: {formatDate(request.preferredTime)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <svg className={`w-4 h-4 ${darkMode ? "text-gray-500" : "text-gray-600"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                          </svg>
                          <span className={darkMode ? "text-gray-400" : "text-gray-700"}>
                            Participants: {request.requestedWith.join(", ")}
                          </span>
                        </div>
                      </div>
                      {request.status === "pending" && (
                        <div className="flex gap-3">
                          <button
                            onClick={() => {
                              setMeetingRequests(meetingRequests.map((r) =>
                                r.id === request.id ? { ...r, status: "approved" } : r
                              ));
                            }}
                            className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm font-medium transition-all"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => {
                              setMeetingRequests(meetingRequests.map((r) =>
                                r.id === request.id ? { ...r, status: "rejected" } : r
                              ));
                            }}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${darkMode
                                ? "bg-red-500/10 text-red-400 hover:bg-red-500/20"
                                : "bg-red-50 text-red-600 hover:bg-red-100"
                              }`}
                          >
                            Reject
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        </main>
      </div>

      {/* Modals would go here - simplified for brevity */}
      {/* You can add full modal implementations for creating meetings, tasks, and requests */}

    </div>
  );
};

export default Dashboard;
