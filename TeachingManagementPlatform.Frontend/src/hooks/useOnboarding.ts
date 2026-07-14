import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';

const STORAGE_KEY = 'onboarding_completed';
const TOUR_RESET_EVENT = 'onboarding-tour-reset';

export function useOnboarding() {
  const [showTour, setShowTour] = useState(() => {
    return localStorage.getItem(STORAGE_KEY) !== 'true';
  });

  // Listen for reset events from other instances of this hook
  useEffect(() => {
    const handleReset = () => {
      setShowTour(true);
    };

    window.addEventListener(TOUR_RESET_EVENT, handleReset);
    return () => {
      window.removeEventListener(TOUR_RESET_EVENT, handleReset);
    };
  }, []);

  const completeTour = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setShowTour(false);
    api.put('/user/settings', { onboardingCompleted: true }).catch(() => {});
  }, []);

  const resetTour = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setShowTour(true);
    // Notify other hook instances (e.g., DashboardLayout) to show the tour
    window.dispatchEvent(new Event(TOUR_RESET_EVENT));
  }, []);

  return { showTour, completeTour, resetTour };
}
