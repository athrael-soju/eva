import { useCallback, useEffect, useRef, useState } from 'react';
import { OpenAIRealtimeWebRTC, RealtimeSession } from '@openai/agents/realtime';
import { createConversationalAgent } from '../lib/agent';
import { setupSpeechAnalysis, waitForAudioSilence } from '../lib/services/audioPlayback';
import { createRealtimeSessionToken } from '../lib/services/sessionService';

type SessionStatus = 'idle' | 'connecting' | 'connected' | 'disconnecting';

export const useAgentSession = () => {
  const [status, setStatus] = useState<SessionStatus>('idle');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [shouldReset, setShouldReset] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sessionRef = useRef<RealtimeSession | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const audioFrequencyDataRef = useRef<Uint8Array | null>(null);
  const analysisCleanupRef = useRef<(() => void) | null>(null);
  const isConnectingRef = useRef(false);

  const cleanupAudio = useCallback(() => {
    if (analysisCleanupRef.current) {
      analysisCleanupRef.current();
      analysisCleanupRef.current = null;
    }
    if (audioElementRef.current) {
      audioElementRef.current.pause();
      audioElementRef.current.srcObject = null;
      audioElementRef.current = null;
    }
    audioFrequencyDataRef.current = null;
    setIsSpeaking(false);
  }, []);

  const resetAnimationFlag = useCallback(() => {
    setShouldReset(true);
    setTimeout(() => setShouldReset(false), 100);
  }, []);

  const disconnect = useCallback(() => {
    if (status === 'disconnecting') return;
    setStatus('disconnecting');

    if (sessionRef.current) {
      sessionRef.current.close();
      sessionRef.current = null;
    }

    cleanupAudio();
    resetAnimationFlag();
    isConnectingRef.current = false;
    setStatus('idle');
  }, [cleanupAudio, resetAnimationFlag, status]);

  const waitForPlayback = useCallback(() => {
    if (audioElementRef.current) {
      return waitForAudioSilence(audioElementRef.current);
    }
    return Promise.resolve();
  }, []);

  const connect = useCallback(async () => {
    if (isConnectingRef.current || status === 'connected') {
      return;
    }
    isConnectingRef.current = true;
    setError(null);
    setStatus('connecting');

    try {
      const sessionData = await createRealtimeSessionToken();

      const audioElement = new Audio();
      audioElement.autoplay = true;
      audioElementRef.current = audioElement;

      const transport = new OpenAIRealtimeWebRTC({ audioElement });
      const agent = createConversationalAgent(disconnect, () => sessionRef.current, waitForPlayback);
      const session = new RealtimeSession(agent, { transport });

      sessionRef.current = session;

      await session.connect({
        apiKey: sessionData.client_secret.value,
        model: process.env.OPENAI_REALTIME_MODEL,
      });

      if (audioElement.srcObject) {
        const { cleanup } = setupSpeechAnalysis(
          audioElement.srcObject as MediaStream,
          audioFrequencyDataRef,
          {
            onSpeakingChange: setIsSpeaking,
          }
        );
        analysisCleanupRef.current = cleanup;
      }

      setStatus('connected');
      isConnectingRef.current = false;

      session.sendMessage('Hello!');
    } catch (err) {
      console.error('Failed to initialize agent:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      isConnectingRef.current = false;
      setStatus('idle');
      cleanupAudio();
      resetAnimationFlag();
      throw err;
    }
  }, [cleanupAudio, disconnect, resetAnimationFlag, status, waitForPlayback]);

  useEffect(() => {
    return () => {
      if (sessionRef.current) {
        sessionRef.current.close();
        sessionRef.current = null;
      }
      cleanupAudio();
    };
  }, [cleanupAudio]);

  return {
    connect,
    disconnect,
    status,
    isSpeaking,
    audioFrequencyData: audioFrequencyDataRef.current,
    shouldReset,
    error,
  };
};
