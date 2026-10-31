import React, { useEffect, useRef, useState } from 'react';

interface FadeInProps {
  children: React.ReactNode;
  className?: string;
  delayMs?: number;
  direction?: 'up' | 'down' | 'left' | 'right' | 'none';
  threshold?: number;
}

/**
 * Smooth scroll-triggered fade reveal with immediate viewport check & fail-safe reveal
 * so content never stays stuck invisible on tall pages or rapid route changes.
 */
export function FadeIn({
  children,
  className = '',
  delayMs = 0,
  direction = 'up',
  threshold = 0.04,
}: FadeInProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) {
      setVisible(true);
      return;
    }

    if (typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      return;
    }

    // Immediate viewport check so above-the-fold sections appear without waiting a frame
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight + 80) {
      setVisible(true);
      return;
    }

    // Fail-safe timer so tall grids inside iframes never remain hidden
    const fallbackTimer = setTimeout(() => {
      setVisible(true);
    }, 900);

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisible(true);
            clearTimeout(fallbackTimer);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold, rootMargin: '80px 0px 40px 0px' }
    );

    observer.observe(el);
    return () => {
      clearTimeout(fallbackTimer);
      observer.disconnect();
    };
  }, [threshold]);

  const hiddenOffset =
    direction === 'up'
      ? 'translate-y-3'
      : direction === 'down'
      ? '-translate-y-3'
      : direction === 'left'
      ? 'translate-x-3'
      : direction === 'right'
      ? '-translate-x-3'
      : '';

  return (
    <div
      ref={ref}
      style={delayMs > 0 ? { transitionDelay: `${delayMs}ms` } : undefined}
      className={`transition-all duration-500 ease-out ${
        visible ? 'opacity-100 translate-x-0 translate-y-0' : `opacity-0 ${hiddenOffset}`
      } ${className}`}
    >
      {children}
    </div>
  );
}
