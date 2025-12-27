// contexts/PhoneAuthContext.tsx - Context provider for Firebase phone authentication
import React, { createContext, useContext, useState, ReactNode } from 'react';
import { FirebaseAuthTypes } from '@react-native-firebase/auth';

interface PhoneAuthContextType {
  confirmation: FirebaseAuthTypes.ConfirmationResult | null;
  phoneNumber: string | null;
  setConfirmation: (confirmation: FirebaseAuthTypes.ConfirmationResult | null) => void;
  setPhoneNumber: (phone: string | null) => void;
  clearAuth: () => void;
}

const PhoneAuthContext = createContext<PhoneAuthContextType | undefined>(undefined);

export function PhoneAuthProvider({ children }: { children: ReactNode }) {
  const [confirmation, setConfirmation] = useState<FirebaseAuthTypes.ConfirmationResult | null>(null);
  const [phoneNumber, setPhoneNumber] = useState<string | null>(null);

  const clearAuth = () => {
    setConfirmation(null);
    setPhoneNumber(null);
  };

  return (
    <PhoneAuthContext.Provider
      value={{
        confirmation,
        phoneNumber,
        setConfirmation,
        setPhoneNumber,
        clearAuth,
      }}>
      {children}
    </PhoneAuthContext.Provider>
  );
}

export function usePhoneAuth() {
  const context = useContext(PhoneAuthContext);
  if (context === undefined) {
    throw new Error('usePhoneAuth must be used within a PhoneAuthProvider');
  }
  return context;
}

