import { useState, useEffect } from "react";

const CATEGORIES = ["Shelter", "Sleep", "Clothing", "Navigation", "Food & Water", "Tools & Repair", "Safety", "Electronics", "Hygiene", "Other"];
const STORAGE_ZONES = ["Saddle Bag", "Frame Bag", "Handlebar Bag", "Top Tube Bag", "Rack Bag", "Fork Mounts", "Other"];
const STORAGE_COLORS = {
  "Saddle Bag":     { bg: "#6b3a1f", text: "#f0c888", dot: "#e07830" },
  "Frame Bag":      { bg: "#2a5040", text: "#90d4b0", dot: "#3aaa78" },
  "Handlebar Bag":  { bg: "#7a3818", text: "#f4b870", dot: "#d06820" },
  "Top Tube Bag":   { bg: "#1e4a3a", text: "#80c8a0", dot: "#2a9068" },
  "Rack Bag":       { bg: "#5a3010", text: "#e8a860", dot: "#c07828" },
  "Fork Mounts":    { bg: "#3a5a30", text: "#a8d888", dot: "#5aaa40" },
  "Other":          { bg: "#4a3820", text: "#d4b878", dot: "#a07840" },
};

const STORAGE_KEY = "bikepacking_lists_v2";

function loadLists() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"); }
  catch { return {}; }
}
function saveLists(lists) { localStorage.setItem(STORAGE_KEY, JSON.stringify(lists)); }
function toOz(lbs, oz) { return parseFloat(lbs || 0) * 16 + parseFloat(oz || 0); }

function encodeKit(name, items) {
  try {
    const data = JSON.stringify({ name, items });
    return btoa(unescape(encodeURIComponent(data)));
  } catch { return null; }
}

function decodeKit(str) {
  try {
    const data = JSON.parse(decodeURIComponent(escape(atob(str))));
    return data;
  } catch { return null; }
}

function getSharedKitFromURL() {
  try {
    const params = new URLSearchParams(window.location.search);
    const encoded = params.get("kit");
    if (!encoded) return null;
    return decodeKit(encoded);
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

const emptyForm = { name: "", lbs: "", oz: "", category: CATEGORIES[0], zone: STORAGE_ZONES[0], essential: true };

// ── Shared / Comparison view ──────────────────────────────────────────────────
function CompareView({ sharedKit, myItems, onDismiss }) {
  const [compareOpen, setCompareOpen] = useState(false);
  const myNames = new Set(myItems.map(i => i.name.toLowerCase().trim()));
  const sharedNames = new Set(sharedKit.items.map(i => i.name.toLowerCase().trim()));
  const duplicates = new Set([...myNames].filter(n => sharedNames.has(n)));

  const sharedTotal = sharedKit.items.reduce((s, i) => s + toOz(i.lbs, i.oz), 0);
  const myTotal = myItems.reduce((s, i) => s + toOz(i.lbs, i.oz), 0);

  const groupedShared = STORAGE_ZONES.map(zone => ({
    zone,
    items: sharedKit.items.filter(i => i.zone === zone),
  })).filter(g => g.items.length > 0);

  const groupedMine = STORAGE_ZONES.map(zone => ({
    zone,
    items: myItems.filter(i => i.zone === zone),
  })).filter(g => g.items.length > 0);

  const KitColumn = ({ groups, label, total, isShared }) => (
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontFamily: "'Lora', serif", fontSize: 18, fontWeight: 700, color: isShared ? "#40c898" : "#e8a030", marginBottom: 2 }}>{label}</div>
        <div style={{ fontFamily: "'Josefin Sans', sans-serif", fontSize: 10, color: "#3a8868", letterSpacing: "1.5px" }}>
          <WeightDisplay oz={total} /> · {isShared ? sharedKit.items.length : myItems.length} items
        </div>
      </div>
      {groups.length === 0 ? (
        <div style={{ fontFamily: "'Lora', serif", fontStyle: "italic", color: "#5a3810", fontSize: 13 }}>No items</div>
      ) : groups.map(({ zone, items }) => {
        const col = STORAGE_COLORS[zone];
        return (
          <div key={zone} style={{ marginBottom: 10 }}>
            <div style={{ fontFamily: "'Josefin Sans', sans-serif", fontSize: 10, color: col.text, letterSpacing: "1px", background: col.bg, padding: "5px 10px", borderRadius: "6px 6px 0 0", display: "flex", justifyContent: "space-between" }}>
              <span>{zone}</span>
              <WeightDisplay oz={items.reduce((s, i) => s + toOz(i.lbs, i.oz), 0)} />
            </div>
            <div style={{ background: "rgba(30,14,4,0.72)", borderRadius: "0 0 6px 6px", border: `1px solid ${col.bg}`, borderTop: "none" }}>
              {items.map((item, idx) => {
                const isDupe = duplicates.has(item.name.toLowerCase().trim());
                return (
                  <div key={item.id || idx} style={{
                    display: "flex", alignItems: "center", gap: 8, padding: "8px 12px",
                    borderBottom: idx < items.length - 1 ? "1px solid rgba(160,80,20,0.12)" : "none",
                    background: isDupe ? "rgba(220,160,20,0.12)" : "transparent",
                  }}>
                    {isDupe && <span title="Both of you have this!" style={{ fontSize: 12 }}>⚠️</span>}
                    <span style={{ flex: 1, fontFamily: "'Lora', serif", fontSize: 13, color: isDupe ? "#e8c040" : (item.essential ? "#ecd8a8" : "#8a5828") }}>{item.name}</span>
                    <span style={{ fontFamily: "'Josefin Sans', sans-serif", fontSize: 11, color: col.text }}>
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

  return (
    <div style={{ background: "rgba(30,48,36,0.95)", border: "2px solid #2a9068", borderRadius: 16, padding: "20px 22px", marginBottom: 24 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
        <div>
          <div style={{ fontFamily: "'Lora', serif", fontSize: 20, fontWeight: 700, color: "#40c898" }}>🤝 Comparing Kits</div>
          <div style={{ fontFamily: "'Josefin Sans', sans-serif", fontSize: 10, color: "#3a8868", letterSpacing: "1.5px", marginTop: 3 }}>
            {duplicates.size > 0
              ? `⚠️ ${duplicates.size} duplicate item${duplicates.size !== 1 ? "s" : ""} found — highlighted in yellow`
              : "✓ No duplicate items — you're well coordinated!"}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => setCompareOpen(!compareOpen)}
            style={{ background: "#2a6848", border: "none", color: "#a0e8c0", padding: "7px 14px", borderRadius: 10, cursor: "pointer", fontSize: 12, fontFamily: "'Josefin Sans', sans-serif" }}>
            {compareOpen ? "Hide details" : "See full comparison"}
          </button>
          <button onClick={onDismiss}
            style={{ background: "rgba(60,15,10,0.7)", border: "1px solid #7a2010", color: "#e06040", padding: "7px 12px", borderRadius: 10, cursor: "pointer", fontSize: 12, fontFamily: "'Josefin Sans', sans-serif" }}>
            Dismiss
          </button>
        </div>
      </div>

      {/* Quick duplicate summary */}
      {duplicates.size > 0 && (
        <div style={{ background: "rgba(220,160,20,0.1)", border: "1px solid rgba(220,160,20,0.3)", borderRadius: 10, padding: "10px 14px", marginBottom: compareOpen ? 16 : 0 }}>
          <div style={{ fontFamily: "'Josefin Sans', sans-serif", fontSize: 9, color: "#c8a030", letterSpacing: "2px", marginBottom: 8 }}>DUPLICATES — CONSIDER WHO CARRIES THESE</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {[...duplicates].map(name => (
              <span key={name} style={{ background: "rgba(220,160,20,0.2)", border: "1px solid rgba(220,160,20,0.4)", color: "#e8c040", padding: "3px 10px", borderRadius: 20, fontFamily: "'Lora', serif", fontSize: 12 }}>
                {name}
              </span>
            ))}
          </div>
        </div>
      )}

      {compareOpen && (
        <div style={{ display: "flex", gap: 16, marginTop: 16 }}>
          <KitColumn groups={groupedMine} label="Your Kit" total={myTotal} isShared={false} />
          <div style={{ width: 1, background: "rgba(42,144,104,0.3)", flexShrink: 0 }} />
          <KitColumn groups={groupedShared} label={sharedKit.name || "Their Kit"} total={sharedTotal} isShared={true} />
        </div>
      )}
    </div>
  );
}

// ── Share Modal ───────────────────────────────────────────────────────────────
function ShareModal({ items, currentName, onClose }) {
  const [copied, setCopied] = useState(false);
  const [riderName, setRiderName] = useState(currentName || "My Kit");

  const encoded = encodeKit(riderName, items);
  const shareUrl = encoded ? `${window.location.origin}${window.location.pathname}?kit=${encoded}` : "";

  const handleCopy = () => {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(60,48,40,0.38)", backdropFilter: "blur(5px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: "#241408", borderRadius: 22, padding: 32, width: 440, boxShadow: "0 24px 64px rgba(0,0,0,0.5)", border: "1px solid #2a9068" }}>
        <div style={{ fontFamily: "'Lora', serif", fontSize: 22, fontWeight: 700, color: "#40c898", marginBottom: 6 }}>🔗 Share Your Kit</div>
        <div style={{ fontFamily: "'Josefin Sans', sans-serif", fontSize: 11, color: "#3a8868", marginBottom: 20 }}>
          Send this link to Dalton. When he opens it, he'll see your kit alongside his — with any duplicates flagged.
        </div>

        <div style={{ fontFamily: "'Josefin Sans', sans-serif", fontSize: 10, color: "#7a4818", letterSpacing: "1.5px", marginBottom: 6 }}>YOUR NAME / KIT LABEL</div>
        <input value={riderName} onChange={e => setRiderName(e.target.value)}
          placeholder="e.g. Jordan's Kit"
          style={{ width: "100%", background: "rgba(55,28,8,0.85)", border: "1px solid #7a4010", color: "#ecd8a8", padding: "10px 14px", borderRadius: 10, fontSize: 14, marginBottom: 16, fontFamily: "'Lora', serif" }} />

        <div style={{ fontFamily: "'Josefin Sans', sans-serif", fontSize: 10, color: "#7a4818", letterSpacing: "1.5px", marginBottom: 6 }}>SHAREABLE LINK</div>
        <div style={{ background: "rgba(20,40,30,0.7)", border: "1px solid #2a5040", borderRadius: 10, padding: "10px 14px", marginBottom: 16, wordBreak: "break-all", fontFamily: "'Josefin Sans', sans-serif", fontSize: 11, color: "#3aaa78", lineHeight: 1.5, maxHeight: 80, overflow: "auto" }}>
          {shareUrl || "No items to share yet"}
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={handleCopy} disabled={!shareUrl || items.length === 0}
            style={{ flex: 1, background: copied ? "#1a5838" : "#2a6848", border: "none", color: "#a0e8c0", padding: "12px", borderRadius: 12, cursor: "pointer", fontSize: 14, fontWeight: 600, fontFamily: "'Josefin Sans', sans-serif", transition: "background 0.2s" }}>
            {copied ? "✓ Copied!" : "Copy Link"}
          </button>
          <button onClick={onClose}
            style={{ background: "rgba(55,28,8,0.7)", border: "1px solid #5a3010", color: "#8a5828", padding: "12px 20px", borderRadius: 12, cursor: "pointer", fontSize: 14, fontFamily: "'Josefin Sans', sans-serif" }}>
            Done
          </button>
        </div>

        {items.length === 0 && (
          <div style={{ marginTop: 12, fontFamily: "'Josefin Sans', sans-serif", fontSize: 11, color: "#8a4818", textAlign: "center" }}>
            Add some items to your kit first before sharing.
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────────────────────────
export default function App() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState(null);
  const [filterZone, setFilterZone] = useState("All");
  const [filterEssential, setFilterEssential] = useState("All");
  const [lists, setLists] = useState(loadLists);
  const [currentName, setCurrentName] = useState("");
  const [saveOpen, setSaveOpen] = useState(false);
  const [loadOpen, setLoadOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [toast, setToast] = useState(null);
  const [collapsedZones, setCollapsedZones] = useState({});
  const [sharedKit, setSharedKit] = useState(null);

  // On mount, check if there's a shared kit in the URL
  useEffect(() => {
    const kit = getSharedKitFromURL();
    if (kit) setSharedKit(kit);
  }, []);

  const notify = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const totalOz = items.reduce((s, i) => s + toOz(i.lbs, i.oz), 0);
  const essentialOz = items.filter(i => i.essential).reduce((s, i) => s + toOz(i.lbs, i.oz), 0);

  const filtered = items.filter(i => {
    if (filterZone !== "All" && i.zone !== filterZone) return false;
    if (filterEssential === "Essential" && !i.essential) return false;
    if (filterEssential === "Optional" && i.essential) return false;
    return true;
  });

  const groupedByZone = STORAGE_ZONES.map(zone => ({
    zone,
    items: filtered.filter(i => i.zone === zone),
    totalOz: filtered.filter(i => i.zone === zone).reduce((s, i) => s + toOz(i.lbs, i.oz), 0),
  })).filter(g => g.items.length > 0);

  const handleSubmit = () => {
    if (!form.name.trim()) return;
    if (editId !== null) {
      setItems(items.map(i => i.id === editId ? { ...form, id: editId } : i));
      setEditId(null);
    } else {
      setItems([...items, { ...form, id: Date.now() }]);
    }
    setForm(emptyForm);
  };

  const handleEdit = (item) => {
    setForm({ name: item.name, lbs: item.lbs, oz: item.oz, category: item.category, zone: item.zone, essential: item.essential });
    setEditId(item.id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = (id) => setItems(items.filter(i => i.id !== id));

  const handleSave = () => {
    if (!newName.trim()) return;
    const updated = { ...lists, [newName]: { items, createdAt: new Date().toISOString() } };
    setLists(updated); saveLists(updated);
    setCurrentName(newName); setSaveOpen(false); setNewName("");
    notify(`"${newName}" saved ✓`);
  };

  const handleLoad = (name) => {
    setItems(lists[name].items); setCurrentName(name); setLoadOpen(false);
    notify(`Loaded "${name}"`);
  };

  const handleDeleteList = (name) => {
    const updated = { ...lists }; delete updated[name];
    setLists(updated); saveLists(updated);
    if (currentName === name) setCurrentName("");
    notify(`"${name}" removed`);
  };

  const toggleZone = (zone) => setCollapsedZones(z => ({ ...z, [zone]: !z[zone] }));

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(155deg, #2e1a08 0%, #1a3028 50%, #3a2010 100%)",
      fontFamily: "'Lora', Georgia, serif",
      color: "#ecd8b0",
      position: "relative",
      overflow: "hidden",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,600;0,700;1,400&family=Josefin+Sans:wght@300;400;600&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-track { background: #0e1408; }
        ::-webkit-scrollbar-thumb { background: #4a6a30; border-radius: 10px; }
        input, select, button { font-family: 'Josefin Sans', sans-serif; }
        input:focus, select:focus { outline: none; box-shadow: 0 0 0 2px rgba(80,120,50,0.4); }
        .item-row { transition: background 0.12s ease; }
        .item-row:hover { background: rgba(40,60,20,0.5) !important; }
        .action-btn { opacity: 0; transition: opacity 0.15s; }
        .item-row:hover .action-btn { opacity: 1; }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes toastPop { from { opacity: 0; transform: translateX(-50%) translateY(8px) scale(0.95); } to { opacity: 1; transform: translateX(-50%) translateY(0) scale(1); } }
        .fade-up { animation: fadeUp 0.3s ease both; }
        .pill-btn { cursor: pointer; border: none; font-size: 11px; letter-spacing: 0.8px; padding: 5px 13px; border-radius: 20px; font-family: 'Josefin Sans', sans-serif; transition: all 0.15s; }
        .pill-btn:hover { filter: brightness(0.94); transform: translateY(-1px); }
        .zone-header-btn { width: 100%; border: none; cursor: pointer; display: flex; align-items: center; justify-content: space-between; border-radius: 14px; padding: 13px 18px; transition: filter 0.15s; }
        .zone-header-btn:hover { filter: brightness(1.06); }
      `}</style>

      {/* Mountain silhouette */}
      <svg viewBox="0 0 1440 280" preserveAspectRatio="none" style={{ position: "fixed", bottom: 0, left: 0, right: 0, width: "100%", height: 280, opacity: 0.18, pointerEvents: "none", zIndex: 0 }}>
        <path fill="#8b3a10" d="M0,280 L160,100 L300,190 L460,40 L600,160 L740,20 L880,140 L1040,60 L1200,170 L1380,80 L1440,110 L1440,280 Z"/>
        <path fill="#2a6048" d="M0,280 L220,170 L380,240 L540,130 L700,220 L860,110 L1020,200 L1200,140 L1440,180 L1440,280 Z" opacity="0.7"/>
        <path fill="#c06820" d="M0,280 L300,240 L600,260 L900,235 L1200,255 L1440,245 L1440,280 Z" opacity="0.5"/>
      </svg>
      <div style={{ position: "fixed", top: -60, right: -60, width: 240, height: 240, borderRadius: "50%", background: "radial-gradient(circle, rgba(220,130,40,0.22) 0%, rgba(200,100,20,0.08) 60%, transparent 75%)", pointerEvents: "none", zIndex: 0 }} />

      <div style={{ position: "relative", zIndex: 1 }}>
        {/* Header */}
        <div style={{ background: "rgba(30,16,6,0.85)", backdropFilter: "blur(14px)", borderBottom: "1px solid rgba(180,100,30,0.35)", padding: "16px 28px" }}>
          <div style={{ maxWidth: 900, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 26 }}>🏔</span>
                <div>
                  <div style={{ fontFamily: "'Lora', serif", fontSize: 24, fontWeight: 700, color: "#e8a030", letterSpacing: "-0.3px", lineHeight: 1 }}>Two Cranks</div>
                  <div style={{ fontFamily: "'Josefin Sans', sans-serif", fontSize: 9, color: "#3a9070", letterSpacing: "2.5px", marginTop: 2 }}>GEAR PLANNER</div>
                </div>
              </div>
              {currentName && <div style={{ fontFamily: "'Lora', serif", fontStyle: "italic", fontSize: 12, color: "#3aaa78", marginTop: 5, marginLeft: 36 }}>— {currentName}</div>}
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button onClick={() => setShareOpen(true)}
                style={{ background: "#1e5840", border: "1px solid #2a9068", color: "#60d898", padding: "8px 18px", borderRadius: 20, cursor: "pointer", fontSize: 12, fontWeight: 600, letterSpacing: "0.3px", display: "flex", alignItems: "center", gap: 6 }}>
                🔗 Share Kit
              </button>
              <button onClick={() => setLoadOpen(true)} style={{ background: "rgba(50,28,8,0.85)", border: "1px solid #7a4818", color: "#d4903a", padding: "8px 18px", borderRadius: 20, cursor: "pointer", fontSize: 12, letterSpacing: "0.3px" }}>Load List</button>
              <button onClick={() => { setNewName(currentName); setSaveOpen(true); }} style={{ background: "#2a6848", border: "none", color: "#a0e8c0", padding: "8px 18px", borderRadius: 20, cursor: "pointer", fontSize: 12, fontWeight: 600, letterSpacing: "0.3px", boxShadow: "0 2px 10px rgba(30,100,60,0.45)" }}>Save List</button>
              <button onClick={() => { setItems([]); setCurrentName(""); }} style={{ background: "rgba(40,22,8,0.6)", border: "1px solid #5a3010", color: "#8a6030", padding: "8px 14px", borderRadius: 20, cursor: "pointer", fontSize: 12 }}>New</button>
            </div>
          </div>
        </div>

        <div style={{ maxWidth: 900, margin: "0 auto", padding: "24px 20px 60px" }}>

          {/* Shared kit comparison banner */}
          {sharedKit && (
            <CompareView
              sharedKit={sharedKit}
              myItems={items}
              onDismiss={() => setSharedKit(null)}
            />
          )}

          {/* If no kit loaded yet but shared kit exists, prompt */}
          {sharedKit && items.length === 0 && (
            <div style={{ background: "rgba(20,50,35,0.7)", border: "1px solid #2a6848", borderRadius: 12, padding: "14px 18px", marginBottom: 20, fontFamily: "'Josefin Sans', sans-serif", fontSize: 12, color: "#3aaa78", letterSpacing: "0.5px" }}>
              👆 Add your own gear above to compare against {sharedKit.name || "their kit"} and find duplicates.
            </div>
          )}

          {/* Summary Cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginBottom: 24 }} className="fade-up">
            {[
              { label: "TOTAL WEIGHT", val: <WeightDisplay oz={totalOz} />, color: "#e8a030" },
              { label: "ESSENTIAL WT.", val: <WeightDisplay oz={essentialOz} />, color: "#40c080" },
              { label: "TOTAL ITEMS", val: items.length, color: "#e07030" },
              { label: "BAGS IN USE", val: new Set(items.map(i => i.zone)).size, color: "#50b888" },
            ].map(({ label, val, color }) => (
              <div key={label} style={{ background: "rgba(38,20,8,0.78)", backdropFilter: "blur(8px)", borderRadius: 16, padding: "16px 18px", border: "1px solid rgba(160,80,20,0.35)", boxShadow: "0 2px 14px rgba(0,0,0,0.3)" }}>
                <div style={{ fontFamily: "'Josefin Sans', sans-serif", fontSize: 9, color: "#3a8868", letterSpacing: "2px", marginBottom: 6 }}>{label}</div>
                <div style={{ fontFamily: "'Lora', serif", fontSize: 22, fontWeight: 600, color }}>{val}</div>
              </div>
            ))}
          </div>

          {/* Add / Edit Form */}
          <div style={{ background: "rgba(38,20,8,0.82)", backdropFilter: "blur(10px)", borderRadius: 20, padding: "22px", marginBottom: 22, border: "1px solid rgba(160,80,20,0.3)", boxShadow: "0 4px 24px rgba(0,0,0,0.25)" }} className="fade-up">
            <div style={{ fontFamily: "'Josefin Sans', sans-serif", fontSize: 10, color: "#3a9070", letterSpacing: "2.5px", marginBottom: 14 }}>
              {editId !== null ? "✏️  EDITING ITEM" : "＋  ADD GEAR ITEM"}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
              <input value={form.name} placeholder="Item name (e.g. Big Agnes Copper Spur)"
                onChange={e => setForm({ ...form, name: e.target.value })}
                onKeyDown={e => e.key === "Enter" && handleSubmit()}
                style={{ gridColumn: "1/-1", background: "rgba(55,28,8,0.75)", border: "1px solid #7a4010", color: "#ecd8a8", padding: "10px 14px", borderRadius: 10, fontSize: 14 }} />
              <div style={{ display: "flex", gap: 8 }}>
                <input value={form.lbs} placeholder="lbs" type="number" min="0"
                  onChange={e => setForm({ ...form, lbs: e.target.value })}
                  style={{ flex: 1, background: "rgba(55,28,8,0.75)", border: "1px solid #7a4010", color: "#ecd8a8", padding: "10px 12px", borderRadius: 10, fontSize: 14 }} />
                <input value={form.oz} placeholder="oz" type="number" min="0" step="0.1"
                  onChange={e => setForm({ ...form, oz: e.target.value })}
                  style={{ flex: 1, background: "rgba(55,28,8,0.75)", border: "1px solid #7a4010", color: "#ecd8a8", padding: "10px 12px", borderRadius: 10, fontSize: 14 }} />
              </div>
              <select value={form.zone} onChange={e => setForm({ ...form, zone: e.target.value })}
                style={{ background: "rgba(55,28,8,0.75)", border: "1px solid #7a4010", color: "#ecd8a8", padding: "10px 14px", borderRadius: 10, fontSize: 13 }}>
                {STORAGE_ZONES.map(z => <option key={z}>{z}</option>)}
              </select>
              <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}
                style={{ background: "rgba(55,28,8,0.75)", border: "1px solid #7a4010", color: "#ecd8a8", padding: "10px 14px", borderRadius: 10, fontSize: 13 }}>
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div style={{ display: "flex", alignItems: "center" }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontFamily: "'Josefin Sans', sans-serif", fontSize: 12, color: "#50a878" }}>
                <input type="checkbox" checked={form.essential} onChange={e => setForm({ ...form, essential: e.target.checked })}
                  style={{ accentColor: "#2a8858", width: 14, height: 14 }} />
                Mark as essential
              </label>
              <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
                {editId !== null && (
                  <button onClick={() => { setEditId(null); setForm(emptyForm); }}
                    style={{ background: "transparent", border: "1px solid #5a3010", color: "#7a5020", padding: "9px 16px", borderRadius: 20, cursor: "pointer", fontSize: 12 }}>Cancel</button>
                )}
                <button onClick={handleSubmit}
                  style={{ background: "#2a6848", border: "none", color: "#a0e8c0", padding: "10px 26px", borderRadius: 20, cursor: "pointer", fontSize: 13, fontWeight: 600, boxShadow: "0 2px 12px rgba(30,100,60,0.45)" }}>
                  {editId !== null ? "Update Item" : "Add Item"}
                </button>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div style={{ display: "flex", gap: 6, marginBottom: 18, flexWrap: "wrap", alignItems: "center" }}>
            <span style={{ fontFamily: "'Josefin Sans', sans-serif", fontSize: 9, color: "#3a8868", letterSpacing: "2px", marginRight: 4 }}>SHOW</span>
            {["All", "Essential", "Optional"].map(e => (
              <button key={e} className="pill-btn" onClick={() => setFilterEssential(e)}
                style={{ background: filterEssential === e ? "#2a6848" : "rgba(45,22,8,0.7)", color: filterEssential === e ? "#a0e8c0" : "#a07840", border: "1px solid " + (filterEssential === e ? "#2a8858" : "#6a3810") }}>
                {e}
              </button>
            ))}
            <div style={{ width: 1, height: 16, background: "#6a3810", margin: "0 4px" }} />
            {["All", ...STORAGE_ZONES].map(z => {
              const col = STORAGE_COLORS[z];
              const active = filterZone === z;
              return (
                <button key={z} className="pill-btn" onClick={() => setFilterZone(z)}
                  style={{ background: active ? (col?.bg || "rgba(45,22,8,0.7)") : "rgba(45,22,8,0.7)", color: active ? (col?.text || "#ecd8a8") : "#a07840", border: "1px solid " + (active ? (col?.dot || "#8a4820") : "#6a3810") }}>
                  {z === "All" ? "All Bags" : z}
                </button>
              );
            })}
          </div>

          {/* Items grouped by zone */}
          {items.length === 0 ? (
            <div style={{ textAlign: "center", padding: "70px 0 40px", color: "#4a3a20" }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>🚲</div>
              <div style={{ fontFamily: "'Lora', serif", fontStyle: "italic", fontSize: 17, marginBottom: 8, color: "#c07830" }}>Your kit is empty</div>
              <div style={{ fontFamily: "'Josefin Sans', sans-serif", fontSize: 11, color: "#6a3810", letterSpacing: "1px" }}>ADD YOUR FIRST ITEM ABOVE TO GET STARTED</div>
            </div>
          ) : groupedByZone.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 0", color: "#4a3a20", fontFamily: "'Lora', serif", fontStyle: "italic" }}>No items match your filters</div>
          ) : (
            groupedByZone.map(({ zone, items: zoneItems, totalOz: zoneOz }, gi) => {
              const col = STORAGE_COLORS[zone];
              const collapsed = collapsedZones[zone];
              return (
                <div key={zone} className="fade-up" style={{ marginBottom: 14, animationDelay: `${gi * 0.04}s` }}>
                  <button className="zone-header-btn" onClick={() => toggleZone(zone)}
                    style={{ background: col.bg, boxShadow: "0 2px 10px rgba(0,0,0,0.3)", borderRadius: collapsed ? 14 : "14px 14px 0 0" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 9, height: 9, borderRadius: "50%", background: col.dot, boxShadow: `0 0 0 3px ${col.bg}, 0 0 0 4px ${col.dot}60` }} />
                      <span style={{ fontFamily: "'Josefin Sans', sans-serif", fontSize: 13, fontWeight: 600, color: col.text, letterSpacing: "0.5px" }}>{zone}</span>
                      <span style={{ fontFamily: "'Josefin Sans', sans-serif", fontSize: 11, color: col.text, opacity: 0.6 }}>{zoneItems.length} item{zoneItems.length !== 1 ? "s" : ""}</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <span style={{ fontFamily: "'Lora', serif", fontSize: 16, fontWeight: 600, color: col.text }}><WeightDisplay oz={zoneOz} /></span>
                      <span style={{ color: col.text, opacity: 0.45, fontSize: 10 }}>{collapsed ? "▼" : "▲"}</span>
                    </div>
                  </button>
                  {!collapsed && (
                    <div style={{ background: "rgba(30,14,4,0.72)", borderRadius: "0 0 14px 14px", border: `1px solid ${col.bg}`, borderTop: "none", overflow: "hidden" }}>
                      {zoneItems.map((item, idx) => {
                        const itemOz = toOz(item.lbs, item.oz);
                        return (
                          <div key={item.id} className="item-row" style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 18px", borderBottom: idx < zoneItems.length - 1 ? `1px solid rgba(160,80,20,0.18)` : "none" }}>
                            <div style={{ width: 6, height: 6, borderRadius: "50%", background: item.essential ? col.dot : "#5a3010", flexShrink: 0 }} />
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <span style={{ fontFamily: "'Lora', serif", fontSize: 14, color: item.essential ? "#ecd8a8" : "#8a5828" }}>{item.name}</span>
                              <span style={{ fontFamily: "'Josefin Sans', sans-serif", fontSize: 10, color: "#7a4818", marginLeft: 8 }}>{item.category}</span>
                            </div>
                            {!item.essential && (
                              <span style={{ fontFamily: "'Josefin Sans', sans-serif", fontSize: 9, color: "#7a4818", letterSpacing: "0.8px", border: "1px solid #5a3010", padding: "2px 7px", borderRadius: 10, flexShrink: 0 }}>optional</span>
                            )}
                            <span style={{ fontFamily: "'Josefin Sans', sans-serif", fontSize: 13, fontWeight: 600, color: col.text, minWidth: 64, textAlign: "right", flexShrink: 0 }}>
                              <WeightDisplay oz={itemOz} />
                            </span>
                            <button className="action-btn" onClick={() => handleEdit(item)}
                              style={{ background: "rgba(60,30,8,0.9)", border: "1px solid #8a4818", color: "#d4903a", padding: "4px 10px", borderRadius: 8, cursor: "pointer", fontSize: 11 }}>edit</button>
                            <button className="action-btn" onClick={() => handleDelete(item.id)}
                              style={{ background: "rgba(60,15,10,0.8)", border: "1px solid #7a2010", color: "#e06040", padding: "4px 10px", borderRadius: 8, cursor: "pointer", fontSize: 11 }}>✕</button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          )}

          {/* Bag Weight Summary */}
          {items.length > 0 && (
            <div style={{ background: "rgba(38,18,6,0.78)", borderRadius: 18, padding: "20px 22px", marginTop: 24, border: "1px solid rgba(160,80,20,0.28)", boxShadow: "0 2px 16px rgba(0,0,0,0.25)" }}>
              <div style={{ fontFamily: "'Josefin Sans', sans-serif", fontSize: 9, color: "#3a8868", letterSpacing: "2.5px", marginBottom: 14 }}>BAG WEIGHT BREAKDOWN</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                {STORAGE_ZONES.map(zone => {
                  const zOz = items.filter(i => i.zone === zone).reduce((s, i) => s + toOz(i.lbs, i.oz), 0);
                  if (zOz === 0) return null;
                  const col = STORAGE_COLORS[zone];
                  const pct = totalOz > 0 ? Math.round((zOz / totalOz) * 100) : 0;
                  return (
                    <div key={zone} style={{ background: col.bg, borderRadius: 12, padding: "12px 16px", minWidth: 110 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 4 }}>
                        <div style={{ width: 7, height: 7, borderRadius: "50%", background: col.dot }} />
                        <span style={{ fontFamily: "'Josefin Sans', sans-serif", fontSize: 10, color: col.text }}>{zone}</span>
                      </div>
                      <div style={{ fontFamily: "'Lora', serif", fontSize: 17, fontWeight: 600, color: col.text }}><WeightDisplay oz={zOz} /></div>
                      <div style={{ fontFamily: "'Josefin Sans', sans-serif", fontSize: 10, color: col.text, opacity: 0.55, marginTop: 2 }}>{pct}% of total</div>
                    </div>
                  );
                })}
                <div key="total" style={{ background: "rgba(20,60,40,0.55)", borderRadius: 12, padding: "12px 16px", minWidth: 110, borderLeft: "3px solid #2a9868" }}>
                  <div style={{ fontFamily: "'Josefin Sans', sans-serif", fontSize: 10, color: "#3ab880", marginBottom: 4 }}>Total</div>
                  <div style={{ fontFamily: "'Lora', serif", fontSize: 17, fontWeight: 700, color: "#60d898" }}><WeightDisplay oz={totalOz} /></div>
                  <div style={{ fontFamily: "'Josefin Sans', sans-serif", fontSize: 10, color: "#2a7850", marginTop: 2 }}>{items.length} items</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Share Modal */}
      {shareOpen && <ShareModal items={items} currentName={currentName} onClose={() => setShareOpen(false)} />}

      {/* Save Modal */}
      {saveOpen && (
        <div onClick={() => setSaveOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(60,48,40,0.38)", backdropFilter: "blur(5px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "#241408", borderRadius: 22, padding: 32, width: 360, boxShadow: "0 24px 64px rgba(0,0,0,0.5)", border: "1px solid #7a3e10" }}>
            <div style={{ fontFamily: "'Lora', serif", fontSize: 22, fontWeight: 700, color: "#e8a030", marginBottom: 6 }}>Save your list</div>
            <div style={{ fontFamily: "'Josefin Sans', sans-serif", fontSize: 11, color: "#3a8868", marginBottom: 18 }}>Give it a name you'll remember</div>
            <input value={newName} onChange={e => setNewName(e.target.value)} onKeyDown={e => e.key === "Enter" && handleSave()}
              placeholder="e.g. Colorado Tour · June 2025" autoFocus
              style={{ width: "100%", background: "rgba(55,28,8,0.85)", border: "1px solid #7a4010", color: "#ecd8a8", padding: "12px 16px", borderRadius: 12, fontSize: 14, marginBottom: 16 }} />
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={handleSave} style={{ flex: 1, background: "#2a6848", border: "none", color: "#a0e8c0", padding: "12px", borderRadius: 12, cursor: "pointer", fontSize: 14, fontWeight: 600 }}>Save</button>
              <button onClick={() => setSaveOpen(false)} style={{ background: "rgba(55,28,8,0.7)", border: "1px solid #5a3010", color: "#8a5828", padding: "12px 20px", borderRadius: 12, cursor: "pointer", fontSize: 14 }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Load Modal */}
      {loadOpen && (
        <div onClick={() => setLoadOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(60,48,40,0.38)", backdropFilter: "blur(5px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "#241408", borderRadius: 22, padding: 32, width: 420, maxHeight: "72vh", overflow: "auto", boxShadow: "0 24px 64px rgba(0,0,0,0.5)", border: "1px solid #7a3e10" }}>
            <div style={{ fontFamily: "'Lora', serif", fontSize: 22, fontWeight: 700, color: "#e8a030", marginBottom: 18 }}>Saved Lists</div>
            {Object.keys(lists).length === 0 ? (
              <div style={{ color: "#6a3810", fontStyle: "italic", fontFamily: "'Lora', serif", textAlign: "center", padding: "28px 0" }}>No saved lists yet</div>
            ) : (
              Object.entries(lists).map(([name, data]) => (
                <div key={name} style={{ display: "flex", alignItems: "center", gap: 10, padding: "13px 0", borderBottom: "1px solid #3a1e08" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: "'Lora', serif", fontSize: 15, color: "#ecd8a8" }}>{name}</div>
                    <div style={{ fontFamily: "'Josefin Sans', sans-serif", fontSize: 11, color: "#7a4818", marginTop: 2 }}>{data.items.length} items · {new Date(data.createdAt).toLocaleDateString()}</div>
                  </div>
                  <button onClick={() => handleLoad(name)} style={{ background: "#2a6848", border: "none", color: "#a0e8c0", padding: "7px 16px", borderRadius: 10, cursor: "pointer", fontSize: 12, fontWeight: 600 }}>Load</button>
                  <button onClick={() => handleDeleteList(name)} style={{ background: "rgba(60,15,10,0.8)", border: "1px solid #7a2010", color: "#e06040", padding: "7px 12px", borderRadius: 10, cursor: "pointer", fontSize: 12 }}>✕</button>
                </div>
              ))
            )}
            <button onClick={() => setLoadOpen(false)} style={{ width: "100%", background: "rgba(55,28,8,0.7)", border: "1px solid #5a3010", color: "#8a5828", padding: "12px", borderRadius: 12, cursor: "pointer", fontSize: 14, marginTop: 16 }}>Close</button>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div style={{ position: "fixed", bottom: 28, left: "50%", background: "rgba(58,46,38,0.88)", backdropFilter: "blur(10px)", color: "#f5ede3", padding: "11px 22px", borderRadius: 20, fontFamily: "'Josefin Sans', sans-serif", fontSize: 12, letterSpacing: "0.5px", animation: "toastPop 0.2s ease", zIndex: 200, whiteSpace: "nowrap", boxShadow: "0 4px 20px rgba(0,0,0,0.2)" }}>
          {toast}
        </div>
      )}
    </div>
  );
}
