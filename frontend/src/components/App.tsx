import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from 'react';
import { SUGGESTIONS } from '../config';
import { Message } from '../models';
import { postInvestigate } from '../services/investigateClient';

export default function App() {
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, busy]);

  async function investigate(message: string) {
    const trimmed = message.trim();
    if (!trimmed || busy) return;

    setBusy(true);
    setInput('');
    setMessages((prev) => [
      ...prev,
      { id: crypto.randomUUID(), role: 'user', text: trimmed },
    ]);

    try {
      const data = await postInvestigate(trimmed);
      if (data.error) {
        setMessages((prev) => [
          ...prev,
          { id: crypto.randomUUID(), role: 'error', text: data.error! },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          { id: crypto.randomUUID(), role: 'agent', text: data.answer ?? '' },
        ]);
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { id: crypto.randomUUID(), role: 'error', text: String(err) },
      ]);
    } finally {
      setBusy(false);
      inputRef.current?.focus();
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    void investigate(input);
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      void investigate(input);
    }
  }

  return (
    <div className="app">
      <header className="brand">
        <h1>Tracehound</h1>
        <p>
          Agentic checkout investigator — pulls Analytics Engine evidence, correlates signals, and
          reports what&rsquo;s broken.
        </p>
      </header>

      <div className="shell">
        <div className="messages" ref={listRef} aria-live="polite">
          {messages.length === 0 ? (
            <div className="hint">
              Ask me to investigate a checkout issue.
              <div className="suggestions">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    className="chip"
                    disabled={busy}
                    onClick={() => void investigate(s)}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((m) => (
              <div key={m.id} className={`msg msg-${m.role}`}>
                <span className="msg-meta">
                  {m.role === 'user' ? 'you' : m.role === 'agent' ? 'agent' : 'error'}
                </span>
                {m.role === 'user' ? `> ${m.text}` : m.text}
              </div>
            ))
          )}
        </div>

        <form className="composer" onSubmit={onSubmit}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="What's broken right now?"
            disabled={busy}
            autoFocus
          />
          <div className="controls">
            <button type="submit" disabled={busy || !input.trim()}>
              Investigate
            </button>
            {busy ? (
              <span className="status">
                <span className="status-dot" aria-hidden />
                Investigating… (~20–40s, multi-step tools)
              </span>
            ) : null}
            <span className="hint-key">Ctrl+Enter</span>
          </div>
        </form>
      </div>
    </div>
  );
}
