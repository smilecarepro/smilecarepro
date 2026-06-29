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

  // Dragging state
  const [position, setPosition] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef({ startX: 0, startY: 0, initialX: 0, initialY: 0, moved: false });

  useEffect(() => {
    // Initialize position
    setPosition({
      x: isRTL ? 25 : window.innerWidth - 80,
      y: window.innerHeight - 80
    });
  }, [isRTL]);

  const handlePointerDown = (e) => {
    setIsDragging(true);
    dragRef.current.startX = e.clientX || (e.touches && e.touches[0].clientX);
    dragRef.current.startY = e.clientY || (e.touches && e.touches[0].clientY);
    dragRef.current.initialX = position.x;
    dragRef.current.initialY = position.y;
    dragRef.current.moved = false;
  };

  const handlePointerMove = (e) => {
    if (!isDragging) return;
    const clientX = e.clientX || (e.touches && e.touches[0].clientX);
    const clientY = e.clientY || (e.touches && e.touches[0].clientY);
    
    if (clientX === undefined || clientY === undefined) return;

    const dx = clientX - dragRef.current.startX;
    const dy = clientY - dragRef.current.startY;
    
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
      dragRef.current.moved = true;
      let newX = dragRef.current.initialX + dx;
      let newY = dragRef.current.initialY + dy;
      
      // Constrain bubble within the screen bounds (bubble is 55x55)
      newX = Math.max(0, Math.min(newX, window.innerWidth - 55));
      newY = Math.max(0, Math.min(newY, window.innerHeight - 55));

      setPosition({ x: newX, y: newY });
    }
  };

  const handlePointerUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener("mousemove", handlePointerMove);
      window.addEventListener("mouseup", handlePointerUp);
      window.addEventListener("touchmove", handlePointerMove, { passive: false });
      window.addEventListener("touchend", handlePointerUp);
    } else {
      window.removeEventListener("mousemove", handlePointerMove);
      window.removeEventListener("mouseup", handlePointerUp);
      window.removeEventListener("touchmove", handlePointerMove);
      window.removeEventListener("touchend", handlePointerUp);
    }
    return () => {
      window.removeEventListener("mousemove", handlePointerMove);
      window.removeEventListener("mouseup", handlePointerUp);
      window.removeEventListener("touchmove", handlePointerMove);
      window.removeEventListener("touchend", handlePointerUp);
    };
  }, [isDragging, position]);


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

  if (!user || !position) return null;

  const isMobile = window.innerWidth < 768;
  const chatHeight = isMobile ? 380 : 480;
  const bottomSafeArea = isMobile ? 85 : 10;

  return (
    <div className="chat-widget-wrapper" style={{ 
      position: "fixed", 
      left: position.x, 
      top: position.y, 
      width: 55, height: 55,
      zIndex: 99999
    }}>
      {/* Floating Bubble */}
      <button 
        onMouseDown={handlePointerDown}
        onTouchStart={handlePointerDown}
        onClick={(e) => {
          if (!dragRef.current.moved) setIsOpen(!isOpen);
        }}
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
          position: "fixed", 
          top: Math.max(10, Math.min(
            (window.innerHeight - position.y - 55 > position.y) ? position.y + 70 : position.y - chatHeight - 15,
            window.innerHeight - chatHeight - bottomSafeArea
          )),
          left: Math.max(10, Math.min(
            position.x - 340 / 2 + 55 / 2, 
            window.innerWidth - 340 - 10
          )),
          width: 340, height: chatHeight, 
          maxWidth: "calc(100vw - 20px)", maxHeight: `calc(100vh - ${bottomSafeArea + 10}px)`,
          display: "flex", flexDirection: "column",
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
              <button onClick={() => setSelectedContact(null)} style={{ background: "none", border: "none", color: "var(--text-main)", cursor: "pointer", fontSize: 18 }}>
                {isRTL ? "←" : "→"}
              </button>
            )}
            <div style={{ flex: 1, color: "var(--text-main)" }}>
              <div style={{ fontWeight: 800, fontSize: 14 }}>
                {selectedContact ? selectedContact.full_name : t("المراسلات")}
              </div>
              <div style={{ fontSize: 10, opacity: 0.8 }}>
                {selectedContact ? (t(selectedContact.role) || "online") : t("اختر شخصاً للمراسلة")}
              </div>
            </div>
            <button 
              onClick={() => setIsOpen(false)} 
              style={{ 
                background: "rgba(0,0,0,0.05)", border: "none", color: "var(--text-main)", 
                cursor: "pointer", fontSize: 14, display: "flex", alignItems: "center", 
                justifyContent: "center", width: 28, height: 28, borderRadius: "50%",
                transition: "0.2s"
              }}
            >
              ✕
            </button>
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
                      background: "var(--panel-bg)", display: "flex", 
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
                        alignItems: isMe ? (isRTL ? "flex-start" : "flex-end") : (isRTL ? "flex-end" : "flex-start") 
                      }}>
                        <div style={{
                          maxWidth: "85%", padding: "8px 14px", borderRadius: 16,
                          fontSize: 13, lineHeight: 1.4,
                          background: isMe ? "var(--primary)" : "var(--panel-bg-hover)",
                          color: "var(--text-main)",
                          borderBottomRightRadius: isMe ? 2 : 16,
                          borderBottomLeftRadius: isMe ? 16 : 2
                        }}>
                          {m.content}
                        </div>
                        <div style={{ fontSize: 8, color: "var(--text-dim)", marginTop: 4, marginHorizontal: 4 }}>
                          {m.timestamp ? new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }) : ""}
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
