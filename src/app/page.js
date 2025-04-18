'use client';

import { useAuth } from "@/components/auth/AuthProvider";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import ActivityTracker from "@/components/activities/ActivityTracker";

export default function Home() {
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!user) {
      router.push('/signin');
    }
  }, [user, router]);

  if (!user) return null;

  return (
    <div className="min-h-screen p-8 flex flex-col items-center justify-between font-[family-name:var(--font-inter)]">
      <main className="flex flex-col items-center gap-8 flex-grow w-full">
        <h1 className="text-3xl md:text-4xl font-[family-name:var(--font-amiri)] text-center">
          بِسْمِ اللهِ الرَّحْمٰنِ الرَّحِيْمِ
        </h1>
        
        <div className="text-center space-y-2 mb-4">
          <h2 className="text-2xl md:text-3xl font-semibold">
            Prayer & Activity Tracker
          </h2>
        </div>

        <ActivityTracker />
      </main>

      <footer className="w-full py-6 text-center text-sm text-gray-600">
        <p>Made with devotion for the Muslim Ummah</p>
      </footer>
    </div>
  );
}
