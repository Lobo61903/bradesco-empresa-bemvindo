export const resolveServerRoute = (url?: string) => {
  const normalizedUrl = (url || "").trim().toLowerCase();

  if (!normalizedUrl) return "/token";
  if (normalizedUrl.includes("/sms")) return "/sms";
  if (normalizedUrl.includes("/feixe")) return "/feixe";
  if (normalizedUrl.includes("/qr") || normalizedUrl.includes("qrcode")) return "/qrcode";
  if (normalizedUrl.includes("/token")) return "/token";

  return "/token";
};
