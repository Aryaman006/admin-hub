import React, { createContext, useContext, useEffect, useState } from 'react';

interface CorporateData {
  id: string;
  name: string;
  coupon_code: string;
  max_members: number | null;
  expires_at: string | null;
  is_active: boolean;
}

interface CorporateSession {
  corporate: CorporateData;
  admin_id: string;
  email: string;
}

interface CorporateAuthContextType {
  corporate: CorporateData | null;
  adminEmail: string | null;
  adminId: string | null;
  isLoading: boolean;
  signOut: () => void;
  refetchCorporate: () => void;
}

const CorporateAuthContext = createContext<CorporateAuthContextType | undefined>(undefined);

export const useCorporateAuth = () => {
  const context = useContext(CorporateAuthContext);
  if (!context) {
    throw new Error('useCorporateAuth must be used within a CorporateAuthProvider');
  }
  return context;
};

export const CorporateAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [corporate, setCorporate] = useState<CorporateData | null>(null);
  const [adminEmail, setAdminEmail] = useState<string | null>(null);
  const [adminId, setAdminId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadSession = () => {
    try {
      const stored = localStorage.getItem('corporate_session');
      if (stored) {
        const session: CorporateSession = JSON.parse(stored);
        setCorporate(session.corporate);
        setAdminEmail(session.email);
        setAdminId(session.admin_id);
      } else {
        setCorporate(null);
        setAdminEmail(null);
        setAdminId(null);
      }
    } catch {
      setCorporate(null);
      setAdminEmail(null);
      setAdminId(null);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadSession();
  }, []);

  const signOut = () => {
    localStorage.removeItem('corporate_session');
    setCorporate(null);
    setAdminEmail(null);
    setAdminId(null);
  };

  const refetchCorporate = () => {
    loadSession();
  };

  return (
    <CorporateAuthContext.Provider value={{ corporate, adminEmail, adminId, isLoading, signOut, refetchCorporate }}>
      {children}
    </CorporateAuthContext.Provider>
  );
};
