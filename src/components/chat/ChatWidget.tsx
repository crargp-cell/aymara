"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageCircle, X, Send } from "lucide-react";

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([
    { role: "assistant", content: "¡Kamisaraki! Soy tu asistente Aymara. Pregúntame por palabras o lecciones." },
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
      const res = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages: [...messages, userMsg] }) });
      if (!res.body) throw new Error("Sin respuesta del servidor");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      while (true) {
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
        next[next.length - 1] = { role: "assistant", content: "Error al conectar." };
        return next;
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Button onClick={() => setOpen(!open)} variant="gradient" size="icon" className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-glow z-50">
        {open ? <X /> : <MessageCircle />}
      </Button>
      {open && (
        <Card className="fixed bottom-24 right-6 w-80 sm:w-96 h-[420px] flex flex-col z-50 overflow-hidden">
          <CardHeader className="py-3">
            <CardTitle className="text-sm">Yatichiri — Asistente Aymara</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col gap-3 overflow-hidden p-3">
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {messages.map((m, i) => (
                <div key={i} className={`rounded-xl px-3 py-2 text-sm max-w-[80%] ${m.role === "user" ? "ml-auto bg-primary text-primary-foreground" : "panel"}`}>
                  <span className="whitespace-pre-wrap">{m.content}</span>
                </div>
              ))}
              {loading && <div className="text-xs text-muted-foreground">Escribiendo…</div>}
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                send();
              }}
              className="flex gap-2"
            >
              <Input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Escribe en aymara o español..." className="flex-1" />
              <Button type="submit" size="icon" variant="gradient" disabled={loading}>
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
    </>
  );
}
