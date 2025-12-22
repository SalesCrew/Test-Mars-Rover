import { useState, useEffect } from 'react';

export type DeviceType = 'mobile' | 'tablet' | 'desktop';

export interface ResponsiveState {
  deviceType: DeviceType;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  width: number;
  height: number;
}

/**
 * Custom hook for responsive design detection
 * Optimized for iPad-first (810x1080) then mobile scaling
 * 
 * Breakpoints:
 * - Mobile: < 768px
 * - Tablet (iPad): 768px - 1024px
 * - Desktop: > 1024px
 */
export function useResponsive(): ResponsiveState {
  const [state, setState] = useState<ResponsiveState>(() => {
    if (typeof window === 'undefined') {
      return {
        deviceType: 'tablet',
        isMobile: false,
        isTablet: true,
        isDesktop: false,
        width: 810,
        height: 1080,
      };
    }

    const width = window.innerWidth;
    const height = window.innerHeight;
    
    let deviceType: DeviceType = 'tablet';
    if (width < 768) {
      deviceType = 'mobile';
    } else if (width > 1024) {
      deviceType = 'desktop';
    }

    return {
      deviceType,
      isMobile: deviceType === 'mobile',
      isTablet: deviceType === 'tablet',
      isDesktop: deviceType === 'desktop',
      width,
      height,
    };
  });

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      
      let deviceType: DeviceType = 'tablet';
      if (width < 768) {
        deviceType = 'mobile';
      } else if (width > 1024) {
        deviceType = 'desktop';
      }

      setState({
        deviceType,
        isMobile: deviceType === 'mobile',
        isTablet: deviceType === 'tablet',
        isDesktop: deviceType === 'desktop',
        width,
        height,
      });
    };

    // Debounce resize events for performance
    let timeoutId: number;
    const debouncedResize = () => {
      clearTimeout(timeoutId);
      timeoutId = window.setTimeout(handleResize, 150);
    };

    window.addEventListener('resize', debouncedResize);
    
    return () => {
      window.removeEventListener('resize', debouncedResize);
      clearTimeout(timeoutId);
    };
  }, []);

  return state;
}





























