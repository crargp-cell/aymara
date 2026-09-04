"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send } from "lucide-react";

/**
 * La conversación con el cóndor: consulta el diccionario y las lecciones.
 *
 * Estaba dentro de `ChatWidget`, que además dibujaba su propio botón flotante.
 * Se separó para que el cóndor pueda ser quien abre esta conversación, en lugar
 * de tener dos cosas distintas peleándose por la misma esquina.
 */
export function PanelChat() {
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([
    { role: "assistant", content: "Pregúntame por una palabra o por una lección y la busco." },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  async function send() {
    if (!input.trim()) return;
    const userMsg = { role: "user" as const, content: input };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setLoading(true);
    setMessages((m) => [...m, { role: "assistant", content: "" }]);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [...messages, userMsg] }),
      });
      if (!res.body) throw new Error("Sin respuesta del servidor");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        const text = acc;
        setMessages((m) => {
          const next = [...m];
          next[next.length - 1] = { role: "assistant", content: text };
          return next;
        });
      }
    } catch {
      setMessages((m) => {
        const next = [...m];
        next[next.length - 1] = { role: "assistant", content: "No pude conectar. Inténtalo de nuevo." };
        return next;
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex-1 flex flex-col gap-3 overflow-hidden p-3">
      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`rounded-xl px-3 py-2 text-sm max-w-[85%] ${
              m.role === "user" ? "ml-auto bg-primary text-primary-foreground" : "panel"
            }`}
          >
            <span className="whitespace-pre-wrap">{m.content}</span>
          </div>
        ))}
        {loading && <div className="text-xs text-muted-foreground">Escribiendo…</div>}
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
        className="flex gap-2"
      >
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Escribe en aymara o español…"
          className="flex-1"
        />
        <Button type="submit" size="icon" variant="gradient" disabled={loading} aria-label="Enviar">
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}
