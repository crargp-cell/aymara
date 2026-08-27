import { prisma } from "@/lib/prisma";
import { streamText, createTextStreamResponse } from "ai";

function textToStream(text: string): ReadableStream<string> {
  const words = text.split(" ");
  return new ReadableStream<string>({
    async start(controller) {
      for (let i = 0; i < words.length; i++) {
        controller.enqueue(i === 0 ? words[i] : " " + words[i]);
        await new Promise((r) => setTimeout(r, 18));
      }
      controller.close();
    },
  });
}

export async function POST(req: Request) {
  const { messages } = await req.json();
  const last = messages?.[messages.length - 1]?.content ?? "";
  const q = String(last).toLowerCase().trim();

  const [words, lessons] = await Promise.all([
    q
      ? prisma.diccionario.findMany({
          where: { OR: [{ aymara: { contains: q, mode: "insensitive" } }, { espanol: { contains: q, mode: "insensitive" } }], estado: "activo" },
          take: 3,
        })
      : Promise.resolve([]),
    q ? prisma.lesson.findMany({ where: { title: { contains: q, mode: "insensitive" }, estado: "activo" }, take: 2 }) : Promise.resolve([]),
  ]);

  const buildFallbackText = () => {
    let reply = "¡Kamisaraki! Soy tu asistente Aymara. Pregúntame por palabras, lecciones o ejercicios.";
    if (words.length > 0) {
      reply = `Encontré ${words.length} palabra(s):\n` + words.map((w) => `• ${w.aymara} — ${w.espanol} (${w.categoria})`).join("\n");
    } else if (lessons.length > 0) {
      reply = "Lecciones relacionadas:\n" + lessons.map((l) => `• ${l.title}`).join("\n");
    } else if (q.includes("hola") || q.includes("kamisaraki")) {
      reply = "¡Kamisaraki! ¿Cómo puedo ayudarte hoy con aymara?";
    } else if (q.includes("leccion") || q.includes("lesson")) {
      reply = "No encontré una lección con ese nombre. Revisa la lista completa en /lessons.";
    } else if (q) {
      reply = `No encontré "${q}" en el diccionario. Prueba con palabras como "yatiña", "pachamama" o "thakhi".`;
    }
    return reply;
  };

  if (process.env.XAI_API_KEY) {
    try {
      const { createXai } = await import("@ai-sdk/xai");
      const xai = createXai({ apiKey: process.env.XAI_API_KEY });
      const context = [
        words.length ? `Diccionario:\n${words.map((w) => `${w.aymara}=${w.espanol}`).join("\n")}` : "",
        lessons.length ? `Lecciones:\n${lessons.map((l) => l.title).join("\n")}` : "",
      ]
        .filter(Boolean)
        .join("\n\n");
      const result = streamText({
        model: xai("grok-3"),
        system: `Eres Yatichiri, asistente de aymara. Responde en español con toques aymara, breve y útil. ${context}`,
        messages: messages.map((m: any) => ({ role: m.role, content: m.content })),
        onError: (err) => console.error("chat streamText error", err),
      });
      return result.toTextStreamResponse();
    } catch (err) {
      console.error("chat xai setup error", err);
      return createTextStreamResponse({ stream: textToStream(buildFallbackText()) });
    }
  }

  return createTextStreamResponse({ stream: textToStream(buildFallbackText()) });
}
