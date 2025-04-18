'use client';

import { useState } from 'react';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import Link from 'next/link';
import { doc, setDoc } from 'firebase/firestore';

export default function SignUpForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Create user document in Firestore
      await setDoc(doc(db, 'users', user.uid), {
        email: user.email,
        displayName: user.email.split('@')[0],
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
      
    } catch (error) {
      if (error.code === 'auth/email-already-in-use') {
        setError('This email is already in use.');
      } else if (error.code === 'auth/weak-password') {
        setError('Password should be at least 6 characters.');
      } else {
        setError('Failed to create account.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center p-8">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold">Sign up for a new account</h2>
          <p className="mt-2 text-gray-600">
            Or{' '}
            <Link href="/signin" className="text-emerald-600 hover:text-emerald-500">
              sign in to your existing account
            </Link>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* ... existing form elements ... */}
        </form>
      </div>
    </div>
  );
} 