'use client';

import { useState } from 'react';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { FcGoogle } from 'react-icons/fc';
import Image from 'next/image';

export default function SignInForm() {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const createUserDocument = async (user) => {
    try {
      // Check if user document already exists
      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);
      
      if (!userDoc.exists()) {
        // Create default user document with activities
        await setDoc(userDocRef, {
          email: user.email,
          displayName: user.displayName || user.email.split('@')[0],
          photoURL: user.photoURL,
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
        
        console.log("Created new user document for:", user.email);
      }
    } catch (error) {
      console.error("Error creating user document:", error);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      setError('');
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      await createUserDocument(result.user);
    } catch (error) {
      setError('Failed to sign in with Google.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="w-full max-w-md p-8">
        <div className="mb-10 text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Mu-slim&Smart
          </h1>
          <p className="text-gray-600">
            Simple habit tracking for better living
          </p>
        </div>

        <div className="mb-8">
          <Image 
            src="/test.webp" 
            alt="Mu-slim&Smart" 
            width={400} 
            height={250} 
            className="w-full h-auto rounded-md"
          />
        </div>
        
        {error && (
          <div className="p-3 mb-6 text-sm text-red-600 bg-red-50 rounded">
            {error}
          </div>
        )}
        
        <button
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full flex items-center justify-center px-4 py-3 text-base font-medium rounded bg-black text-white hover:bg-gray-800 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <div className="flex items-center gap-2">
              <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Signing in...</span>
            </div>
          ) : (
            <>
              <FcGoogle className="w-5 h-5 mr-2" />
              <span>Continue with Google</span>
            </>
          )}
        </button>
        
        <p className="mt-8 text-center text-sm text-gray-500">
          Track your activities, compete with friends, grow together
        </p>
      </div>
    </div>
  );
} 