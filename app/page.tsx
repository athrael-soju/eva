'use client';

import { useCallback } from "react";
import LoadingAnimation from "./components/LoadingAnimation";
import { useAgentSession } from "./hooks/useAgentSession";

export default function Home() {
  const {
    connect,
    status,
    isSpeaking,
    audioFrequencyData,
    shouldReset,
    error,
  } = useAgentSession();

  const handleAnimationClick = useCallback(() => {
    connect().catch((err) => {
      const errorMessage = err instanceof Error ? err.message : "Unknown error occurred";
      alert(`Failed to connect to AI agent: ${errorMessage}`);
    });
  }, [connect]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#d1684e] font-sans">
      <LoadingAnimation
        onAnimationComplete={handleAnimationClick}
        isAgentConnected={status === 'connected'}
        isAgentSpeaking={isSpeaking}
        audioFrequencyData={audioFrequencyData}
        shouldReset={shouldReset}
      />
      {error ? <span className="sr-only">Connection error: {error}</span> : null}
    </div>
  );
}
