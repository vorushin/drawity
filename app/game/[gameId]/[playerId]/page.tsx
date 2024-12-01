'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

export default function GamePage() {
  const params = useParams();
  const [playerRole, setPlayerRole] = useState<string>('');
  
  useEffect(() => {
    const checkPlayerRole = async () => {
      try {
        const response = await fetch(`/api/games/${params.gameId}`);
        const data = await response.json();
        
        if (params.playerId === data.player1Id) {
          setPlayerRole('Player 1');
        } else if (params.playerId === data.player2Id) {
          setPlayerRole('Player 2');
        } else {
          setPlayerRole('Unknown Player');
        }
      } catch (error) {
        console.error('Error fetching game:', error);
      }
    };

    checkPlayerRole();
  }, [params.gameId, params.playerId]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8">
      <div className="space-y-4 text-center">
        <h1 className="text-2xl font-bold">Game Room</h1>
        <p>Game ID: {params.gameId}</p>
        <p>You are: {playerRole}</p>
      </div>
    </div>
  );
} 