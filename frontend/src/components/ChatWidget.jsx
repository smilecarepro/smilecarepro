import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../AuthContext";
import { useLanguage } from "../LanguageContext";
import { getChatContacts, getChatHistory, sendChatMessage, getUnreadMessagesCount } from "../api";

export default function ChatWidget() {
  const { user } = useAuth();
  const { t, lang } = useLanguage();
  const isRTL = document.documentElement.dir === "rtl" || lang === "ar";
  
  const [isOpen, setIsOpen] = useState(false);
  const [contacts, setContacts] = useState([]);
  const [selectedContact, setSelectedContact] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef(null);

  // Poll for unread count
  useEffect(() => {
    if (!user) return;
    const checkUnread = () => {
      getUnreadMessagesCount().then(res => setUnreadCount(res?.count || 0)).catch(() => {});
    };
    checkUnread();
    const interval = setInterval(checkUnread, 10000);
    return () => clearInterval(interval);
  }, [user]);

  // Fetch contacts when opened
  useEffect(() => {
    if (isOpen && user) {
      getChatContacts().then(res => setContacts(res || [])).catch(() => {});
    }
  }, [isOpen, user]);

  // Fetch history when contact selected
  useEffect(() => {
    if (selectedContact) {
      setLoading(true);
      getChatHistory(selectedContact.username)
        .then(res => setMessages(res || []))
        .finally(() => setLoading(false));
      
      const interval = setInterval(() => {
        getChatHistory(selectedContact.username).then(res => setMessages(res || []));
      }, 5000);
      return () => clearInterval(interval);
    } else {
      setMessages([]);
    }
  }, [selectedContact]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedContact) return;
    
    const msgData = {
      receiver_username: selectedContact.username,
      content: newMessage
    };
    
    try {
      await sendChatMessage(msgData);
      setNewMessage("");
      const history = await getChatHistory(selectedContact.username);
      setMessages(history);
    } catch (e) {
      console.error("Failed to send message", e);
    }
  };

  if (!user) return null;

  return (
    <div className="chat-widget-wrapper" style={{ position: "fixed", bottom: 25, [isRTL ? "left" : "right"]: 25, zIndex: 1000 }}>
      {/* Floating Bubble */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="chat-bubble shadow-primary"
        style={{
          width: 55, height: 55, borderRadius: "50%",
          background: "var(--primary)", border: "none",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 22, cursor: "pointer", transition: "0.3s all"
        }}
      >
        {isOpen ? "✕" : "💬"}
        {unreadCount > 0 && !isOpen && (
          <span style={{
            position: "absolute", top: -2, [isRTL ? "right" : "left"]: -2,
            background: "#ef4444", color: "white",
            fontSize: 10, fontWeight: 800, padding: "4px 7px",
            borderRadius: "50%", border: "2px solid var(--bg-dark)"
          }}>
            {unreadCount}
          </span>
        )}
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="glass-panel animate-scale-up" style={{
          position: "absolute", bottom: 70, [isRTL ? "left" : "right"]: 0,
          width: 340, height: 480, display: "flex", flexDirection: "column",
          overflow: "hidden", border: "1px solid var(--glass-border)",
          boxShadow: "0 20px 50px rgba(0,0,0,0.4)",
          borderRadius: 24
        }}>
          
          {/* Header */}
          <div style={{ 
            padding: "14px 18px", background: "var(--primary)", color: "white",
            display: "flex", alignItems: "center", gap: 12
          }}>
            {selectedContact && (
              <button onClick={() => setSelectedContact(null)} style={{ background: "none", border: "none", color: "white", cursor: "pointer", fontSize: 18 }}>
                {isRTL ? "←" : "→"}
              </button>
            )}
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 800, fontSize: 14 }}>
                {selectedContact ? selectedContact.full_name : t("المراسلات")}
              </div>
              <div style={{ fontSize: 10, opacity: 0.8 }}>
                {selectedContact ? (t(selectedContact.role) || "online") : t("اختر شخصاً للمراسلة")}
              </div>
            </div>
          </div>

          {/* Body */}
          <div style={{ flex: 1, overflowY: "auto", padding: 15, background: "rgba(0,0,0,0.15)" }}>
            {!selectedContact ? (
              /* Contact List */
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {contacts.length === 0 ? (
                  <div style={{ textAlign: "center", padding: 40, color: "var(--text-dim)", fontSize: 12 }}>
                    {t("لا توجد جهات اتصال متاحة")}
                  </div>
                ) : contacts.map(c => (
                  <div 
                    key={c.username}
                    onClick={() => setSelectedContact(c)}
                    className="glass-card"
                    style={{ 
                      padding: "10px 14px", cursor: "pointer", display: "flex", 
                      alignItems: "center", gap: 12, transition: "0.2s",
                      borderRadius: 16
                    }}
                  >
                    <div style={{ 
                      width: 38, height: 38, borderRadius: "50%", 
                      background: "rgba(255,255,255,0.05)", display: "flex", 
                      alignItems: "center", justifyContent: "center", fontSize: 16 
                    }}>
                      {c.role === 'doctor' ? '👨‍⚕️' : c.role === 'manager' ? '⚙️' : '👤'}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 700 }}>{c.full_name}</div>
                      <div style={{ fontSize: 10, color: "var(--text-dim)" }}>{t(c.role)}</div>
                    </div>
                    {c.unread_count > 0 && (
                      <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--primary)" }}></span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              /* Chat Messages */
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {loading ? (
                  <div style={{ textAlign: "center", padding: 20, fontSize: 12, color: "var(--text-dim)" }}>{t("جاري التحميل...")}</div>
                ) : (
                  messages.map((m, idx) => {
                    const isMe = m.sender_username === user.username;
                    return (
                      <div key={idx} style={{ 
                        display: "flex", flexDirection: "column", 
                        alignItems: isMe ? "flex-end" : "flex-start" 
                      }}>
                        <div style={{
                          maxWidth: "85%", padding: "8px 14px", borderRadius: 16,
                          fontSize: 13, lineHeight: 1.4,
                          background: isMe ? "var(--primary)" : "rgba(255,255,255,0.08)",
                          color: "white",
                          borderBottomRightRadius: isMe ? 2 : 16,
                          borderBottomLeftRadius: isMe ? 16 : 2
                        }}>
                          {m.content}
                        </div>
                        <div style={{ fontSize: 8, color: "var(--text-dim)", marginTop: 4, marginHorizontal: 4 }}>
                          {m.timestamp ? new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ""}
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={chatEndRef} />
              </div>
            )}
          </div>

          {/* Footer Input */}
          {selectedContact && (
            <form onSubmit={handleSendMessage} style={{ padding: 12, borderTop: "1px solid var(--glass-border)", display: "flex", gap: 8, background: "rgba(0,0,0,0.1)" }}>
              <input 
                type="text"
                className="glass-input"
                placeholder={t("اكتب رسالة...")}
                value={newMessage}
                onChange={e => setNewMessage(e.target.value)}
                style={{ flex: 1, padding: "8px 14px", fontSize: 13, borderRadius: 20 }}
              />
              <button 
                type="submit" 
                className="btn-primary" 
                style={{ width: 36, height: 36, padding: 0, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}
              >
                ✈️
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
