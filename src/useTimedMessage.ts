import { useCallback, useEffect, useRef, useState } from 'react';

export const useTimedMessage = (duration = 2000) => {
  const [message, setMessageState] = useState('');
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const setMessage = useCallback(
    (text: string) => {
      clearTimeout(timer.current);
      setMessageState(text);
      if (text) {
        timer.current = setTimeout(() => setMessageState(''), duration);
      }
    },
    [duration]
  );

  useEffect(() => () => clearTimeout(timer.current), []);

  return [message, setMessage] as const;
};
