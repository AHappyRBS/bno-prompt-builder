import { useState, useEffect, useCallback } from "react";

const HASH = "de7c63aef71cf751908ddba28869870c140bed193bc1d370af1c58fe1e26490b";
const DRAFT_KEY = "bno_prompt_builder_draft";

async function sha256(str) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}

const PLATFORMS = ["Android", "iOS", "Both"];
const TEST_TYPES = ["New Test", "Update Locators", "Fix Failing Test", "Add to Existing Test"];
const initialElement = () => ({
  name: "",
  android: { contentDesc: "", text: "", className: "", xpath: "" },
  ios: { contentDesc: "", text: "", className: "", xpath: "" },
  notes: ""
});
const initialStep = () => ({ description: "", expected: "" });
const initialState = () => ({
  testName: "", testType: "New Test", platform: "Android",
  xrayKey: "", screen: "",
  elements: [initialElement()],
  steps: [initialStep(), initialStep(), initialStep()],
  notes: ""
});

const globalStyles = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&family=Syne:wght@700;800&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html, body, #root { width: 100%; min-height: 100vh; background: #0e0e0e; }
  ::-webkit-scrollbar { width: 4px; }
  ::-webkit-scrollbar-track { background: #1a1a1a; }
  ::-webkit-scrollbar-thumb { background: #E8B84B; border-radius: 2px; }
  input, textarea, select { outline: none; }
  input::placeholder, textarea::placeholder { color: #444; }
  @keyframes shake { 0%,100%{transform:translateX(0)} 20%,60%{transform:translateX(-8px)} 40%,80%{transform:translateX(8px)} }
  @keyframes fadeIn { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
  @keyframes pulse { 0%,100%{opacity:0.3} 50%{opacity:1} }
  @keyframes savedPop { 0%{opacity:0;transform:translateY(4px)} 20%{opacity:1;transform:translateY(0)} 80%{opacity:1} 100%{opacity:0} }
`;

function LoginGate({ onUnlock }) {
  const [pw, setPw] = useState("");
  const [error, setError] = useState(false);
  const [shake, setShake] = useState(false);

  const attempt = async () => {
    const hash = await sha256(pw);
    if (hash === HASH) {
      onUnlock();
    } else {
      setError(true); setShake(true); setPw("");
      setTimeout(() => setShake(false), 500);
    }
  };

  return (
    <div style={{ width: "100vw", minHeight: "100vh", background: "#0e0e0e", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Mono', monospace" }}>
      <style>{globalStyles}</style>
      <div style={{ animation: "fadeIn 0.4s ease", textAlign: "center", width: "360px", padding: "0 24px" }}>
        <div style={{ fontFamily: "'Syne', sans-serif", fontSize: "28px", fontWeight: 800, color: "#E8B84B", letterSpacing: "-0.5px", marginBottom: "4px" }}>B&O // PROMPT BUILDER</div>
        <div style={{ fontSize: "10px", color: "#444", letterSpacing: "3px", marginBottom: "48px" }}>APPIUM TEST FRAMEWORK</div>
        <div style={{ animation: shake ? "shake 0.4s ease" : "none" }}>
          <div style={{ fontSize: "10px", color: "#555", letterSpacing: "2px", marginBottom: "10px", textAlign: "left" }}>ACCESS CODE</div>
          <input type="password" value={pw} onChange={e => { setPw(e.target.value); setError(false); }} onKeyDown={e => e.key === "Enter" && attempt()} placeholder="Enter access code"
            style={{ width: "100%", background: "#111", border: `1px solid ${error ? "#c0392b" : "#2a2a2a"}`, borderRadius: "6px", padding: "12px 16px", color: "#e8e8e8", fontFamily: "'DM Mono', monospace", fontSize: "14px", marginBottom: "8px" }} />
          {error && <div style={{ fontSize: "11px", color: "#c0392b", letterSpacing: "1px", marginBottom: "12px", textAlign: "left" }}>INCORRECT ACCESS CODE</div>}
          <button onClick={attempt} style={{ width: "100%", background: "#E8B84B", color: "#0e0e0e", border: "none", padding: "13px", borderRadius: "6px", cursor: "pointer", fontFamily: "'Syne', sans-serif", fontSize: "13px", fontWeight: 800, letterSpacing: "1px", marginTop: "4px" }}>ENTER →</button>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [unlocked, setUnlocked] = useState(false);
  if (!unlocked) return <LoginGate onUnlock={() => setUnlocked(true)} />;
  return <PromptBuilder />;
}

function PromptBuilder() {
  const [form, setForm] = useState(() => {
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      return saved ? JSON.parse(saved) : initialState();
    } catch { return initialState(); }
  });

  const [generated, setGenerated] = useState("");
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("builder");
  const [draftSaved, setDraftSaved] = useState(false);
  const [hasDraft, setHasDraft] = useState(() => !!localStorage.getItem(DRAFT_KEY));

  const { testName, testType, platform, xrayKey, screen, elements, steps, notes } = form;

  const update = (field, value) => setForm(f => ({ ...f, [field]: value }));

  // Auto-save draft on every change
  useEffect(() => {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(form));
      setHasDraft(true);
      setDraftSaved(true);
      const t = setTimeout(() => setDraftSaved(false), 2000);
      return () => clearTimeout(t);
    } catch {}
  }, [form]);

  const clearDraft = () => {
    localStorage.removeItem(DRAFT_KEY);
    setForm(initialState());
    setHasDraft(false);
    setGenerated("");
    setActiveTab("builder");
  };

  const addElement = () => update("elements", [...elements, initialElement()]);
  const removeElement = (i) => update("elements", elements.filter((_, idx) => idx !== i));
  const updateElement = (i, plat, field, value) => {
    const updated = [...elements];
    if (plat === "name" || plat === "notes") updated[i][plat] = value;
    else updated[i][plat][field] = value;
    update("elements", updated);
  };

  const addStep = () => update("steps", [...steps, initialStep()]);
  const removeStep = (i) => update("steps", steps.filter((_, idx) => idx !== i));
  const updateStep = (i, field, value) => {
    const updated = [...steps];
    updated[i][field] = value;
    update("steps", updated);
  };

  const buildContext = () => {
    const validElements = elements.filter(e => e.name || e.android.contentDesc || e.android.xpath || e.android.text || e.ios.contentDesc || e.ios.xpath || e.ios.text);
    const validSteps = steps.filter(s => s.description.trim());
    return `
Test type: ${testType}
Test name: ${testName || "not specified"}
Platform: ${platform}
Screen: ${screen || "not specified"}
Xray key: ${xrayKey || "TBD"}
${notes ? `Additional notes: ${notes}` : ""}

ELEMENTS FROM APPIUM INSPECTOR:
${validElements.length ? validElements.map((e, i) => `
Element ${i + 1}${e.name ? ` — ${e.name}` : ""}:
  ANDROID:
${e.android.contentDesc ? `    - content-desc: ${e.android.contentDesc}` : ""}
${e.android.text ? `    - text: ${e.android.text}` : ""}
${e.android.className ? `    - class: ${e.android.className}` : ""}
${e.android.xpath ? `    - xpath: ${e.android.xpath}` : ""}
  iOS:
${e.ios.contentDesc ? `    - content-desc/name: ${e.ios.contentDesc}` : ""}
${e.ios.text ? `    - text: ${e.ios.text}` : ""}
${e.ios.className ? `    - class: ${e.ios.className}` : ""}
${e.ios.xpath ? `    - xpath: ${e.ios.xpath}` : ""}
${e.notes ? `  Notes: ${e.notes}` : ""}
`).join("") : "No elements provided"}

TEST STEPS:
${validSteps.length ? validSteps.map((s, i) =>
  `${i + 1}. ${s.description}${s.expected ? `\n   Expected: ${s.expected}` : ""}`
).join("\n") : "No steps provided"}
`.trim();
  };

  const generate = async () => {
    setLoading(true);
    setActiveTab("output");
    const context = buildContext();
    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": import.meta.env.VITE_ANTHROPIC_KEY,
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true"
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: `You are a prompt engineer for a mobile test automation framework.
The framework uses Python + pytest + Appium 2.x for Android and iOS.
Key conventions:
- Page Object Model: locators only in locators/locators.py grouped by screen
- Locators always have android and ios keys
- If a locator uses content-desc, prefer AppiumBy.ACCESSIBILITY_ID
- If a locator uses text, prefer AppiumBy.ANDROID_UIAUTOMATOR with UiSelector().text()
- If ios value is unknown, set it to "" with a # TBD comment
- Tests use explicit waits only, no sleep()
- Screenshots on failure only
- Xray markers: @pytest.mark.xray("CLOUD-XXX")
- Steps use steps fixture: steps.pass_step() / steps.fail_step()
- Each step has an expected result — use it to write the assertion for that step
- CLI flags: --platform, --skip-login, --accept-permissions
Generate a precise Claude Code prompt based on the user input.
Start with "Read CLAUDE.md first." and be ready to paste directly into Claude Code.
Output only the prompt, nothing else.`,
          messages: [{ role: "user", content: `Generate a Claude Code prompt for this test:\n\n${context}` }]
        })
      });
      const data = await response.json();
      setGenerated(data.content?.map(b => b.text || "").join("") || "Error generating prompt.");
    } catch {
      setGenerated("Error generating prompt. Please check your API key in .env");
    }
    setLoading(false);
  };

  const copy = () => {
    navigator.clipboard.writeText(generated);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{ width: "100vw", minHeight: "100vh", background: "#0e0e0e", color: "#e8e8e8", fontFamily: "'DM Mono', monospace" }}>
      <style>{globalStyles}</style>

      {/* Header */}
      <div style={{ width: "100%", borderBottom: "1px solid #1f1f1f", padding: "20px 40px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontFamily: "'Syne', sans-serif", fontSize: "22px", fontWeight: 800, letterSpacing: "-0.5px", color: "#E8B84B" }}>B&O // PROMPT BUILDER</div>
          <div style={{ fontSize: "11px", color: "#555", marginTop: "2px", letterSpacing: "2px", display: "flex", alignItems: "center", gap: "12px" }}>
            APPIUM TEST FRAMEWORK
            {draftSaved && <span style={{ fontSize: "10px", color: "#2E7D32", letterSpacing: "1px", animation: "savedPop 2s ease forwards" }}>✓ DRAFT SAVED</span>}
          </div>
        </div>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          {hasDraft && (
            <button onClick={clearDraft} style={{ ...addBtnStyle, color: "#c0392b", borderColor: "#c0392b33", fontSize: "10px" }}>
              CLEAR DRAFT
            </button>
          )}
          {["builder", "output"].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{
              background: activeTab === tab ? "#E8B84B" : "transparent",
              color: activeTab === tab ? "#0e0e0e" : "#555",
              border: "1px solid " + (activeTab === tab ? "#E8B84B" : "#2a2a2a"),
              padding: "6px 20px", borderRadius: "4px", cursor: "pointer",
              fontFamily: "'DM Mono', monospace", fontSize: "11px", letterSpacing: "1px", textTransform: "uppercase"
            }}>{tab}</button>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: "960px", margin: "0 auto", padding: "40px" }}>
        {activeTab === "builder" && (
          <div style={{ display: "grid", gap: "24px" }}>

            <Section title="01 — TEST INFO">
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
                <Field label="TEST NAME"><input value={testName} onChange={e => update("testName", e.target.value)} placeholder="e.g. test_sign_in_google" style={inputStyle} /></Field>
                <Field label="SCREEN"><input value={screen} onChange={e => update("screen", e.target.value)} placeholder="e.g. Login Screen" style={inputStyle} /></Field>
                <Field label="XRAY KEY"><input value={xrayKey} onChange={e => update("xrayKey", e.target.value)} placeholder="e.g. CLOUD-001" style={inputStyle} /></Field>
                <Field label="TEST TYPE">
                  <select value={testType} onChange={e => update("testType", e.target.value)} style={inputStyle}>
                    {TEST_TYPES.map(t => <option key={t}>{t}</option>)}
                  </select>
                </Field>
              </div>
              <Field label="PLATFORM">
                <div style={{ display: "flex", gap: "8px", marginTop: "4px" }}>
                  {PLATFORMS.map(p => (
                    <button key={p} onClick={() => update("platform", p)} style={{
                      background: platform === p ? "#E8B84B" : "transparent",
                      color: platform === p ? "#0e0e0e" : "#555",
                      border: "1px solid " + (platform === p ? "#E8B84B" : "#2a2a2a"),
                      padding: "6px 24px", borderRadius: "4px", cursor: "pointer",
                      fontFamily: "'DM Mono', monospace", fontSize: "11px", letterSpacing: "1px"
                    }}>{p.toUpperCase()}</button>
                  ))}
                </div>
              </Field>
            </Section>

            <Section title="02 — APPIUM ELEMENTS">
              <div style={{ fontSize: "11px", color: "#555", marginBottom: "16px", letterSpacing: "1px" }}>ADD ONE ENTRY PER ELEMENT — FILL ANDROID, iOS, OR BOTH</div>
              {elements.map((el, i) => (
                <div key={i} style={{ background: "#141414", border: "1px solid #1f1f1f", borderRadius: "6px", padding: "16px", marginBottom: "12px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                    <input value={el.name} onChange={e => updateElement(i, "name", null, e.target.value)}
                      placeholder={`Element ${i + 1} name (e.g. Continue with Google)`}
                      style={{ ...inputStyle, flex: 1, marginRight: "12px", background: "#1a1a1a", fontWeight: 500, color: "#E8B84B" }} />
                    {elements.length > 1 && <button onClick={() => removeElement(i)} style={{ background: "transparent", border: "none", color: "#444", cursor: "pointer", fontSize: "20px", lineHeight: 1 }}>×</button>}
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                    <div style={{ border: "1px solid #2a2a2a", borderRadius: "6px", padding: "12px" }}>
                      <div style={{ fontSize: "10px", color: "#4CAF50", letterSpacing: "2px", marginBottom: "12px", fontWeight: 500 }}>🤖 ANDROID</div>
                      <div style={{ display: "grid", gap: "10px" }}>
                        <Field label="CONTENT-DESC"><input value={el.android.contentDesc} onChange={e => updateElement(i, "android", "contentDesc", e.target.value)} placeholder="e.g. Continue with Google" style={inputStyle} /></Field>
                        <Field label="TEXT"><input value={el.android.text} onChange={e => updateElement(i, "android", "text", e.target.value)} placeholder="e.g. Continue with Google" style={inputStyle} /></Field>
                        <Field label="CLASS"><input value={el.android.className} onChange={e => updateElement(i, "android", "className", e.target.value)} placeholder="e.g. android.view.ViewGroup" style={inputStyle} /></Field>
                        <Field label="XPATH"><input value={el.android.xpath} onChange={e => updateElement(i, "android", "xpath", e.target.value)} placeholder='e.g. //android.view.ViewGroup[@content-desc="..."]' style={inputStyle} /></Field>
                      </div>
                    </div>
                    <div style={{ border: "1px solid #2a2a2a", borderRadius: "6px", padding: "12px" }}>
                      <div style={{ fontSize: "10px", color: "#64B5F6", letterSpacing: "2px", marginBottom: "12px", fontWeight: 500 }}>🍎 iOS</div>
                      <div style={{ display: "grid", gap: "10px" }}>
                        <Field label="CONTENT-DESC / NAME"><input value={el.ios.contentDesc} onChange={e => updateElement(i, "ios", "contentDesc", e.target.value)} placeholder="e.g. Continue with Google" style={inputStyle} /></Field>
                        <Field label="TEXT"><input value={el.ios.text} onChange={e => updateElement(i, "ios", "text", e.target.value)} placeholder="e.g. Continue with Google" style={inputStyle} /></Field>
                        <Field label="CLASS"><input value={el.ios.className} onChange={e => updateElement(i, "ios", "className", e.target.value)} placeholder="e.g. XCUIElementTypeButton" style={inputStyle} /></Field>
                        <Field label="XPATH"><input value={el.ios.xpath} onChange={e => updateElement(i, "ios", "xpath", e.target.value)} placeholder='e.g. //XCUIElementTypeButton[@name="..."]' style={inputStyle} /></Field>
                      </div>
                    </div>
                  </div>
                  <div style={{ marginTop: "12px" }}>
                    <Field label="NOTES"><input value={el.notes} onChange={e => updateElement(i, "notes", null, e.target.value)} placeholder="e.g. only visible after tapping More Options" style={inputStyle} /></Field>
                  </div>
                </div>
              ))}
              <button onClick={addElement} style={addBtnStyle}>+ ADD ELEMENT</button>
            </Section>

            <Section title="03 — TEST STEPS">
              <div style={{ display: "grid", gridTemplateColumns: "26px 1fr 1fr 24px", gap: "8px", marginBottom: "8px" }}>
                <div />
                <div style={{ fontSize: "10px", color: "#444", letterSpacing: "1.5px" }}>STEP</div>
                <div style={{ fontSize: "10px", color: "#444", letterSpacing: "1.5px" }}>EXPECTED RESULT</div>
                <div />
              </div>
              {steps.map((s, i) => (
                <div key={i} style={{ display: "grid", gridTemplateColumns: "26px 1fr 1fr 24px", gap: "8px", alignItems: "center", marginBottom: "10px" }}>
                  <div style={{ width: "26px", height: "26px", borderRadius: "50%", background: "#1a1a1a", border: "1px solid #2a2a2a", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px", color: "#E8B84B", flexShrink: 0 }}>{i + 1}</div>
                  <input value={s.description} onChange={e => updateStep(i, "description", e.target.value)} placeholder="e.g. Tap Continue with Google" style={inputStyle} />
                  <input value={s.expected} onChange={e => updateStep(i, "expected", e.target.value)} placeholder="e.g. Google webview opens" style={{ ...inputStyle, borderColor: s.expected ? "#2E7D32" : "#2a2a2a" }} />
                  {steps.length > 1 && <button onClick={() => removeStep(i)} style={{ background: "transparent", border: "none", color: "#444", cursor: "pointer", fontSize: "20px", lineHeight: 1 }}>×</button>}
                </div>
              ))}
              <button onClick={addStep} style={addBtnStyle}>+ ADD STEP</button>
            </Section>

            <Section title="04 — ADDITIONAL NOTES">
              <textarea value={notes} onChange={e => update("notes", e.target.value)} placeholder="Any extra context, known issues, special behaviour..." style={{ ...inputStyle, height: "90px", resize: "vertical", width: "100%" }} />
            </Section>

            <button onClick={generate} disabled={loading} style={{
              width: "100%", background: loading ? "#2a2a2a" : "#E8B84B",
              color: loading ? "#555" : "#0e0e0e", border: "none",
              padding: "15px", borderRadius: "6px", cursor: loading ? "not-allowed" : "pointer",
              fontFamily: "'Syne', sans-serif", fontSize: "14px", fontWeight: 800, letterSpacing: "1px"
            }}>{loading ? "GENERATING..." : "GENERATE CLAUDE CODE PROMPT →"}</button>
          </div>
        )}

        {activeTab === "output" && (
          <div>
            {loading ? (
              <div style={{ textAlign: "center", padding: "100px 0" }}>
                <div style={{ fontSize: "11px", color: "#E8B84B", letterSpacing: "3px", marginBottom: "20px" }}>GENERATING PROMPT</div>
                <div style={{ width: "48px", height: "2px", background: "#E8B84B", margin: "0 auto", animation: "pulse 1s ease-in-out infinite" }} />
              </div>
            ) : generated ? (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                  <div style={{ fontSize: "11px", color: "#555", letterSpacing: "2px" }}>READY TO PASTE INTO CLAUDE CODE</div>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button onClick={() => setActiveTab("builder")} style={{ ...addBtnStyle, padding: "6px 16px" }}>← BACK</button>
                    <button onClick={copy} style={{
                      background: copied ? "#2E7D32" : "#E8B84B", color: copied ? "#fff" : "#0e0e0e",
                      border: "none", padding: "6px 24px", borderRadius: "4px", cursor: "pointer",
                      fontFamily: "'DM Mono', monospace", fontSize: "11px", letterSpacing: "1px"
                    }}>{copied ? "✓ COPIED" : "COPY"}</button>
                  </div>
                </div>
                <div style={{ background: "#141414", border: "1px solid #1f1f1f", borderRadius: "8px", padding: "28px" }}>
                  <pre style={{ margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word", fontSize: "13px", lineHeight: "1.8", color: "#c8c8c8", fontFamily: "'DM Mono', monospace" }}>{generated}</pre>
                </div>
              </div>
            ) : (
              <div style={{ textAlign: "center", padding: "100px 0", color: "#444" }}>
                <div style={{ fontSize: "11px", letterSpacing: "2px", marginBottom: "20px" }}>NO PROMPT GENERATED YET</div>
                <button onClick={() => setActiveTab("builder")} style={addBtnStyle}>← GO TO BUILDER</button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div style={{ border: "1px solid #1f1f1f", borderRadius: "8px", overflow: "hidden" }}>
      <div style={{ padding: "12px 20px", borderBottom: "1px solid #1f1f1f", background: "#111" }}>
        <span style={{ fontSize: "11px", color: "#E8B84B", letterSpacing: "2px", fontWeight: 500 }}>{title}</span>
      </div>
      <div style={{ padding: "20px" }}>{children}</div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <div style={{ fontSize: "10px", color: "#444", letterSpacing: "1.5px", marginBottom: "6px" }}>{label}</div>
      {children}
    </div>
  );
}

const inputStyle = {
  background: "#0e0e0e", border: "1px solid #2a2a2a", borderRadius: "4px",
  padding: "8px 12px", color: "#e8e8e8", fontFamily: "'DM Mono', monospace",
  fontSize: "12px", width: "100%"
};

const addBtnStyle = {
  background: "transparent", border: "1px solid #2a2a2a", color: "#555",
  padding: "8px 16px", borderRadius: "4px", cursor: "pointer",
  fontFamily: "'DM Mono', monospace", fontSize: "11px", letterSpacing: "1px"
};