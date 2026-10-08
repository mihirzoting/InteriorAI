import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { toast } from "sonner";
import { Conversation, ConversationContent, ConversationEmptyState, ConversationScrollButton } from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import { PromptInput, PromptInputFooter, PromptInputSubmit, PromptInputTextarea } from "@/components/ai-elements/prompt-input";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/Logo";

export const Route = createFileRoute("/_authenticated/assistant")({
  head: () => ({
    meta: [
      { title: "Design assistant — InteriorAI" },
      { name: "description", content: "Chat with an interior design assistant that knows the catalogue." },
      { property: "og:title", content: "Design assistant — InteriorAI" },
      { property: "og:description", content: "Chat with an interior design assistant that knows the catalogue." },
    ],
  }),
  component: Assistant,
});

const SUGGESTIONS = [
  "How do I make my living room feel bigger?",
  "Suggest a cozy bedroom setup under $2,500",
  "What lighting suits a dim room?",
];

const transport = new DefaultChatTransport({
  api: "/api/chat",
  headers: async (): Promise<Record<string, string>> => {
    const { data } = await supabase.auth.getSession();
    return data.session ? { Authorization: `Bearer ${data.session.access_token}` } : {};
  },
});

function Assistant() {
  const [input, setInput] = useState("");
  const { messages, sendMessage, status, stop } = useChat({
    transport,
    onError: (e) => {
      const m = e.message || "";
      if (m.includes("429")) toast.error("Too many requests — please wait a moment.");
      else if (m.includes("402")) toast.error("AI credits are used up. Add credits to keep chatting.");
      else toast.error(m.startsWith("{") ? (JSON.parse(m).error ?? "Something went wrong") : m || "Something went wrong");
    },
  });
  const busy = status === "submitted" || status === "streaming";

  const send = (text: string) => {
    if (!text.trim() || busy) return;
    sendMessage({ text });
    setInput("");
  };

  return (
    <div className="mx-auto flex h-[calc(100vh-10rem)] max-w-3xl flex-col">
      <Conversation className="flex-1">
        <ConversationContent>
          {messages.length === 0 ? (
            <ConversationEmptyState>
              <div className="flex flex-col items-center gap-4 text-center">
                <Logo />
                <h1 className="text-3xl font-light">Your design assistant</h1>
                <p className="max-w-md text-muted-foreground">Ask about layouts, colours, lighting — or for picks from our catalogue based on your rooms.</p>
                <div className="mt-2 flex flex-wrap justify-center gap-2">
                  {SUGGESTIONS.map((s) => (
                    <button key={s} onClick={() => send(s)} className="rounded-full border bg-card px-4 py-2 text-sm hover:bg-secondary">
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </ConversationEmptyState>
          ) : (
            messages.map((m) => (
              <Message key={m.id} from={m.role}>
                <MessageContent>
                  {m.parts.map((p, i) => (p.type === "text" ? <MessageResponse key={i}>{p.text}</MessageResponse> : null))}
                </MessageContent>
              </Message>
            ))
          )}
          {status === "submitted" && <Shimmer className="text-sm">Thinking about your space…</Shimmer>}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>
      <PromptInput onSubmit={(msg) => send(msg.text ?? input)} className="mt-4">
        <PromptInputTextarea value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask anything about your interior…" />
        <PromptInputFooter className="justify-end">
          <PromptInputSubmit status={status} onStop={stop} disabled={!busy && !input.trim()} />
        </PromptInputFooter>
      </PromptInput>
    </div>
  );
}
