"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { WorkspaceLayout } from "@/components/workspace-layout";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

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

function renderInline(text: string) {
  return text.split(/(\`[^\`]+\`|\*\*[^*]+\*\*)/g).map((part, index) => {
    if (part.startsWith("\`") && part.endsWith("\`")) return <code key={index}>{part.slice(1, -1)}</code>;
    if (part.startsWith("**") && part.endsWith("**")) return <strong key={index}>{part.slice(2, -2)}</strong>;
    return <span key={index}>{part}</span>;
  });
}

function renderAssistantContent(content: string) {
  const lines = content.replace(/\r/g, "").split("\n");
  const blocks: ReactNode[] = [];
  let paragraph: string[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;
  let code: string[] | null = null;

  const flushParagraph = () => {
    if (paragraph.length) {
      blocks.push(<p key={"p" + blocks.length}>{renderInline(paragraph.join(" "))}</p>);
      paragraph = [];
    }
  };
  const flushList = () => {
    if (list) {
      const items = list.items.map((item, index) => <li key={index}>{renderInline(item)}</li>);
      blocks.push(list.ordered ? <ol key={"l" + blocks.length}>{items}</ol> : <ul key={"l" + blocks.length}>{items}</ul>);
      list = null;
    }
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("\`\`\`")) {
      flushParagraph(); flushList();
      if (code) {
        blocks.push(<pre key={"c" + blocks.length}><code>{code.join("\n")}</code></pre>);
        code = null;
      } else code = [];
      continue;
    }
    if (code) { code.push(line); continue; }
    if (!trimmed) { flushParagraph(); flushList(); continue; }

    const heading = trimmed.match(/^(#{1,3})\s+(.+)$/);
    if (heading) {
      flushParagraph(); flushList();
      const level = heading[1].length;
      const content = renderInline(heading[2]);
      blocks.push(level === 1 ? <h3 key={"h" + blocks.length}>{content}</h3> : level === 2 ? <h4 key={"h" + blocks.length}>{content}</h4> : <h5 key={"h" + blocks.length}>{content}</h5>);
      continue;
    }
    const bullet = trimmed.match(/^[-*•]\s+(.+)$/);
    const numbered = trimmed.match(/^\d+[.)]\s+(.+)$/);
    if (bullet || numbered) {
      flushParagraph();
      const ordered = Boolean(numbered);
      if (list && list.ordered !== ordered) flushList();
      if (!list) list = { ordered, items: [] };
      list.items.push((bullet || numbered)![1]);
      continue;
    }
    if (trimmed.startsWith(">")) {
      flushParagraph(); flushList();
      blocks.push(<blockquote key={"q" + blocks.length}>{renderInline(trimmed.replace(/^>\s?/, ""))}</blockquote>);
      continue;
    }
    flushList();
    paragraph.push(trimmed);
  }
  flushParagraph(); flushList();
  if (code) blocks.push(<pre key={"c" + blocks.length}><code>{code.join("\n")}</code></pre>);
  return <div className="pp-response-body">{blocks}</div>;
}

export default function AssistantPage() {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeId, setActiveId] = useState("");
  const [input, setInput] = useState("");
  const [caseId, setCaseId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [desktopHistory, setDesktopHistory] = useState(true);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [recording, setRecording] = useState(false);
  const filePicker = useRef<HTMLInputElement>(null);
  const imagePicker = useRef<HTMLInputElement>(null);
  const recognition = useRef<{ stop: () => void } | null>(null);
  const bottom = useRef<HTMLDivElement>(null);
  const composer = useRef<HTMLTextAreaElement>(null);
  const active = threads.find((thread) => thread.id === activeId);
  const messages = active ? active.messages : [];

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

  function addFiles(fileList: FileList | null, imagesOnly = false) {
    if (!fileList) return;
    const chosen = Array.from(fileList);
    const accepted = chosen.filter((file) => {
      if (file.size > 8 * 1024 * 1024) { setError(file.name + " is larger than the 8 MB limit."); return false; }
      if (imagesOnly && !file.type.startsWith("image/")) return false;
      return true;
    });
    setAttachments((current) => [...current, ...accepted].slice(0, 4));
    setToolsOpen(false);
  }

  function toggleVoice() {
    type SpeechResult = { transcript: string };
    type SpeechEvent = { resultIndex: number; results: ArrayLike<ArrayLike<SpeechResult>> };
    type SpeechRecognitionLike = {
      lang: string; interimResults: boolean; continuous: boolean;
      onresult: ((event: SpeechEvent) => void) | null;
      onerror: (() => void) | null; onend: (() => void) | null;
      start: () => void; stop: () => void;
    };
    const speechWindow = window as Window & { SpeechRecognition?: new () => SpeechRecognitionLike; webkitSpeechRecognition?: new () => SpeechRecognitionLike };
    const Speech = speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;
    if (recording) { recognition.current?.stop(); setRecording(false); return; }
    if (!Speech) { setError("Voice input is not supported in this browser. Try a recent version of Chrome or Edge."); return; }
    const instance = new Speech();
    const initialText = input.trim();
    instance.lang = "en-US"; instance.interimResults = true; instance.continuous = true;
    instance.onresult = (event) => {
      let transcript = "";
      for (let i = 0; i < event.results.length; i++) transcript += event.results[i][0].transcript;
      setInput((initialText ? initialText + " " : "") + transcript.trim());
    };
    instance.onerror = () => { setRecording(false); setError("Microphone access failed. Check your browser's microphone permission."); };
    instance.onend = () => { setRecording(false); recognition.current = null; };
    recognition.current = instance;
    try { instance.start(); setRecording(true); setError(""); }
    catch { setRecording(false); setError("The microphone could not be started. Please try again."); }
  }

  async function send(value?: string) {
    const text = (value ?? input).trim();
    if ((!text && attachments.length === 0) || loading || !activeId) return;
    const user: Message = { role: "user", content: (text || "Please review the attached file(s).") + (attachments.length ? "\n[Attachments: " + attachments.map((file) => file.name).join(", ") + "]" : "") };
    const currentFiles = attachments;
    const imageFiles = currentFiles.filter((file) => file.type.startsWith("image/"));
    const textFiles = currentFiles.filter((file) => file.type.startsWith("text/") || file.type === "application/json" || [".txt", ".md", ".csv", ".json", ".log"].some((ext) => file.name.toLowerCase().endsWith(ext)));
    setInput(""); setAttachments([]); setError(""); setLoading(true);
    updateThread((thread) => ({
      ...thread,
      title: thread.messages.length ? thread.title : (text.length > 38 ? text.slice(0, 38) + "…" : text),
      messages: [...thread.messages, user, { role: "assistant", content: "" }],
      updatedAt: Date.now()
    }));
    if (composer.current) composer.current.style.height = "auto";
    try {
      const imageData = await Promise.all(imageFiles.map(async (file) => {
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result));
          reader.onerror = () => reject(new Error("Could not read " + file.name));
          reader.readAsDataURL(file);
        });
        return { name: file.name, dataUrl };
      }));
      const textContents = await Promise.all(textFiles.map(async (file) => {
        const contents = await file.text();
        return "\n\n[Attached file: " + file.name + "]\n" + contents.slice(0, 4500);
      }));
      const otherFiles = currentFiles.filter((file) => !file.type.startsWith("image/") && !textFiles.includes(file));
      const attachmentNote = otherFiles.map((file) => "[Attached file: " + file.name + " (" + (file.type || "unknown type") + ")]").join("\n");
      const messageContent = (text || "Please review the attached file(s).") + textContents.join("") +
        (attachmentNote ? "\n" + attachmentNote + "\nThis file type is attached by name only; its contents are not readable here." : "");
      if (messageContent.length > 5900) throw new Error("The message and attached text are too long. Please shorten them.");
      const supabase = getSupabaseBrowserClient();
      const { data: { session } } = supabase ? await supabase.auth.getSession() : { data: { session: null } };
      if (!session) {
        window.location.assign("/auth");
        return;
      }
      const response = await fetch("/api/assistant/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ messages: [...messages, { role: "user", content: messageContent }].slice(-24), images: imageData, caseId: caseId || undefined })
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
                <div className="pp-message-avatar">{message.role === "assistant" ? "✳" : "U"}</div>
                <div className="pp-message-content"><b>{message.role === "assistant" ? "PayProof AI" : "You"}</b><div>{message.content ? (message.role === "assistant" ? renderAssistantContent(message.content) : <div className="pp-user-text">{message.content}</div>) : (loading && index === messages.length - 1 ? <span className="pp-chat-thinking">● ● ● Thinking</span> : "")}</div>
                  {message.role === "assistant" && message.content && <button type="button" onClick={() => navigator.clipboard?.writeText(message.content)}>Copy response</button>}
                </div>
              </article>)}
              <div ref={bottom} />
            </div>}
          </div>

          <div className="pp-composer-wrap">
            {error && <div className="pp-chat-error" role="alert">{error}<button type="button" onClick={() => setError("")}>Dismiss</button></div>}
            {attachments.length > 0 && <div className="pp-attachment-list">{attachments.map((file, index) => <div className="pp-attachment-chip" key={file.name + index}><span>{file.type.startsWith("image/") ? "▧" : "↥"}</span><span title={file.name}>{file.name}</span><button type="button" aria-label={"Remove " + file.name} onClick={() => setAttachments((current) => current.filter((_, i) => i !== index))}>×</button></div>)}</div>}
            <form className="pp-chat-composer" onSubmit={(event) => { event.preventDefault(); send(); }}>
              <textarea ref={composer} value={input} rows={1} maxLength={6000} placeholder="Message PayProof AI…" aria-label="Message PayProof AI"
                onChange={(event) => { setInput(event.target.value); event.currentTarget.style.height = "auto"; event.currentTarget.style.height = Math.min(event.currentTarget.scrollHeight, 160) + "px"; }}
                onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); send(); } }} />
              <div className="pp-composer-controls">
                <div className="pp-composer-left">
                  <div className="pp-add-wrap">
                    <button className="pp-composer-icon pp-plus" type="button" aria-label="Add attachment" aria-expanded={toolsOpen} onClick={() => setToolsOpen((open) => !open)}>＋</button>
                    {toolsOpen && <div className="pp-attach-menu">
                      <button type="button" onClick={() => filePicker.current?.click()}><span>↥</span><b>Attach file</b><small>Documents and text files</small></button>
                      <button type="button" onClick={() => imagePicker.current?.click()}><span>▧</span><b>Photo library</b><small>Choose images to discuss</small></button>
                    </div>}
                  </div>
                  <button className="pp-composer-icon pp-attach" type="button" aria-label="Attach a file" title="Attach file" onClick={() => filePicker.current?.click()}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 12.5 14.8 5.7a3.5 3.5 0 0 1 5 5L10 20.5a5 5 0 0 1-7.1-7.1l9.2-9.2" /></svg></button>
                  <button className="pp-composer-icon pp-gallery" type="button" aria-label="Choose an image" title="Photo library" onClick={() => imagePicker.current?.click()}><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="8.5" cy="9" r="1.5"/><path d="m21 15-5-5L5 20"/></svg></button>
                  <input ref={filePicker} type="file" hidden multiple onChange={(event) => { addFiles(event.target.files); event.currentTarget.value = ""; }} />
                  <input ref={imagePicker} type="file" hidden multiple accept="image/*" onChange={(event) => { addFiles(event.target.files, true); event.currentTarget.value = ""; }} />
                  <button className={"pp-composer-icon pp-mic" + (recording ? " recording" : "")} type="button" aria-label={recording ? "Stop voice input" : "Start voice input"} title={recording ? "Stop voice input" : "Voice input"} onClick={toggleVoice}><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="2.5" width="6" height="12" rx="3"/><path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v3m-4 0h8"/></svg></button>
                </div>
                <small className="pp-composer-hint">{recording ? "Listening… tap microphone to stop" : "Enter to send · Shift + Enter for a new line"}</small>
                <button className="pp-send-button" type="submit" aria-label="Send message" disabled={(!input.trim() && attachments.length === 0) || loading}>{loading ? "…" : <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 19V5m-6 6 6-6 6 6"/></svg>}</button>
              </div>
            </form>
            <p className="pp-chat-disclaimer">AI can make mistakes. Verify payment status against provider records before taking action. Never share passwords or payment credentials.</p>
          </div>
        </div>
      </section>
      <style jsx global>{`
        .pp-chat{font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;display:grid;grid-template-columns:260px minmax(0,1fr);height:clamp(600px,78vh,820px);min-height:600px;background:#fff;border:1px solid #dce5ef;border-radius:18px;overflow:hidden;box-shadow:0 12px 36px rgba(25,58,112,.07);position:relative;color:#172b4d}
        .pp-chat-history{display:flex;flex-direction:column;min-width:0;min-height:0;padding:16px 13px;background:#f7f9fc;border-right:1px solid #e5ebf2}
        .pp-history-backdrop{display:none}
        .pp-history-top{display:flex;gap:8px}
        .pp-history-top button:first-child{flex:1;text-align:left;padding:0 13px;height:42px;border:1px solid #dce5ef;border-radius:10px;background:#fff;color:#193a70;font-size:12px;font-weight:700}
        .pp-hide-history{width:38px;border:1px solid #dce5ef;border-radius:10px;background:#fff;color:#64748b;font-size:19px}
        .pp-chat-history>p{padding:24px 8px 10px;margin:0;color:#8290a5;font-size:9px;font-weight:800;letter-spacing:1.1px}
        .pp-history-list{display:grid;gap:5px;overflow-y:auto;min-height:0}
        .pp-history-list button{display:flex;align-items:center;gap:9px;min-width:0;padding:11px 10px;border:1px solid transparent;border-radius:9px;background:transparent;text-align:left;color:#53647d}
        .pp-history-list button.selected,.pp-history-list button:hover{background:#e8f3fa;border-color:#d9e9f2;color:#193a70}
        .pp-history-list button span{font-size:14px;flex:0 0 auto}
        .pp-history-list button b{font-size:11px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        .pp-history-bottom{margin-top:auto;padding:13px 10px;background:#fff;border:1px solid #e5ebf2;border-radius:11px;display:grid;gap:7px}
        .pp-history-bottom strong{font-size:10px;color:#344b6b}
        .pp-history-bottom small{font-size:10px;line-height:1.55;color:#77869b}
        .pp-history-bottom button{justify-self:start;border:0;background:transparent;padding:3px 0;color:#64748b;font-size:10px}
        .pp-chat-main{display:flex;flex-direction:column;min-width:0;min-height:0;background:#fff}
        .pp-chat-head{min-height:66px;flex-shrink:0;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 20px;border-bottom:1px solid #e8edf3;background:#fff}
        .pp-chat-brand,.pp-chat-tools{display:flex;align-items:center;gap:10px;min-width:0}
        .pp-chat-brand>div{display:grid;gap:4px}
        .pp-chat-brand strong{font-size:13px;color:#172b4d}
        .pp-chat-brand small{font-size:10px;color:#718096}
        .pp-chat-brand small i{display:inline-block;width:7px;height:7px;border-radius:50%;background:#20a779;margin-right:5px}
        .pp-chat-brand>button,.pp-mobile-new{border:1px solid #dce5ef;border-radius:9px;background:#fff;color:#526985;padding:8px 10px;font-size:11px}
        .pp-mobile-history,.pp-mobile-new{display:none}
        .pp-chat-tools label{display:flex;align-items:center;gap:7px;font-size:10px;color:#718096;white-space:nowrap}
        .pp-chat-tools select{max-width:205px;min-width:145px;padding:8px 10px;border:1px solid #dce5ef;border-radius:9px;background:#fff;color:#344b6b;font-size:10px}
        .pp-chat-scroll{flex:1;min-height:0;overflow-y:auto;overscroll-behavior:contain}
        .pp-chat-welcome{max-width:760px;margin:0 auto;padding:48px 30px 25px;text-align:center}
        .pp-chat-mark{width:48px;height:48px;margin:0 auto 17px;display:grid;place-items:center;border-radius:15px;background:linear-gradient(145deg,#eeefff,#e5f4fb);color:#6658d3;font-size:24px}
        .pp-chat-welcome>small{font-size:9px;letter-spacing:1.35px;font-weight:800;color:#315e70}
        .pp-chat-welcome h2{margin:11px 0 9px;font-size:clamp(21px,2.4vw,27px);font-weight:750;letter-spacing:-.7px;color:#172b4d;line-height:1.25}
        .pp-chat-welcome>p{max-width:560px;margin:0 auto;color:#64748b;font-size:12px;line-height:1.75}
        .pp-suggestions{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:11px;margin:27px 0 21px;text-align:left}
        .pp-suggestions button{position:relative;display:grid;align-content:start;gap:7px;min-height:112px;padding:15px;border:1px solid #dce5ef;border-radius:12px;background:#fff;text-align:left;color:#526985;transition:border-color .15s,background .15s}
        .pp-suggestions button:hover{border-color:#36bfc0;background:#f7fcfc}
        .pp-suggestions button>span{color:#6658d3;font-size:16px}
        .pp-suggestions button b{font-size:12px;color:#193a70}
        .pp-suggestions button small{font-size:10px;line-height:1.5;color:#718096;max-width:90%}
        .pp-suggestions button i{position:absolute;right:13px;top:13px;color:#94a3b8;font-style:normal}
        .pp-chat-welcome footer{color:#718096;font-size:10px;line-height:1.5}
        .pp-chat-messages{max-width:820px;margin:0 auto;padding:30px 30px 40px;display:grid;gap:28px}
        .pp-chat-message{display:grid;grid-template-columns:32px minmax(0,1fr);gap:12px;align-items:start}
        .pp-message-avatar{width:30px;height:30px;display:grid;place-items:center;border-radius:10px;background:#e9e8fa;color:#6658d3;font-size:14px;font-weight:800}
        .pp-chat-message.user .pp-message-avatar{background:#e3edf7;color:#193a70;font-size:10px}
        .pp-message-content{min-width:0}
        .pp-message-content>b{display:block;margin:2px 0 8px;font-size:11px;color:#193a70;letter-spacing:.2px}
        .pp-message-content>div{font-size:13px;line-height:1.8;color:#26364e;overflow-wrap:anywhere}
        .pp-user-text{white-space:pre-wrap}
        .pp-response-body{display:grid;gap:11px}
        .pp-response-body p{margin:0;line-height:1.85}
        .pp-response-body h3,.pp-response-body h4,.pp-response-body h5{margin:9px 0 0;color:#172b4d;font-weight:750;line-height:1.35}
        .pp-response-body h3{font-size:17px}.pp-response-body h4{font-size:15px}.pp-response-body h5{font-size:13px}
        .pp-response-body ul,.pp-response-body ol{margin:0;padding-left:23px;display:grid;gap:7px;line-height:1.75}
        .pp-response-body li::marker{color:#6658d3}
        .pp-response-body strong{color:#172b4d;font-weight:750}
        .pp-response-body code{padding:2px 5px;border-radius:5px;background:#eef0fb;color:#5748c4;font-family:ui-monospace,monospace;font-size:.92em}
        .pp-response-body pre{margin:2px 0;padding:13px 15px;overflow:auto;border:1px solid #dce5ef;border-radius:10px;background:#f5f8fc;color:#26364e;white-space:pre-wrap}
        .pp-response-body pre code{padding:0;background:transparent}
        .pp-response-body blockquote{margin:0;padding:10px 13px;border-left:3px solid #36bfc0;background:#eff8f8;color:#315e70}
        .pp-message-content>button{margin-top:10px;padding:0;border:0;background:transparent;color:#64748b;font-size:10px}
        .pp-chat-thinking{color:#718096;font-size:11px}
        .pp-composer-wrap{flex-shrink:0;padding:13px 20px 14px;background:linear-gradient(180deg,#ffffffd9,#fff 20%)}
        .pp-chat-composer{max-width:820px;margin:0 auto;padding:11px 12px 9px;border:1px solid #cad7e5;border-radius:15px;background:#fff;box-shadow:0 6px 22px rgba(25,58,112,.06)}
        .pp-chat-composer:focus-within{border-color:#36bfc0;box-shadow:0 0 0 3px rgba(54,191,192,.14)}
        .pp-chat-composer textarea{display:block;width:100%;max-height:160px;min-height:34px;resize:none;border:0;outline:0;background:transparent;padding:3px 5px 8px;color:#172b4d;font-size:13px;line-height:1.6}
        .pp-chat-composer textarea::placeholder{color:#94a3b8}
        .pp-composer-controls{display:flex;align-items:center;gap:9px;padding:0 2px}
        .pp-composer-left{display:flex;align-items:center;gap:5px}
        .pp-composer-icon{width:33px;height:33px;display:grid;place-items:center;border:0;border-radius:9px;background:transparent;color:#64748b}
        .pp-composer-icon:hover{background:#eaf3fa;color:#193a70}
        .pp-composer-icon svg{width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
        .pp-plus{font-size:23px;border:1px solid #dce5ef;background:#f7f9fc}
        .pp-attach,.pp-gallery{display:none!important}
        .pp-mic.recording{background:#fff0f0;color:#d04452;animation:pp-mic-pulse 1.2s infinite}
        .pp-add-wrap{position:relative}
        .pp-attach-menu{position:absolute;bottom:42px;left:0;z-index:30;width:220px;padding:6px;background:#fff;border:1px solid #dce5ef;border-radius:12px;box-shadow:0 12px 35px rgba(25,58,112,.16)}
        .pp-attach-menu button{width:100%;display:grid;grid-template-columns:27px 1fr;gap:2px 8px;padding:10px;border:0;border-radius:8px;background:#fff;text-align:left;color:#526985}
        .pp-attach-menu button:hover{background:#f0f5fa}
        .pp-attach-menu button>span{grid-row:span 2;align-self:center;font-size:17px;color:#6658d3}
        .pp-attach-menu b{font-size:11px}.pp-attach-menu small{font-size:10px;color:#718096}
        .pp-composer-hint{margin-left:auto;font-size:10px;color:#94a3b8;white-space:nowrap}
        .pp-send-button{width:36px;height:34px;flex-shrink:0;display:grid;place-items:center;border:0;border-radius:10px;background:#193a70;color:#fff}
        .pp-send-button svg{width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
        .pp-send-button:disabled{background:#dce5ef;color:#94a3b8;cursor:not-allowed}
        .pp-attachment-list{max-width:820px;margin:0 auto 8px;display:flex;flex-wrap:wrap;gap:6px}
        .pp-attachment-chip{display:flex;align-items:center;gap:6px;max-width:220px;padding:7px 9px;border:1px solid #dce5ef;border-radius:9px;background:#f7f9fc;color:#526985;font-size:10px}
        .pp-attachment-chip>span:nth-child(2){overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        .pp-attachment-chip button{border:0;background:transparent;color:#718096;font-size:15px}
        .pp-chat-disclaimer{max-width:820px;margin:8px auto 0;text-align:center;color:#94a3b8;font-size:9px;line-height:1.5}
        .pp-chat-error{max-width:820px;margin:0 auto 8px;padding:10px 12px;border:1px solid #f4c7cb;border-radius:9px;background:#fdf0f1;color:#b83e49;font-size:11px}
        .pp-chat-error button{float:right;border:0;background:transparent;color:#b83e49;font-size:10px}
        @keyframes pp-mic-pulse{50%{box-shadow:0 0 0 4px rgba(208,68,82,.13)}}
        @media(max-width:1050px){.pp-chat{grid-template-columns:225px minmax(0,1fr)}.pp-chat-head{padding:10px 14px}.pp-chat-tools select{max-width:165px;min-width:120px}}
        @media(max-width:700px){
          .pp-chat{display:flex;flex-direction:column;height:clamp(560px,calc(100dvh - 300px),720px);min-height:560px;border-radius:14px}
          .pp-chat-main{flex:1;min-height:0}
          .pp-chat-history{display:none;position:absolute;z-index:42;inset:0 auto 0 0;width:min(300px,88%);height:100%;padding:14px;background:#f7f9fc;box-shadow:16px 0 40px rgba(20,35,65,.18)}
          .pp-chat-history.mobile-visible{display:flex}
          .pp-history-backdrop{display:block;position:absolute;inset:0;z-index:41;width:100%;height:100%;border:0;background:rgba(15,28,48,.38)}
          .pp-hide-history{display:none}
          .pp-chat-head{min-height:60px;padding:9px 10px;gap:7px}
          .pp-chat-brand{gap:7px}.pp-chat-brand strong{font-size:12px}.pp-chat-brand small{font-size:9px}
          .pp-mobile-history{display:inline-flex;align-items:center;gap:5px;padding:8px 9px;font-size:10px;white-space:nowrap}
          .pp-mobile-new{display:inline-flex;align-items:center;justify-content:center;width:34px;height:34px;padding:0;font-size:17px}
          .pp-chat-tools{gap:5px}.pp-chat-tools label{font-size:0}
          .pp-chat-tools select{width:min(132px,31vw);min-width:0;max-width:132px;padding:8px 7px;font-size:9px}
          .pp-chat-welcome{padding:30px 14px 18px}
          .pp-chat-mark{width:43px;height:43px;margin-bottom:14px}
          .pp-chat-welcome>small{font-size:8px;letter-spacing:1px}
          .pp-chat-welcome h2{font-size:21px;margin:9px 0}
          .pp-chat-welcome>p{font-size:11px;line-height:1.65}
          .pp-suggestions{grid-template-columns:1fr;gap:7px;margin:18px 0 15px}
          .pp-suggestions button{min-height:0;padding:10px 12px;grid-template-columns:22px minmax(0,1fr);gap:3px 8px}
          .pp-suggestions button>span{grid-row:span 2;align-self:center}
          .pp-suggestions button b{font-size:11px}
          .pp-suggestions button small{font-size:9px;max-width:100%}
          .pp-suggestions button i{right:10px;top:10px}
          .pp-chat-welcome footer{font-size:9px}
          .pp-chat-messages{padding:19px 13px 28px;gap:22px}
          .pp-chat-message{grid-template-columns:27px minmax(0,1fr);gap:9px}
          .pp-message-avatar{width:27px;height:27px}
          .pp-message-content>div{font-size:12px}
          .pp-composer-wrap{padding:9px 9px 10px}
          .pp-chat-composer{padding:9px 9px 7px;border-radius:13px}
          .pp-chat-composer textarea{font-size:12px;min-height:32px}
          .pp-composer-controls{gap:6px}.pp-composer-left{gap:3px}
          .pp-composer-icon{width:32px;height:32px}
          .pp-composer-hint{display:none}
          .pp-send-button{width:35px;height:34px}
          .pp-chat-disclaimer{font-size:8px;padding:0 4px}
        }
        @media(max-width:380px){.pp-mobile-history{padding:7px;font-size:9px}.pp-chat-tools select{width:112px}.pp-chat-brand{gap:5px}.pp-chat-brand strong{font-size:11px}}
        @media(prefers-reduced-motion:reduce){.pp-suggestions button{transition:none}.pp-mic.recording{animation:none}}
      `}</style>
    </WorkspaceLayout>
  );
}
