'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import LoadingScreen from '../common/LoadingScreen';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
      if (authUser) {
        setUser(authUser);
        
        // Check if user document exists, if not create it
        try {
          const userDocRef = doc(db, 'users', authUser.uid);
          const userDoc = await getDoc(userDocRef);
          
          if (!userDoc.exists()) {
            // Create default user document
            await setDoc(userDocRef, {
              email: authUser.email,
              displayName: authUser.displayName || authUser.email.split('@')[0],
              photoURL: authUser.photoURL,
              createdAt: new Date().toISOString(),
              activities: [
                {
                  id: 'namaz',
                  name: 'Namaz',
                  enabled: true,
                  type: 'checkboxes',
                  options: [
                    { id: 'fajr', name: 'Fajr', score: 1, enabled: true },
                    { id: 'zuhr', name: 'Zuhr', score: 1, enabled: true },
                    { id: 'asr', name: 'Asr', score: 1, enabled: true },
                    { id: 'maghrib', name: 'Maghrib', score: 1, enabled: true },
                    { id: 'isha', name: 'Isha', score: 1, enabled: true },
                  ],
                },
                {
                  id: 'exercise',
                  name: 'Exercise',
                  enabled: true,
                  type: 'boolean',
                  score: 2,
                },
                {
                  id: 'study',
                  name: 'Study',
                  enabled: true,
                  type: 'range',
                  min: 0,
                  max: 5,
                }
              ],
              competitionSettings: {
                showNamaz: true,
                showExercise: true,
                showStudy: true
              }
            });
            
            console.log("Created new user document for:", authUser.email);
          }
        } catch (error) {
          console.error("Error checking/creating user document:", error);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {loading ? <LoadingScreen /> : children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
} 