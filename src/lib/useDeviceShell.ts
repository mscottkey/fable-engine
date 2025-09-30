import { useState, useEffect } from 'react';

export type Shell = 'desktop' | 'mobile';
export type Breakpoint = 'sm' | 'md' | 'lg' | 'xl' | '2xl';

interface DeviceShell {
  shell: Shell;
  isNative: boolean;
  breakpoint: Breakpoint;
  width: number;
}

const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
} as const;

function getCurrentBreakpoint(width: number): Breakpoint {
  if (width >= BREAKPOINTS['2xl']) return '2xl';
  if (width >= BREAKPOINTS.xl) return 'xl';
  if (width >= BREAKPOINTS.lg) return 'lg';
  if (width >= BREAKPOINTS.md) return 'md';
  return 'sm';
}

function getIsNative(): boolean {
  // Check if running in Capacitor
  if (typeof window !== 'undefined' && (window as any).Capacitor) {
    return (window as any).Capacitor.isNativePlatform();
  }
  return false;
}

export function useDeviceShell(): DeviceShell {
  const [deviceInfo, setDeviceInfo] = useState<DeviceShell>(() => {
    if (typeof window === 'undefined') {
      return { shell: 'desktop', isNative: false, breakpoint: 'lg', width: 1024 };
    }
    
    const width = window.innerWidth;
    const breakpoint = getCurrentBreakpoint(width);
    const isNative = getIsNative();
    
    // Mobile shell for native apps or small screens
    const shell: Shell = isNative || width < BREAKPOINTS.lg ? 'mobile' : 'desktop';
    
    return { shell, isNative, breakpoint, width };
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleResize = () => {
      const width = window.innerWidth;
      const breakpoint = getCurrentBreakpoint(width);
      const isNative = getIsNative();
      const shell: Shell = isNative || width < BREAKPOINTS.lg ? 'mobile' : 'desktop';
      
      setDeviceInfo({ shell, isNative, breakpoint, width });
    };

    const mediaQuery = window.matchMedia(`(min-width: ${BREAKPOINTS.lg}px)`);
    mediaQuery.addEventListener('change', handleResize);
    window.addEventListener('resize', handleResize);
    
    return () => {
      mediaQuery.removeEventListener('change', handleResize);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return deviceInfo;
}