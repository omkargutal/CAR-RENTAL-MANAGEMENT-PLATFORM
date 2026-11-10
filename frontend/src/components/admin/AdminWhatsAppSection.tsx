import { useState, useEffect } from "react";
import {
  MessageSquare, Settings, Bell, ListFilter, Send, RefreshCw,
  CheckCircle2, AlertCircle, ShieldCheck, ExternalLink,
  Copy, Check, UserCheck, Bot, User, Eye, EyeOff, Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  whatsappApi,
  WhatsAppConfigResponse,
  WhatsAppConversationResponse,
  WhatsAppConversationDetailResponse,
  WhatsAppMessageResponse,
} from "@/core/api";

type WhatsAppTab = "conversations" | "config" | "notifications" | "messages";

export function AdminWhatsAppSection() {
  const [activeSubTab, setActiveSubTab] = useState<WhatsAppTab>("conversations");
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState<WhatsAppConfigResponse | null>(null);

  // Status feedback
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [testingConnection, setTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState<{ connected: boolean; message: string } | null>(null);

  // Conversations State
  const [conversations, setConversations] = useState<WhatsAppConversationResponse[]>([]);
  const [convFilter, setConvFilter] = useState<string>("ALL");
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
  const [activeThread, setActiveThread] = useState<WhatsAppConversationDetailResponse | null>(null);
  const [loadingThread, setLoadingThread] = useState(false);
  const [manualReplyText, setManualReplyText] = useState("");
  const [sendingReply, setSendingReply] = useState(false);

  // Message Audit Logs
  const [messages, setMessages] = useState<WhatsAppMessageResponse[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);

  // Form State for Config
  const [phoneId, setPhoneId] = useState("");
  const [wabaId, setWabaId] = useState("");
  const [businessPhone, setBusinessPhone] = useState("");
  const [displayPhone, setDisplayPhone] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [showAccessToken, setShowAccessToken] = useState(false);
  const [verifyToken, setVerifyToken] = useState("");
  const [appId, setAppId] = useState("");
  const [appSecret, setAppSecret] = useState("");
  const [floatingEnabled, setFloatingEnabled] = useState(true);
  const [floatingGreeting, setFloatingGreeting] = useState("");
  const [adminPhone, setAdminPhone] = useState("");
  const [savingConfig, setSavingConfig] = useState(false);
  const [copiedWebhook, setCopiedWebhook] = useState(false);

  // Test Message Modal
  const [showTestModal, setShowTestModal] = useState(false);
  const [testRecipient, setTestRecipient] = useState("");
  const [testContent, setTestContent] = useState("Hello from Swaraj Tours & Travel WhatsApp Platform!");
  const [sendingTest, setSendingTest] = useState(false);

  // Notification Preferences
  const [notifPrefs, setNotifPrefs] = useState({
    customer: {
      booking_confirmation: true,
      payment_success: true,
      cancellation: true,
      reminders: true,
    },
    admin: {
      new_booking: true,
      payment_success: true,
      cancellation: true,
      human_support: true,
    },
  });

  // Load config & conversations on mount
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const cfg = await whatsappApi.getAdminConfig();
      setConfig(cfg);
      setPhoneId(cfg.phone_number_id || "");
      setWabaId(cfg.waba_id || "");
      setBusinessPhone(cfg.business_phone_number || "");
      setDisplayPhone(cfg.display_phone_number || "");
      setVerifyToken(cfg.verify_token || "autofleet_webhook_token_2026");
      setAppId(cfg.app_id || "");
      setFloatingEnabled(cfg.floating_button_enabled);
      setFloatingGreeting(cfg.floating_button_greeting || "");
      setAdminPhone(cfg.admin_notification_phone || "");
      if (cfg.notification_preferences) {
        setNotifPrefs(cfg.notification_preferences);
      }

      await loadConversations();
    } catch (err: any) {
      setSaveError(err?.message || "Failed to load WhatsApp configuration.");
    } finally {
      setLoading(false);
    }
  };

  const loadConversations = async (statusFilter = convFilter) => {
    try {
      const convs = await whatsappApi.listConversations({ status: statusFilter });
      setConversations(convs);
      if (convs.length > 0 && !selectedConvId) {
        selectConversation(convs[0].id);
      }
    } catch (err) {
      console.error("Failed to load WhatsApp conversations", err);
    }
  };

  const selectConversation = async (convId: string) => {
    setSelectedConvId(convId);
    setLoadingThread(true);
    try {
      const thread = await whatsappApi.getConversationThread(convId);
      setActiveThread(thread);
    } catch (err) {
      console.error("Failed to load thread", err);
    } finally {
      setLoadingThread(false);
    }
  };

  const handleSendManualReply = async () => {
    if (!selectedConvId || !manualReplyText.trim()) return;
    setSendingReply(true);
    try {
      const sentMsg = await whatsappApi.sendManualReply(selectedConvId, manualReplyText.trim());
      setManualReplyText("");
      if (activeThread) {
        setActiveThread({
          ...activeThread,
          messages: [...activeThread.messages, sentMsg],
        });
      }
      loadConversations();
    } catch (err: any) {
      alert(err?.message || "Failed to send WhatsApp reply.");
    } finally {
      setSendingReply(false);
    }
  };

  const handleToggleHandover = async (newStatus: "BOT" | "HUMAN_AGENT") => {
    if (!selectedConvId) return;
    try {
      const updated = await whatsappApi.updateHandoverStatus(selectedConvId, newStatus);
      if (activeThread) {
        setActiveThread({ ...activeThread, status: updated.status });
      }
      loadConversations();
    } catch (err: any) {
      alert(err?.message || "Failed to update handover status.");
    }
  };

  const handleTestConnection = async () => {
    setTestingConnection(true);
    setTestResult(null);
    try {
      const res = await whatsappApi.testConnection();
      setTestResult({
        connected: res.connected,
        message: res.message,
      });
      loadData();
    } catch (err: any) {
      setTestResult({
        connected: false,
        message: err?.message || "Failed to test connection.",
      });
    } finally {
      setTestingConnection(false);
    }
  };

  const handleSaveConfig = async () => {
    setSavingConfig(true);
    setSaveMessage(null);
    setSaveError(null);
    try {
      const updated = await whatsappApi.updateAdminConfig({
        phone_number_id: phoneId,
        waba_id: wabaId,
        business_phone_number: businessPhone,
        display_phone_number: displayPhone,
        access_token: accessToken || undefined,
        verify_token: verifyToken,
        app_id: appId,
        app_secret: appSecret || undefined,
        floating_button_enabled: floatingEnabled,
        floating_button_greeting: floatingGreeting,
        admin_notification_phone: adminPhone,
        notification_preferences: notifPrefs,
      });
      setConfig(updated);
      setAccessToken(""); // clear unmasked local state
      setAppSecret("");
      setSaveMessage("WhatsApp configuration and preferences saved successfully!");
    } catch (err: any) {
      setSaveError(err?.message || "Failed to save configuration.");
    } finally {
      setSavingConfig(false);
    }
  };

  const handleSendTestMessage = async () => {
    if (!testRecipient.trim()) {
      alert("Please enter a valid recipient phone number.");
      return;
    }
    setSendingTest(true);
    try {
      await whatsappApi.sendTestMessage(testRecipient.trim(), testContent.trim());
      setShowTestModal(false);
      alert("Test WhatsApp message dispatched successfully!");
      loadConversations();
    } catch (err: any) {
      alert(err?.message || "Failed to dispatch test message.");
    } finally {
      setSendingTest(false);
    }
  };

  const loadMessageLogs = async () => {
    setLoadingMessages(true);
    try {
      const msgs = await whatsappApi.listMessages({ page: 1, page_size: 50 });
      setMessages(msgs);
    } catch (err) {
      console.error("Failed to load message audit log", err);
    } finally {
      setLoadingMessages(false);
    }
  };

  const copyWebhookUrl = () => {
    if (config?.webhook_url) {
      navigator.clipboard.writeText(config.webhook_url);
      setCopiedWebhook(true);
      setTimeout(() => setCopiedWebhook(false), 2000);
    }
  };

  if (loading && !config) {
    return (
      <div className="flex items-center justify-center p-12 text-slate-400">
        <RefreshCw className="w-6 h-6 animate-spin mr-2 text-emerald-500" />
        <span>Loading WhatsApp Integration...</span>
      </div>
    );
  }

  const statusColor =
    config?.status === "CONNECTED"
      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
      : config?.status === "INCOMPLETE"
      ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
      : config?.status === "ERROR"
      ? "bg-rose-500/10 text-rose-400 border-rose-500/30"
      : "bg-slate-700 text-slate-300 border-slate-600";

  return (
    <div className="space-y-6">
      {/* Top Banner & Health Card */}
      <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/20 text-white">
              <MessageSquare className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-xl font-black text-white">Meta WhatsApp Business Platform</h2>
                <Badge variant="outline" className={`font-mono text-xs px-2.5 py-0.5 border ${statusColor}`}>
                  {config?.status || "NOT_CONFIGURED"}
                </Badge>
              </div>
              <p className="text-xs text-slate-400 mt-1 max-w-xl">
                Official Meta Cloud API integration. Powers the website floating WhatsApp button, database-backed customer assistant, human concierge handover, and automated transaction notifications.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={handleTestConnection}
              disabled={testingConnection}
              className="border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl"
            >
              <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${testingConnection ? "animate-spin" : ""}`} />
              Test Connection
            </Button>
            <Button
              size="sm"
              onClick={() => setShowTestModal(true)}
              className="bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md shadow-emerald-600/20"
            >
              <Send className="w-3.5 h-3.5 mr-1.5" />
              Send Test Message
            </Button>
          </div>
        </div>

        {/* Status Details / Notice */}
        {config?.status_details && (
          <div className="mt-4 p-3 bg-slate-800/60 border border-slate-700/50 rounded-xl text-xs text-slate-300 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Status: {config.status_details}</span>
            </div>
            {config.business_phone_number && (
              <span className="font-mono text-slate-400">
                Number: +91 {config.business_phone_number.replace(/^91/, "")}
              </span>
            )}
          </div>
        )}

        {testResult && (
          <div
            className={`mt-4 p-3 rounded-xl text-xs flex items-center gap-2 ${
              testResult.connected
                ? "bg-emerald-950/60 border border-emerald-800 text-emerald-300"
                : "bg-rose-950/60 border border-rose-800 text-rose-300"
            }`}
          >
            {testResult.connected ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            <span>{testResult.message}</span>
          </div>
        )}
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="flex border-b border-slate-800 gap-2">
        <button
          onClick={() => setActiveSubTab("conversations")}
          className={`pb-3 px-4 text-xs font-bold transition-all relative flex items-center gap-2 ${
            activeSubTab === "conversations"
              ? "text-emerald-400 border-b-2 border-emerald-400"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span>Customer Conversations</span>
          {conversations.some((c) => c.status === "HUMAN_AGENT") && (
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
          )}
        </button>

        <button
          onClick={() => setActiveSubTab("config")}
          className={`pb-3 px-4 text-xs font-bold transition-all relative flex items-center gap-2 ${
            activeSubTab === "config"
              ? "text-emerald-400 border-b-2 border-emerald-400"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>API Credentials & Floating Button</span>
        </button>

        <button
          onClick={() => setActiveSubTab("notifications")}
          className={`pb-3 px-4 text-xs font-bold transition-all relative flex items-center gap-2 ${
            activeSubTab === "notifications"
              ? "text-emerald-400 border-b-2 border-emerald-400"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <Bell className="w-4 h-4" />
          <span>Notification Preferences</span>
        </button>

        <button
          onClick={() => {
            setActiveSubTab("messages");
            loadMessageLogs();
          }}
          className={`pb-3 px-4 text-xs font-bold transition-all relative flex items-center gap-2 ${
            activeSubTab === "messages"
              ? "text-emerald-400 border-b-2 border-emerald-400"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <ListFilter className="w-4 h-4" />
          <span>Message Logs & Delivery</span>
        </button>
      </div>

      {/* 1. Conversations & Live Support Handover */}
      {activeSubTab === "conversations" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[550px]">
          {/* Conversation List Sidebar */}
          <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Active Threads ({conversations.length})
              </h3>
              <div className="flex gap-1">
                {(["ALL", "HUMAN_AGENT", "BOT"] as const).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => {
                      setConvFilter(filter);
                      loadConversations(filter);
                    }}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-colors ${
                      convFilter === filter
                        ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                        : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                    }`}
                  >
                    {filter === "ALL" ? "All" : filter === "HUMAN_AGENT" ? "Human Handover" : "Bot Active"}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1 max-h-[460px]">
              {conversations.length === 0 ? (
                <div className="text-center py-12 text-slate-500 text-xs">
                  No WhatsApp conversations matching this filter.
                </div>
              ) : (
                conversations.map((c) => {
                  const isSelected = selectedConvId === c.id;
                  const isHuman = c.status === "HUMAN_AGENT";
                  return (
                    <div
                      key={c.id}
                      onClick={() => selectConversation(c.id)}
                      className={`p-3.5 rounded-xl cursor-pointer transition-all border ${
                        isSelected
                          ? "bg-slate-800/90 border-emerald-500/40 shadow-sm"
                          : "bg-slate-900/50 hover:bg-slate-800/40 border-slate-800/80"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                            isHuman ? "bg-amber-500/20 text-amber-300 border border-amber-500/30" : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                          }`}>
                            {isHuman ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                          </div>
                          <div>
                            <span className="font-bold text-xs text-white block">
                              {c.customer_name || `+${c.phone_number}`}
                            </span>
                            <span className="text-[10px] font-mono text-slate-400">
                              +{c.phone_number}
                            </span>
                          </div>
                        </div>

                        <div className="text-right">
                          <Badge
                            variant="outline"
                            className={`text-[9px] px-1.5 py-0.5 ${
                              isHuman
                                ? "bg-amber-500/10 text-amber-400 border-amber-500/30 font-bold animate-pulse"
                                : "bg-slate-800 text-slate-400 border-slate-700"
                            }`}
                          >
                            {isHuman ? "Human Agent" : "Automated Bot"}
                          </Badge>
                          {c.unread_admin_count > 0 && (
                            <span className="inline-block mt-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-rose-500 text-white">
                              {c.unread_admin_count} new
                            </span>
                          )}
                        </div>
                      </div>

                      {c.last_message && (
                        <p className="text-[11px] text-slate-400 mt-2 truncate">
                          <span className="font-semibold text-slate-300">
                            {c.last_message.direction === "INBOUND" ? "User: " : "Swaraj: "}
                          </span>
                          {c.last_message.content}
                        </p>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Active Chat Thread Window */}
          <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col overflow-hidden">
            {activeThread ? (
              <>
                {/* Thread Header */}
                <div className="p-4 bg-slate-800/80 border-b border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-300 font-bold">
                      {activeThread.customer_name ? activeThread.customer_name[0].toUpperCase() : "U"}
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-white">
                        {activeThread.customer_name || `+${activeThread.phone_number}`}
                      </h4>
                      <p className="text-[11px] font-mono text-slate-400">
                        WhatsApp ID: +{activeThread.phone_number}
                      </p>
                    </div>
                  </div>

                  {/* Handover Toggle */}
                  <div className="flex items-center gap-2">
                    {activeThread.status === "HUMAN_AGENT" ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleToggleHandover("BOT")}
                        className="border-emerald-600/40 text-emerald-400 bg-emerald-950/40 hover:bg-emerald-900/60 text-xs font-bold rounded-xl"
                      >
                        <Bot className="w-3.5 h-3.5 mr-1.5" />
                        Return to Bot
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleToggleHandover("HUMAN_AGENT")}
                        className="border-amber-600/40 text-amber-400 bg-amber-950/40 hover:bg-amber-900/60 text-xs font-bold rounded-xl"
                      >
                        <UserCheck className="w-3.5 h-3.5 mr-1.5" />
                        Handover to Human
                      </Button>
                    )}
                  </div>
                </div>

                {/* Message Stream */}
                <div className="flex-1 p-4 overflow-y-auto space-y-3 max-h-[380px] bg-slate-950/30">
                  {loadingThread ? (
                    <div className="flex items-center justify-center h-48 text-slate-500 text-xs">
                      <RefreshCw className="w-5 h-5 animate-spin mr-2" /> Loading messages...
                    </div>
                  ) : activeThread.messages.length === 0 ? (
                    <div className="text-center py-12 text-slate-500 text-xs">
                      No message history in this thread yet.
                    </div>
                  ) : (
                    activeThread.messages.map((m) => {
                      const isInbound = m.direction === "INBOUND";
                      return (
                        <div
                          key={m.id}
                          className={`flex flex-col ${isInbound ? "items-start" : "items-end"}`}
                        >
                          <div
                            className={`max-w-[85%] p-3.5 rounded-2xl text-xs leading-relaxed ${
                              isInbound
                                ? "bg-slate-800 text-slate-100 rounded-tl-none border border-slate-700/60"
                                : "bg-emerald-600 text-white rounded-tr-none shadow-md shadow-emerald-600/10"
                            }`}
                          >
                            <p className="whitespace-pre-line">{m.content}</p>
                          </div>
                          <div className="flex items-center gap-1.5 text-[10px] text-slate-500 mt-1 px-1">
                            <span>
                              {new Date(m.created_at).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                            {!isInbound && (
                              <span className="font-semibold uppercase tracking-wider text-[9px] text-slate-400">
                                • {m.status}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Reply Input Bar */}
                <div className="p-3 bg-slate-800/80 border-t border-slate-800 flex items-center gap-2">
                  <Input
                    placeholder="Type an outbound WhatsApp reply to customer..."
                    value={manualReplyText}
                    onChange={(e) => setManualReplyText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSendManualReply();
                      }
                    }}
                    className="bg-slate-900 border-slate-700 text-white rounded-xl text-xs h-10"
                  />
                  <Button
                    onClick={handleSendManualReply}
                    disabled={sendingReply || !manualReplyText.trim()}
                    className="bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white rounded-xl text-xs font-bold h-10 px-4"
                  >
                    <Send className={`w-3.5 h-3.5 ${sendingReply ? "animate-pulse" : ""}`} />
                  </Button>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-slate-500 text-xs">
                <MessageSquare className="w-12 h-12 text-slate-700 mb-2" />
                <span>Select a conversation from the left to view messages and reply.</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2. Configuration & Credentials View */}
      {activeSubTab === "config" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Card 1: Website Floating WhatsApp Button */}
          <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                Website WhatsApp Floating Button
              </h3>
              <Badge variant="outline" className="text-xs border-emerald-500/30 text-emerald-400 bg-emerald-500/10">
                Independent
              </Badge>
            </div>
            <p className="text-xs text-slate-400">
              Configures the customer-facing WhatsApp action button on the website. Redirects directly to WhatsApp web, desktop, or mobile app via <code className="text-emerald-300">wa.me</code> without requiring Meta API credentials.
            </p>

            <div className="space-y-3 pt-2">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Business WhatsApp Mobile Number (10 digits)
                </label>
                <div className="flex rounded-xl overflow-hidden border border-slate-700 bg-slate-950">
                  <span className="bg-slate-800 text-slate-300 px-3 py-2 text-xs font-bold border-r border-slate-700 flex items-center">
                    🇮🇳 +91
                  </span>
                  <Input
                    placeholder="8421081570"
                    value={businessPhone.replace(/^91/, "")}
                    onChange={(e) => setBusinessPhone(e.target.value)}
                    className="border-0 bg-transparent text-white text-xs h-10 focus-visible:ring-0"
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  10-digit Indian number will automatically have +91 prepended.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Display Phone Number Label
                </label>
                <Input
                  placeholder="+91 8421081570"
                  value={displayPhone}
                  onChange={(e) => setDisplayPhone(e.target.value)}
                  className="bg-slate-950 border-slate-700 text-white rounded-xl text-xs h-10"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Default Predefined Greeting Text
                </label>
                <textarea
                  rows={2}
                  value={floatingGreeting}
                  onChange={(e) => setFloatingGreeting(e.target.value)}
                  placeholder="Hi Swaraj Tours & Travel! I'd like to ask about booking a cab / tour."
                  className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl text-xs p-2.5 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <label className="text-xs font-semibold text-slate-300">
                  Enable Floating WhatsApp Button on Website
                </label>
                <input
                  type="checkbox"
                  checked={floatingEnabled}
                  onChange={(e) => setFloatingEnabled(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded bg-slate-950 border-slate-700"
                />
              </div>

              {config?.wa_me_url && (
                <div className="pt-2">
                  <a
                    href={config.wa_me_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 font-bold"
                  >
                    <span>Test Generated wa.me Link</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Card 2: Meta WhatsApp Cloud API Credentials */}
          <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                Meta Cloud API Credentials (Official)
              </h3>
              <Badge variant="outline" className={`text-xs border ${statusColor}`}>
                {config?.status}
              </Badge>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Meta Phone Number ID
                </label>
                <Input
                  placeholder="e.g. 100982736451234"
                  value={phoneId}
                  onChange={(e) => setPhoneId(e.target.value)}
                  className="bg-slate-950 border-slate-700 text-white rounded-xl text-xs h-10 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  WhatsApp Business Account ID (WABA ID)
                </label>
                <Input
                  placeholder="e.g. 908273645123456"
                  value={wabaId}
                  onChange={(e) => setWabaId(e.target.value)}
                  className="bg-slate-950 border-slate-700 text-white rounded-xl text-xs h-10 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  System User Permanent Access Token
                </label>
                <div className="relative">
                  <Input
                    type={showAccessToken ? "text" : "password"}
                    placeholder={config?.access_token_masked || "Enter new EAAG... permanent token"}
                    value={accessToken}
                    onChange={(e) => setAccessToken(e.target.value)}
                    className="bg-slate-950 border-slate-700 text-white rounded-xl text-xs h-10 pr-10 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowAccessToken(!showAccessToken)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-white"
                  >
                    {showAccessToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Token is securely masked. Never exposed to public code or logs.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Webhook Verification Token
                </label>
                <Input
                  placeholder="autofleet_webhook_token_2026"
                  value={verifyToken}
                  onChange={(e) => setVerifyToken(e.target.value)}
                  className="bg-slate-950 border-slate-700 text-white rounded-xl text-xs h-10 font-mono"
                />
              </div>

              {/* Webhook URL Endpoint Box */}
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">
                  Callback Webhook URL (Paste into Meta Developer App)
                </span>
                <div className="flex items-center justify-between text-xs font-mono text-emerald-400 break-all">
                  <span>{config?.webhook_url || "http://localhost/api/v1/whatsapp/webhook"}</span>
                  <button
                    onClick={copyWebhookUrl}
                    className="p-1 hover:text-white text-slate-400 rounded transition-colors shrink-0 ml-2"
                    title="Copy Webhook URL"
                  >
                    {copiedWebhook ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Action Row */}
          <div className="md:col-span-2 flex items-center justify-between pt-2">
            <div>
              {saveMessage && (
                <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" /> {saveMessage}
                </span>
              )}
              {saveError && (
                <span className="text-xs text-rose-400 font-semibold flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4" /> {saveError}
                </span>
              )}
            </div>

            <Button
              onClick={handleSaveConfig}
              disabled={savingConfig}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl px-6 h-10 shadow-md shadow-emerald-600/20"
            >
              {savingConfig ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin mr-2" /> Saving...
                </>
              ) : (
                "Save Configuration"
              )}
            </Button>
          </div>
        </div>
      )}

      {/* 3. Notification Preferences View */}
      {activeSubTab === "notifications" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Customer Notifications */}
          <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
              <User className="w-4 h-4 text-emerald-400" />
              Customer Transactional Alerts (WhatsApp)
            </h3>
            <p className="text-xs text-slate-400">
              Automated notifications sent to the customer's phone number upon lifecycle events.
            </p>

            <div className="space-y-3 pt-2">
              {[
                { key: "booking_confirmation", label: "Booking Confirmation Alert", desc: "Sent when reservation holds are locked" },
                { key: "payment_success", label: "Payment Captured & Receipt", desc: "Sent when full or advance payment succeeds" },
                { key: "cancellation", label: "Cancellation & Refund Notice", desc: "Sent when booking is cancelled" },
                { key: "reminders", label: "Pickup & Return Reminders", desc: "24h pickup and 2h return notices" },
              ].map((item) => (
                <div key={item.key} className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
                  <div>
                    <h5 className="font-bold text-xs text-white">{item.label}</h5>
                    <p className="text-[11px] text-slate-400">{item.desc}</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={(notifPrefs.customer as any)[item.key]}
                    onChange={(e) =>
                      setNotifPrefs({
                        ...notifPrefs,
                        customer: { ...notifPrefs.customer, [item.key]: e.target.checked },
                      })
                    }
                    className="w-4 h-4 text-emerald-600 rounded bg-slate-900 border-slate-700"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Admin Notifications */}
          <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
              <Bell className="w-4 h-4 text-emerald-400" />
              Internal Admin & Operations Alerts
            </h3>
            <p className="text-xs text-slate-400">
              Real-time operational alerts sent to the fleet manager's WhatsApp number.
            </p>

            <div className="pt-2">
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Admin Recipient WhatsApp Number
              </label>
              <Input
                placeholder="e.g. 918421081570"
                value={adminPhone}
                onChange={(e) => setAdminPhone(e.target.value)}
                className="bg-slate-950 border-slate-700 text-white rounded-xl text-xs h-10 font-mono mb-3"
              />
            </div>

            <div className="space-y-3">
              {[
                { key: "new_booking", label: "New Booking Notification", desc: "Alert when a new reservation is placed" },
                { key: "payment_success", label: "Payment Capture Notification", desc: "Alert on verified Razorpay payments" },
                { key: "cancellation", label: "Booking Cancellation Alert", desc: "Alert when a customer or staff cancels" },
                { key: "human_support", label: "Human Support Escalation", desc: "Alert when a customer requests a live agent" },
              ].map((item) => (
                <div key={item.key} className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
                  <div>
                    <h5 className="font-bold text-xs text-white">{item.label}</h5>
                    <p className="text-[11px] text-slate-400">{item.desc}</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={(notifPrefs.admin as any)[item.key]}
                    onChange={(e) =>
                      setNotifPrefs({
                        ...notifPrefs,
                        admin: { ...notifPrefs.admin, [item.key]: e.target.checked },
                      })
                    }
                    className="w-4 h-4 text-emerald-600 rounded bg-slate-900 border-slate-700"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="md:col-span-2 flex justify-end">
            <Button
              onClick={handleSaveConfig}
              disabled={savingConfig}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl px-6 h-10"
            >
              Save Notification Preferences
            </Button>
          </div>
        </div>
      )}

      {/* 4. Message History & Delivery Tracking View */}
      {activeSubTab === "messages" && (
        <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <ListFilter className="w-4 h-4 text-emerald-400" />
              Inbound & Outbound WhatsApp Message Audit Log
            </h3>
            <Button
              variant="outline"
              size="sm"
              onClick={loadMessageLogs}
              disabled={loadingMessages}
              className="border-slate-700 text-slate-300 text-xs rounded-xl h-8"
            >
              <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loadingMessages ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="p-3">Direction</th>
                  <th className="p-3">Recipient / Sender</th>
                  <th className="p-3">Content Snippet</th>
                  <th className="p-3">Type</th>
                  <th className="p-3">Delivery Status</th>
                  <th className="p-3">WAMID</th>
                  <th className="p-3">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {messages.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-6 text-center text-slate-500">
                      No messages recorded in the audit log yet.
                    </td>
                  </tr>
                ) : (
                  messages.map((m) => {
                    const isInbound = m.direction === "INBOUND";
                    return (
                      <tr key={m.id} className="hover:bg-slate-800/40">
                        <td className="p-3">
                          <Badge
                            variant="outline"
                            className={`text-[10px] font-bold ${
                              isInbound
                                ? "bg-blue-500/10 text-blue-400 border-blue-500/30"
                                : "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                            }`}
                          >
                            {m.direction}
                          </Badge>
                        </td>
                        <td className="p-3 font-mono">
                          {isInbound ? `+${m.sender_phone}` : `+${m.recipient_phone}`}
                        </td>
                        <td className="p-3 max-w-xs truncate" title={m.content}>
                          {m.content}
                        </td>
                        <td className="p-3 text-[10px] font-mono text-slate-400">
                          {m.message_type}
                        </td>
                        <td className="p-3">
                          <Badge
                            variant="outline"
                            className={`text-[10px] ${
                              m.status === "READ"
                                ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30 font-bold"
                                : m.status === "DELIVERED" || m.status === "SENT"
                                ? "bg-slate-800 text-slate-300 border-slate-700"
                                : "bg-rose-500/20 text-rose-400 border-rose-500/30"
                            }`}
                          >
                            {m.status}
                          </Badge>
                        </td>
                        <td className="p-3 font-mono text-[10px] text-slate-500 max-w-[120px] truncate" title={m.wamid || ""}>
                          {m.wamid || "—"}
                        </td>
                        <td className="p-3 text-slate-400 text-[11px]">
                          {new Date(m.created_at).toLocaleString()}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Send Test Message Modal */}
      {showTestModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h4 className="font-bold text-sm text-white flex items-center gap-2">
              <Send className="w-4 h-4 text-emerald-400" /> Send Test WhatsApp Message
            </h4>
            <p className="text-xs text-slate-400">
              Dispatches an immediate message through the configured Meta Cloud API (or sandbox simulation mode).
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Recipient Phone Number (with Country Code)
                </label>
                <Input
                  placeholder="e.g. 918421081570"
                  value={testRecipient}
                  onChange={(e) => setTestRecipient(e.target.value)}
                  className="bg-slate-950 border-slate-700 text-white rounded-xl text-xs h-10 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Message Content
                </label>
                <textarea
                  rows={3}
                  value={testContent}
                  onChange={(e) => setTestContent(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl text-xs p-2.5 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowTestModal(false)}
                className="border-slate-700 text-slate-300 rounded-xl text-xs"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSendTestMessage}
                disabled={sendingTest}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs"
              >
                {sendingTest ? "Sending..." : "Dispatch Message"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
