import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import * as SecureStore from 'expo-secure-store';

interface UserData {
  id: number;
  nom: string;
  prenom: string;
  email: string;
  telephone: string;
  role: number;
  compagnie_id: number | null;
  statut: number;
  photo?: string | null;
}

interface UserContextType {
  user: UserData | null;
  setUser: (user: UserData | null) => void;
  updateUser: (partial: Partial<UserData>) => void;
}

const UserContext = createContext<UserContextType>({
  user: null,
  setUser: () => {},
  updateUser: () => {},
});

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUserState] = useState<UserData | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const json = await SecureStore.getItemAsync('fandrioUser');
        if (json) setUserState(JSON.parse(json));
      } catch (e) {
        console.warn('UserProvider: erreur lecture cache', e);
      }
    })();
  }, []);

  const setUser = useCallback((u: UserData | null) => {
    setUserState(u);
    if (u) {
      SecureStore.setItemAsync('fandrioUser', JSON.stringify(u)).catch(() => {});
    }
  }, []);

  const updateUser = useCallback((partial: Partial<UserData>) => {
    setUserState(prev => {
      if (!prev) return prev;
      const updated = { ...prev, ...partial };
      SecureStore.setItemAsync('fandrioUser', JSON.stringify(updated)).catch(() => {});
      return updated;
    });
  }, []);

  return (
    <UserContext.Provider value={{ user, setUser, updateUser }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  return useContext(UserContext);
}
