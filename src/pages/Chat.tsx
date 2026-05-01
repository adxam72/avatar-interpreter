import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Navbar } from "@/components/Navbar";
import { SignAvatar } from "@/components/SignAvatar";
import { useSignPlayer } from "@/hooks/useSignPlayer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { Send, Search, Phone, MessageCircle, Hand, ArrowLeft, Loader2, Sparkles } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface Profile {
  id: string;
  user_id: string;
  full_name: string | null;
  phone: string | null;
  email: string | null;
  is_deaf: boolean | null;
}

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  message_type: string;
  created_at: string;
}

const Chat = () => {
  const { user, profile } = useAuth();
  const [contacts, setContacts] = useState<Profile[]>([]);
  const [activeContact, setActiveContact] = useState<Profile | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [searching, setSearching] = useState(false);
  const [showAvatar, setShowAvatar] = useState(false);
  const [avatarMessageId, setAvatarMessageId] = useState<string | null>(null);
  const [autoTranslate, setAutoTranslate] = useState(true);
  const [inlinePlayingId, setInlinePlayingId] = useState<string | null>(null);
  const player = useSignPlayer();
  const inlinePlayer = useSignPlayer();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastAutoPlayedRef = useRef<string | null>(null);

  // Load contacts
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: contactRows } = await supabase
        .from("contacts")
        .select("contact_user_id")
        .eq("owner_id", user.id);

      if (!contactRows?.length) return;
      const ids = contactRows.map((c) => c.contact_user_id);
      const { data: profs } = await supabase
        .from("profiles")
        .select("*")
        .in("user_id", ids);

      if (profs) setContacts(profs as Profile[]);
    })();
  }, [user]);

  // Load messages
  useEffect(() => {
    if (!activeContact || !user) return;
    (async () => {
      const { data } = await supabase
        .from("messages")
        .select("*")
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${activeContact.user_id}),and(sender_id.eq.${activeContact.user_id},receiver_id.eq.${user.id})`)
        .order("created_at", { ascending: true });
      if (data) setMessages(data as Message[]);
    })();

    // Realtime subscription
    const channel = supabase
      .channel(`chat-${activeContact.user_id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          const m = payload.new as Message;
          if (
            (m.sender_id === user.id && m.receiver_id === activeContact.user_id) ||
            (m.sender_id === activeContact.user_id && m.receiver_id === user.id)
          ) {
            setMessages((prev) => {
              if (prev.some((existing) => existing.id === m.id)) return prev;
              return [...prev, m];
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeContact, user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Auto-translate incoming text messages onto inline avatar
  useEffect(() => {
    if (!autoTranslate || !user || messages.length === 0) return;
    const last = messages[messages.length - 1];
    if (last.sender_id === user.id) return; // only incoming
    if (last.message_type !== "text") return;
    if (lastAutoPlayedRef.current === last.id) return;
    lastAutoPlayedRef.current = last.id;
    setInlinePlayingId(last.id);
    inlinePlayer.play(last.content).finally(() => {
      setInlinePlayingId((cur) => (cur === last.id ? null : cur));
    });
  }, [messages, autoTranslate, user]);

  // Stop inline player when toggle turns off
  useEffect(() => {
    if (!autoTranslate) {
      inlinePlayer.stop();
      setInlinePlayingId(null);
    }
  }, [autoTranslate]);

  const search = async () => {
    if (!searchQuery.trim() || !user) return;
    setSearching(true);
    const q = searchQuery.trim().replace(/[%_(),.*]/g, "");
    if (!q) { setSearching(false); return; }
    const pattern = `%${q}%`;
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .or(`phone.ilike.${pattern},email.ilike.${pattern},full_name.ilike.${pattern}`)
      .neq("user_id", user.id)
      .limit(10);
    setSearchResults((data as Profile[]) || []);
    setSearching(false);
  };

  const addContact = async (p: Profile) => {
    if (!user) return;
    await supabase.from("contacts").insert({ owner_id: user.id, contact_user_id: p.user_id });
    setContacts((prev) => [...prev, p]);
    setActiveContact(p);
    setSearchQuery("");
    setSearchResults([]);
    toast({ title: "Kontakt qo'shildi", description: p.full_name || p.phone || "" });
  };

  const send = async () => {
    if (!draft.trim() || !activeContact || !user) return;
    const content = draft.trim();
    setDraft("");
    const { error } = await supabase.from("messages").insert({
      sender_id: user.id,
      receiver_id: activeContact.user_id,
      content,
      message_type: "text",
    });
    if (error) toast({ variant: "destructive", title: "Xatolik", description: error.message });
  };

  const playAvatar = (m: Message) => {
    setAvatarMessageId(m.id);
    setShowAvatar(true);
    player.play(m.content);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="container py-6 h-[calc(100vh-4rem)] flex flex-col">
        <div className="grid md:grid-cols-[320px_1fr] gap-4 flex-1 overflow-hidden">
          {/* Sidebar */}
          <div className={`glass-card rounded-3xl p-4 flex flex-col ${activeContact ? "hidden md:flex" : "flex"}`}>
            <h2 className="font-display font-bold text-lg mb-3">Muloqot</h2>

            {/* Search */}
            <div className="space-y-2 mb-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Telefon, email yoki ism..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && search()}
                  className="rounded-xl"
                />
                <Button onClick={search} size="icon" disabled={searching}>
                  {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                </Button>
              </div>
              {searchResults.length > 0 && (
                <div className="space-y-1 bg-muted/50 rounded-xl p-2">
                  {searchResults.map((p) => (
                    <button
                      key={p.user_id}
                      onClick={() => addContact(p)}
                      className="w-full text-left p-2 rounded-lg hover:bg-background transition-smooth flex items-center gap-2"
                    >
                      <div className="h-8 w-8 rounded-full gradient-hero text-white flex items-center justify-center text-xs font-medium">
                        {p.full_name?.[0]?.toUpperCase() || "?"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{p.full_name || "Foydalanuvchi"}</div>
                        <div className="text-xs text-muted-foreground truncate">{p.phone || p.email}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Contacts */}
            <div className="flex-1 overflow-auto space-y-1">
              <h3 className="text-xs font-medium text-muted-foreground px-2 mb-2 uppercase">Kontaktlar</h3>
              {contacts.length === 0 ? (
                <div className="text-center py-8 text-sm text-muted-foreground px-4">
                  Hali kontaktlar yo'q. Telefon raqam yoki email orqali qidiring.
                </div>
              ) : (
                contacts.map((c) => (
                  <button
                    key={c.user_id}
                    onClick={() => setActiveContact(c)}
                    className={`w-full text-left p-3 rounded-2xl flex items-center gap-3 transition-smooth ${
                      activeContact?.user_id === c.user_id ? "bg-primary-soft" : "hover:bg-muted/50"
                    }`}
                  >
                    <div className="h-10 w-10 rounded-full gradient-hero text-white flex items-center justify-center font-medium relative">
                      {c.full_name?.[0]?.toUpperCase() || "?"}
                      {c.is_deaf && (
                        <div className="absolute -bottom-1 -right-1 bg-background rounded-full p-0.5">
                          <Hand className="h-3 w-3 text-primary" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{c.full_name || "Foydalanuvchi"}</div>
                      <div className="text-xs text-muted-foreground truncate">{c.phone || c.email}</div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Chat area */}
          <div className={`glass-card rounded-3xl flex flex-col overflow-hidden ${!activeContact ? "hidden md:flex" : "flex"}`}>
            {!activeContact ? (
              <div className="flex-1 flex items-center justify-center text-center p-8">
                <div className="space-y-3">
                  <div className="inline-flex p-4 rounded-full bg-primary-soft">
                    <MessageCircle className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="font-display font-semibold text-lg">Suhbatni boshlang</h3>
                  <p className="text-sm text-muted-foreground max-w-xs">
                    Chap tomondan kontaktni tanlang yoki yangi qo'shing.
                  </p>
                </div>
              </div>
            ) : (
              <>
                {/* Header */}
                <div className="p-4 border-b border-primary/5 flex items-center gap-3">
                  <button onClick={() => setActiveContact(null)} className="md:hidden p-2 rounded-full hover:bg-muted">
                    <ArrowLeft className="h-4 w-4" />
                  </button>
                  <div className="h-10 w-10 rounded-full gradient-hero text-white flex items-center justify-center font-medium">
                    {activeContact.full_name?.[0]?.toUpperCase() || "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{activeContact.full_name}</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      <Phone className="h-3 w-3" /> {activeContact.phone || activeContact.email}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pl-2 border-l border-primary/10">
                    <Sparkles className={`h-4 w-4 ${autoTranslate ? "text-primary" : "text-muted-foreground"}`} />
                    <Label htmlFor="auto-translate" className="text-xs cursor-pointer hidden sm:block">
                      Auto-tarjima
                    </Label>
                    <Switch
                      id="auto-translate"
                      checked={autoTranslate}
                      onCheckedChange={setAutoTranslate}
                    />
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-auto p-4 space-y-2 bg-gradient-to-b from-background to-primary-soft/30">
                  {messages.length === 0 ? (
                    <div className="text-center py-8 text-sm text-muted-foreground">
                      Hali xabarlar yo'q. Birinchi bo'lib salomlashing 👋
                    </div>
                  ) : (
                    messages.map((m) => {
                      const mine = m.sender_id === user?.id;
                      const isInlinePlaying = inlinePlayingId === m.id && !mine;
                      return (
                        <div key={m.id} className={`flex flex-col ${mine ? "items-end" : "items-start"} group`}>
                          <div className={`max-w-[75%] flex items-end gap-2 ${mine ? "flex-row-reverse" : ""}`}>
                            <div
                              className={`px-4 py-2.5 rounded-3xl text-sm ${
                                mine
                                  ? "gradient-hero text-primary-foreground rounded-br-md"
                                  : "bg-background border border-primary/5 rounded-bl-md"
                              }`}
                            >
                              {m.content}
                            </div>
                            <button
                              onClick={() => playAvatar(m)}
                              className="opacity-0 group-hover:opacity-100 transition-smooth p-1.5 rounded-full bg-background border border-primary/10 hover:bg-primary-soft"
                              title="Avatar bilan ko'rsatish"
                            >
                              <Hand className="h-3.5 w-3.5 text-primary" />
                            </button>
                          </div>
                          <AnimatePresence>
                            {isInlinePlaying && (
                              <motion.div
                                initial={{ opacity: 0, scale: 0.8, y: -8 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.8, y: -8 }}
                                className="mt-2 ml-2 glass-card rounded-2xl p-2 flex items-center gap-2 shadow-soft border border-primary/10"
                              >
                                <div className="h-20 w-20 rounded-xl overflow-hidden bg-gradient-to-br from-primary-soft to-background">
                                  <SignAvatar
                                    pose={inlinePlayer.currentPose}
                                    avatarUrl={profile?.avatar_url || undefined}
                                    compact
                                  />
                                </div>
                                <div className="flex flex-col gap-1 pr-2">
                                  <div className="flex items-center gap-1 text-[10px] text-primary font-medium">
                                    <Sparkles className="h-3 w-3" /> Auto-tarjima
                                  </div>
                                  <div className="text-xs font-medium">
                                    "{inlinePlayer.currentWord || "..."}"
                                  </div>
                                  <div className="h-1 w-24 bg-muted rounded-full overflow-hidden">
                                    <div
                                      className="h-full gradient-hero transition-all"
                                      style={{ width: `${Math.round(inlinePlayer.progress * 100)}%` }}
                                    />
                                  </div>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <div className="p-4 border-t border-primary/5 flex gap-2">
                  <Input
                    placeholder="Xabar yozing..."
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && send()}
                    className="rounded-full"
                  />
                  <Button onClick={send} variant="hero" size="icon" disabled={!draft.trim()}>
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Avatar overlay */}
        <AnimatePresence>
          {showAvatar && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
              onClick={() => { setShowAvatar(false); player.stop(); }}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-background rounded-3xl overflow-hidden max-w-md w-full aspect-square relative"
                onClick={(e) => e.stopPropagation()}
              >
                <SignAvatar pose={player.currentPose} avatarUrl={profile?.avatar_url || undefined} compact />
                <div className="absolute bottom-4 left-4 right-4 glass px-4 py-3 rounded-2xl text-center">
                  <div className="text-xs text-muted-foreground mb-1">Tarjima qilinyapti</div>
                  <div className="font-medium text-sm">"{player.currentWord || "..."}"</div>
                </div>
                <button
                  onClick={() => { setShowAvatar(false); player.stop(); }}
                  className="absolute top-4 right-4 glass p-2 rounded-full"
                >
                  ✕
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Chat;
