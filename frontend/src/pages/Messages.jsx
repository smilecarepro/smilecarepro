import React, { useState, useEffect, useRef } from "react";
import { useLanguage } from "../LanguageContext";
import { useAuth } from "../AuthContext";
import { getChatContacts, getChatHistory, sendChatMessage } from "../api";

export default function Messages() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [contacts, setContacts] = useState([]);
  const [selectedContact, setSelectedContact] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [chatLoading, setChatLoading] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    getChatContacts()
      .then(setContacts)
      .finally(() => setLoading(false));
  }, []);

  // Poll for new messages every 5 seconds if a chat is selected
  useEffect(() => {
    let interval;
    if (selectedContact) {
      const fetchHistory = () => {
        getChatHistory(selectedContact.username).then(setMessages);
      };
      fetchHistory();
      interval = setInterval(fetchHistory, 5000);
    }
    return () => clearInterval(interval);
  }, [selectedContact]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedContact) return;

    const msgData = {
      receiver_username: selectedContact.username,
      message: newMessage.trim()
    };

    // Optimistic update
    const tempMsg = {
      id: Date.now(),
      sender_username: user.username,
      message: newMessage.trim(),
      timestamp: new Date().toISOString(),
      is_read: 0
    };
    setMessages([...messages, tempMsg]);
    setNewMessage("");

    try {
      await sendChatMessage(msgData);
    } catch (e) {
      alert("Failed to send message");
    }
  };

  const getRoleIcon = (type) => {
    if (type === 'manager') return "👑";
    if (type === 'doctor') return "👨‍⚕️";
    if (type === 'secretary') return "👩‍💻";
    return "👤";
  };

  if (loading) return <div style={{ padding: 40, textAlign: "center" }}>{t("جاري تحميل جهات الاتصال...")}</div>;

  return (
    <div className="animate-fade" style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: 0, height: "calc(100vh - 120px)", borderRadius: 24, overflow: "hidden", border: "1px solid var(--glass-border)", background: "rgba(255,255,255,0.02)" }}>
      {/* Sidebar */}
      <div style={{ borderLeft: "1px solid var(--glass-border)", background: "rgba(255,255,255,0.02)", display: "flex", flexDirection: "column" }}>
        <div style={{ padding: 24, borderBottom: "1px solid var(--glass-border)" }}>
           <h3 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>💬 {t("المراسلات")}</h3>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: 12 }} className="custom-scrollbar">
          {contacts.map(contact => (
            <div 
              key={contact.username} 
              onClick={() => setSelectedContact(contact)}
              style={{
                padding: "12px 16px", borderRadius: 12, cursor: "pointer", marginBottom: 8,
                background: selectedContact?.username === contact.username ? "var(--primary)" : "transparent",
                color: selectedContact?.username === contact.username ? "white" : "inherit",
                transition: "all 0.2s"
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: "50%", background: "rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>
                  {getRoleIcon(contact.type)}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{contact.display_name}</div>
                  <div style={{ fontSize: 10, opacity: 0.7 }}>{contact.type === 'manager' ? t("المدير العام") : contact.type === 'doctor' ? t("طبيب") : t("سكرتارية")}</div>
                </div>
              </div>
            </div>
          ))}
          {contacts.length === 0 && (
            <div style={{ textAlign: "center", padding: 40, opacity: 0.5, fontSize: 12 }}>{t("لا توجد جهات اتصال متاحة")}</div>
          )}
        </div>
      </div>

      {/* Chat Window */}
      <div style={{ display: "flex", flexDirection: "column", background: "rgba(0,0,0,0.1)" }}>
        {selectedContact ? (
          <>
            {/* Header */}
            <div style={{ padding: "16px 24px", borderBottom: "1px solid var(--glass-border)", display: "flex", alignItems: "center", gap: 12, background: "rgba(255,255,255,0.02)" }}>
               <div style={{ fontSize: 24 }}>{getRoleIcon(selectedContact.type)}</div>
               <div>
                  <div style={{ fontWeight: 800 }}>{selectedContact.display_name}</div>
                  <div style={{ fontSize: 11, color: "var(--primary-glow)" }}>● {t("نشط الآن")}</div>
               </div>
            </div>

            {/* Messages Area */}
            <div 
              ref={scrollRef}
              style={{ flex: 1, overflowY: "auto", padding: 24, display: "flex", flexDirection: "column", gap: 12 }}
              className="custom-scrollbar"
            >
              {messages.map((m, idx) => {
                const isMe = m.sender_username === user.username;
                return (
                  <div key={m.id} style={{ alignSelf: isMe ? "flex-start" : "flex-end", maxWidth: "70%" }}>
                    <div style={{ 
                      padding: "12px 18px", borderRadius: 16, fontSize: 14, lineHeight: 1.5,
                      background: isMe ? "var(--primary)" : "rgba(255,255,255,0.05)",
                      color: isMe ? "white" : "inherit",
                      border: isMe ? "none" : "1px solid var(--glass-border)",
                      borderTopRightRadius: isMe ? 4 : 16,
                      borderTopLeftRadius: isMe ? 16 : 4
                    }}>
                      {m.message}
                    </div>
                    <div style={{ fontSize: 9, color: "var(--text-dim)", marginTop: 4, textAlign: isMe ? "left" : "right", padding: "0 4px" }}>
                      {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}
                    </div>
                  </div>
                );
              })}
              {messages.length === 0 && (
                <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", opacity: 0.3 }}>
                   <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: 48, marginBottom: 16 }}>👋</div>
                      <div>{t("ابدأ المراسلة مع")} {selectedContact.display_name}</div>
                   </div>
                </div>
              )}
            </div>

            {/* Input Area */}
            <form onSubmit={handleSend} style={{ padding: 24, borderTop: "1px solid var(--glass-border)", background: "rgba(255,255,255,0.02)" }}>
              <div style={{ display: "flex", gap: 12 }}>
                <input 
                  className="glass-input"
                  style={{ flex: 1, padding: "12px 20px", borderRadius: 12 }}
                  placeholder={t("اكتب رسالتك هنا...")}
                  value={newMessage}
                  onChange={e => setNewMessage(e.target.value)}
                />
                <button type="submit" className="btn-primary" style={{ padding: "0 24px", borderRadius: 12 }}>
                   {t("إرسال")} 🚀
                </button>
              </div>
            </form>
          </>
        ) : (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", opacity: 0.2 }}>
             <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 100, marginBottom: 20 }}>💬</div>
                <h3 style={{ fontSize: 24, fontWeight: 800 }}>{t("مرحباً بك في بريد المركز")}</h3>
                <p>{t("اختر جهة اتصال من القائمة لبدء محادثة خاصة وآمنة")}</p>
             </div>
          </div>
        )}
      </div>
    </div>
  );
}
