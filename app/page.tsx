'use client';

import { useState } from "react";

export default function Home() {
  const [isLoading, setIsLoading] = useState(false);

  return (
    <div className="min-h-screen flex flex-col items-center justify-between p-6 sm:p-8 bg-gradient-to-b from-white to-gray-50 dark:from-gray-900 dark:to-black">
      <div className="w-full" /> {/* Spacer */}
      
      <main className="w-full max-w-md mx-auto space-y-8 text-center">
        <header className="space-y-6">
          <div className="relative">
            <h1 className="text-5xl sm:text-6xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400">
              Drawity
            </h1>
            <div className="absolute -top-8 -right-8 w-16 h-16 animate-float">
              <svg viewBox="0 0 24 24" className="w-full h-full text-blue-500 dark:text-blue-400">
                <path fill="currentColor" d="M20.71,7.04C21.1,6.65 21.1,6 20.71,5.63L18.37,3.29C18,2.9 17.35,2.9 16.96,3.29L15.12,5.12L18.87,8.87M3,17.25V21H6.75L17.81,9.93L14.06,6.18L3,17.25Z" />
              </svg>
            </div>
          </div>
          <p className="text-xl sm:text-2xl text-gray-600 dark:text-gray-400 font-light">
            Start a creative journey with friends!
          </p>
        </header>

        <div className="space-y-4 px-4">
          <button
            disabled={isLoading}
            className="w-full py-4 px-6 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white text-lg font-medium rounded-2xl transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
            onClick={async () => {
              try {
                setIsLoading(true);
                const response = await fetch('/api/games', {
                  method: 'POST',
                });
                const data = await response.json();
                
                if (response.ok) {
                  window.location.href = `/game/${data.gameId}/${data.player1Id}`;
                } else {
                  console.error('Failed to create game:', data.error);
                }
              } catch (error) {
                console.error('Error creating game:', error);
              } finally {
                setIsLoading(false);
              }
            }}
          >
            {isLoading ? (
              <div className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Creating game...
              </div>
            ) : (
              "Start New Game"
            )}
          </button>
        </div>
      </main>

      <footer className="mt-auto pt-16 text-center">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Draw and have fun together!
        </p>
      </footer>
    </div>
  );
}
