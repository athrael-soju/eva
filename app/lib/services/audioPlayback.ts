export type SpeechAnalysisOptions = {
  smoothingTimeConstant?: number;
  fftSize?: number;
  threshold?: number;
  onSpeakingChange?: (isSpeaking: boolean) => void;
};

export type SpeechAnalysisHandle = {
  dataRef: MutableRefObject<Uint8Array | null>;
  cleanup: () => void;
};

/**
 * Sets up a Web Audio analyser to detect when the agent is speaking.
 * Returns a handle with the frequency data ref (for visualization) and a cleanup hook.
 */
export function setupSpeechAnalysis(
  stream: MediaStream,
  dataRef: MutableRefObject<Uint8Array | null>,
  {
    smoothingTimeConstant = 0.8,
    fftSize = 512,
    threshold = 20,
    onSpeakingChange,
  }: SpeechAnalysisOptions = {}
): SpeechAnalysisHandle {
  const AudioContextClass = (window as any).AudioContext || (window as any).webkitAudioContext;
  const audioContext: AudioContext = new AudioContextClass();
  const analyser = audioContext.createAnalyser();
  analyser.fftSize = fftSize;
  analyser.smoothingTimeConstant = smoothingTimeConstant;

  const source = audioContext.createMediaStreamSource(stream);
  source.connect(analyser);

  const bufferLength = analyser.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLength);
  dataRef.current = dataArray;

  let animationFrameId: number | null = null;

  const checkAudio = () => {
    analyser.getByteFrequencyData(dataArray);

    let sum = 0;
    for (let i = 0; i < bufferLength; i++) {
      sum += dataArray[i];
    }
    const average = sum / bufferLength;

    if (onSpeakingChange) {
      onSpeakingChange(average > threshold);
    }

    animationFrameId = requestAnimationFrame(checkAudio);
  };

  checkAudio();

  const cleanup = () => {
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
    }
    try {
      source.disconnect();
      analyser.disconnect();
      if (audioContext.state !== 'closed') {
        audioContext.close();
      }
    } catch (e) {
      console.warn('Error during audio analysis cleanup:', e);
    }
  };

  return { dataRef, cleanup };
}

/**
 * Waits for the audio element to become silent or finish playback.
 * Used to ensure farewell audio is played before disconnecting.
 */
export function waitForAudioSilence(
  audio: HTMLAudioElement,
  {
    silenceThreshold = 10,
    silenceDurationMs = 1000,
    timeoutMs = 10000,
    fftSize = 256,
  }: {
    silenceThreshold?: number;
    silenceDurationMs?: number;
    timeoutMs?: number;
    fftSize?: number;
  } = {}
): Promise<void> {
  return new Promise((resolve) => {
    if (audio.paused || audio.ended) {
      resolve();
      return;
    }

    try {
      const AudioContextClass = (window as any).AudioContext || (window as any).webkitAudioContext;
      const audioContext: AudioContext = new AudioContextClass();
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = fftSize;

      const stream = audio.srcObject as MediaStream | null;
      if (!stream) {
        resolve();
        return;
      }

      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      let silenceStart = Date.now();
      let timeoutId: NodeJS.Timeout | null = null;
      let animationFrameId: number | null = null;
      let cleanedUp = false;

      const cleanup = () => {
        if (cleanedUp) return;
        cleanedUp = true;
        if (timeoutId) clearTimeout(timeoutId);
        if (animationFrameId) cancelAnimationFrame(animationFrameId);
        try {
          source.disconnect();
          analyser.disconnect();
          if (audioContext.state !== 'closed') {
            audioContext.close();
          }
        } catch (e) {
          console.warn('Error during audio silence cleanup:', e);
        }
      };

      const checkSilence = () => {
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const average = sum / bufferLength;

        if (average < silenceThreshold) {
          if (Date.now() - silenceStart > silenceDurationMs) {
            cleanup();
            resolve();
            return;
          }
        } else {
          silenceStart = Date.now();
        }

        animationFrameId = requestAnimationFrame(checkSilence);
      };

      checkSilence();

      timeoutId = setTimeout(() => {
        cleanup();
        resolve();
      }, timeoutMs);
    } catch (e) {
      console.error('Error setting up silence detection:', e);
      resolve();
    }
  });
}
import type { MutableRefObject } from 'react';
