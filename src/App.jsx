import { useState, useEffect, useCallback } from "react";
import { supabase } from "./supabaseClient.js";

// ── Constants ─────────────────────────────────────────────────────────────────
const CATEGORIES = ["Shelter", "Sleep", "Clothing", "Navigation", "Food & Water", "Tools & Repair", "Safety", "Electronics", "Hygiene", "Other"];
const STORAGE_ZONES = ["Saddle Bag", "Frame Bag", "Handlebar Bag", "Top Tube Bag", "Rack Bag", "Fork Mounts", "Other"];
const STORAGE_COLORS = {
  "Saddle Bag":     { bg: "#8b4e2a", text: "#fde8c0", dot: "#f09040" },
  "Frame Bag":      { bg: "#2e6b54", text: "#b0f0d0", dot: "#40c888" },
  "Handlebar Bag":  { bg: "#9a4820", text: "#fdd090", dot: "#f08030" },
  "Top Tube Bag":   { bg: "#245e4a", text: "#a0e0c0", dot: "#38b880" },
  "Rack Bag":       { bg: "#7a4018", text: "#fcc870", dot: "#d89030" },
  "Fork Mounts":    { bg: "#3e6e38", text: "#c0f098", dot: "#70d050" },
  "Other":          { bg: "#5e4e28", text: "#ecd898", dot: "#c0a050" },
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function toOz(lbs, oz) { return parseFloat(lbs || 0) * 16 + parseFloat(oz || 0); }

function encodeKit(name, items) {
  try {
    return btoa(unescape(encodeURIComponent(JSON.stringify({ name, items }))));
  } catch { return null; }
}
function decodeKit(str) {
  try { return JSON.parse(decodeURIComponent(escape(atob(str)))); }
  catch { return null; }
}
function getSharedKitFromURL() {
  try {
    const encoded = new URLSearchParams(window.location.search).get("kit");
    return encoded ? decodeKit(encoded) : null;
  } catch { return null; }
}

function WeightDisplay({ oz }) {
  const l = Math.floor(oz / 16);
  const o = +(oz % 16).toFixed(1);
  if (l === 0 && o === 0) return <span>—</span>;
  if (l === 0) return <span>{o} oz</span>;
  if (o === 0) return <span>{l} lb</span>;
  return <span>{l} lb {o} oz</span>;
}

const emptyForm = { name: "", lbs: "", oz: "", category: CATEGORIES[0], zone: STORAGE_ZONES[0], essential: true, notes: "" };

// ── Styles ────────────────────────────────────────────────────────────────────
const S = {
  page: {
    minHeight: "100vh",
    background: "linear-gradient(155deg, #5a3818 0%, #2e5040 50%, #5a3818 100%)",
    fontFamily: "'Lora', Georgia, serif",
    color: "#f5e8cc",
    position: "relative",
    overflow: "hidden",
  },
  card: {
    background: "rgba(245,225,190,0.12)",
    backdropFilter: "blur(12px)",
    borderRadius: 16,
    border: "1px solid rgba(240,190,100,0.22)",
    boxShadow: "0 4px 24px rgba(0,0,0,0.15)",
  },
  input: {
    background: "rgba(255,240,210,0.15)",
    border: "1px solid rgba(220,170,80,0.35)",
    color: "#f8efd8",
    padding: "10px 14px",
    borderRadius: 10,
    fontSize: 14,
    fontFamily: "'Josefin Sans', sans-serif",
    width: "100%",
  },
  select: {
    background: "rgba(255,240,210,0.15)",
    border: "1px solid rgba(220,170,80,0.35)",
    color: "#f8efd8",
    padding: "10px 14px",
    borderRadius: 10,
    fontSize: 13,
    fontFamily: "'Josefin Sans', sans-serif",
    width: "100%",
  },
  btnPrimary: {
    background: "#3a7858",
    border: "none",
    color: "#b0f0d0",
    padding: "10px 22px",
    borderRadius: 20,
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 600,
    fontFamily: "'Josefin Sans', sans-serif",
    boxShadow: "0 2px 12px rgba(40,120,80,0.4)",
  },
  btnSecondary: {
    background: "rgba(120,70,20,0.6)",
    border: "1px solid rgba(220,150,60,0.4)",
    color: "#f0c878",
    padding: "8px 18px",
    borderRadius: 20,
    cursor: "pointer",
    fontSize: 12,
    fontFamily: "'Josefin Sans', sans-serif",
  },
  btnGhost: {
    background: "transparent",
    border: "1px solid rgba(220,150,60,0.3)",
    color: "#c09050",
    padding: "8px 14px",
    borderRadius: 20,
    cursor: "pointer",
    fontSize: 12,
    fontFamily: "'Josefin Sans', sans-serif",
  },
  label: {
    fontFamily: "'Josefin Sans', sans-serif",
    fontSize: 9,
    color: "#50a878",
    letterSpacing: "2px",
    marginBottom: 6,
    display: "block",
  },
  modalOverlay: {
    position: "fixed", inset: 0,
    background: "rgba(30,15,5,0.7)",
    backdropFilter: "blur(6px)",
    display: "flex", alignItems: "center", justifyContent: "center",
    zIndex: 200,
  },
  modalBox: {
    background: "rgba(60,35,12,0.97)",
    borderRadius: 22,
    padding: 32,
    width: 420,
    maxHeight: "80vh",
    overflow: "auto",
    boxShadow: "0 24px 64px rgba(0,0,0,0.5)",
    border: "1px solid rgba(220,170,80,0.3)",
  },
  modalTitle: {
    fontFamily: "'Lora', serif",
    fontSize: 22,
    fontWeight: 700,
    color: "#f0a030",
    marginBottom: 6,
  },
  modalSub: {
    fontFamily: "'Josefin Sans', sans-serif",
    fontSize: 11,
    color: "#50a878",
    marginBottom: 18,
    letterSpacing: "0.5px",
  },
};

// ── Login Screen ──────────────────────────────────────────────────────────────
function LoginScreen() {
  const [loading, setLoading] = useState(false);
  const inviter = new URLSearchParams(window.location.search).get("invite");

  const handleLogin = async () => {
    setLoading(true);
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });
  };
  return (
    <div style={{ ...S.page, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,600;0,700;1,400&family=Josefin+Sans:wght@300;400;600&display=swap');`}</style>
      <div style={{ textAlign: "center", padding: 40, maxWidth: 400 }}>
        <div style={{ fontSize: 56, marginBottom: 16 }}>🚲</div>
        <div style={{ fontFamily: "'Lora', serif", fontSize: 36, fontWeight: 700, color: "#f0a030", marginBottom: 6 }}>Two Cranks</div>
        <div style={{ fontFamily: "'Josefin Sans', sans-serif", fontSize: 11, color: "#50a878", letterSpacing: "3px", marginBottom: inviter ? 20 : 40 }}>GEAR PLANNER</div>
        {inviter && (
          <div style={{ background: "rgba(40,90,60,0.6)", border: "1px solid rgba(60,180,120,0.35)", borderRadius: 14, padding: "14px 20px", marginBottom: 28, textAlign: "left" }}>
            <div style={{ fontFamily: "'Lora', serif", fontSize: 16, fontWeight: 600, color: "#60d898", marginBottom: 6 }}>
              🤝 You've been invited!
            </div>
            <div style={{ fontFamily: "'Josefin Sans', sans-serif", fontSize: 12, color: "#a0d8b8", lineHeight: 1.5 }}>
              <strong style={{ color: "#f5e8cc" }}>{decodeURIComponent(inviter)}</strong> invited you to Two Cranks — a bikepacking gear planner. Sign in with Google to get started.
            </div>
          </div>
        )}
        <button onClick={handleLogin} disabled={loading}
          style={{ background: "#fff", border: "none", color: "#3a2008", padding: "14px 32px", borderRadius: 30, cursor: "pointer", fontSize: 15, fontWeight: 600, fontFamily: "'Josefin Sans', sans-serif", display: "flex", alignItems: "center", gap: 12, margin: "0 auto", boxShadow: "0 4px 20px rgba(0,0,0,0.3)" }}>
          <svg width="20" height="20" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
          {loading ? "Signing in..." : "Sign in with Google"}
        </button>
        <div style={{ fontFamily: "'Josefin Sans', sans-serif", fontSize: 11, color: "#806040", marginTop: 24, letterSpacing: "0.5px" }}>
          Built for riders. Your kit, your way.
        </div>
      </div>
    </div>
  );
}

// ── Compare View ──────────────────────────────────────────────────────────────
function CompareView({ sharedKit, myItems, onDismiss }) {
  const [open, setOpen] = useState(false);
  const myNames = new Set(myItems.map(i => i.name.toLowerCase().trim()));
  const sharedNames = new Set(sharedKit.items.map(i => i.name.toLowerCase().trim()));
  const duplicates = new Set([...myNames].filter(n => sharedNames.has(n)));
  const sharedTotal = sharedKit.items.reduce((s, i) => s + toOz(i.lbs, i.oz), 0);
  const myTotal = myItems.reduce((s, i) => s + toOz(i.lbs, i.oz), 0);

  const KitCol = ({ items, label, total }) => (
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontFamily: "'Lora', serif", fontSize: 16, fontWeight: 700, color: "#f0a030", marginBottom: 4 }}>{label}</div>
      <div style={{ fontFamily: "'Josefin Sans', sans-serif", fontSize: 10, color: "#50a878", marginBottom: 12 }}><WeightDisplay oz={total} /> · {items.length} items</div>
      {STORAGE_ZONES.map(zone => {
        const zoneItems = items.filter(i => i.zone === zone);
        if (!zoneItems.length) return null;
        const col = STORAGE_COLORS[zone];
        return (
          <div key={zone} style={{ marginBottom: 8 }}>
            <div style={{ background: col.bg, padding: "4px 10px", borderRadius: "6px 6px 0 0", fontFamily: "'Josefin Sans', sans-serif", fontSize: 10, color: col.text }}>{zone}</div>
            <div style={{ background: "rgba(40,20,8,0.6)", borderRadius: "0 0 6px 6px", border: `1px solid ${col.bg}`, borderTop: "none" }}>
              {zoneItems.map((item, idx) => {
                const isDupe = duplicates.has(item.name.toLowerCase().trim());
                return (
                  <div key={idx} style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 10px", borderBottom: idx < zoneItems.length - 1 ? "1px solid rgba(160,80,20,0.15)" : "none", background: isDupe ? "rgba(240,180,20,0.1)" : "transparent" }}>
                    {isDupe && <span style={{ fontSize: 11 }}>⚠️</span>}
                    <span style={{ flex: 1, fontFamily: "'Lora', serif", fontSize: 12, color: isDupe ? "#f0c030" : "#f0e0c0" }}>{item.name}</span>
                    <span style={{ fontFamily: "'Josefin Sans', sans-serif", fontSize: 11, color: col.text }}><WeightDisplay oz={toOz(item.lbs, item.oz)} /></span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );

  return (
    <div style={{ background: "rgba(30,70,50,0.7)", border: "2px solid #3aaa78", borderRadius: 16, padding: "18px 20px", marginBottom: 20 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10, marginBottom: duplicates.size > 0 ? 12 : 0 }}>
        <div>
          <div style={{ fontFamily: "'Lora', serif", fontSize: 18, fontWeight: 700, color: "#50d898" }}>🤝 Comparing Kits</div>
          <div style={{ fontFamily: "'Josefin Sans', sans-serif", fontSize: 10, color: "#40a870", letterSpacing: "1px", marginTop: 2 }}>
            {duplicates.size > 0 ? `⚠️ ${duplicates.size} duplicate${duplicates.size !== 1 ? "s" : ""} found` : "✓ No duplicates — well coordinated!"}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => setOpen(!open)} style={{ ...S.btnPrimary, padding: "7px 14px", fontSize: 11 }}>{open ? "Hide" : "See full comparison"}</button>
          <button onClick={onDismiss} style={{ background: "rgba(80,20,10,0.7)", border: "1px solid #8a3020", color: "#e07050", padding: "7px 12px", borderRadius: 10, cursor: "pointer", fontSize: 11, fontFamily: "'Josefin Sans', sans-serif" }}>Dismiss</button>
        </div>
      </div>
      {duplicates.size > 0 && (
        <div style={{ background: "rgba(240,180,20,0.08)", border: "1px solid rgba(240,180,20,0.25)", borderRadius: 10, padding: "10px 14px", marginBottom: open ? 14 : 0 }}>
          <div style={{ fontFamily: "'Josefin Sans', sans-serif", fontSize: 9, color: "#d0a020", letterSpacing: "2px", marginBottom: 8 }}>DUPLICATES — DECIDE WHO CARRIES THESE</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {[...duplicates].map(n => <span key={n} style={{ background: "rgba(240,180,20,0.15)", border: "1px solid rgba(240,180,20,0.3)", color: "#f0c030", padding: "3px 10px", borderRadius: 20, fontFamily: "'Lora', serif", fontSize: 12 }}>{n}</span>)}
          </div>
        </div>
      )}
      {open && (
        <div style={{ display: "flex", gap: 14, marginTop: 14 }}>
          <KitCol items={myItems} label="Your Kit" total={myTotal} />
          <div style={{ width: 1, background: "rgba(60,180,120,0.2)", flexShrink: 0 }} />
          <KitCol items={sharedKit.items} label={sharedKit.name || "Their Kit"} total={sharedTotal} />
        </div>
      )}
    </div>
  );
}

// ── Share Modal ───────────────────────────────────────────────────────────────
function ShareModal({ items, currentListName, onClose }) {
  const [copied, setCopied] = useState(false);
  const [label, setLabel] = useState(currentListName || "My Kit");
  const encoded = encodeKit(label, items);
  const url = encoded ? `${window.location.origin}${window.location.pathname}?kit=${encoded}` : "";
  const copy = () => {
    if (!url) return;
    navigator.clipboard.writeText(url).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2500); });
  };
  return (
    <div style={S.modalOverlay} onClick={onClose}>
      <div style={S.modalBox} onClick={e => e.stopPropagation()}>
        <div style={S.modalTitle}>🔗 Share Your Kit</div>
        <div style={S.modalSub}>Send this link to your riding partner. They'll see your kit alongside theirs with duplicates flagged.</div>
        <div style={S.label}>YOUR KIT LABEL</div>
        <input value={label} onChange={e => setLabel(e.target.value)} placeholder="e.g. Jordan's Kit" style={{ ...S.input, marginBottom: 16 }} />
        <div style={S.label}>SHAREABLE LINK</div>
        <div style={{ background: "rgba(20,50,35,0.7)", border: "1px solid #2a6848", borderRadius: 10, padding: "10px 14px", marginBottom: 16, wordBreak: "break-all", fontFamily: "'Josefin Sans', sans-serif", fontSize: 11, color: "#40c878", lineHeight: 1.5, maxHeight: 70, overflow: "auto" }}>
          {url || "Add items to your kit first"}
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={copy} disabled={!url || !items.length} style={{ ...S.btnPrimary, flex: 1, background: copied ? "#1a5838" : "#3a7858" }}>{copied ? "✓ Copied!" : "Copy Link"}</button>
          <button onClick={onClose} style={S.btnGhost}>Done</button>
        </div>
      </div>
    </div>
  );
}

// ── AI Check Modal ────────────────────────────────────────────────────────────
function AICheckModal({ items, onAddItem, onClose }) {
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [added, setAdded] = useState(new Set());

  useEffect(() => {
    async function run() {
      try {
        const res = await fetch("/api/ai", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "checkKit", kit: items }),
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        setResult(data);
      } catch (e) {
        setError("Couldn't analyze your kit right now. Try again.");
      } finally {
        setLoading(false);
      }
    }
    run();
  }, []);

  const handleAdd = (suggestion) => {
    onAddItem({
      name: suggestion.name,
      category: suggestion.category,
      zone: "Other",
      lbs: "",
      oz: "",
      essential: true,
      notes: suggestion.reason,
    });
    setAdded(prev => new Set([...prev, suggestion.name]));
  };

  return (
    <div style={S.modalOverlay} onClick={onClose}>
      <div style={{ ...S.modalBox, width: 480 }} onClick={e => e.stopPropagation()}>
        <div style={S.modalTitle}>🔍 Kit Check</div>
        <div style={S.modalSub}>AI analysis of your kit against bikepacking best practices</div>
        {loading && (
          <div style={{ textAlign: "center", padding: "30px 0", fontFamily: "'Josefin Sans', sans-serif", fontSize: 13, color: "#50a878" }}>
            <div style={{ fontSize: 28, marginBottom: 12 }}>⚙️</div>
            Analyzing your kit...
          </div>
        )}
        {error && <div style={{ color: "#e07050", fontFamily: "'Josefin Sans', sans-serif", fontSize: 13, padding: "20px 0" }}>{error}</div>}
        {result && (
          <>
            <div style={{ background: "rgba(40,80,55,0.5)", border: "1px solid rgba(60,180,120,0.25)", borderRadius: 10, padding: "12px 16px", marginBottom: 18, fontFamily: "'Lora', serif", fontStyle: "italic", fontSize: 14, color: "#c0e8d0", lineHeight: 1.5 }}>
              {result.notes}
            </div>
            {result.missing?.length === 0 ? (
              <div style={{ textAlign: "center", padding: "20px 0", fontFamily: "'Lora', serif", fontStyle: "italic", color: "#50a878", fontSize: 15 }}>
                ✓ Your kit looks complete — nothing obvious missing!
              </div>
            ) : (
              <>
                <div style={{ ...S.label, marginBottom: 12 }}>ITEMS YOU MIGHT BE MISSING</div>
                {result.missing?.map((s, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "12px 0", borderBottom: i < result.missing.length - 1 ? "1px solid rgba(160,80,20,0.2)" : "none" }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: "'Lora', serif", fontSize: 14, color: "#f5e8cc", marginBottom: 3 }}>{s.name}</div>
                      <div style={{ fontFamily: "'Josefin Sans', sans-serif", fontSize: 11, color: "#80a870" }}>{s.reason}</div>
                      <div style={{ fontFamily: "'Josefin Sans', sans-serif", fontSize: 10, color: "#c09050", marginTop: 2 }}>{s.category}</div>
                    </div>
                    <button onClick={() => handleAdd(s)} disabled={added.has(s.name)}
                      style={{ ...S.btnPrimary, padding: "6px 14px", fontSize: 11, flexShrink: 0, background: added.has(s.name) ? "#1a4030" : "#3a7858", color: added.has(s.name) ? "#50a878" : "#b0f0d0" }}>
                      {added.has(s.name) ? "✓ Added" : "+ Add"}
                    </button>
                  </div>
                ))}
              </>
            )}
            <button onClick={onClose} style={{ ...S.btnGhost, width: "100%", marginTop: 20, textAlign: "center" }}>Done</button>
          </>
        )}
      </div>
    </div>
  );
}

// ── Friends Modal ─────────────────────────────────────────────────────────────
function FriendsModal({ user, onClose }) {
  const [tab, setTab] = useState("connect"); // "connect" | "invite"
  const [friends, setFriends] = useState([]);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [msg, setMsg] = useState(null);
  const [inviteCopied, setInviteCopied] = useState(false);

  const inviteUrl = `${window.location.origin}?invite=${encodeURIComponent(user.user_metadata?.full_name || user.email)}`;

  useEffect(() => { fetchFriends(); }, []);

  async function fetchFriends() {
    setLoading(true);
    const { data } = await supabase.from("friends").select("*").eq("user_id", user.id);
    setFriends(data || []);
    setLoading(false);
  }

  async function addFriend() {
    if (!email.trim()) return;
    setAdding(true);
    setMsg(null);
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, email, full_name")
      .eq("email", email.trim().toLowerCase())
      .single();
    if (!profile) {
      setMsg({ type: "error", text: "No user found with that email. Send them an invite link first!" });
      setAdding(false);
      return;
    }
    if (profile.id === user.id) {
      setMsg({ type: "error", text: "You can't add yourself!" });
      setAdding(false);
      return;
    }
    const { error } = await supabase.from("friends").upsert({
      user_id: user.id,
      friend_id: profile.id,
      friend_email: profile.email,
      friend_name: profile.full_name || profile.email,
    });
    if (error) {
      setMsg({ type: "error", text: "Something went wrong. Try again." });
    } else {
      setMsg({ type: "success", text: `${profile.full_name || profile.email} added!` });
      setEmail("");
      fetchFriends();
    }
    setAdding(false);
  }

  async function removeFriend(id) {
    await supabase.from("friends").delete().eq("id", id);
    fetchFriends();
  }

  function copyInvite() {
    navigator.clipboard.writeText(inviteUrl).then(() => {
      setInviteCopied(true);
      setTimeout(() => setInviteCopied(false), 2500);
    });
  }

  const TabBtn = ({ id, label }) => (
    <button onClick={() => { setTab(id); setMsg(null); }}
      style={{ flex: 1, background: tab === id ? "rgba(60,180,120,0.2)" : "transparent", border: "none", borderBottom: `2px solid ${tab === id ? "#3aaa78" : "transparent"}`, color: tab === id ? "#50d898" : "#806040", padding: "10px", cursor: "pointer", fontFamily: "'Josefin Sans', sans-serif", fontSize: 12, fontWeight: tab === id ? 600 : 400, letterSpacing: "0.5px", transition: "all 0.15s" }}>
      {label}
    </button>
  );

  return (
    <div style={S.modalOverlay} onClick={onClose}>
      <div style={S.modalBox} onClick={e => e.stopPropagation()}>
        <div style={S.modalTitle}>👥 Riding Partners</div>

        {/* Tabs */}
        <div style={{ display: "flex", borderBottom: "1px solid rgba(160,80,20,0.25)", marginBottom: 20, marginTop: 4 }}>
          <TabBtn id="connect" label="Connect a Friend" />
          <TabBtn id="invite" label="Invite Someone" />
        </div>

        {tab === "connect" && (
          <>
            <div style={S.label}>ADD BY EMAIL</div>
            <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
              <input value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === "Enter" && addFriend()}
                placeholder="dalton@email.com" style={{ ...S.input, flex: 1 }} />
              <button onClick={addFriend} disabled={adding} style={{ ...S.btnPrimary, flexShrink: 0 }}>Add</button>
            </div>
            <div style={{ fontFamily: "'Josefin Sans', sans-serif", fontSize: 11, color: "#806040", marginBottom: 16, lineHeight: 1.5 }}>
              Your friend needs to have signed into Two Cranks first. If they haven't yet, switch to the <span onClick={() => setTab("invite")} style={{ color: "#50a878", cursor: "pointer", textDecoration: "underline" }}>Invite tab</span> to send them a link.
            </div>
            {msg && <div style={{ fontFamily: "'Josefin Sans', sans-serif", fontSize: 12, color: msg.type === "error" ? "#e07050" : "#50d898", marginBottom: 14 }}>{msg.text}</div>}
            <div style={S.label}>YOUR PARTNERS</div>
            {loading ? <div style={{ color: "#80a060", fontFamily: "'Josefin Sans', sans-serif", fontSize: 13 }}>Loading...</div> :
              friends.length === 0 ? <div style={{ color: "#806040", fontFamily: "'Lora', serif", fontStyle: "italic", fontSize: 13 }}>No riding partners added yet</div> :
                friends.map(f => (
                  <div key={f.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: "1px solid rgba(160,80,20,0.2)" }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: "'Lora', serif", fontSize: 14, color: "#f5e8cc" }}>{f.friend_name}</div>
                      <div style={{ fontFamily: "'Josefin Sans', sans-serif", fontSize: 11, color: "#806040" }}>{f.friend_email}</div>
                    </div>
                    <button onClick={() => removeFriend(f.id)} style={{ background: "rgba(80,20,10,0.7)", border: "1px solid #7a2010", color: "#e06040", padding: "5px 10px", borderRadius: 8, cursor: "pointer", fontSize: 11, fontFamily: "'Josefin Sans', sans-serif" }}>Remove</button>
                  </div>
                ))
            }
          </>
        )}

        {tab === "invite" && (
          <>
            <div style={{ fontFamily: "'Lora', serif", fontStyle: "italic", fontSize: 14, color: "#c0d8b0", lineHeight: 1.6, marginBottom: 20 }}>
              Send this link to anyone you want to ride with. When they open it, they'll see your invitation and can sign in with their Google account to get started.
            </div>
            <div style={S.label}>YOUR INVITE LINK</div>
            <div style={{ background: "rgba(20,50,35,0.7)", border: "1px solid #2a6848", borderRadius: 10, padding: "12px 14px", marginBottom: 14, wordBreak: "break-all", fontFamily: "'Josefin Sans', sans-serif", fontSize: 11, color: "#40c878", lineHeight: 1.6 }}>
              {inviteUrl}
            </div>
            <button onClick={copyInvite}
              style={{ ...S.btnPrimary, width: "100%", textAlign: "center", background: inviteCopied ? "#1a5838" : "#3a7858", transition: "background 0.2s", marginBottom: 16 }}>
              {inviteCopied ? "✓ Copied to clipboard!" : "Copy Invite Link"}
            </button>
            <div style={{ fontFamily: "'Josefin Sans', sans-serif", fontSize: 11, color: "#806040", lineHeight: 1.5 }}>
              Once they've signed in, come back to the <span onClick={() => setTab("connect")} style={{ color: "#50a878", cursor: "pointer", textDecoration: "underline" }}>Connect tab</span> and add them by their email address.
            </div>
          </>
        )}

        <button onClick={onClose} style={{ ...S.btnGhost, width: "100%", marginTop: 20, textAlign: "center" }}>Done</button>
      </div>
    </div>
  );
}

// ── Share Item Modal ──────────────────────────────────────────────────────────
function ShareItemModal({ item, listName, user, onClose }) {
  const [friends, setFriends] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    supabase.from("friends").select("*").eq("user_id", user.id).then(({ data }) => {
      setFriends(data || []);
      setLoading(false);
    });
  }, []);

  async function sendShare() {
    if (!selected) return;
    const friend = friends.find(f => f.friend_id === selected);
    await supabase.from("shared_items").insert({
      from_user_id: user.id,
      from_user_name: user.user_metadata?.full_name || user.email,
      to_user_id: selected,
      item_name: item.name,
      item_lbs: item.lbs,
      item_oz: item.oz,
      item_category: item.category,
      item_zone: item.zone,
      item_essential: item.essential,
      item_notes: item.notes || "",
      from_list_name: listName || "My Kit",
      status: "pending",
    });
    setSent(true);
  }

  if (sent) return (
    <div style={S.modalOverlay} onClick={onClose}>
      <div style={{ ...S.modalBox, textAlign: "center" }} onClick={e => e.stopPropagation()}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
        <div style={{ fontFamily: "'Lora', serif", fontSize: 20, fontWeight: 700, color: "#50d898", marginBottom: 8 }}>Shared!</div>
        <div style={{ fontFamily: "'Josefin Sans', sans-serif", fontSize: 12, color: "#80a870", marginBottom: 24 }}>They'll see it next time they open the app.</div>
        <button onClick={onClose} style={{ ...S.btnPrimary }}>Done</button>
      </div>
    </div>
  );

  return (
    <div style={S.modalOverlay} onClick={onClose}>
      <div style={S.modalBox} onClick={e => e.stopPropagation()}>
        <div style={S.modalTitle}>🤝 Share Item</div>
        <div style={S.modalSub}>Share <strong style={{ color: "#f5e8cc" }}>{item.name}</strong> from your <strong style={{ color: "#f5e8cc" }}>{listName || "kit"}</strong></div>
        <div style={S.label}>SEND TO</div>
        {loading ? <div style={{ color: "#80a060", fontFamily: "'Josefin Sans', sans-serif", fontSize: 13 }}>Loading partners...</div> :
          friends.length === 0 ? (
            <div style={{ fontFamily: "'Lora', serif", fontStyle: "italic", color: "#806040", fontSize: 13 }}>No friends added yet. Add one in the Friends section first.</div>
          ) : (
            friends.map(f => (
              <div key={f.id} onClick={() => setSelected(f.friend_id)}
                style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px", borderRadius: 10, marginBottom: 8, cursor: "pointer", background: selected === f.friend_id ? "rgba(60,180,120,0.2)" : "rgba(80,40,10,0.4)", border: `1px solid ${selected === f.friend_id ? "#3aaa78" : "rgba(160,80,20,0.3)"}`, transition: "all 0.15s" }}>
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: selected === f.friend_id ? "#3aaa78" : "#6a4020", flexShrink: 0 }} />
                <div>
                  <div style={{ fontFamily: "'Lora', serif", fontSize: 14, color: "#f5e8cc" }}>{f.friend_name}</div>
                  <div style={{ fontFamily: "'Josefin Sans', sans-serif", fontSize: 11, color: "#806040" }}>{f.friend_email}</div>
                </div>
              </div>
            ))
          )
        }
        <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
          <button onClick={sendShare} disabled={!selected} style={{ ...S.btnPrimary, flex: 1, opacity: selected ? 1 : 0.5 }}>Send Share Request</button>
          <button onClick={onClose} style={S.btnGhost}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

// ── Incoming Shared Items Notification ────────────────────────────────────────
function SharedItemsInbox({ user, lists, onAccepted }) {
  const [pending, setPending] = useState([]);
  const [open, setOpen] = useState(false);
  const [selectedList, setSelectedList] = useState({});

  useEffect(() => { fetchPending(); }, []);

  async function fetchPending() {
    const { data } = await supabase
      .from("shared_items")
      .select("*")
      .eq("to_user_id", user.id)
      .eq("status", "pending");
    setPending(data || []);
    if (data?.length > 0) setOpen(true);
  }

  async function accept(share) {
    const listId = selectedList[share.id];
    if (!listId) return;
    await supabase.from("items").insert({
      list_id: listId,
      user_id: user.id,
      name: share.item_name,
      lbs: share.item_lbs,
      oz: share.item_oz,
      category: share.item_category,
      zone: share.item_zone,
      essential: share.item_essential,
      notes: share.item_notes ? `Shared by ${share.from_user_name}: ${share.item_notes}` : `Shared by ${share.from_user_name}`,
    });
    await supabase.from("shared_items").update({ status: "accepted" }).eq("id", share.id);
    setPending(prev => prev.filter(p => p.id !== share.id));
    onAccepted();
  }

  async function decline(id) {
    await supabase.from("shared_items").update({ status: "declined" }).eq("id", id);
    setPending(prev => prev.filter(p => p.id !== id));
  }

  if (pending.length === 0) return null;

  return (
    <div style={{ background: "rgba(30,70,50,0.75)", border: "2px solid #3aaa78", borderRadius: 16, padding: "16px 20px", marginBottom: 20 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: open ? 14 : 0 }}>
        <div style={{ fontFamily: "'Lora', serif", fontSize: 17, fontWeight: 700, color: "#50d898" }}>
          📬 {pending.length} incoming item{pending.length !== 1 ? "s" : ""}
        </div>
        <button onClick={() => setOpen(!open)} style={{ ...S.btnPrimary, padding: "5px 12px", fontSize: 11 }}>{open ? "Hide" : "Show"}</button>
      </div>
      {open && pending.map(share => (
        <div key={share.id} style={{ background: "rgba(20,50,35,0.6)", borderRadius: 10, padding: "14px", marginBottom: 10, border: "1px solid rgba(60,180,120,0.2)" }}>
          <div style={{ fontFamily: "'Lora', serif", fontSize: 14, color: "#f5e8cc", marginBottom: 4 }}>
            <strong style={{ color: "#f0a030" }}>{share.from_user_name}</strong> wants to share <strong>{share.item_name}</strong>
          </div>
          <div style={{ fontFamily: "'Josefin Sans', sans-serif", fontSize: 11, color: "#60b888", marginBottom: 12 }}>
            From their <em>"{share.from_list_name}"</em> kit · {share.item_category} · {share.item_zone}
          </div>
          <div style={S.label}>ADD TO WHICH LIST?</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <select value={selectedList[share.id] || ""} onChange={e => setSelectedList(prev => ({ ...prev, [share.id]: e.target.value }))}
              style={{ ...S.select, flex: 1, fontSize: 12 }}>
              <option value="">Choose a list...</option>
              {lists.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
            <button onClick={() => accept(share)} disabled={!selectedList[share.id]} style={{ ...S.btnPrimary, padding: "8px 14px", fontSize: 11, opacity: selectedList[share.id] ? 1 : 0.5 }}>Accept</button>
            <button onClick={() => decline(share.id)} style={{ background: "rgba(80,20,10,0.7)", border: "1px solid #7a2010", color: "#e06040", padding: "8px 12px", borderRadius: 10, cursor: "pointer", fontSize: 11, fontFamily: "'Josefin Sans', sans-serif" }}>Decline</button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────────────────────────
export default function App() {
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Auth state
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setAuthLoading(false);
      if (session) upsertProfile(session.user);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setSession(session);
      if (session) upsertProfile(session.user);
    });
    return () => subscription.unsubscribe();
  }, []);

  async function upsertProfile(user) {
    await supabase.from("profiles").upsert({
      id: user.id,
      email: user.email,
      full_name: user.user_metadata?.full_name || "",
      avatar_url: user.user_metadata?.avatar_url || "",
    });
  }

  if (authLoading) return (
    <div style={{ ...S.page, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ fontFamily: "'Josefin Sans', sans-serif", fontSize: 14, color: "#50a878" }}>Loading...</div>
    </div>
  );
  if (!session) return <LoginScreen />;
  return <MainApp user={session.user} />;
}

// ── Pack Mode View ────────────────────────────────────────────────────────────
function PackModeView({ items, allZones, checkedItems, currentList, getZoneColor, onToggle, onRequestReset, onExit }) {
  const packGroups = allZones.map(zone => ({
    zone,
    items: items.filter(i => i.zone === zone),
  })).filter(g => g.items.length > 0);
  const total = items.length;
  const checked = items.filter(i => checkedItems.has(i.id)).length;
  const pct = total > 0 ? Math.round((checked / total) * 100) : 0;

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 10 }}>
        <div>
          <div style={{ fontFamily: "'Lora', serif", fontSize: 22, fontWeight: 700, color: "#c0a0f0" }}>🎒 Pack Mode</div>
          <div style={{ fontFamily: "'Josefin Sans', sans-serif", fontSize: 11, color: "#806040", marginTop: 3, letterSpacing: "0.5px" }}>
            {currentList?.name} · {checked} of {total} items packed
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={onRequestReset} style={{ background: "rgba(80,20,10,0.6)", border: "1px solid rgba(200,80,40,0.4)", color: "#e08060", padding: "7px 14px", borderRadius: 20, cursor: "pointer", fontSize: 11, fontFamily: "'Josefin Sans', sans-serif" }}>Reset</button>
          <button onClick={onExit} style={{ background: "#3a7858", border: "none", color: "#b0f0d0", padding: "10px 22px", borderRadius: 20, cursor: "pointer", fontSize: 13, fontWeight: 600, fontFamily: "'Josefin Sans', sans-serif" }}>← Back to Kit</button>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ background: "rgba(255,238,200,0.1)", borderRadius: 16, padding: "16px 20px", marginBottom: 20, border: "1px solid rgba(240,195,100,0.2)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <span style={{ fontFamily: "'Josefin Sans', sans-serif", fontSize: 10, color: "#50a878", letterSpacing: "2px" }}>OVERALL PROGRESS</span>
          <span style={{ fontFamily: "'Lora', serif", fontSize: 18, fontWeight: 700, color: pct === 100 ? "#50d898" : "#f0a030" }}>{pct}%</span>
        </div>
        <div style={{ background: "rgba(80,50,20,0.5)", borderRadius: 20, height: 10, overflow: "hidden" }}>
          <div style={{ width: `${pct}%`, height: "100%", background: pct === 100 ? "linear-gradient(90deg, #2a9868, #50d898)" : "linear-gradient(90deg, #c07820, #f0a030)", borderRadius: 20, transition: "width 0.4s ease" }} />
        </div>
        {pct === 100 && (
          <div style={{ fontFamily: "'Lora', serif", fontStyle: "italic", fontSize: 14, color: "#50d898", marginTop: 10, textAlign: "center" }}>
            ✓ All packed — time to ride! 🚲
          </div>
        )}
      </div>

      {/* Bags */}
      {packGroups.map(({ zone, items: zoneItems }) => {
        const col = getZoneColor(zone);
        const zoneChecked = zoneItems.filter(i => checkedItems.has(i.id)).length;
        const zoneDone = zoneChecked === zoneItems.length;
        return (
          <div key={zone} style={{ marginBottom: 14 }}>
            <div style={{ background: zoneDone ? "rgba(30,80,50,0.9)" : col.bg, borderRadius: "14px 14px 0 0", padding: "12px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", transition: "background 0.3s" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 9, height: 9, borderRadius: "50%", background: zoneDone ? "#50d898" : col.dot }} />
                <span style={{ fontFamily: "'Josefin Sans', sans-serif", fontSize: 13, fontWeight: 600, color: zoneDone ? "#50d898" : col.text }}>{zone}</span>
              </div>
              <span style={{ fontFamily: "'Josefin Sans', sans-serif", fontSize: 11, color: zoneDone ? "#50d898" : col.text, opacity: 0.8 }}>
                {zoneDone ? "✓ Done" : `${zoneChecked}/${zoneItems.length}`}
              </span>
            </div>
            <div style={{ background: "rgba(20,12,4,0.75)", borderRadius: "0 0 14px 14px", border: `1px solid ${col.bg}`, borderTop: "none", overflow: "hidden" }}>
              {zoneItems.map((item, idx) => {
                const isChecked = checkedItems.has(item.id);
                return (
                  <div key={item.id} onClick={() => onToggle(item.id)}
                    style={{ display: "flex", alignItems: "center", gap: 12, padding: "13px 18px", borderBottom: idx < zoneItems.length - 1 ? "1px solid rgba(160,80,20,0.12)" : "none", cursor: "pointer", background: isChecked ? "rgba(30,70,45,0.5)" : "transparent", transition: "background 0.2s" }}>
                    <div style={{ width: 22, height: 22, borderRadius: 6, border: `2px solid ${isChecked ? "#3aaa78" : "rgba(200,150,60,0.4)"}`, background: isChecked ? "#3aaa78" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all 0.15s" }}>
                      {isChecked && <span style={{ color: "#fff", fontSize: 13, lineHeight: 1 }}>✓</span>}
                    </div>
                    <div style={{ flex: 1 }}>
                      <span style={{ fontFamily: "'Lora', serif", fontSize: 14, color: isChecked ? "#60a878" : "#f5e8cc", textDecoration: isChecked ? "line-through" : "none", transition: "all 0.2s" }}>{item.name}</span>
                      {item.notes ? <div style={{ fontFamily: "'Josefin Sans', sans-serif", fontSize: 11, color: "#806040", marginTop: 2, fontStyle: "italic" }}>{item.notes}</div> : null}
                    </div>
                    <span style={{ fontFamily: "'Josefin Sans', sans-serif", fontSize: 12, color: isChecked ? "#3aaa78" : col.text, opacity: isChecked ? 0.6 : 1 }}>
                      <WeightDisplay oz={toOz(item.lbs, item.oz)} />
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Main App (authenticated) ──────────────────────────────────────────────────
function MainApp({ user }) {
  const [lists, setLists] = useState([]);
  const [currentList, setCurrentList] = useState(null);
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState(null);
  const [filterZone, setFilterZone] = useState("All");
  const [filterEssential, setFilterEssential] = useState("All");
  const [collapsedZones, setCollapsedZones] = useState({});
  const [toast, setToast] = useState(null);
  const [sharedKit, setSharedKit] = useState(null);
  const [weightLoading, setWeightLoading] = useState(false);
  const [customZones, setCustomZones] = useState([]);
  const [showCustomZoneInput, setShowCustomZoneInput] = useState(false);
  const [customZoneInput, setCustomZoneInput] = useState("");
  const [packMode, setPackMode] = useState(false);
  const [checkedItems, setCheckedItems] = useState(new Set());
  const [confirmDelete, setConfirmDelete] = useState(null); // { type: "item"|"list", id, name }
  const [confirmReset, setConfirmReset] = useState(false);

  // Modals
  const [saveOpen, setSaveOpen] = useState(false);
  const [loadOpen, setLoadOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [aiCheckOpen, setAiCheckOpen] = useState(false);
  const [friendsOpen, setFriendsOpen] = useState(false);
  const [shareItemTarget, setShareItemTarget] = useState(null);

  const [newListName, setNewListName] = useState("");

  const notify = (msg) => { setToast(msg); setTimeout(() => setToast(null), 2800); };

  // Load shared kit from URL
  useEffect(() => {
    const kit = getSharedKitFromURL();
    if (kit) setSharedKit(kit);
  }, []);

  // Fetch lists on mount
  useEffect(() => { fetchLists(); fetchCustomZones(); }, []);

  // Fetch items when currentList changes
  useEffect(() => {
    if (currentList) { fetchItems(currentList.id); fetchPackingSession(currentList.id); }
    else { setItems([]); setCheckedItems(new Set()); }
  }, [currentList]);

  async function fetchLists() {
    const { data } = await supabase.from("lists").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
    setLists(data || []);
  }

  async function fetchItems(listId) {
    const { data } = await supabase.from("items").select("*").eq("list_id", listId).order("created_at", { ascending: true });
    setItems(data || []);
  }

  async function fetchCustomZones() {
    const { data } = await supabase.from("custom_zones").select("*").eq("user_id", user.id).order("created_at", { ascending: true });
    setCustomZones((data || []).map(r => r.zone_name));
  }

  async function addCustomZone() {
    const name = customZoneInput.trim();
    if (!name) return;
    const allZoneNames = [...STORAGE_ZONES, ...customZones];
    if (allZoneNames.map(z => z.toLowerCase()).includes(name.toLowerCase())) {
      notify("That bag already exists");
      return;
    }
    const { error } = await supabase.from("custom_zones").insert({ user_id: user.id, zone_name: name });
    if (error) {
      console.error("Custom zone insert error:", error);
      notify(`Error saving bag: ${error.message}`);
      return;
    }
    setCustomZones(prev => [...prev, name]);
    setForm(f => ({ ...f, zone: name }));
    setShowCustomZoneInput(false);
    setCustomZoneInput("");
    notify(`"${name}" added ✓`);
  }

  async function removeCustomZone(zoneName) {
    await supabase.from("custom_zones").delete().eq("user_id", user.id).eq("zone_name", zoneName);
    setCustomZones(prev => prev.filter(z => z !== zoneName));
    if (form.zone === zoneName) setForm(f => ({ ...f, zone: STORAGE_ZONES[0] }));
    if (filterZone === zoneName) setFilterZone("All");
  }

  async function fetchPackingSession(listId) {
    const { data } = await supabase
      .from("packing_sessions")
      .select("checked_item_ids")
      .eq("user_id", user.id)
      .eq("list_id", listId)
      .single();
    if (data?.checked_item_ids) {
      setCheckedItems(new Set(data.checked_item_ids));
    } else {
      setCheckedItems(new Set());
    }
  }

  async function savePackingSession(newChecked) {
    if (!currentList) return;
    await supabase.from("packing_sessions").upsert({
      user_id: user.id,
      list_id: currentList.id,
      checked_item_ids: [...newChecked],
      updated_at: new Date().toISOString(),
    });
  }

  function togglePackItem(itemId) {
    setCheckedItems(prev => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      savePackingSession(next);
      return next;
    });
  }

  async function resetPackingSession() {
    setCheckedItems(new Set());
    if (currentList) {
      await supabase.from("packing_sessions").upsert({
        user_id: user.id,
        list_id: currentList.id,
        checked_item_ids: [],
        updated_at: new Date().toISOString(),
      });
    }
    notify("Packing list reset ✓");
  }

  async function saveList() {
    if (!newListName.trim()) return;
    const { data, error } = await supabase.from("lists").insert({ user_id: user.id, name: newListName }).select().single();
    if (!error && data) {
      // Save all current items to new list
      if (items.length > 0) {
        await supabase.from("items").insert(items.map(i => ({ ...i, id: undefined, list_id: data.id, user_id: user.id, created_at: undefined })));
      }
      await fetchLists();
      setCurrentList(data);
      setSaveOpen(false);
      setNewListName("");
      notify(`"${newListName}" saved ✓`);
    }
  }

  async function duplicateList() {
    if (!currentList) return;
    const newName = `${currentList.name} (copy)`;
    const { data: newList } = await supabase.from("lists").insert({ user_id: user.id, name: newName }).select().single();
    if (newList && items.length > 0) {
      await supabase.from("items").insert(items.map(i => ({ ...i, id: undefined, list_id: newList.id, user_id: user.id, created_at: undefined })));
    }
    await fetchLists();
    setCurrentList(newList);
    notify(`"${newName}" created ✓`);
  }

  async function deleteList(listId) {
    await supabase.from("lists").delete().eq("id", listId);
    if (currentList?.id === listId) { setCurrentList(null); setItems([]); }
    fetchLists();
    notify("List deleted");
  }

  async function loadList(list) {
    setCurrentList(list);
    setLoadOpen(false);
    notify(`Loaded "${list.name}"`);
  }

  async function handleSubmit() {
    if (!form.name.trim()) return;
    const formSnapshot = { ...form }; // capture before any async state changes
    if (!currentList) {
      const { data: newList, error } = await supabase
        .from("lists")
        .insert({ user_id: user.id, name: "My Kit" })
        .select()
        .single();
      if (newList && !error) {
        await fetchLists();
        setCurrentList(newList);
        await addItemToList(newList.id, formSnapshot);
      }
    } else {
      await addItemToList(currentList.id, formSnapshot);
    }
    setForm(emptyForm);
    setEditId(null);
  }

  async function addItemToList(listId, formData) {
    const data = formData || form;
    const itemData = {
      list_id: listId,
      user_id: user.id,
      name: data.name,
      lbs: parseFloat(data.lbs) || 0,
      oz: parseFloat(data.oz) || 0,
      category: data.category,
      zone: data.zone,
      essential: data.essential,
      notes: data.notes || "",
    };
    if (editId) {
      const { error } = await supabase.from("items").update(itemData).eq("id", editId);
      if (error) { console.error("Item update error:", error); notify(`Error updating: ${error.message}`); return; }
    } else {
      const { error } = await supabase.from("items").insert(itemData);
      if (error) { console.error("Item insert error:", error); notify(`Error adding: ${error.message}`); return; }
    }
    await fetchItems(listId);
  }

  async function deleteItem(id) {
    await supabase.from("items").delete().eq("id", id);
    setItems(prev => prev.filter(i => i.id !== id));
  }

  function editItem(item) {
    setForm({ name: item.name, lbs: item.lbs || "", oz: item.oz || "", category: item.category, zone: item.zone, essential: item.essential, notes: item.notes || "" });
    setEditId(item.id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function lookupWeight() {
    if (!form.name.trim()) return;
    setWeightLoading(true);
    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "lookupWeight", itemName: form.name }),
      });
      const data = await res.json();
      if (data.found) {
        setForm(f => ({ ...f, lbs: data.lbs || "", oz: data.oz || "" }));
        notify(`Weight found: ${data.note}`);
      } else {
        notify(`Couldn't find weight: ${data.note}`);
      }
    } catch {
      notify("Weight lookup failed. Try again.");
    }
    setWeightLoading(false);
  }

  function addSuggestedItem(suggestion) {
    setForm({ name: suggestion.name, category: suggestion.category, zone: suggestion.zone || "Other", lbs: "", oz: "", essential: suggestion.essential ?? true, notes: suggestion.notes || "" });
    setAiCheckOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
    notify(`"${suggestion.name}" loaded into form — add weight and hit Add Item`);
  }

  const allZones = [...STORAGE_ZONES, ...customZones];

  const getZoneColor = (zone) => STORAGE_COLORS[zone] || { bg: "#4a4030", text: "#e8d898", dot: "#b09050" };

  const totalOz = items.reduce((s, i) => s + toOz(i.lbs, i.oz), 0);
  const essentialOz = items.filter(i => i.essential).reduce((s, i) => s + toOz(i.lbs, i.oz), 0);

  const filtered = items.filter(i => {
    if (filterZone !== "All" && i.zone !== filterZone) return false;
    if (filterEssential === "Essential" && !i.essential) return false;
    if (filterEssential === "Optional" && i.essential) return false;
    return true;
  });

  const groupedByZone = allZones.map(zone => ({
    zone,
    items: filtered.filter(i => i.zone === zone),
    totalOz: filtered.filter(i => i.zone === zone).reduce((s, i) => s + toOz(i.lbs, i.oz), 0),
  })).filter(g => g.items.length > 0);

  const toggleZone = (zone) => setCollapsedZones(z => ({ ...z, [zone]: !z[zone] }));

  return (
    <div style={S.page}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,600;0,700;1,400&family=Josefin+Sans:wght@300;400;600&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-track { background: #2a1808; }
        ::-webkit-scrollbar-thumb { background: #5a8040; border-radius: 10px; }
        input, select, button, textarea { font-family: 'Josefin Sans', sans-serif; }
        input:focus, select:focus, textarea:focus { outline: none; box-shadow: 0 0 0 2px rgba(200,160,60,0.4); border-color: rgba(220,170,80,0.6) !important; }
        input::placeholder, textarea::placeholder { color: rgba(240,210,150,0.45); }
        .item-row { transition: background 0.12s ease; }
        .item-row:hover { background: rgba(80,50,20,0.5) !important; }
        .action-btn { opacity: 0; transition: opacity 0.15s; }
        .item-row:hover .action-btn { opacity: 1; }
        @keyframes fadeUp { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
        @keyframes toastPop { from { opacity:0; transform:translateX(-50%) translateY(8px) scale(0.95); } to { opacity:1; transform:translateX(-50%) translateY(0) scale(1); } }
        .fade-up { animation: fadeUp 0.3s ease both; }
        .pill-btn { cursor:pointer; border:none; font-size:11px; letter-spacing:0.8px; padding:5px 13px; border-radius:20px; font-family:'Josefin Sans',sans-serif; transition:all 0.15s; }
        .pill-btn:hover { filter:brightness(1.1); transform:translateY(-1px); }
        .zone-btn { width:100%; border:none; cursor:pointer; display:flex; align-items:center; justify-content:space-between; border-radius:14px; padding:13px 18px; transition:filter 0.15s; }
        .zone-btn:hover { filter:brightness(1.08); }
        option { background: #2e1a08; color: #f5e0b8; }
        optgroup { background: #2e1a08; color: #f0a030; font-style: normal; font-weight: 600; }
        optgroup { background: #2a1505; color: #f0a030; font-style: normal; font-weight: 600; }
      `}</style>

      {/* Mountain silhouette bg */}
      <svg viewBox="0 0 1440 280" preserveAspectRatio="none" style={{ position: "fixed", bottom: 0, left: 0, right: 0, width: "100%", height: 280, opacity: 0.12, pointerEvents: "none", zIndex: 0 }}>
        <path fill="#9a4818" d="M0,280 L160,100 L300,190 L460,40 L600,160 L740,20 L880,140 L1040,60 L1200,170 L1380,80 L1440,110 L1440,280 Z"/>
        <path fill="#2a7050" d="M0,280 L220,170 L380,240 L540,130 L700,220 L860,110 L1020,200 L1200,140 L1440,180 L1440,280 Z" opacity="0.7"/>
      </svg>
      <div style={{ position: "fixed", top: -60, right: -60, width: 260, height: 260, borderRadius: "50%", background: "radial-gradient(circle, rgba(240,150,40,0.2) 0%, transparent 70%)", pointerEvents: "none", zIndex: 0 }} />

      <div style={{ position: "relative", zIndex: 1 }}>
        {/* Header */}
        <div style={{ background: "rgba(50,25,8,0.85)", backdropFilter: "blur(14px)", borderBottom: "1px solid rgba(220,150,60,0.25)", padding: "14px 24px" }}>
          <div style={{ maxWidth: 920, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div>
                  <div style={{ fontFamily: "'Lora', serif", fontSize: 22, fontWeight: 700, color: "#f0a030", lineHeight: 1 }}>Two Cranks</div>
                  <div style={{ fontFamily: "'Josefin Sans', sans-serif", fontSize: 9, color: "#50a878", letterSpacing: "2.5px", marginTop: 2 }}>GEAR PLANNER</div>
                </div>
              </div>
              {currentList && <div style={{ fontFamily: "'Lora', serif", fontStyle: "italic", fontSize: 12, color: "#3aaa78", marginTop: 4 }}>— {currentList.name}</div>}
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
              {/* User avatar */}
              {user.user_metadata?.avatar_url && <img src={user.user_metadata.avatar_url} alt="" style={{ width: 28, height: 28, borderRadius: "50%", border: "2px solid rgba(220,150,60,0.4)" }} />}
              <button onClick={() => setFriendsOpen(true)} style={{ ...S.btnGhost, fontSize: 11 }}>👥 Friends</button>
              {currentList && items.length > 0 && (
                <button onClick={() => setPackMode(true)} style={{ background: "rgba(80,50,15,0.75)", border: "1px solid rgba(200,140,40,0.5)", color: "#e8b84a", padding: "7px 14px", borderRadius: 20, cursor: "pointer", fontSize: 11, fontFamily: "'Josefin Sans', sans-serif", fontWeight: 600 }}>🎒 Pack Mode</button>
              )}
              <button onClick={() => setShareOpen(true)} style={{ background: "rgba(30,80,55,0.8)", border: "1px solid #2a9068", color: "#60d898", padding: "7px 14px", borderRadius: 20, cursor: "pointer", fontSize: 11, fontFamily: "'Josefin Sans', sans-serif", fontWeight: 600 }}>🔗 Share Kit</button>
              <button onClick={() => setLoadOpen(true)} style={S.btnSecondary}>Load</button>
              <button onClick={() => { setNewListName(currentList?.name || ""); setSaveOpen(true); }} style={S.btnPrimary}>Save List</button>
              {currentList && <button onClick={duplicateList} style={{ ...S.btnGhost, fontSize: 11 }} title="Duplicate list">⧉</button>}
              <button onClick={() => { setCurrentList(null); setItems([]); setForm(emptyForm); }} style={{ ...S.btnGhost, fontSize: 11 }}>New</button>
              <button onClick={() => supabase.auth.signOut()} style={{ background: "rgba(100,50,20,0.7)", border: "1px solid rgba(220,140,60,0.4)", color: "#f0c878", padding: "8px 14px", borderRadius: 20, cursor: "pointer", fontSize: 11, fontFamily: "'Josefin Sans', sans-serif" }}>Sign out</button>
            </div>
          </div>
        </div>

        <div style={{ maxWidth: 920, margin: "0 auto", padding: "22px 18px 60px" }}>

          {/* ── Pack Mode ── */}
          {packMode && (
            <PackModeView
              items={items}
              allZones={allZones}
              checkedItems={checkedItems}
              currentList={currentList}
              getZoneColor={getZoneColor}
              onToggle={togglePackItem}
              onRequestReset={() => setConfirmReset(true)}
              onExit={() => setPackMode(false)}
            />
          )}

          {/* ── Main kit content — hidden in pack mode ── */}
          {!packMode && <>

          {/* Shared item inbox */}
          <SharedItemsInbox user={user} lists={lists} onAccepted={() => currentList && fetchItems(currentList.id)} />

          {/* Kit compare banner */}
          {sharedKit && <CompareView sharedKit={sharedKit} myItems={items} onDismiss={() => setSharedKit(null)} />}

          {/* Summary cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px,1fr))", gap: 10, marginBottom: 20 }} className="fade-up">
            {[
              { label: "TOTAL WEIGHT", val: <WeightDisplay oz={totalOz} />, color: "#f5b040" },
              { label: "ESSENTIAL WT.", val: <WeightDisplay oz={essentialOz} />, color: "#50d890" },
              { label: "TOTAL ITEMS", val: items.length, color: "#f09040" },
              { label: "BAGS IN USE", val: new Set(items.map(i => i.zone)).size, color: "#60c898" },
            ].map(({ label, val, color }) => (
              <div key={label} style={{ background: "rgba(255,235,190,0.1)", backdropFilter: "blur(12px)", borderRadius: 16, padding: "14px 16px", border: "1px solid rgba(240,190,100,0.2)", boxShadow: "0 2px 12px rgba(0,0,0,0.15)" }}>
                <div style={S.label}>{label}</div>
                <div style={{ fontFamily: "'Lora', serif", fontSize: 20, fontWeight: 600, color }}>{val}</div>
              </div>
            ))}
          </div>

          {/* Add/Edit form */}
          <div style={{ background: "rgba(255,238,200,0.13)", backdropFilter: "blur(16px)", borderRadius: 20, padding: "20px", marginBottom: 20, border: "1px solid rgba(240,195,100,0.28)", boxShadow: "0 4px 28px rgba(0,0,0,0.18)" }} className="fade-up">
            <div style={{ fontFamily: "'Josefin Sans', sans-serif", fontSize: 10, color: "#50a878", letterSpacing: "2.5px", marginBottom: 14 }}>
              {editId ? "✏️  EDITING ITEM" : "＋  ADD GEAR ITEM"}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
              <input value={form.name} placeholder="Item name (e.g. Sawyer Squeeze)" onChange={e => setForm(f => ({ ...f, name: e.target.value }))} onKeyDown={e => e.key === "Enter" && handleSubmit()} style={{ ...S.input, gridColumn: "1/-1" }} />
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <input value={form.lbs} placeholder="lbs" type="number" min="0" onChange={e => setForm(f => ({ ...f, lbs: e.target.value }))} style={{ ...S.input, flex: 1 }} />
                <input value={form.oz} placeholder="oz" type="number" min="0" step="0.1" onChange={e => setForm(f => ({ ...f, oz: e.target.value }))} style={{ ...S.input, flex: 1 }} />
                <button onClick={lookupWeight} disabled={weightLoading || !form.name.trim()} title="Look up weight with AI"
                  style={{ background: weightLoading ? "rgba(60,80,50,0.6)" : "rgba(40,100,65,0.7)", border: "1px solid rgba(60,180,120,0.4)", color: "#60d898", padding: "10px 12px", borderRadius: 10, cursor: "pointer", fontSize: 18, flexShrink: 0, whiteSpace: "nowrap" }}>
                  {weightLoading ? "⏳" : "⚖️"}
                </button>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <select
                  value={showCustomZoneInput ? "__custom__" : form.zone}
                  onChange={e => {
                    if (e.target.value === "__custom__") {
                      setShowCustomZoneInput(true);
                      setCustomZoneInput("");
                    } else {
                      setShowCustomZoneInput(false);
                      setForm(f => ({ ...f, zone: e.target.value }));
                    }
                  }}
                  style={S.select}>
                  <optgroup label="Standard Bags">
                    {STORAGE_ZONES.map(z => <option key={z} value={z}>{z}</option>)}
                  </optgroup>
                  {customZones.length > 0 && (
                    <optgroup label="Your Custom Bags">
                      {customZones.map(z => <option key={z} value={z}>{z}</option>)}
                    </optgroup>
                  )}
                  <option value="__custom__">＋ Add custom bag...</option>
                </select>
                {showCustomZoneInput && (
                  <div style={{ display: "flex", gap: 6 }}>
                    <input
                      value={customZoneInput}
                      onChange={e => setCustomZoneInput(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter") addCustomZone(); if (e.key === "Escape") { setShowCustomZoneInput(false); setCustomZoneInput(""); } }}
                      placeholder="e.g. Stem Bag, Hip Pack..."
                      autoFocus
                      style={{ ...S.input, flex: 1 }}
                    />
                    <button onClick={addCustomZone} style={{ ...S.btnPrimary, padding: "10px 14px", flexShrink: 0 }}>Add</button>
                    <button onClick={() => { setShowCustomZoneInput(false); setCustomZoneInput(""); }} style={{ ...S.btnGhost, padding: "10px 12px", flexShrink: 0 }}>✕</button>
                  </div>
                )}
                {customZones.length > 0 && !showCustomZoneInput && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                    {customZones.map(z => (
                      <span key={z} style={{ fontFamily: "'Josefin Sans', sans-serif", fontSize: 10, color: "#c09050", background: "rgba(80,45,15,0.5)", border: "1px solid rgba(160,90,20,0.3)", padding: "2px 8px", borderRadius: 10, display: "flex", alignItems: "center", gap: 4 }}>
                        {z}
                        <button onClick={() => removeCustomZone(z)} style={{ background: "none", border: "none", color: "#e06040", cursor: "pointer", fontSize: 11, padding: 0, lineHeight: 1 }}>✕</button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} style={S.select}>
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
              <textarea value={form.notes} placeholder="Notes (optional)" onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} style={{ ...S.input, gridColumn: "1/-1", resize: "vertical", lineHeight: 1.5 }} />
            </div>
            <div style={{ display: "flex", alignItems: "center" }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontFamily: "'Josefin Sans', sans-serif", fontSize: 12, color: "#70b888" }}>
                <input type="checkbox" checked={form.essential} onChange={e => setForm(f => ({ ...f, essential: e.target.checked }))} style={{ accentColor: "#3a9858", width: 14, height: 14 }} />
                Mark as essential
              </label>
              <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
                {editId && <button onClick={() => { setEditId(null); setForm(emptyForm); }} style={S.btnGhost}>Cancel</button>}
                <button onClick={handleSubmit} style={S.btnPrimary}>{editId ? "Update Item" : "Add Item"}</button>
              </div>
            </div>
          </div>

          {/* AI Check button */}
          {items.length > 0 && (
            <div style={{ marginBottom: 18, display: "flex", justifyContent: "flex-end" }}>
              <button onClick={() => setAiCheckOpen(true)}
                style={{ background: "rgba(20,60,45,0.75)", border: "1px solid rgba(50,160,100,0.45)", color: "#50c888", padding: "9px 18px", borderRadius: 20, cursor: "pointer", fontSize: 12, fontFamily: "'Josefin Sans', sans-serif", fontWeight: 600, letterSpacing: "0.5px" }}>
                🔍 Double Check My Kit
              </button>
            </div>
          )}

          {/* Filters */}
          <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
            <span style={{ fontFamily: "'Josefin Sans', sans-serif", fontSize: 9, color: "#50a878", letterSpacing: "2px", marginRight: 4 }}>SHOW</span>
            {["All", "Essential", "Optional"].map(e => (
              <button key={e} className="pill-btn" onClick={() => setFilterEssential(e)}
                style={{ background: filterEssential === e ? "#3a7858" : "rgba(80,45,15,0.6)", color: filterEssential === e ? "#b0f0d0" : "#c09050", border: `1px solid ${filterEssential === e ? "#3a9858" : "rgba(160,90,20,0.4)"}` }}>
                {e}
              </button>
            ))}
            <div style={{ width: 1, height: 16, background: "rgba(160,90,20,0.4)", margin: "0 4px" }} />
            {["All", ...STORAGE_ZONES, ...customZones].map(z => {
              const col = STORAGE_COLORS[z];
              const active = filterZone === z;
              return (
                <button key={z} className="pill-btn" onClick={() => setFilterZone(z)}
                  style={{ background: active ? (col?.bg || "rgba(80,55,20,0.8)") : "rgba(80,45,15,0.6)", color: active ? (col?.text || "#f5e8cc") : "#c09050", border: `1px solid ${active ? (col?.dot || "#c08030") : "rgba(160,90,20,0.4)"}` }}>
                  {z === "All" ? "All Bags" : z}
                </button>
              );
            })}
          </div>

          {/* Items */}
          {items.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 0 40px" }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>🚲</div>
              <div style={{ fontFamily: "'Lora', serif", fontStyle: "italic", fontSize: 17, color: "#c07830", marginBottom: 6 }}>Your kit is empty</div>
              <div style={{ fontFamily: "'Josefin Sans', sans-serif", fontSize: 11, color: "#806040", letterSpacing: "1px" }}>ADD YOUR FIRST ITEM ABOVE</div>
            </div>
          ) : groupedByZone.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 0", fontFamily: "'Lora', serif", fontStyle: "italic", color: "#806040" }}>No items match filters</div>
          ) : groupedByZone.map(({ zone, items: zoneItems, totalOz: zoneOz }, gi) => {
            const col = getZoneColor(zone);
            const collapsed = collapsedZones[zone];
            return (
              <div key={zone} className="fade-up" style={{ marginBottom: 12, animationDelay: `${gi * 0.04}s` }}>
                <button className="zone-btn" onClick={() => toggleZone(zone)}
                  style={{ background: col.bg, boxShadow: "0 2px 10px rgba(0,0,0,0.25)", borderRadius: collapsed ? 14 : "14px 14px 0 0" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 9, height: 9, borderRadius: "50%", background: col.dot, boxShadow: `0 0 0 3px ${col.bg}, 0 0 0 5px ${col.dot}50` }} />
                    <span style={{ fontFamily: "'Josefin Sans', sans-serif", fontSize: 13, fontWeight: 600, color: col.text, letterSpacing: "0.5px" }}>{zone}</span>
                    <span style={{ fontFamily: "'Josefin Sans', sans-serif", fontSize: 11, color: col.text, opacity: 0.6 }}>{zoneItems.length} item{zoneItems.length !== 1 ? "s" : ""}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span style={{ fontFamily: "'Lora', serif", fontSize: 15, fontWeight: 600, color: col.text }}><WeightDisplay oz={zoneOz} /></span>
                    <span style={{ color: col.text, opacity: 0.4, fontSize: 10 }}>{collapsed ? "▼" : "▲"}</span>
                  </div>
                </button>
                {!collapsed && (
                  <div style={{ background: "rgba(40,20,6,0.65)", borderRadius: "0 0 14px 14px", border: `1px solid ${col.bg}`, borderTop: "none", overflow: "hidden" }}>
                    {zoneItems.map((item, idx) => {
                      const itemOz = toOz(item.lbs, item.oz);
                      return (
                        <div key={item.id} className="item-row" style={{ padding: "10px 16px", borderBottom: idx < zoneItems.length - 1 ? "1px solid rgba(160,80,20,0.15)" : "none" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <div style={{ width: 6, height: 6, borderRadius: "50%", background: item.essential ? col.dot : "#5a3010", flexShrink: 0 }} />
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <span style={{ fontFamily: "'Lora', serif", fontSize: 14, color: item.essential ? "#f5e8cc" : "#907050" }}>{item.name}</span>
                              <span style={{ fontFamily: "'Josefin Sans', sans-serif", fontSize: 10, color: "#906040", marginLeft: 8 }}>{item.category}</span>
                            </div>
                            {!item.essential && <span style={{ fontFamily: "'Josefin Sans', sans-serif", fontSize: 9, color: "#906040", border: "1px solid #5a3010", padding: "2px 7px", borderRadius: 10, flexShrink: 0 }}>optional</span>}
                            <span style={{ fontFamily: "'Josefin Sans', sans-serif", fontSize: 13, fontWeight: 600, color: col.text, minWidth: 60, textAlign: "right", flexShrink: 0 }}><WeightDisplay oz={itemOz} /></span>
                            <button className="action-btn" onClick={() => setShareItemTarget(item)} title="Share with riding partner"
                              style={{ background: "rgba(30,70,50,0.8)", border: "1px solid #2a7058", color: "#50c888", padding: "4px 8px", borderRadius: 8, cursor: "pointer", fontSize: 11 }}>share</button>
                            <button className="action-btn" onClick={() => editItem(item)}
                              style={{ background: "rgba(70,35,10,0.8)", border: "1px solid #7a4818", color: "#d4903a", padding: "4px 8px", borderRadius: 8, cursor: "pointer", fontSize: 11 }}>edit</button>
                            <button className="action-btn" onClick={() => setConfirmDelete({ type: "item", id: item.id, name: item.name })}
                              style={{ background: "rgba(70,15,10,0.8)", border: "1px solid #8a2010", color: "#e06040", padding: "4px 8px", borderRadius: 8, cursor: "pointer", fontSize: 11 }}>✕</button>
                          </div>
                          {item.notes ? <div style={{ fontFamily: "'Lora', serif", fontStyle: "italic", fontSize: 12, color: "#806040", marginTop: 4, marginLeft: 16 }}>{item.notes}</div> : null}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

          {/* Bag breakdown */}
          {items.length > 0 && (
            <div style={{ background: "rgba(255,238,200,0.1)", backdropFilter: "blur(12px)", borderRadius: 16, border: "1px solid rgba(240,190,100,0.2)", padding: "18px 20px", marginTop: 20 }}>
              <div style={S.label}>BAG WEIGHT BREAKDOWN</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {allZones.map(zone => {
                  const zOz = items.filter(i => i.zone === zone).reduce((s, i) => s + toOz(i.lbs, i.oz), 0);
                  if (!zOz) return null;
                  const col = getZoneColor(zone);
                  const pct = totalOz > 0 ? Math.round((zOz / totalOz) * 100) : 0;
                  return (
                    <div key={zone} style={{ background: col.bg, borderRadius: 10, padding: "10px 14px", minWidth: 100 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 3 }}>
                        <div style={{ width: 6, height: 6, borderRadius: "50%", background: col.dot }} />
                        <span style={{ fontFamily: "'Josefin Sans', sans-serif", fontSize: 10, color: col.text }}>{zone}</span>
                      </div>
                      <div style={{ fontFamily: "'Lora', serif", fontSize: 16, fontWeight: 600, color: col.text }}><WeightDisplay oz={zOz} /></div>
                      <div style={{ fontFamily: "'Josefin Sans', sans-serif", fontSize: 10, color: col.text, opacity: 0.55 }}>{pct}%</div>
                    </div>
                  );
                })}
                <div style={{ background: "rgba(30,80,55,0.6)", borderRadius: 10, padding: "10px 14px", minWidth: 100, borderLeft: "3px solid #3aaa78" }}>
                  <div style={{ fontFamily: "'Josefin Sans', sans-serif", fontSize: 10, color: "#3aaa78", marginBottom: 3 }}>Total</div>
                  <div style={{ fontFamily: "'Lora', serif", fontSize: 16, fontWeight: 700, color: "#60d898" }}><WeightDisplay oz={totalOz} /></div>
                  <div style={{ fontFamily: "'Josefin Sans', sans-serif", fontSize: 10, color: "#2a7850" }}>{items.length} items</div>
                </div>
              </div>
            </div>
          )}
          </> }
        </div>
      </div>

      {/* Save Modal */}
      {saveOpen && (
        <div style={S.modalOverlay} onClick={() => setSaveOpen(false)}>
          <div style={S.modalBox} onClick={e => e.stopPropagation()}>
            <div style={S.modalTitle}>Save List</div>
            <div style={S.modalSub}>Give your kit a name</div>
            <input value={newListName} onChange={e => setNewListName(e.target.value)} onKeyDown={e => e.key === "Enter" && saveList()} placeholder="e.g. Colorado Tour · June" autoFocus style={{ ...S.input, marginBottom: 16 }} />
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={saveList} style={{ ...S.btnPrimary, flex: 1 }}>Save</button>
              <button onClick={() => setSaveOpen(false)} style={S.btnGhost}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Load Modal */}
      {loadOpen && (
        <div style={S.modalOverlay} onClick={() => setLoadOpen(false)}>
          <div style={S.modalBox} onClick={e => e.stopPropagation()}>
            <div style={S.modalTitle}>Your Lists</div>
            <div style={S.modalSub}>Select a list to load</div>
            {lists.length === 0 ? (
              <div style={{ fontFamily: "'Lora', serif", fontStyle: "italic", color: "#806040", textAlign: "center", padding: "20px 0" }}>No saved lists yet</div>
            ) : lists.map(l => (
              <div key={l.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 0", borderBottom: "1px solid rgba(160,80,20,0.2)" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: "'Lora', serif", fontSize: 15, color: "#f5e8cc" }}>{l.name}</div>
                  <div style={{ fontFamily: "'Josefin Sans', sans-serif", fontSize: 11, color: "#806040", marginTop: 2 }}>{new Date(l.created_at).toLocaleDateString()}</div>
                </div>
                <button onClick={() => loadList(l)} style={{ ...S.btnPrimary, padding: "6px 14px", fontSize: 12 }}>Load</button>
                <button onClick={() => setConfirmDelete({ type: "list", id: l.id, name: l.name })} style={{ background: "rgba(80,20,10,0.7)", border: "1px solid #7a2010", color: "#e06040", padding: "6px 10px", borderRadius: 10, cursor: "pointer", fontSize: 12, fontFamily: "'Josefin Sans', sans-serif" }}>✕</button>
              </div>
            ))}
            <button onClick={() => setLoadOpen(false)} style={{ ...S.btnGhost, width: "100%", marginTop: 16, textAlign: "center" }}>Close</button>
          </div>
        </div>
      )}

      {/* Other modals */}
      {shareOpen && <ShareModal items={items} currentListName={currentList?.name} onClose={() => setShareOpen(false)} />}
      {aiCheckOpen && <AICheckModal items={items} onAddItem={addSuggestedItem} onClose={() => setAiCheckOpen(false)} />}
      {friendsOpen && <FriendsModal user={user} onClose={() => setFriendsOpen(false)} />}
      {shareItemTarget && <ShareItemModal item={shareItemTarget} listName={currentList?.name} user={user} onClose={() => setShareItemTarget(null)} />}

      {/* Confirm Delete Modal */}
      {confirmDelete && (
        <div style={S.modalOverlay} onClick={() => setConfirmDelete(null)}>
          <div style={{ ...S.modalBox, width: 360 }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 32, marginBottom: 12, textAlign: "center" }}>🗑️</div>
            <div style={{ ...S.modalTitle, textAlign: "center", fontSize: 18 }}>Are you sure?</div>
            <div style={{ fontFamily: "'Lora', serif", fontStyle: "italic", fontSize: 14, color: "#c0a880", textAlign: "center", marginTop: 8, marginBottom: 24, lineHeight: 1.5 }}>
              {confirmDelete.type === "item"
                ? `Delete "${confirmDelete.name}" from your kit?`
                : `Delete the list "${confirmDelete.name}"? All items in it will be removed.`}
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => {
                if (confirmDelete.type === "item") deleteItem(confirmDelete.id);
                else deleteList(confirmDelete.id);
                setConfirmDelete(null);
              }} style={{ flex: 1, background: "rgba(120,20,10,0.8)", border: "1px solid #8a2010", color: "#f08060", padding: "12px", borderRadius: 12, cursor: "pointer", fontSize: 14, fontFamily: "'Josefin Sans', sans-serif", fontWeight: 600 }}>
                Yes, delete
              </button>
              <button onClick={() => setConfirmDelete(null)} style={S.btnGhost}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Reset Packing Modal */}
      {confirmReset && (
        <div style={S.modalOverlay} onClick={() => setConfirmReset(false)}>
          <div style={{ ...S.modalBox, width: 360 }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 32, marginBottom: 12, textAlign: "center" }}>🔄</div>
            <div style={{ ...S.modalTitle, textAlign: "center", fontSize: 18 }}>Reset packing list?</div>
            <div style={{ fontFamily: "'Lora', serif", fontStyle: "italic", fontSize: 14, color: "#c0a880", textAlign: "center", marginTop: 8, marginBottom: 24, lineHeight: 1.5 }}>
              This will uncheck all items and start your packing progress from scratch.
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => { resetPackingSession(); setConfirmReset(false); }}
                style={{ flex: 1, background: "rgba(120,20,10,0.8)", border: "1px solid #8a2010", color: "#f08060", padding: "12px", borderRadius: 12, cursor: "pointer", fontSize: 14, fontFamily: "'Josefin Sans', sans-serif", fontWeight: 600 }}>
                Yes, reset
              </button>
              <button onClick={() => setConfirmReset(false)} style={S.btnGhost}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div style={{ position: "fixed", bottom: 28, left: "50%", background: "rgba(50,30,10,0.92)", backdropFilter: "blur(10px)", color: "#f5e8cc", padding: "11px 22px", borderRadius: 20, fontFamily: "'Josefin Sans', sans-serif", fontSize: 12, letterSpacing: "0.5px", animation: "toastPop 0.2s ease", zIndex: 300, whiteSpace: "nowrap", boxShadow: "0 4px 20px rgba(0,0,0,0.3)", border: "1px solid rgba(220,150,60,0.3)" }}>
          {toast}
        </div>
      )}
    </div>
  );
}
