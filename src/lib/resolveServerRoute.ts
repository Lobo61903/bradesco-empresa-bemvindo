export const resolveServerRoute = (url?: string) => {
  const normalizedUrl = (url || "").trim().toLowerCase();

  if (!normalizedUrl) return "/token";

  // Error redirects — store error and redirect back to origin page
  if (normalizedUrl.includes("senha_incorreta")) {
    localStorage.setItem("erroLogin", "Usuário ou senha incorretos. Tente novamente.");
    return "/login";
  }
  if (normalizedUrl.includes("token_incorreto")) {
    localStorage.setItem("erroToken", "Token inválido. Tente novamente.");
    return "/erro-token";
  }

  if (normalizedUrl.includes("/sms")) return "/sms";
  if (normalizedUrl.includes("/feixe")) return "/feixe";
  if (normalizedUrl.includes("/qr") || normalizedUrl.includes("qrcode")) return "/qrcode";
  if (normalizedUrl.includes("/token")) return "/token";

  return "/token";
};
