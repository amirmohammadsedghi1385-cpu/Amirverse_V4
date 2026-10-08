"use client";

import { ChangeEvent, FormEvent, MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import type { GalleryItem, WorldQuality } from "./World2D";

const WorldCanvas = dynamic(() => import("./World2D"), { ssr: false });

type Section = "home" | "visit" | "create" | "ai" | "memory" | "control";
type User = { id: string; name: string; email: string } | null;
type Memory = { id: string; content: string; source: string; createdAt: string };
type ChatMessage = { role: "user" | "assistant"; content: string };
type Artifact = { id: string; kind: string; title: string; prompt: string; createdAt: string };

type Preferences = { theme: "dark" | "light"; lowPower: boolean; quality: WorldQuality; sound: boolean; motion: boolean };
const defaultPreferences: Preferences = { theme: "dark", lowPower: false, quality: "balanced", sound: true, motion: true };

const nav: Array<[Section, string, string]> = [
  ["home", "خانه", "⌂"],
  ["visit", "بازدید", "▣"],
  ["create", "ساخت", "✦"],
  ["ai", "دستیار", "◉"],
  ["memory", "حافظه", "♧"]
];

const sectionTitle: Record<Section, string> = {
  home: "میدان مرکزی",
  visit: "بازدید",
  create: "مرکز ساخت",
  ai: "دستیار",
  memory: "حافظه من",
  control: "مرکز کنترل"
};

const storageKeys = { gallery: "amirverse-v4-gallery", entrySeen: "amirverse-v4-entry-seen", places: "amirverse-v4-places", characters: "amirverse-v4-characters", missions: "amirverse-v4-missions" };

function haptic() {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate?.(8);
}

async function jsonFetch(url: string, init?: RequestInit) {
  const response = await fetch(url, { ...init, headers: { "Content-Type": "application/json", ...(init?.headers || {}) } });
  const data = await response.json().catch(() => ({}));
  return { response, data };
}

type Place = { id: string; name: string; description: string; };
type Character = { id: string; name: string; role: string; description: string; };
type Mission = { id: string; title: string; description: string; done: boolean; };

export default function Amirverse() {
  const [entry, setEntry] = useState(true);
  const [user, setUser] = useState<User>(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [auth, setAuth] = useState({ name: "", email: "", password: "" });
  const [authError, setAuthError] = useState("");
  const [section, setSection] = useState<Section>("home");
  const [panelOpen, setPanelOpen] = useState(false);
  const [preferences, setPreferences] = useState<Preferences>(defaultPreferences);
  const [preferencesReady, setPreferencesReady] = useState(false);
  const [toast, setToast] = useState("");
  const [memory, setMemory] = useState<Memory[]>([]);
  const [message, setMessage] = useState("");
  const [chat, setChat] = useState<ChatMessage[]>([]);
  const [busy, setBusy] = useState(false);
  const [creationTab, setCreationTab] = useState<"image" | "document" | "ppt" | "pdf">("image");
  const [insideVisitRoom, setInsideVisitRoom] = useState(false);
  const [creationPrompt, setCreationPrompt] = useState("");
  const [generatedImage, setGeneratedImage] = useState("");
  const [generatedDoc, setGeneratedDoc] = useState<{ title?: string; intro?: string; slides?: Array<{ title: string; bullets: string[] }> } | null>(null);
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [memoryInput, setMemoryInput] = useState("");
  const [places, setPlaces] = useState<Place[]>([]);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [missions, setMissions] = useState<Mission[]>([]);

  const [galleryItems, setGalleryItems] = useState<GalleryItem[]>([]);
  const [gallerySelected, setGallerySelected] = useState<GalleryItem | null>(null);
  const [galleryText, setGalleryText] = useState("");
  const [showInstall, setShowInstall] = useState(false);
  const installPrompt = useRef<any>(null);

  useEffect(() => {
    const savedGallery = localStorage.getItem(storageKeys.gallery);
    const savedPlaces = localStorage.getItem(storageKeys.places);
    const savedCharacters = localStorage.getItem(storageKeys.characters);
    const savedMissions = localStorage.getItem(storageKeys.missions);
    if (savedPlaces) { try { setPlaces(JSON.parse(savedPlaces)); } catch { localStorage.removeItem(storageKeys.places); } }
    if (savedCharacters) { try { setCharacters(JSON.parse(savedCharacters)); } catch { localStorage.removeItem(storageKeys.characters); } }
    if (savedMissions) { try { setMissions(JSON.parse(savedMissions)); } catch { localStorage.removeItem(storageKeys.missions); } }
    if (savedGallery) { try { setGalleryItems(JSON.parse(savedGallery)); } catch { localStorage.removeItem(storageKeys.gallery); } }
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduced) setPreferences((p: Preferences) => ({ ...p, motion: false }));
    const beforeInstall = (event: Event) => {
      event.preventDefault();
      installPrompt.current = event;
      setShowInstall(true);
    };
    window.addEventListener("beforeinstallprompt", beforeInstall as EventListener);
    return () => window.removeEventListener("beforeinstallprompt", beforeInstall as EventListener);
  }, []);

  useEffect(() => {
    localStorage.setItem(storageKeys.gallery, JSON.stringify(galleryItems.slice(-8)));
  }, [galleryItems]);

  useEffect(() => {
    localStorage.setItem(storageKeys.places, JSON.stringify(places));
  }, [places]);

  useEffect(() => {
    localStorage.setItem(storageKeys.characters, JSON.stringify(characters));
  }, [characters]);

  useEffect(() => {
    localStorage.setItem(storageKeys.missions, JSON.stringify(missions));
  }, [missions]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth", { cache: "no-store" })
      .then((r) => r.json())
      .then(async (data) => {
        if (cancelled) return;
        setUser(data.user ?? null);
        if (data.user) {
          const [prefRes, chatRes] = await Promise.all([
            fetch("/api/preferences", { cache: "no-store" }),
            fetch("/api/ai/chat", { cache: "no-store" })
          ]);
          if (prefRes.ok) {
            const pref = (await prefRes.json()).preferences as Partial<Preferences>;
            setPreferences({ ...defaultPreferences, ...pref });
          }
          if (chatRes.ok) {
            const history = (await chatRes.json()).messages;
            if (Array.isArray(history)) setChat(history);
          }
        }
        setLoadingSession(false);
      })
      .catch(() => setLoadingSession(false));
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = preferences.theme;
    document.documentElement.dataset.motion = preferences.motion ? "on" : "off";
  }, [preferences.theme, preferences.motion]);

  useEffect(() => {
    if (!user || !preferencesReady) return;
    const values: Array<[string, string | boolean]> = [
      ["theme", preferences.theme],
      ["lowPower", preferences.lowPower],
      ["quality", preferences.quality],
      ["sound", preferences.sound],
      ["motion", preferences.motion]
    ];
    values.forEach(([key, value]) => {
      void jsonFetch("/api/preferences", { method: "POST", body: JSON.stringify({ key, value }) });
    });
  }, [preferences, user, preferencesReady]);

  useEffect(() => {
    if (!user || entry) return;
    setPreferencesReady(true);
  }, [user, entry]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 2600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const openSection = (next: Section) => {
    haptic();
    setSection(next); if (next !== "visit") setInsideVisitRoom(false);
    setPanelOpen(true);
    if (next === "memory") void loadMemory();
    if (next === "create") void loadArtifacts();
  };

  const enterVisitRoom = () => { haptic(); setInsideVisitRoom(true); setPanelOpen(false); setToast("وارد اتاق بازدید شد."); };
  const enterWorld = () => {
    haptic();
    setEntry(false);
    setPanelOpen(false);
    if (!user) setToast("حالت مهمان فعاله؛ برای حافظه و AI واقعی وارد حساب شو.");
  };

  const loadMemory = async () => {
    if (!user) return;
    const { response, data } = await jsonFetch("/api/memory", { method: "GET" });
    if (response.ok && Array.isArray(data.memories)) setMemory(data.memories);
  };

  const loadArtifacts = async () => {
    if (!user) return;
    const { response, data } = await jsonFetch("/api/artifacts", { method: "GET" });
    if (response.ok && Array.isArray(data.artifacts)) setArtifacts(data.artifacts);
  };

  const runAuth = async () => {
    setAuthError("");
    const { response, data } = await jsonFetch("/api/auth", { method: "POST", body: JSON.stringify({ action: authMode, ...auth }) });
    if (!response.ok) return setAuthError(data.error || "انجام عملیات ممکن نشد.");
    setUser(data.user);
    setAuthOpen(false);
    setEntry(false);
    setPreferencesReady(false);
    setToast(authMode === "login" ? "خوش برگشتی 🌌" : "دنیای تو آماده است ✨");
    setAuth({ name: "", email: "", password: "" });
    haptic();
    const [prefRes, chatRes] = await Promise.all([fetch("/api/preferences", { cache: "no-store" }), fetch("/api/ai/chat", { cache: "no-store" })]);
    if (prefRes.ok) setPreferences({ ...defaultPreferences, ...(await prefRes.json()).preferences });
    if (chatRes.ok) setChat((await chatRes.json()).messages || []);
    setPreferencesReady(true);
  };

  const logout = async () => {
    await jsonFetch("/api/auth", { method: "POST", body: JSON.stringify({ action: "logout" }) });
    setUser(null); setEntry(true); setPanelOpen(false); setChat([]); setMemory([]); setToast("از Amirverse خارج شدی.");
  };

  const sendChat = async (value = message) => {
    const text = value.trim();
    if (!text || busy) return;
    if (!user) { setAuthMode("login"); setAuthOpen(true); setToast("برای استفاده از دستیار، اول وارد حسابت شو."); return; }
    setBusy(true); setMessage(""); setChat((old) => [...old, { role: "user", content: text }]);
    try {
      const { response, data } = await jsonFetch("/api/ai/chat", { method: "POST", body: JSON.stringify({ message: text }) });
      if (!response.ok) throw new Error(data.error || "خطای ارتباط با دستیار");
      setChat((old) => [...old, { role: "assistant", content: data.message }]);
      for (const action of data.actions || []) {
        if (action.type === "navigate") openSection(action.section as Section);
        if (action.type === "set_theme") setPreferences((p: Preferences) => ({ ...p, theme: action.theme }));
        if (action.type === "set_low_power") setPreferences((p: Preferences) => ({ ...p, lowPower: Boolean(action.enabled) }));
        if (action.type === "set_quality") setPreferences((p: Preferences) => ({ ...p, quality: action.quality }));
        if (action.type === "set_motion") setPreferences((p: Preferences) => ({ ...p, motion: Boolean(action.enabled) }));
        if (action.type === "set_sound") setPreferences((p: Preferences) => ({ ...p, sound: Boolean(action.enabled) }));
        if (action.type === "memory_saved") void loadMemory();
      }
    } catch (error) {
      setChat((old) => [...old, { role: "assistant", content: error instanceof Error ? error.message : "ارتباط با دستیار برقرار نشد." }]);
    } finally { setBusy(false); }
  };

  const saveMemory = async () => {
    if (!user) { setAuthOpen(true); return; }
    const content = memoryInput.trim();
    if (!content) return;
    const { response, data } = await jsonFetch("/api/memory", { method: "POST", body: JSON.stringify({ content }) });
    if (!response.ok) return setToast(data.error || "ذخیره نشد.");
    setMemoryInput(""); await loadMemory(); setToast("در حافظه ذخیره شد 🧠");
  };

  const removeMemory = async (id: string) => {
    const { response } = await jsonFetch("/api/memory", { method: "DELETE", body: JSON.stringify({ id }) });
    if (response.ok) { await loadMemory(); setToast("یادآوری حذف شد."); }
  };

  const clearAllMemory = async () => {
    if (!user || !confirm("همه حافظه‌های ذخیره‌شده حذف شوند؟")) return;
    for (const item of memory) await jsonFetch("/api/memory", { method: "DELETE", body: JSON.stringify({ id: item.id }) });
    await loadMemory(); setToast("حافظه پاک شد.");
  };

  const generateImage = async () => {
    if (!user) { setAuthOpen(true); return; }
    if (!creationPrompt.trim() || busy) return;
    setBusy(true); setGeneratedImage("");
    try {
      const { response, data } = await jsonFetch("/api/generate/image", { method: "POST", body: JSON.stringify({ prompt: creationPrompt }) });
      if (!response.ok) throw new Error(data.error || "تولید تصویر ناموفق بود.");
      setGeneratedImage(data.dataUrl); setToast("تصویر آماده شد 🖼️"); await loadArtifacts();
    } catch (error) { setToast(error instanceof Error ? error.message : "تولید تصویر ناموفق بود."); }
    finally { setBusy(false); }
  };

  const generateDoc = async () => {
    if (!user) { setAuthOpen(true); return; }
    if (!creationPrompt.trim() || busy) return;
    setBusy(true); setGeneratedDoc(null);
    try {
      const { response, data } = await jsonFetch("/api/generate/document", { method: "POST", body: JSON.stringify({ prompt: creationPrompt }) });
      if (!response.ok) throw new Error(data.error || "ساخت سند ناموفق بود.");
      setGeneratedDoc(data); await loadArtifacts(); setToast("سند آماده شد 📝");
    } catch (error) { setToast(error instanceof Error ? error.message : "ساخت سند ناموفق بود."); }
    finally { setBusy(false); }
  };

  const downloadFile = async (kind: "pdf" | "ppt") => {
    if (!user) { setAuthOpen(true); return; }
    if (!creationPrompt.trim() || busy) return;
    setBusy(true);
    try {
      const response = await fetch(`/api/generate/${kind}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompt: creationPrompt }) });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "ساخت فایل ناموفق بود.");
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url; link.download = kind === "ppt" ? "amirverse-presentation.pptx" : "amirverse-document.pdf";
      document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(url);
      await loadArtifacts(); setToast("فایل آماده و ذخیره شد 📦");
    } catch (error) { setToast(error instanceof Error ? error.message : "ساخت فایل ناموفق بود."); }
    finally { setBusy(false); }
  };

  const addGalleryImage = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/") || file.size > 8 * 1024 * 1024) { setToast("یک تصویر حداکثر ۸ مگابایتی انتخاب کن."); return; }
    try {
      const dataUrl = await compressImage(file);
      const item: GalleryItem = { id: crypto.randomUUID(), kind: "image", title: file.name.slice(0, 80), value: dataUrl };
      setGalleryItems((old: GalleryItem[]) => [...old, item].slice(-8)); setToast("تصویر به اتاق بازدید اضافه شد.");
    } catch { setToast("خواندن تصویر ناموفق بود."); }
  };

  const addGalleryText = () => {
    const value = galleryText.trim();
    if (!value) return;
    setGalleryItems((old: GalleryItem[]) => [...old, { id: crypto.randomUUID(), kind: "text" as const, title: "یادداشت شخصی", value }].slice(-8));
    setGalleryText(""); setToast("متن به اتاق اضافه شد.");
  };

  const removeGalleryItem = (id: string) => setGalleryItems((old: GalleryItem[]) => old.filter((item: GalleryItem) => item.id !== id));

  const createPlace = () => {
    const name = window.prompt("نام مکان را وارد کن:");
    if (!name?.trim()) return;
    const description = window.prompt("توضیح مکان را وارد کن:") || "";
    const place: Place = { id: crypto.randomUUID(), name: name.trim(), description: description.trim() };
    setPlaces((old) => [...old, place]);
    setToast("مکان ساخته شد 🏢");
  };

  const createCharacter = () => {
    const name = window.prompt("نام شخصیت را وارد کن:");
    if (!name?.trim()) return;
    const role = window.prompt("نقش شخصیت را وارد کن:") || "شخصیت";
    const description = window.prompt("توضیح شخصیت را وارد کن:") || "";
    const character: Character = { id: crypto.randomUUID(), name: name.trim(), role: role.trim(), description: description.trim() };
    setCharacters((old) => [...old, character]);
    setToast("شخصیت ساخته شد 👤");
  };

  const createMission = () => {
    const title = window.prompt("عنوان مأموریت را وارد کن:");
    if (!title?.trim()) return;
    const description = window.prompt("توضیح مأموریت را وارد کن:") || "";
    const mission: Mission = { id: crypto.randomUUID(), title: title.trim(), description: description.trim(), done: false };
    setMissions((old) => [...old, mission]);
    setToast("مأموریت ساخته شد 🎯");
  };

  const installApp = async () => {
    if (!installPrompt.current) return;
    await installPrompt.current.prompt();
    installPrompt.current = null; setShowInstall(false);
  };

  const title = sectionTitle[section];
  const worldGallery = section === "visit" && insideVisitRoom;
  const isGuest = !user;

  if (loadingSession) return <main className="boot-screen"><div className="boot-orb">A</div><div>در حال آماده‌سازی Amirverse…</div></main>;

  if (entry) {
    return <>
      <main className="entry-screen">
        <div className="entry-sky" />
        <div className="entry-moon" />
        <div className="entry-island i1" /><div className="entry-island i2" /><div className="entry-island i3" />
        <div className="entry-floor" />
        <div className="entry-person" />
        <button className="entry-theme" onClick={() => setPreferences((p: Preferences) => ({ ...p, theme: p.theme === "dark" ? "light" : "dark" }))}>{preferences.theme === "dark" ? "☾" : "☀"}</button>
        <button className="entry-profile" onClick={() => { setAuthOpen(true); setAuthMode(user ? "login" : "login"); }}>{user ? `◯ ${user.name}` : "ورود"}</button>
        <section className="entry-content-v4">
          <div className="logo-a">A</div>
          <div className="logo-word">AMIRVERSE</div>
          <button className="entry-enter" onClick={enterWorld}>ورود به دنیا <span>←</span></button>
          <div className="entry-bottom">برای شروع روی دکمه ورود به دنیا بزن</div>
        </section>
      </main>
      {authOpen && <AuthModal mode={authMode} value={auth} setValue={setAuth} error={authError} submit={runAuth} close={() => setAuthOpen(false)} setMode={setAuthMode} />}
    </>;
  }

  return <main className="app-shell">
    <WorldCanvas lowPower={preferences.lowPower} quality={preferences.quality} motion={preferences.motion} activeSection={section} gallery={worldGallery} galleryItems={galleryItems} onNavigate={openSection} onGallerySelect={setGallerySelected} />
    <div className="world-overlay" />

    <header className="topbar glass">
      <button className="brand-mini" onClick={() => openSection("home")} aria-label="خانه Amirverse"><span>A</span> AMIRVERSE</button>
      <div className="top-actions">
        {showInstall && <button className="install-btn" onClick={installApp}>نصب</button>}
        {isGuest ? <button className="guest-pill" onClick={() => setAuthOpen(true)}>مهمان · ورود</button> : <button className="guest-pill" onClick={() => setAuthOpen(true)}>◯ {user?.name}</button>}
        <button className="circle-btn" onClick={() => setPreferences((p: Preferences) => ({ ...p, theme: p.theme === "dark" ? "light" : "dark" }))}>{preferences.theme === "dark" ? "☾" : "☀"}</button>
        <button className="circle-btn" onClick={() => openSection("control")}>⚙</button>
      </div>
    </header>

    <div className="world-heading"><small>دنیای شخصی من</small><h1>{title}</h1></div>
    <button className="logout-btn glass" onClick={isGuest ? () => setEntry(true) : logout}>{isGuest ? "خروج از دنیا" : "خروج"}</button>

    <nav className="bottom-nav glass" aria-label="ناوبری اصلی">
      {nav.map(([id, label, icon]) => <button key={id} className={section === id ? "active" : ""} onClick={() => openSection(id)}><span>{icon}</span><small>{label}</small></button>)}
    </nav>


  <button className="open-panel glass" onClick={() => insideVisitRoom ? (setInsideVisitRoom(false), setPanelOpen(true)) : setPanelOpen((v) => !v)}>{insideVisitRoom ? "↩ خروج از اتاق" : (panelOpen ? "بستن پنل" : "نمایش پنل")}</button>

    {panelOpen && <aside className="panel glass" aria-label="پنل Amirverse">
      <div className="panel-handle" />
      <div className="panel-head"><div><small>AMIRVERSE</small><h2>{title}</h2></div><button className="circle-btn" onClick={() => setPanelOpen(false)}>×</button></div>
      {section === "home" && <HomePanel user={user} open={openSection} />}
      {section === "visit" && <VisitPanel items={galleryItems} addImage={addGalleryImage} text={galleryText} setText={setGalleryText} addText={addGalleryText} remove={removeGalleryItem} enterRoom={enterVisitRoom} />}
      {section === "create" && <CreatePanel open={openSection} items={galleryItems} addImage={addGalleryImage} text={galleryText} setText={setGalleryText} addText={addGalleryText} remove={(id) => setGalleryItems((prev) => prev.filter((item) => item.id !== id))} createPlace={createPlace} createCharacter={createCharacter} createMission={createMission} />}
      {section === "ai" && <AiPanel user={user} chat={chat} message={message} setMessage={setMessage} sendChat={sendChat} busy={busy} />}
      {section === "memory" && <MemoryPanel user={user} memory={memory} input={memoryInput} setInput={setMemoryInput} save={saveMemory} remove={removeMemory} clearAll={clearAllMemory} />}
      {section === "control" && <ControlPanel preferences={preferences} setPreferences={setPreferences} onLogout={logout} installAvailable={Boolean(installPrompt.current)} install={installApp} />}
    </aside>}

    {toast && <div className="toast">{toast}</div>}
    {gallerySelected && <GalleryModal item={gallerySelected} close={() => setGallerySelected(null)} />}
    {authOpen && !entry && <AuthModal mode={authMode} value={auth} setValue={setAuth} error={authError} submit={runAuth} close={() => setAuthOpen(false)} setMode={setAuthMode} />}
  </main>;
}


function AuthModal({ mode, setMode, value, setValue, error, submit, close }: any) {
  return <div className="modal-backdrop" role="dialog" aria-modal="true">
    <form className="modal glass" onSubmit={(e: FormEvent) => { e.preventDefault(); void submit(); }}>
      <button type="button" className="modal-close circle-btn" onClick={close}>×</button>
      <div className="logo-a small">A</div>
      <h2>{mode === "login" ? "ورود به دنیا" : "ساخت حساب"}</h2>
      <p>{mode === "login" ? "به دنیای خودت برگرد." : "یک حساب برای حافظه و ابزارهای هوشمند Amirverse بساز."}</p>
      {mode === "register" && <input autoFocus required autoComplete="name" placeholder="نام" value={value.name} onChange={(e: ChangeEvent<HTMLInputElement>) => setValue({ ...value, name: e.target.value })} />}
      <input required autoComplete="email" inputMode="email" dir="ltr" placeholder="ایمیل" value={value.email} onChange={(e: ChangeEvent<HTMLInputElement>) => setValue({ ...value, email: e.target.value })} />
      <input required minLength={8} maxLength={128} autoComplete={mode === "login" ? "current-password" : "new-password"} dir="ltr" type="password" placeholder="گذرواژه" value={value.password} onChange={(e: ChangeEvent<HTMLInputElement>) => setValue({ ...value, password: e.target.value })} />
      <button className="entry-enter full" type="submit">{mode === "login" ? "ورود" : "ساخت حساب"}</button>
      {error && <div className="error">{error}</div>}
      <button type="button" className="switch-auth" onClick={() => { setMode(mode === "login" ? "register" : "login"); }}>{mode === "login" ? "حساب ندارم؛ ساخت حساب" : "قبلاً حساب دارم؛ ورود"}</button>
    </form>
  </div>;
}

function HomePanel({ open, user }: { open: (section: Section) => void; user: User }) {
  return <div className="stack">
    <div className="hero-card">
      <div className="hero-orb">A</div>
      <div><small>{user ? `خوش آمدی ${user.name}` : "حالت مهمان"}</small><h3>مرکز دنیای Amirverse</h3><p>می‌توانی در دنیا حرکت کنی، وارد ساختمان‌ها شوی یا از پنل سریع استفاده کنی.</p></div>
    </div>
    <div className="quick-grid">
      {[["visit", "▣", "بازدید", "اتاق و گالری"], ["create", "✦", "ساخت", "تصویر و فایل"], ["ai", "◉", "دستیار", "فرمان و گفت‌وگو"], ["memory", "♧", "حافظه", "یادآوری‌های من"]].map(([id, icon, title, text]) => <button key={id} onClick={() => open(id as Section)}><b>{icon}</b><strong>{title}</strong><span>{text}</span></button>)}
    </div>
    <div className="info-card"><span>💡</span><div><strong>کنترل ۲بعدی</strong><p>روی موبایل با با لمس یا کلیک روی محیط حرکت کن.</p></div></div>
  </div>;
}

function VisitPanel({ items, addImage, text, setText, addText, remove, enterRoom }: { items: GalleryItem[]; addImage: (event: ChangeEvent<HTMLInputElement>) => void; text: string; setText: (v: string) => void; addText: () => void; remove: (id: string) => void; enterRoom: () => void }) {
  return <div className="stack">
    <div className="hero-card"><div><small>اتاق شخصی ۲بعدی</small><h3>بازدید</h3><p>عکس‌ها و متن‌های خودت را به این اتاق اضافه کن. بعد وارد اتاق ۲بعدی شو و روی قاب‌ها بزن.</p></div></div>
        <button className="primary-btn" onClick={enterRoom}>🚪 ورود به اتاق</button>
    <div className="upload-row"><label className="action-card"><input type="file" accept="image/*" hidden onChange={addImage} /><span>🖼️</span><strong>افزودن عکس</strong><small>از گوشی</small></label><div className="action-card text-action"><span>📝</span><strong>افزودن متن</strong><small>برای قاب‌ها</small></div></div>
    <div className="text-add"><textarea className="prompt-box small-box" placeholder="مثلاً: جمله یا خاطره‌ای که می‌خواهی در اتاق باشد…" value={text} onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setText(e.target.value)} /><button className="primary-btn" onClick={addText}>افزودن به اتاق</button></div>
    <div className="gallery-list">
      {items.length === 0 && <div className="empty-card">هنوز چیزی به اتاق اضافه نکرده‌ای.</div>}
      {items.map((item) => <div className="gallery-row" key={item.id}>{item.kind === "image" ? <img src={item.value} alt="قاب شخصی" /> : <div className="text-thumb">📝</div>}<div><strong>{item.title}</strong><small>{item.kind === "image" ? "تصویر" : "متن"}</small></div><button onClick={() => remove(item.id)}>حذف</button></div>)}
    </div>
  </div>;
}

function CreatePanel({ open, items, addImage, text, setText, addText, remove, createPlace, createCharacter, createMission }: {
  open: (section: Section) => void;
  items: GalleryItem[];
  addImage: (event: ChangeEvent<HTMLInputElement>) => void;
  text: string;
  setText: (v: string) => void;
  addText: () => void;
  remove: (id: string) => void;
  createPlace: () => void;
  createCharacter: () => void;
  createMission: () => void;
}) {
  return (
    <div className="stack">
      <div className="hero-card">
        <div>
          <small>AMIRVERSE LAB</small>
          <h3>آزمایشگاه Amirverse</h3>
          <p>
            اینجا دنیای Amirverse را می‌سازی و مدیریت می‌کنی؛
            از اتاق و مکان‌ها گرفته تا تصاویر، نوشته‌ها، شخصیت‌ها و مأموریت‌ها.
          </p>
        </div>
      </div>

      <div className="quick-grid">
        <button className="action-card" onClick={() => open("visit")}>
          <b>🚪</b>
          <strong>مدیریت اتاق</strong>
          <span>ورود و مدیریت اتاق بازدید</span>
        </button>

        <label className="action-card">
          <input
            type="file"
            accept="image/*"
            hidden
            onChange={addImage}
          />
          <b>🖼️</b>
          <strong>افزودن تصویر</strong>
          <span>قرار دادن تصویر داخل اتاق</span>
        </label>

        <button className="action-card" onClick={addText}>
          <b>📝</b>
          <strong>افزودن نوشته</strong>
          <span>ساخت قاب متنی در اتاق</span>
        </button>

        <button className="action-card" onClick={createPlace}>
          <b>🏢</b>
          <strong>ساخت مکان</strong>
          <span>ساختمان و محیط‌های جدید</span>
        </button>

        <button
          className="action-card"
          onClick={createCharacter}
        >
          <b>👤</b>
          <strong>ساخت شخصیت</strong>
          <span>شخصیت و NPC جدید</span>
        </button>

        <button
          className="action-card"
          onClick={createMission}
        >
          <b>🎯</b>
          <strong>ساخت مأموریت</strong>
          <span>هدف و فعالیت برای جهان</span>
        </button>
      </div>

      <div className="text-add">
        <textarea
          className="prompt-box small-box"
          placeholder="نوشته‌ای که می‌خواهی داخل اتاق قرار بگیرد..."
          value={text}
          onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
            setText(e.target.value)
          }
        />
        <button className="primary-btn" onClick={addText}>
          قرار دادن نوشته در اتاق
        </button>
      </div>

      <div className="info-card">
        <span>💾</span>
        <div>
          <strong>ذخیره خودکار</strong>
          <p>
            تصاویر و نوشته‌های اتاق در حافظه مرورگر ذخیره می‌شوند.
          </p>
        </div>
      </div>

      <div className="gallery-list">
        {items.length === 0 && (
          <div className="empty-card">
            هنوز چیزی به دنیای تو اضافه نشده.
          </div>
        )}

        {items.map((item) => (
          <div className="gallery-row" key={item.id}>
            {item.kind === "image" ? (
              <img src={item.value} alt={item.title} />
            ) : (
              <div className="text-thumb">📝</div>
            )}

            <div>
              <strong>{item.title}</strong>
              <small>
                {item.kind === "image" ? "تصویر داخل اتاق" : "نوشته داخل اتاق"}
              </small>
            </div>

            <button onClick={() => remove(item.id)}>
              حذف
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function AiPanel({ user, chat, message, setMessage, sendChat, busy }: any) {
  return <div className="chat-panel">
    {!user && <div className="login-needed"><b>🤖</b><strong>دستیار آماده است</strong><p>برای چت واقعی، حافظه و کنترل ابزارها وارد حساب شو.</p><button className="primary-btn" onClick={() => sendChat("سلام")}>ورود</button></div>}
    <div className="chat-log"><div className="bubble ai"><b>Amirverse AI</b><span>سلام 👋 من دستیار این دنیا هستم. می‌توانم بخش‌ها را باز کنم، تنظیمات را عوض کنم و چیزهایی را که خودت بخواهی به حافظه بسپارم.</span></div>{chat.map((m: ChatMessage, i: number) => <div key={`${m.role}-${i}`} className={`bubble ${m.role}`}><span>{m.content}</span></div>)}{busy && <div className="bubble ai"><span>دارم انجامش می‌دم…</span></div>}</div>
    <div className="quick-actions"><button onClick={() => sendChat("بخش بازدید را باز کن")}>بازدید را باز کن</button><button onClick={() => sendChat("حالت کم‌مصرف را روشن کن")}>کم‌مصرف</button><button onClick={() => sendChat("کیفیت نمایش را روی بالا بگذار")}>کیفیت بالا</button></div>
    <form onSubmit={(e: FormEvent) => { e.preventDefault(); void sendChat(); }}><input value={message} onChange={(e: ChangeEvent<HTMLInputElement>) => setMessage(e.target.value)} placeholder="مثلاً: این نکته را به حافظه‌ام بسپار…" /><button aria-label="ارسال">➤</button></form>
  </div>;
}

function MemoryPanel({ user, memory, input, setInput, save, remove, clearAll }: any) {
  return <div className="stack">
    <div className="hero-card"><div><small>{user ? "حافظه سروری" : "حالت مهمان"}</small><h3>{user ? `${memory.length} یادآوری` : "نیازمند حساب"}</h3><p>{user ? "اطلاعات این بخش در دیتابیس سمت سرور نگهداری می‌شود." : "برای ذخیره پایدار، حساب بساز یا وارد شو."}</p></div></div>
    <form className="memory-form" onSubmit={(e: FormEvent) => { e.preventDefault(); void save(); }}><input disabled={!user} value={input} onChange={(e: ChangeEvent<HTMLInputElement>) => setInput(e.target.value)} placeholder="مثلاً: من تم تاریک را دوست دارم…" /><button disabled={!user}>ذخیره</button></form>
    <div className="memory-tools"><button disabled={!user || !memory.length} onClick={clearAll}>پاک کردن همه</button><button disabled={!memory.length} onClick={() => navigator.clipboard?.writeText(JSON.stringify(memory, null, 2))}>کپی JSON</button></div>
    {memory.map((m: Memory) => <div className="memory-item" key={m.id}><div><strong>{m.content}</strong><small>{m.source} · {new Date(m.createdAt).toLocaleDateString("fa-IR")}</small></div><button onClick={() => remove(m.id)}>حذف</button></div>)}
  </div>;
}

function ControlPanel({ preferences, setPreferences, onLogout, installAvailable, install }: { preferences: Preferences; setPreferences: (p: Preferences) => void; onLogout: () => void; installAvailable: boolean; install: () => Promise<void> }) {
  return <div className="stack">
    <div className="setting-row"><span>تم</span><div className="segmented"><button className={preferences.theme === "dark" ? "sel" : ""} onClick={() => setPreferences({ ...preferences, theme: "dark" })}>تاریک</button><button className={preferences.theme === "light" ? "sel" : ""} onClick={() => setPreferences({ ...preferences, theme: "light" })}>روشن</button></div></div>
    <div className="setting-row"><span>کیفیت نمایش</span><div className="segmented">{(["performance", "balanced", "high"] as WorldQuality[]).map((q) => <button key={q} className={preferences.quality === q ? "sel" : ""} onClick={() => setPreferences({ ...preferences, quality: q, lowPower: q === "performance" })}>{q === "performance" ? "سبک" : q === "balanced" ? "متعادل" : "بالا"}</button>)}</div></div>
    <Toggle label="حالت کم‌مصرف" on={preferences.lowPower} onChange={(v) => setPreferences({ ...preferences, lowPower: v })} />
    <Toggle label="انیمیشن‌ها" on={preferences.motion} onChange={(v) => setPreferences({ ...preferences, motion: v })} />
    <Toggle label="صدای محیط" on={preferences.sound} onChange={(v) => setPreferences({ ...preferences, sound: v })} />
    {installAvailable && <button className="secondary-btn" onClick={() => void install()}>نصب Amirverse روی گوشی</button>}
    <div className="info-card"><span>📱</span><div><strong>طراحی اصلی: موبایل</strong><p>تجربه دسکتاپ هم هست، اما کنترل و چیدمان برای گوشی اول طراحی شده.</p></div></div>
    <button className="danger-btn" onClick={onLogout}>خروج از حساب</button>
  </div>;
}

function Toggle({ label, on, onChange }: { label: string; on: boolean; onChange: (v: boolean) => void }) {
  return <div className="setting-row"><span>{label}</span><button className={`switch ${on ? "on" : ""}`} onClick={() => onChange(!on)} aria-label={label}><i /></button></div>;
}

function GalleryModal({ item, close }: { item: GalleryItem; close: () => void }) {
  return <div className="modal-backdrop" role="dialog" aria-modal="true" onClick={close}>
    <div className="gallery-modal glass" onClick={(e: ReactMouseEvent<HTMLDivElement>) => e.stopPropagation()}><button className="circle-btn modal-close" onClick={close}>×</button><small>{item.kind === "image" ? "تصویر" : "متن"}</small><h2>{item.title}</h2>{item.kind === "image" ? <img src={item.value} alt="نمایش بزرگ قاب" /> : <p className="gallery-text">{item.value}</p>}</div>
  </div>;
}

function compressImage(file: File) {
  return new Promise<string>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const maxSide = 1280;
      const ratio = Math.min(1, maxSide / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(img.width * ratio));
      canvas.height = Math.max(1, Math.round(img.height * ratio));
      const ctx = canvas.getContext("2d");
      if (!ctx) { URL.revokeObjectURL(url); reject(new Error("canvas")); return; }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", 0.78));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("image")); };
    img.src = url;
  });
}
