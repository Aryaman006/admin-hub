import React, { createContext, useContext, useEffect, useState } from 'react';
 import { User, Session } from '@supabase/supabase-js';
 import { supabase } from '@/integrations/supabase/client';
 import { toast } from 'sonner';
 
 interface AuthContextType {
   user: User | null;
   session: Session | null;
   isAdmin: boolean;
   isLoading: boolean;
   signIn: (email: string, password: string) => Promise<void>;
   signOut: () => Promise<void>;
 }
 
 const AuthContext = createContext<AuthContextType | undefined>(undefined);
 
 export const useAuth = () => {
   const context = useContext(AuthContext);
   if (!context) {
     throw new Error('useAuth must be used within an AuthProvider');
   }
   return context;
 };
 
 export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
   const [user, setUser] = useState<User | null>(null);
   const [session, setSession] = useState<Session | null>(null);
   const [isAdmin, setIsAdmin] = useState(false);
   const [isLoading, setIsLoading] = useState(true);
 
   const checkAdminStatus = async (userId: string): Promise<boolean> => {
     try {
       const { data, error } = await supabase
         .from('admins')
         .select('id')
         .eq('user_id', userId)
         .maybeSingle();
 
       if (error) {
         console.error('Error checking admin status:', error);
         return false;
       }
 
       return !!data;
     } catch (error) {
       console.error('Error checking admin status:', error);
       return false;
     }
   };
 
  useEffect(() => {
    let mounted = true;

    // Safety net: never allow the app to spin forever.
    const safetyTimeoutId = window.setTimeout(() => {
      if (mounted) setIsLoading(false);
    }, 8000);

    const finishLoading = () => {
      window.clearTimeout(safetyTimeoutId);
      if (mounted) setIsLoading(false);
    };

    const handleSession = async (nextSession: Session | null) => {
      if (!mounted) return;

      setSession(nextSession);
      setUser(nextSession?.user ?? null);

      if (!nextSession?.user) {
        setIsAdmin(false);
        finishLoading();
        return;
      }

      try {
        const adminStatus = await checkAdminStatus(nextSession.user.id);
        if (!mounted) return;

        setIsAdmin(adminStatus);

        if (!adminStatus) {
          toast.error('Access denied. You are not an admin.');

          // IMPORTANT: Don't await signOut; network issues can cause an infinite spinner.
          void supabase.auth.signOut();
          setUser(null);
          setSession(null);
          setIsAdmin(false);
        }
      } catch (error) {
        console.error('Error handling session:', error);
        setIsAdmin(false);
      } finally {
        finishLoading();
      }
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      void handleSession(nextSession);
    });

    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        void handleSession(session);
      })
      .catch((error) => {
        console.error('Error getting session:', error);
        finishLoading();
      });

    return () => {
      mounted = false;
      window.clearTimeout(safetyTimeoutId);
      subscription.unsubscribe();
    };
  }, []);
 
   const signIn = async (email: string, password: string) => {
     const { error } = await supabase.auth.signInWithPassword({ email, password });
     if (error) throw error;
   };
 
   const signOut = async () => {
     await supabase.auth.signOut();
     setUser(null);
     setSession(null);
     setIsAdmin(false);
   };
 
   return (
     <AuthContext.Provider value={{ user, session, isAdmin, isLoading, signIn, signOut }}>
       {children}
     </AuthContext.Provider>
   );
 };