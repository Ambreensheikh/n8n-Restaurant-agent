"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Bot,
  Send,
  CalendarDays,
  Settings,
  Code2,
  Sparkles,
  CheckCircle2,
  User,
  Phone,
  UtensilsCrossed,
  X,
  Copy,
  Check,
} from "lucide-react";

interface Message {
  id: string;
  sender: "user" | "agent";
  text: string;
  time: string;
}

interface LogPayload {
  timestamp: string;
  request: any;
  response: any;
}

export default function RestaurantDashboard() {
  const [webhookUrl, setWebhookUrl] = useState<string>(
    "http://localhost:5678/webhook/restaurant-agent",
  );
  const [sessionId, setSessionId] = useState<string>("");
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "init-1",
      sender: "agent",
      text: "Bonsoir. Main Le Velours ka AI agent hoon. Aaj shaam table reservation, chef tasting menu, ya private dining booth ke silsile me main aapki kya madad karoon?",
      time: "Just now",
    },
  ]);
  const [inputMessage, setInputMessage] = useState<string>("");
  const [isLoadingChat, setIsLoadingChat] = useState<boolean>(false);
  const [isBookingSubmitting, setIsBookingSubmitting] =
    useState<boolean>(false);

  // Form State
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    guests: "2 Guests",
    dateTime: "",
    seating: "Velvet Booth (Indoor)",
    notes: "",
  });

  // Modals & Logs
  const [showConfig, setShowConfig] = useState<boolean>(false);
  const [showInspector, setShowInspector] = useState<boolean>(false);
  const [lastLog, setLastLog] = useState<LogPayload | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let stored = localStorage.getItem("velours_session_id");
    if (!stored) {
      stored = "session_" + Math.random().toString(36).substring(2, 10);
      localStorage.setItem("velours_session_id", stored);
    }
    setSessionId(stored);

    const savedUrl = localStorage.getItem("velours_webhook_url");
    if (savedUrl) setWebhookUrl(savedUrl);
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoadingChat]);

  // Send message to n8n Webhook
  const handleSendMessage = async (customPrompt?: string) => {
    const textToSend = customPrompt || inputMessage;
    if (!textToSend.trim() || isLoadingChat) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      sender: "user",
      text: textToSend,
      time: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!customPrompt) setInputMessage("");
    setIsLoadingChat(true);

    const payload = {
      action: "chat",
      sessionId: sessionId,
      message: textToSend,
      timestamp: new Date().toISOString(),
      metadata: {
        source: "Next.js Web Client",
        locale: "en-US",
      },
    };

    try {
      const res = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      // Response ko pehle raw text me read karein
      const rawText = await res.text();
      let data: any;

      try {
        // Agar response valid JSON hai to parse karein
        data = JSON.parse(rawText);
      } catch {
        // Agar raw string ya plain text hai to direct use assign karein
        data = { output: rawText || "Response acknowledged by workflow." };
      }

      setLastLog({
        timestamp: new Date().toLocaleTimeString(),
        request: payload,
        response: data,
      });

      const replyText =
        data.output ||
        data.reply ||
        data.response ||
        data.text ||
        data.message ||
        (typeof data === "string" ? data : JSON.stringify(data, null, 2));

      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: "agent",
          text: replyText,
          time: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
        },
      ]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: "agent",
          text: `⚠️ Connection Error: Webhook call to ${webhookUrl} failed. Please ensure n8n is running and active.`,
          time: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
        },
      ]);
    } finally {
      setIsLoadingChat(false);
    }
  };

  // Direct Booking Handler
  const handleReservationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.phone || !formData.dateTime) return;

    setIsBookingSubmitting(true);

    const payload = {
      action: "create_reservation",
      sessionId: sessionId,
      customer: {
        name: formData.name,
        phone: formData.phone,
      },
      reservation: {
        guests: formData.guests,
        dateTime: formData.dateTime,
        seatingArea: formData.seating,
        specialRequests: formData.notes,
      },
      timestamp: new Date().toISOString(),
    };

    try {
      const res = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const rawText = await res.text();
      let data: any;
      try {
        data = JSON.parse(rawText);
      } catch {
        data = {
          status: "success",
          message: rawText || "Booking received by workflow",
        };
      }

      setLastLog({
        timestamp: new Date().toLocaleTimeString(),
        request: payload,
        response: data,
      });

      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          sender: "agent",
          text: `🥂 **Reservation Recorded!**\nShukriya, **${formData.name}**. Aapki reservation details (${formData.guests}, ${formData.seating}) MongoDB database me save ho chuki hain.`,
          time: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
        },
      ]);

      setFormData({
        name: "",
        phone: "",
        guests: "2 Guests",
        dateTime: "",
        seating: "Velvet Booth (Indoor)",
        notes: "",
      });
    } catch (error) {
      alert("Reservation request failed. Please check your n8n workflow.");
    } finally {
      setIsBookingSubmitting(false);
    }
  };

  const copyLogJson = () => {
    if (!lastLog) return;
    navigator.clipboard.writeText(JSON.stringify(lastLog, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[var(--color-brand-bg)] text-[var(--color-brand-text)] flex flex-col">
      {/* Top Navbar */}
      <header className="border-b border-[var(--color-brand-border)] bg-[var(--color-brand-surface)]/90 backdrop-blur sticky top-0 z-40 px-4 sm:px-8 py-3.5 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[var(--color-brand-primary)] to-[var(--color-brand-accent)] p-0.5 shadow-[0_0_15px_rgba(224,33,138,0.4)]">
            <div className="w-full h-full bg-[var(--color-brand-surface)] rounded-[10px] flex items-center justify-center">
              <UtensilsCrossed className="w-5 h-5 text-[var(--color-brand-primary)]" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-bold tracking-tight text-white">
                Le Velours
              </h1>
              <span className="text-[10px] font-semibold bg-[var(--color-brand-primary)]/20 text-[var(--color-brand-primary)] border border-[var(--color-brand-primary)]/30 px-2 py-0.5 rounded-full uppercase tracking-wider">
                n8n Live
              </span>
            </div>
            <p className="text-xs text-[var(--color-brand-dark-muted)] hidden sm:block">
              Connected to MongoDB & Gemini AI Agent
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setShowInspector(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[var(--color-brand-muted)] bg-[var(--color-brand-card)] hover:bg-[var(--color-brand-card-hover)] border border-[var(--color-brand-border)] rounded-lg transition"
          >
            <Code2 className="w-3.5 h-3.5 text-[var(--color-brand-primary)]" />
            <span className="hidden sm:inline">Inspect Payload</span>
          </button>

          <button
            onClick={() => setShowConfig(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[var(--color-brand-muted)] bg-[var(--color-brand-card)] hover:bg-[var(--color-brand-card-hover)] border border-[var(--color-brand-border)] rounded-lg transition"
          >
            <Settings className="w-3.5 h-3.5 text-[var(--color-brand-primary)]" />
            <span className="hidden md:inline font-mono text-[11px] truncate max-w-[150px]">
              {webhookUrl.replace("http://", "")}
            </span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Hero Banner with Dark Ambient Restaurant Visual */}
        <div className="relative rounded-2xl overflow-hidden border border-[var(--color-brand-border)] bg-[var(--color-brand-card)] shadow-2xl">
          <div className="relative h-64 sm:h-80 w-full">
            <img
              src="https://images.unsplash.com/photo-1550966871-3ed3cdb5ed0c?q=80&w=1600&auto=format&fit=crop"
              alt="Le Velours Dining Interior"
              className="w-full h-full object-cover brightness-75 contrast-125"
            />
            {/* Dark Magenta Gradient Masks */}
            <div className="absolute inset-0 bg-gradient-to-t from-[var(--color-brand-card)] via-[var(--color-brand-surface)]/75 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-[var(--color-brand-bg)] via-transparent to-[var(--color-brand-bg)]/70" />

            <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div className="max-w-xl space-y-2">
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-[var(--color-brand-primary)] bg-[var(--color-brand-primary)]/20 px-2.5 py-1 rounded-full border border-[var(--color-brand-primary)]/30 backdrop-blur-sm">
                  <Sparkles className="w-3.5 h-3.5" /> Luxury Dining & Lounge
                </span>
                <h2 className="text-2xl sm:text-4xl font-bold text-white tracking-tight">
                  Intimate Dining, Curated by AI
                </h2>
                <p className="text-sm text-[var(--color-brand-muted)] leading-relaxed hidden sm:block">
                  Autonomous table management and guest inquiries orchestrated
                  by n8n, Google Gemini, and MongoDB persistence.
                </p>
              </div>

              <div className="flex items-center gap-2 bg-[var(--color-brand-surface)]/90 backdrop-blur-md px-4 py-2 rounded-xl border border-[var(--color-brand-border)]">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 -ml-5" />
                <div className="text-xs">
                  <p className="text-white font-medium">Concierge Online</p>
                  <p className="text-[10px] text-[var(--color-brand-dark-muted)] font-mono">
                    Session: {sessionId.slice(0, 10)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Dual Layout: Chat Agent & Direct Booking */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: AI Concierge Chat */}
          <div className="lg:col-span-7 bg-[var(--color-brand-card)] border border-[var(--color-brand-border)] rounded-2xl flex flex-col h-[620px] shadow-2xl overflow-hidden">
            {/* Chat Header */}
            <div className="px-5 py-4 border-b border-[var(--color-brand-border)] bg-[var(--color-brand-surface)]/60 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[var(--color-brand-primary)]/20 border border-[var(--color-brand-primary)]/40 flex items-center justify-center text-[var(--color-brand-primary)]">
                  <Bot className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">
                    Velours AI Host
                  </h3>
                  <p className="text-[11px] text-[var(--color-brand-dark-muted)]">
                    Conversational Inquiries & Reservations
                  </p>
                </div>
              </div>

              <div className="hidden sm:flex items-center gap-1.5">
                <button
                  onClick={() =>
                    handleSendMessage("Table for 2 tonight at 8 PM please.")
                  }
                  className="text-[11px] bg-[var(--color-brand-surface)] hover:bg-[var(--color-brand-border)] text-[var(--color-brand-muted)] px-2.5 py-1 rounded-md border border-[var(--color-brand-border)] transition"
                >
                  Table for 2
                </button>
                <button
                  onClick={() =>
                    handleSendMessage("What are tonight's chef specials?")
                  }
                  className="text-[11px] bg-[var(--color-brand-surface)] hover:bg-[var(--color-brand-border)] text-[var(--color-brand-muted)] px-2.5 py-1 rounded-md border border-[var(--color-brand-border)] transition"
                >
                  Chef Specials
                </button>
              </div>
            </div>

            {/* Chat Stream */}
            <div className="flex-1 p-4 sm:p-5 overflow-y-auto space-y-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex gap-3 max-w-[85%] ${
                    msg.sender === "user"
                      ? "ml-auto flex-row-reverse"
                      : "mr-auto"
                  }`}
                >
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-xs font-semibold ${
                      msg.sender === "user"
                        ? "bg-[var(--color-brand-primary)] text-white"
                        : "bg-[var(--color-brand-surface)] border border-[var(--color-brand-border-light)] text-[var(--color-brand-primary)]"
                    }`}
                  >
                    {msg.sender === "user" ? (
                      <User className="w-3.5 h-3.5" />
                    ) : (
                      <Bot className="w-3.5 h-3.5" />
                    )}
                  </div>
                  <div>
                    <div
                      className={`px-4 py-3 rounded-2xl text-xs sm:text-sm leading-relaxed shadow-sm ${
                        msg.sender === "user"
                          ? "bg-[var(--color-brand-primary)] text-white rounded-tr-none font-medium"
                          : "bg-[var(--color-brand-surface)]/90 text-[var(--color-brand-text)] border border-[var(--color-brand-border)] rounded-tl-none whitespace-pre-line"
                      }`}
                    >
                      {msg.text}
                    </div>
                    <span className="text-[10px] text-[var(--color-brand-dark-muted)] px-1 mt-1 block">
                      {msg.time}
                    </span>
                  </div>
                </div>
              ))}

              {isLoadingChat && (
                <div className="flex gap-3 mr-auto items-center">
                  <div className="w-7 h-7 rounded-lg bg-[var(--color-brand-surface)] border border-[var(--color-brand-border)] flex items-center justify-center text-[var(--color-brand-primary)] shrink-0">
                    <Bot className="w-3.5 h-3.5 animate-spin" />
                  </div>
                  <div className="bg-[var(--color-brand-surface)]/90 border border-[var(--color-brand-border)] px-4 py-2.5 rounded-2xl rounded-tl-none flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-brand-primary)] animate-bounce" />
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-brand-primary)] animate-bounce [animation-delay:0.2s]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-brand-primary)] animate-bounce [animation-delay:0.4s]" />
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Chat Input */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="p-3 sm:p-4 border-t border-[var(--color-brand-border)] bg-[var(--color-brand-surface)]/80 flex items-center gap-2"
            >
              <input
                type="text"
                placeholder="Ask about reservation availability, menu, or timings..."
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                className="flex-1 bg-[var(--color-brand-card)] border border-[var(--color-brand-border)] focus:border-[var(--color-brand-primary)] rounded-xl px-4 py-2.5 text-xs sm:text-sm text-white focus:outline-none transition placeholder:text-[var(--color-brand-dark-muted)]"
              />
              <button
                type="submit"
                disabled={isLoadingChat || !inputMessage.trim()}
                className="bg-[var(--color-brand-primary)] hover:bg-[var(--color-brand-primary-hover)] disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-[0_0_15px_rgba(224,33,138,0.4)] transition"
              >
                <Send className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Send</span>
              </button>
            </form>
          </div>

          {/* Right Column: Instant Reservation Form */}
          <div className="lg:col-span-5 bg-[var(--color-brand-card)] border border-[var(--color-brand-border)] rounded-2xl flex flex-col h-[620px] shadow-2xl p-5 sm:p-6 overflow-y-auto">
            <div className="flex items-center gap-2.5 border-b border-[var(--color-brand-border)] pb-4 mb-5">
              <CalendarDays className="w-5 h-5 text-[var(--color-brand-primary)]" />
              <div>
                <h3 className="text-lg font-bold text-white">
                  Instant Table Booking
                </h3>
                <p className="text-xs text-[var(--color-brand-dark-muted)]">
                  Direct MongoDB Insertion via n8n
                </p>
              </div>
            </div>

            <form
              onSubmit={handleReservationSubmit}
              className="space-y-4 flex-1 flex flex-col justify-between"
            >
              <div className="space-y-3.5">
                <div>
                  <label className="text-xs font-semibold text-[var(--color-brand-muted)] uppercase tracking-wider block mb-1.5">
                    Full Name
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-[var(--color-brand-dark-muted)] absolute left-3 top-3" />
                    <input
                      required
                      type="text"
                      placeholder="e.g. Ambreen Sheikh"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      className="w-full bg-[var(--color-brand-surface)] border border-[var(--color-brand-border)] focus:border-[var(--color-brand-primary)] rounded-xl pl-9 pr-3 py-2 text-xs sm:text-sm text-white focus:outline-none transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-[var(--color-brand-muted)] uppercase tracking-wider block mb-1.5">
                    Phone Number
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-[var(--color-brand-dark-muted)] absolute left-3 top-3" />
                    <input
                      required
                      type="tel"
                      placeholder="+92 300 1234567"
                      value={formData.phone}
                      onChange={(e) =>
                        setFormData({ ...formData, phone: e.target.value })
                      }
                      className="w-full bg-[var(--color-brand-surface)] border border-[var(--color-brand-border)] focus:border-[var(--color-brand-primary)] rounded-xl pl-9 pr-3 py-2 text-xs sm:text-sm text-white focus:outline-none transition"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-[var(--color-brand-muted)] uppercase tracking-wider block mb-1.5">
                      Party Size
                    </label>
                    <select
                      value={formData.guests}
                      onChange={(e) =>
                        setFormData({ ...formData, guests: e.target.value })
                      }
                      className="w-full bg-[var(--color-brand-surface)] border border-[var(--color-brand-border)] focus:border-[var(--color-brand-primary)] rounded-xl px-3 py-2 text-xs sm:text-sm text-white focus:outline-none transition"
                    >
                      <option value="1 Guest">1 Guest</option>
                      <option value="2 Guests">2 Guests (Couple)</option>
                      <option value="4 Guests">4 Guests (Standard)</option>
                      <option value="6 Guests">6 Guests (Party)</option>
                      <option value="8+ VIP">8+ VIP Dining</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-[var(--color-brand-muted)] uppercase tracking-wider block mb-1.5">
                      Date & Time
                    </label>
                    <input
                      required
                      type="datetime-local"
                      value={formData.dateTime}
                      onChange={(e) =>
                        setFormData({ ...formData, dateTime: e.target.value })
                      }
                      className="w-full bg-[var(--color-brand-surface)] border border-[var(--color-brand-border)] focus:border-[var(--color-brand-primary)] rounded-xl px-3 py-2 text-xs sm:text-sm text-white focus:outline-none transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-[var(--color-brand-muted)] uppercase tracking-wider block mb-1.5">
                    Seating Ambience
                  </label>
                  <select
                    value={formData.seating}
                    onChange={(e) =>
                      setFormData({ ...formData, seating: e.target.value })
                    }
                    className="w-full bg-[var(--color-brand-surface)] border border-[var(--color-brand-border)] focus:border-[var(--color-brand-primary)] rounded-xl px-3 py-2 text-xs sm:text-sm text-white focus:outline-none transition"
                  >
                    <option value="Velvet Booth (Indoor)">
                      Velvet Booth (Indoor)
                    </option>
                    <option value="Wine Cellar Table">Wine Cellar Table</option>
                    <option value="Rooftop Skyline">
                      Rooftop Skyline Terrace
                    </option>
                    <option value="Bar High-Top">Cocktail Bar Lounge</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-[var(--color-brand-muted)] uppercase tracking-wider block mb-1.5">
                    Dietary or Special Notes
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Anniversary, window table, dietary requests..."
                    value={formData.notes}
                    onChange={(e) =>
                      setFormData({ ...formData, notes: e.target.value })
                    }
                    className="w-full bg-[var(--color-brand-surface)] border border-[var(--color-brand-border)] focus:border-[var(--color-brand-primary)] rounded-xl p-3 text-xs text-white focus:outline-none transition resize-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isBookingSubmitting}
                className="w-full mt-4 bg-gradient-to-r from-[var(--color-brand-primary)] to-[var(--color-brand-accent)] hover:opacity-95 disabled:opacity-50 text-white py-3 rounded-xl font-medium text-xs sm:text-sm shadow-[0_0_15px_rgba(224,33,138,0.4)] flex items-center justify-center gap-2 transition"
              >
                {isBookingSubmitting ? (
                  <>
                    <Sparkles className="w-4 h-4 animate-spin" />
                    Saving in MongoDB...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    Confirm Reservation
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </main>

      {/* Config Settings Modal */}
      {showConfig && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--color-brand-card)] border border-[var(--color-brand-border)] rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Settings className="w-4 h-4 text-[var(--color-brand-primary)]" />{" "}
                n8n Webhook Settings
              </h3>
              <button
                onClick={() => setShowConfig(false)}
                className="text-[var(--color-brand-muted)] hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-[var(--color-brand-muted)]">
              Specify your active n8n Production Webhook URL.
            </p>
            <div>
              <label className="text-xs font-medium text-[var(--color-brand-dark-muted)] block mb-1">
                Production Webhook URL
              </label>
              <input
                type="text"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                className="w-full bg-[var(--color-brand-surface)] border border-[var(--color-brand-border)] focus:border-[var(--color-brand-primary)] rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => {
                  localStorage.setItem("velours_webhook_url", webhookUrl);
                  setShowConfig(false);
                }}
                className="px-4 py-2 rounded-xl bg-[var(--color-brand-primary)] text-white text-xs font-medium hover:bg-[var(--color-brand-primary-hover)] transition"
              >
                Save Endpoint
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Inspector Modal */}
      {showInspector && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--color-brand-card)] border border-[var(--color-brand-border)] rounded-2xl max-w-2xl w-full p-6 shadow-2xl flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--color-brand-border)]">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Code2 className="w-4 h-4 text-[var(--color-brand-primary)]" />{" "}
                Last Dispatched Payload
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={copyLogJson}
                  className="px-2.5 py-1 text-xs bg-[var(--color-brand-surface)] border border-[var(--color-brand-border)] rounded-lg text-[var(--color-brand-muted)] hover:text-white flex items-center gap-1.5 transition"
                >
                  {copied ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  {copied ? "Copied" : "Copy JSON"}
                </button>
                <button
                  onClick={() => setShowInspector(false)}
                  className="text-[var(--color-brand-muted)] hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto py-4 space-y-4">
              {lastLog ? (
                <>
                  <div>
                    <span className="text-[11px] font-mono text-[var(--color-brand-primary)] uppercase tracking-wider block mb-1">
                      Request Payload Sent (POST)
                    </span>
                    <pre className="bg-[var(--color-brand-bg)] p-3 rounded-xl border border-[var(--color-brand-border)] text-[11px] font-mono text-emerald-300 overflow-x-auto">
                      {JSON.stringify(lastLog.request, null, 2)}
                    </pre>
                  </div>
                  <div>
                    <span className="text-[11px] font-mono text-[var(--color-brand-accent)] uppercase tracking-wider block mb-1">
                      Workflow Response Received
                    </span>
                    <pre className="bg-[var(--color-brand-bg)] p-3 rounded-xl border border-[var(--color-brand-border)] text-[11px] font-mono text-purple-300 overflow-x-auto">
                      {JSON.stringify(lastLog.response, null, 2)}
                    </pre>
                  </div>
                </>
              ) : (
                <p className="text-xs text-[var(--color-brand-dark-muted)] text-center py-12">
                  No requests sent yet. Submit a chat query or table booking to
                  view payloads.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
