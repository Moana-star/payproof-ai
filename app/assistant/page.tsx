"use client";

import { useEffect, useRef, useState } from "react";
import { WorkspaceLayout } from "@/components/workspace-layout";

type Message = { role: "user" | "assistant"; content: string };
type Thread = { id: string; title: string; messages: Message[]; updatedAt: number };
const KEY = "payproof-assistant-session-v1";
const suggestions = [
  ["⇄", "Investigate a mismatch", "How should I investigate a reconciliation mismatch safely?"],
  ["✓", "Understand verification", "Explain the difference between a PayPal capture and bank settlement."],
  ["!", "Review an exception", "Give me a checklist for reviewing an incomplete payment."],
  ["✳", "Explore PayProof AI", "What can PayProof AI do, and what decisions must stay with a human?"]
];
const fresh = (): Thread => ({ id: crypto.randomUUID(), title: "New conversation", messages: [], updatedAt: Date.now() });

export default function AssistantPage() {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeId, setActiveId] = useState("");
  const [input, setInput] = useState("");
  const [caseId, setCaseId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [desktopHistory, setDesktopHistory] = useState(true);
  const bottom = useRef<HTMLDivElement>(null);
  const composer = useRef<HTMLTextAreaElement>(null);
  const active = threads.find((thread) => thread.id === activeId);
  const messages = active?.messages || [];

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(KEY);
      const list = saved ? JSON.parse(saved) as Thread[] : [];
      if (Array.isArray(list) && list.length) { setThreads(list); setActiveId(list[0].id); }
      else { const first = fresh(); setThreads([first]); setActiveId(first.id); }
    } catch { const first = fresh(); setThreads([first]); setActiveId(first.id); }
  }, []);

  useEffect(() => {
    if (threads.length) try { sessionStorage.setItem(KEY, JSON.stringify(threads.slice(0, 30))); } catch { /* storage unavailable */ }
  }, [threads]);

  useEffect(() => { bottom.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [messages, loading]);

  function updateThread(fn: (thread: Thread) => Thread) {
    setThreads((all) => all.map((thread) => thread.id === activeId ? fn(thread) : thread).sort((a, b) => b.updatedAt - a.updatedAt));
  }

  function newChat() {
    if (loading) return;
    const thread = fresh();
    setThreads((all) => [thread, ...all]);
    setActiveId(thread.id); setInput(""); setCaseId(""); setError(""); setHistoryOpen(false);
  }

  async function send(value?: string) {
    const text = (value ?? input).trim();
    if (!text || loading || !activeId) return;
    const user: Message = { role: "user", content: text };
    const history = [...messages, user];
    setInput(""); setError(""); setLoading(true);
    updateThread((thread) => ({
      ...thread,
      title: thread.messages.length ? thread.title : (text.length > 38 ? text.slice(0, 38) + "…" : text),
      messages: [...thread.messages, user, { role: "assistant", content: "" }],
      updatedAt: Date.now()
    }));
    if (composer.current) composer.current.style.height = "auto";
    try {
      const response = await fetch("/api/assistant/chat", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history.slice(-24), caseId: caseId || undefined })
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({})) as { error?: string };
        throw new Error(data.error || "The assistant could not respond. Please try again.");
      }
      if (!response.body) throw new Error("The response stream was unavailable.");
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = ""; let answer = ""; let done = false;
      const append = (chunk: string) => {
        answer += chunk;
        updateThread((thread) => ({ ...thread, messages: thread.messages.map((item, i) => i === thread.messages.length - 1 ? { ...item, content: answer } : item), updatedAt: Date.now() }));
      };
      while (!done) {
        const part = await reader.read(); done = part.done;
        buffer += decoder.decode(part.value || new Uint8Array(), { stream: !done });
        const lines = buffer.split("\n"); buffer = lines.pop() || "";
        for (const line of lines) {
          if (!line.startsWith("data:")) continue;
          const payload = line.slice(5).trim();
          if (!payload || payload === "[DONE]") continue;
          try {
            const data = JSON.parse(payload) as { choices?: Array<{ delta?: { content?: unknown } }> };
            const delta = data.choices?.[0]?.delta?.content;
            if (typeof delta === "string") append(delta);
          } catch { /* ignore stream keepalive */ }
        }
      }
      if (!answer.trim()) throw new Error("The assistant returned an empty response.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "The assistant is unavailable.");
      updateThread((thread) => ({ ...thread, messages: thread.messages[thread.messages.length - 1]?.content ? thread.messages : thread.messages.slice(0, -1), updatedAt: Date.now() }));
    } finally { setLoading(false); window.setTimeout(() => composer.current?.focus(), 20); }
  }

  return (
    <WorkspaceLayout title="AI assistant" eyebrow="PAYPROOF INTELLIGENCE" description="Ask questions, understand payment workflows, and investigate evidence with clear human-review boundaries.">
      <section className="pp-chat">
        <aside className={"pp-chat-history" + (desktopHistory ? "" : " hidden") + (historyOpen ? " mobile-visible" : "")}>
          <div className="pp-history-top"><button type="button" onClick={newChat}>＋ New chat</button><button type="button" className="pp-hide-history" onClick={() => setDesktopHistory(false)}>‹</button></div>
          <p>RECENT CONVERSATIONS</p>
          <div className="pp-history-list">
            {threads.map((thread) => <button key={thread.id} type="button" className={thread.id === activeId ? "selected" : ""} onClick={() => { if (!loading) { setActiveId(thread.id); setHistoryOpen(false); setError(""); } }}><span>◷</span><b>{thread.title}</b></button>)}
          </div>
          <div className="pp-history-bottom"><strong>◈ Private session history</strong><small>Conversation history stays in this browser tab session, not your PayProof account.</small><button type="button" onClick={() => { if (!loading) { const thread = fresh(); setThreads([thread]); setActiveId(thread.id); setCaseId(""); setError(""); try { sessionStorage.removeItem(KEY); } catch {} } }}>Clear history</button></div>
        </aside>

        <div className="pp-chat-main">
          <header className="pp-chat-head">
            <div className="pp-chat-brand">
              {!desktopHistory && <button type="button" aria-label="Show history" onClick={() => setDesktopHistory(true)}>☰</button>}
              <button className="pp-mobile-history" type="button" onClick={() => setHistoryOpen((open) => !open)}>☰ History</button>
              <div><strong>PayProof AI</strong><small><i /> Assistant</small></div>
            </div>
            <div className="pp-chat-tools">
              <label>Context <select value={caseId} onChange={(event) => setCaseId(event.target.value)}><option value="">General help</option><option value="completed-match">Sample: completed match</option><option value="amount-mismatch">Sample: amount mismatch</option><option value="pending-capture">Sample: pending capture</option></select></label>
              <button className="pp-mobile-new" type="button" onClick={newChat}>＋</button>
            </div>
          </header>

          <div className="pp-chat-scroll" aria-live="polite">
            {messages.length === 0 ? <div className="pp-chat-welcome">
              <div className="pp-chat-mark">✳</div>
              <small>YOUR PAYMENT OPERATIONS COPILOT</small>
              <h2>What can I help you understand?</h2>
              <p>Ask about payment evidence, reconciliation, exceptions, or PayProof workflows. I’ll explain what the records show and where human review is needed.</p>
              <div className="pp-suggestions">{suggestions.map(([icon, title, prompt]) => <button key={title} type="button" onClick={() => send(prompt)}><span>{icon}</span><b>{title}</b><small>{prompt}</small><i>↗</i></button>)}</div>
              <footer>✦ Evidence first. AI explains the record. Verified payment data decides.</footer>
            </div> : <div className="pp-chat-messages">
              {messages.map((message, index) => <article key={index} className={"pp-chat-message " + message.role}>
                <div className="pp-message-avatar">{message.role === "assistant" ? "✳" : "You"}</div>
                <div className="pp-message-content"><b>{message.role === "assistant" ? "PayProof AI" : "You"}</b><div>{message.content || (loading && index === messages.length - 1 ? <span className="pp-chat-thinking">● ● ● Thinking</span> : "")}</div>
                  {message.role === "assistant" && message.content && <button type="button" onClick={() => navigator.clipboard?.writeText(message.content)}>Copy response</button>}
                </div>
              </article>)}
              <div ref={bottom} />
            </div>}
          </div>

          <div className="pp-composer-wrap">
            {error && <div className="pp-chat-error" role="alert">{error}<button type="button" onClick={() => setError("")}>Dismiss</button></div>}
            <form className="pp-chat-composer" onSubmit={(event) => { event.preventDefault(); send(); }}>
              <textarea ref={composer} value={input} rows={1} maxLength={6000} placeholder="Message PayProof AI…" aria-label="Message PayProof AI"
                onChange={(event) => { setInput(event.target.value); event.currentTarget.style.height = "auto"; event.currentTarget.style.height = Math.min(event.currentTarget.scrollHeight, 160) + "px"; }}
                onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); send(); } }} />
              <div><small>Enter to send · Shift + Enter for a new line</small><button type="submit" disabled={!input.trim() || loading}>{loading ? "…" : "↑"}</button></div>
            </form>
            <p className="pp-chat-disclaimer">AI can make mistakes. Verify payment status against provider records before taking action. Never share passwords or payment credentials.</p>
          </div>
        </div>
      </section>
      <style jsx global>{\`
        .pp-chat{display:grid;grid-template-columns:250px minmax(0,1fr);height:min(76vh,850px);min-height:660px;background:#fff;border:1px solid #e6eaf1;border-radius:16px;overflow:hidden;box-shadow:0 9px 32px #1d2a4308}
        .pp-chat-history{display:flex;flex-direction:column;min-width:0;padding:14px 12px;background:#f8f9fc;border-right:1px solid #e9edf3}.pp-chat-history.hidden{display:none}
        .pp-history-top{display:flex;gap:7px}.pp-history-top button:first-child{flex:1;text-align:left;padding:0 12px;height:40px;border:1px solid #dfe4ed;border-radius:9px;background:#fff;color:#35425b;font-size:12px;font-weight:700}.pp-history-top button:first-child:first-letter{color:#6656d7}
        .pp-hide-history{width:36px;border:1px solid #e2e6ee;border-radius:9px;background:#fff;color:#65728a;font-size:19px}
        .pp-chat-history>p{padding:22px 8px 9px;margin:0;color:#929bad;font-size:9px;font-weight:800;letter-spacing:1px}
        .pp-history-list{display:grid;gap:4px;overflow-y:auto}.pp-history-list button{display:flex;align-items:center;gap:9px;padding:10px 9px;border:0;border-radius:8px;background:transparent;text-align:left;color:#5d6980}.pp-history-list button.selected,.pp-history-list button:hover{background:#eceffd;color:#344b9c}.pp-history-list button span{font-size:14px}.pp-history-list button b{font-size:11px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        .pp-history-bottom{margin-top:auto;padding:12px 9px;background:#fff;border:1px solid #e8ebf2;border-radius:10px;display:grid;gap:6px}.pp-history-bottom strong{font-size:10px;color:#46536b}.pp-history-bottom small{font-size:9px;line-height:1.5;color:#8993a5}.pp-history-bottom button{justify-self:start;border:0;background:transparent;padding:3px 0;color:#8b94a5;font-size:9px}
        .pp-chat-main{display:flex;flex-direction:column;min-width:0;min-height:0;background:#fff}.pp-chat-head{height:60px;flex-shrink:0;display:flex;align-items:center;justify-content:space-between;gap:10px;padding:0 20px;border-bottom:1px solid #edf0f5}
        .pp-chat-brand,.pp-chat-tools{display:flex;align-items:center;gap:10px}.pp-chat-brand>div{display:grid;gap:4px}.pp-chat-brand strong{font-size:12px;color:#29364d}.pp-chat-brand small{font-size:9px;color:#8a95a7}.pp-chat-brand small i{display:inline-block;width:6px;height:6px;border-radius:50%;background:#32a77c;margin-right:5px}
        .pp-chat-brand>button,.pp-mobile-new{border:1px solid #e4e8ef;border-radius:8px;background:#fff;color:#647188;padding:7px 9px;font-size:11px}.pp-mobile-history,.pp-mobile-new{display:none}
        .pp-chat-tools label{display:flex;align-items:center;gap:7px;font-size:10px;color:#8993a5}.pp-chat-tools select{max-width:190px;padding:7px 9px;border:1px solid #e4e8ef;border-radius:8px;background:#fff;color:#58657b;font-size:10px}
        .pp-chat-scroll{flex:1;min-height:0;overflow-y:auto;overscroll-behavior:contain}.pp-chat-welcome{max-width:740px;margin:0 auto;padding:57px 28px 25px;text-align:center}
        .pp-chat-mark{width:47px;height:47px;margin:0 auto 18px;display:grid;place-items:center;border-radius:15px;background:linear-gradient(145deg,#f1efff,#e8f2ff);color:#6958dc;font-size:24px}.pp-chat-welcome>small{font-size:9px;letter-spacing:1.4px;font-weight:800;color:#9488dd}.pp-chat-welcome h2{margin:10px 0;font:800 25px Manrope,sans-serif;letter-spacing:-.8px;color:#29364d}.pp-chat-welcome>p{max-width:530px;margin:0 auto;color:#8792a4;font-size:12px;line-height:1.7}
        .pp-suggestions{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin:28px 0 22px;text-align:left}.pp-suggestions button{position:relative;display:grid;gap:7px;min-height:108px;padding:13px 14px;border:1px solid #e8ebf2;border-radius:11px;background:#fff;text-align:left;color:#5b6780}.pp-suggestions button:hover{border-color:#c8c1f6;background:#fdfcff}.pp-suggestions button>span{color:#7062d7;font-size:15px}.pp-suggestions button b{font-size:11px;color:#35415a}.pp-suggestions button small{font-size:9px;line-height:1.5;color:#8994a7;max-width:90%}.pp-suggestions button i{position:absolute;right:12px;top:12px;color:#9ca5b4;font-style:normal}.pp-chat-welcome footer{color:#8792a5;font-size:9px}
        .pp-chat-messages{max-width:790px;margin:0 auto;padding:30px 28px 40px;display:grid;gap:27px}.pp-chat-message{display:grid;grid-template-columns:30px minmax(0,1fr);gap:12px;align-items:start}.pp-message-avatar{width:29px;height:29px;display:grid;place-items:center;border-radius:9px;background:#f0edff;color:#6757d5;font-size:14px;font-weight:800}.pp-chat-message.user .pp-message-avatar{background:#eaf0f7;color:#596982;font-size:9px}
        .pp-message-content{min-width:0}.pp-message-content>b{display:block;margin:2px 0 8px;font-size:10px;color:#46536a}.pp-message-content>div{font-size:12px;line-height:1.8;color:#37445a;white-space:pre-wrap;overflow-wrap:anywhere}.pp-message-content>button{margin-top:8px;padding:0;border:0;background:transparent;color:#929bad;font-size:9px}.pp-chat-thinking{color:#8a94a6;font-size:10px}
        .pp-composer-wrap{flex-shrink:0;padding:12px 20px 14px;background:linear-gradient(180deg,#ffffffd9,#fff 20%)}.pp-chat-composer{max-width:790px;margin:0 auto;padding:10px 11px 8px;border:1px solid #dfe4ed;border-radius:14px;box-shadow:0 5px 18px #26324c0a}.pp-chat-composer:focus-within{border-color:#b7afea;box-shadow:0 0 0 3px #7769d310}
        .pp-chat-composer textarea{display:block;width:100%;max-height:160px;min-height:30px;resize:none;border:0;outline:0;background:transparent;padding:3px 5px 8px;color:#344158;font-size:12px;line-height:1.6}.pp-chat-composer textarea::placeholder{color:#a0a9b8}.pp-chat-composer>div{display:flex;align-items:center;justify-content:space-between;padding-left:5px}.pp-chat-composer small{font-size:9px;color:#a0a9b8}.pp-chat-composer>div button{width:33px;height:31px;border:0;border-radius:9px;background:#6354d7;color:#fff;font-size:19px}.pp-chat-composer>div button:disabled{background:#e4e7ee;color:#9ba4b4;cursor:not-allowed}
        .pp-chat-disclaimer{max-width:790px;margin:8px auto 0;text-align:center;color:#a0a9b8;font-size:8px;line-height:1.5}.pp-chat-error{max-width:790px;margin:0 auto 8px;padding:9px 11px;border:1px solid #f1d0d0;border-radius:8px;background:#fff7f7;color:#a33b45;font-size:10px}.pp-chat-error button{float:right;border:0;background:transparent;color:#a33b45;font-size:9px}
        @media(max-width:900px){.pp-chat{grid-template-columns:215px minmax(0,1fr)}.pp-chat-head{padding:0 13px}.pp-chat-tools select{max-width:150px}}
        @media(max-width:700px){.pp-chat{display:block;position:relative;height:calc(100dvh - 220px);min-height:560px}.pp-chat-history{display:none;position:absolute;z-index:20;inset:0 auto 0 0;width:min(290px,86%);height:100%;box-shadow:15px 0 45px #1b29402b}.pp-chat-history.mobile-visible{display:flex}.pp-hide-history{display:none}.pp-mobile-history,.pp-mobile-new{display:inline-flex;align-items:center;gap:5px}.pp-chat-head{height:54px;padding:0 10px}.pp-chat-brand{gap:6px}.pp-chat-tools{gap:5px}.pp-chat-tools label{font-size:0}.pp-chat-tools select{max-width:125px;font-size:9px}.pp-chat-welcome{padding:38px 14px 20px}.pp-chat-welcome h2{font-size:21px}.pp-chat-welcome>p{font-size:11px}.pp-suggestions{grid-template-columns:1fr;gap:7px;margin:20px 0}.pp-suggestions button{min-height:78px;padding:10px 12px;gap:4px}.pp-chat-messages{padding:20px 13px 30px;gap:22px}.pp-chat-message{grid-template-columns:25px minmax(0,1fr);gap:9px}.pp-message-avatar{width:25px;height:25px}.pp-message-content>div{font-size:11px}.pp-composer-wrap{padding:9px 9px 10px}.pp-chat-disclaimer{font-size:7px}}
        @media(prefers-reduced-motion:reduce){.pp-suggestions button{transition:none}}
      \`}</style>
    </WorkspaceLayout>
  );
}
