'use client';

import { useState } from "react";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-gradient-to-b from-white to-gray-50 dark:from-gray-900 dark:to-black">
      <main className="w-full max-w-md mx-auto space-y-8 text-center">
        <header className="space-y-4">
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white">
            Drawity
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Start a creative journey with friends!
          </p>
        </header>

        <div className="space-y-4">
          <button
            className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
            onClick={async () => {
              try {
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
              }
            }}
          >
            Start New Game
          </button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300 dark:border-gray-700" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-gradient-to-b from-white to-gray-50 dark:from-gray-900 dark:to-black text-gray-500">
                or
              </span>
            </div>
          </div>

          <div className="space-y-3">
            <input
              type="text"
              placeholder="Enter game code"
              className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              className="w-full py-3 px-4 bg-gray-800 dark:bg-gray-700 hover:bg-gray-900 dark:hover:bg-gray-600 text-white font-medium rounded-lg transition-colors"
              onClick={() => {
                // TODO: Implement game joining
                console.log("Join game");
              }}
            >
              Join Game
            </button>
          </div>
        </div>
      </main>

      <footer className="mt-16 text-center text-sm text-gray-500 dark:text-gray-400">
        <p>Draw, guess, and have fun together!</p>
      </footer>
    </div>
  );
}
