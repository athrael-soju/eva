'use client';

import { useLoadingAnimation } from '../hooks/useLoadingAnimation';

interface LoadingAnimationProps {
  onAnimationComplete?: () => void;
  isAgentConnected?: boolean;
  shouldReset?: boolean;
}

export default function LoadingAnimation({
  onAnimationComplete,
  isAgentConnected,
  shouldReset,
}: LoadingAnimationProps) {
  const containerRef = useLoadingAnimation({
    onAnimationComplete,
    isAgentConnected,
    shouldReset,
  });

  return (
    <div className="fixed inset-0 w-screen h-screen">
      <div
        ref={containerRef}
        className="absolute left-0 right-0 top-0 bottom-0 overflow-hidden"
      />
    </div>
  );
}
