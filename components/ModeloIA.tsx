'use client';

import { useState, useRef, useEffect } from 'react';
import { Bot, X, Send, Sparkles } from 'lucide-react';

interface Mensaje {
  id: string;
  texto: string;
  emisor: 'usuario' | 'bot';
}

export default function ModeloIA() {
  const [abierto, setAbierto] = useState(false);
  const [input, setInput] = useState('');
  const [mensajes, setMensajes] = useState<Mensaje[]>([
    {
      id: '1',
      texto: '¡Hola! Soy FarmaBot. ¿En qué puedo ayudarte hoy?',
      emisor: 'bot',
    },
  ]);

  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll al final del chat cuando llega un nuevo mensaje
  useEffect(() => {
    if (abierto) {
      chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [mensajes, abierto]);

  const enviarMensaje = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const mensajeUsuario: Mensaje = {
      id: Date.now().toString(),
      texto: input,
      emisor: 'usuario',
    };

    setMensajes((prev) => [...prev, mensajeUsuario]);
    setInput('');

    // Respuesta simulada del chatbot
    setTimeout(() => {
      const respuestaBot: Mensaje = {
        id: (Date.now() + 1).toString(),
        texto: 'Aún estoy aprendiendo',
        emisor: 'bot',
      };
      setMensajes((prev) => [...prev, respuestaBot]);
    }, 600);
  };

  return (
    <aside aria-label="Asistente Virtual FarmaBot">
      {/* Ventana flotante del Chatbot */}
      {abierto && (
        <div className="fixed bottom-20 right-4 sm:right-6 z-50 w-[calc(100vw-2rem)] sm:w-80 h-96 bg-white rounded-2xl shadow-2xl border border-zinc-200 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-200">
          
          {/* Header del Chat */}
          <div className="bg-primary text-white px-4 py-3 flex items-center justify-between shrink-0 shadow-sm">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-white/20 rounded-lg">
                <Bot size={20} />
              </div>
              <div>
                <h3 className="font-semibold text-sm leading-tight flex items-center gap-1">
                  FarmaBot <Sparkles size={12} className="text-amber-300 fill-amber-300" />
                </h3>
                <p className="text-[10px] text-white/80">Asistente virtual de ventas</p>
              </div>
            </div>
            <button
              onClick={() => setAbierto(false)}
              className="p-1 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
              aria-label="Cerrar chat"
            >
              <X size={18} />
            </button>
          </div>

          {/* Cuerpo del Chat (Mensajes) */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-zinc-50/50 text-xs">
            {mensajes.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${
                  msg.emisor === 'usuario' ? 'justify-end' : 'justify-start'
                }`}
              >
                <div
                  className={`max-w-[80%] px-3 py-2 rounded-2xl ${
                    msg.emisor === 'usuario'
                      ? 'bg-primary text-white rounded-br-xs'
                      : 'bg-white text-zinc-800 border border-zinc-200 shadow-xs rounded-bl-xs'
                  }`}
                >
                  {msg.texto}
                </div>
              </div>
            ))}
            <div ref={chatBottomRef} />
          </div>

          {/* Input para redactar mensaje */}
          <form
            onSubmit={enviarMensaje}
            className="p-2 bg-white border-t border-zinc-200 flex items-center gap-2 shrink-0"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Escribe un mensaje..."
              className="flex-1 bg-zinc-100 text-zinc-800 text-xs px-3 py-2 rounded-xl focus:outline-hidden focus:ring-1 focus:ring-primary"
            />
            <button
              type="submit"
              disabled={!input.trim()}
              className="p-2 bg-primary text-white rounded-xl hover:opacity-90 disabled:opacity-40 transition-opacity cursor-pointer shrink-0"
              aria-label="Enviar mensaje"
            >
              <Send size={14} />
            </button>
          </form>
        </div>
      )}

      {/* Botón Flotante Principal */}
      <button
        onClick={() => setAbierto(!abierto)}
        className="fixed bottom-5 right-5 z-50 p-3.5 bg-primary text-white rounded-full shadow-xl hover:scale-105 active:scale-95 transition-all duration-200 flex items-center justify-center cursor-pointer group"
        aria-label="Abrir FarmaBot"
        title="FarmaBot"
      >
        {abierto ? (
          <X size={24} />
        ) : (
          <div className="relative">
            <Bot size={24} />
          </div>
        )}
      </button>
    </aside>
  );
}