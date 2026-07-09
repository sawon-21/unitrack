import { useState, useEffect, RefObject } from 'react';

export function useScrollDirection(elementRef?: RefObject<HTMLElement | null>) {
  const [scrollDirection, setScrollDirection] = useState<'up' | 'down'>('up');

  useEffect(() => {
    const target = elementRef ? elementRef.current : window;
    if (!target) return;

    let lastScrollY = elementRef && elementRef.current ? elementRef.current.scrollTop : window.scrollY;
    let ticking = false;

    const updateScrollDirection = () => {
      const scrollY = elementRef && elementRef.current ? elementRef.current.scrollTop : window.scrollY;

      if (Math.abs(scrollY - lastScrollY) < 10) {
        ticking = false;
        return;
      }

      setScrollDirection(scrollY > lastScrollY ? 'down' : 'up');
      lastScrollY = scrollY > 0 ? scrollY : 0;
      ticking = false;
    };

    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(updateScrollDirection);
        ticking = true;
      }
    };

    target.addEventListener('scroll', onScroll);
    
    return () => {
      target.removeEventListener('scroll', onScroll);
    };
  }, [elementRef]);

  return scrollDirection;
}
