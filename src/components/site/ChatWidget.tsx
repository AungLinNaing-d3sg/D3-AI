"use client";

import { useCallback, useEffect, useRef, useState, type ButtonHTMLAttributes, type FormEvent, type ReactNode } from "react";
import {
  CHAT_INPUT_MAX_LENGTH,
  QUICK_REPLIES,
  REPLIES,
  replyFor,
  type ReplyKey,
  type ReplyPart,
} from "@/lib/chat/assistant";
import { lenisInstance } from "@/lib/motion/lenisInstance";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { InPageLink } from "./InPageLink";

/** Window event other components dispatch to open the widget. */
const OPEN_CHAT_EVENT = "d3:open-chat";

interface Message {
  id: number;
  who: "user" | "bot";
  parts: ReplyPart[];
}

export function ChatOpenButton({ children, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { children: ReactNode; "data-reveal"?: boolean }) {
  return (
    <button type="button" {...rest} onClick={() => window.dispatchEvent(new Event(OPEN_CHAT_EVENT))}>
      {children}
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <path d="M3 8h9.5M8.5 4l4 4-4 4" />
      </svg>
    </button>
  );
}

function MessageParts({ parts, onInternalLink }: { parts: ReplyPart[]; onInternalLink: () => void }) {
  return (
    <>
      {parts.map((part, i) => {
        if (typeof part === "string") return <span key={i}>{part}</span>;
        if (part.href.startsWith("#")) {
          return (
            <InPageLink key={i} href={part.href as `#${string}`} onNavigate={onInternalLink}>
              {part.label}
            </InPageLink>
          );
        }
        return (
          <a key={i} href={part.href}>
            {part.label}
          </a>
        );
      })}
    </>
  );
}

/**
 * Floating "live chat" assistant. Scripted demo (see lib/chat/assistant.ts):
 * replies are canned and nothing typed is sent anywhere. Full-screen sheet on
 * small screens, anchored panel on desktop.
 */
export function ChatWidget() {
  const reducedMotion = usePrefersReducedMotion();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [typing, setTyping] = useState(false);
  const [draft, setDraft] = useState("");
  const greeted = useRef(false);
  const nextId = useRef(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const bodyRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const launchRef = useRef<HTMLButtonElement>(null);

  const push = useCallback((who: Message["who"], parts: ReplyPart[]) => {
    nextId.current += 1;
    const id = nextId.current;
    setMessages((prev) => [...prev, { id, who, parts }]);
  }, []);

  const botSay = useCallback(
    (key: ReplyKey) => {
      setTyping(true);
      const delay = reducedMotion ? 0 : 650 + Math.random() * 400;
      timers.current.push(
        setTimeout(() => {
          setTyping(false);
          push("bot", REPLIES[key]);
        }, delay)
      );
    },
    [push, reducedMotion]
  );

  const setChat = useCallback(
    (next: boolean) => {
      setOpen(next);
      if (next && !greeted.current) {
        greeted.current = true;
        botSay("hello");
      }
    },
    [botSay]
  );

  // Side effects of opening/closing: focus, scroll lock on the mobile sheet.
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("chat-open", open);
    const sheet = window.matchMedia("(max-width: 600px)").matches;
    if (open) {
      const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
      (finePointer ? inputRef.current : closeRef.current)?.focus({ preventScroll: true });
      if (sheet) {
        root.classList.add("scroll-locked");
        lenisInstance.current?.stop();
      }
    }
    return () => {
      if (open && sheet) {
        root.classList.remove("scroll-locked");
        lenisInstance.current?.start();
      }
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      launchRef.current?.focus({ preventScroll: true });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    const onOpen = () => setChat(true);
    window.addEventListener(OPEN_CHAT_EVENT, onOpen);
    const pending = timers.current;
    return () => {
      window.removeEventListener(OPEN_CHAT_EVENT, onOpen);
      pending.forEach(clearTimeout);
    };
  }, [setChat]);

  useEffect(() => {
    const body = bodyRef.current;
    if (body) body.scrollTop = body.scrollHeight;
  }, [messages, typing]);

  function ask(label: string, key: ReplyKey) {
    push("user", [label]);
    botSay(key);
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = draft.trim().slice(0, CHAT_INPUT_MAX_LENGTH);
    if (!text) return;
    setDraft("");
    ask(text, replyFor(text));
  }

  return (
    <div className={`chat${open ? " is-open" : ""}`}>
      <section id="chat-panel" className="chat-panel" role="dialog" aria-label="D3-SG assistant" inert={!open}>
        <header className="cp-head">
          <span className="avatar" aria-hidden="true">
            D
          </span>
          <div>
            <b>D3-SG Assistant</b>
            <small>Demo · scripted replies</small>
          </div>
          <button ref={closeRef} type="button" className="cp-close" aria-label="Close chat" onClick={() => setChat(false)}>
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <path d="M3 3l10 10M13 3L3 13" />
            </svg>
          </button>
        </header>
        <div ref={bodyRef} className="cp-body" aria-live="polite" data-lenis-prevent>
          {messages.map((message) => (
            <div key={message.id} className={`msg ${message.who}`}>
              <MessageParts parts={message.parts} onInternalLink={() => setChat(false)} />
            </div>
          ))}
          {typing ? (
            <div className="msg bot typing" aria-hidden="true">
              <i />
              <i />
              <i />
            </div>
          ) : null}
        </div>
        <div className="cp-quick">
          {QUICK_REPLIES.map((reply) => (
            <button key={reply.key} type="button" onClick={() => ask(reply.label, reply.key)}>
              {reply.label}
            </button>
          ))}
        </div>
        <form className="cp-form" onSubmit={onSubmit}>
          <label className="sr-only" htmlFor="cp-input">
            Message
          </label>
          <input
            ref={inputRef}
            id="cp-input"
            type="text"
            autoComplete="off"
            maxLength={CHAT_INPUT_MAX_LENGTH}
            placeholder="Type a message…"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
          />
          <button type="submit" aria-label="Send">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M5 12h13M13 6l6 6-6 6" />
            </svg>
          </button>
        </form>
        <p className="cp-note">This is a demo assistant. For real enquiries, use the contact form.</p>
      </section>
      <button
        ref={launchRef}
        type="button"
        className="chat-launch"
        aria-expanded={open}
        aria-controls="chat-panel"
        aria-label={open ? "Close chat" : "Open chat"}
        onClick={() => setChat(!open)}
      >
        <svg className="i-chat" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M21 12a8 8 0 01-11.6 7.1L4 20.5l1.4-4.9A8 8 0 1121 12z" />
          <path d="M8.5 12h.01M12 12h.01M15.5 12h.01" />
        </svg>
        <svg className="i-close" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
        {messages.length > 0 || typing ? null : (
          <span className="badge" aria-hidden="true">
            1
          </span>
        )}
      </button>
    </div>
  );
}
