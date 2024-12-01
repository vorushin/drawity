'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';

type Tool = 'pen' | 'eraser';
type GameState = {
  currentPlayerId: string;
  canvasData: string | null;
};

export default function GamePage() {
  const params = useParams();
  const [playerRole, setPlayerRole] = useState<string>('');
  const [player2Url, setPlayer2Url] = useState<string>('');
  const [currentTool, setCurrentTool] = useState<Tool>('pen');
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [isMyTurn, setIsMyTurn] = useState(false);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef(false);
  const lastPositionRef = useRef({ x: 0, y: 0 });

  // Fetch game state periodically
  useEffect(() => {
    const checkPlayerRole = async () => {
      try {
        const response = await fetch(`/api/games/${params.gameId}`);
        const data = await response.json();
        
        // Set player role
        if (params.playerId === data.player1Id) {
          setPlayerRole('Player 1');
          // Create the URL for player 2
          const url = `${window.location.origin}/game/${params.gameId}/${data.player2Id}`;
          setPlayer2Url(url);
        } else if (params.playerId === data.player2Id) {
          setPlayerRole('Player 2');
        } else {
          setPlayerRole('Unknown Player');
        }

        // Set game state and turn
        setGameState({
          currentPlayerId: data.currentPlayerId,
          canvasData: data.canvasData
        });
        
        setIsMyTurn(data.currentPlayerId === params.playerId);
        
        // If there's canvas data and it's my turn, display it
        if (data.canvasData && data.currentPlayerId === params.playerId) {
          const canvas = canvasRef.current;
          if (!canvas) return;
          const ctx = canvas.getContext('2d');
          if (!ctx) return;
          
          const img = new Image();
          img.onload = () => {
            ctx.drawImage(img, 0, 0);
          };
          img.src = data.canvasData;
        }
      } catch (error) {
        console.error('Error fetching game:', error);
      }
    };

    checkPlayerRole();
    
    // Set up polling for game state
    const interval = setInterval(checkPlayerRole, 2000);
    return () => clearInterval(interval);
  }, [params.gameId, params.playerId]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Set canvas size
    canvas.width = 600;
    canvas.height = 400;

    // Get context and set default styles
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, []);

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    isDrawingRef.current = true;
    const position = getEventPosition(e);
    lastPositionRef.current = position;
  };

  const stopDrawing = () => {
    isDrawingRef.current = false;
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawingRef.current || !canvasRef.current) return;

    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    const currentPosition = getEventPosition(e);

    ctx.beginPath();
    ctx.moveTo(lastPositionRef.current.x, lastPositionRef.current.y);
    ctx.lineTo(currentPosition.x, currentPosition.y);
    
    if (currentTool === 'pen') {
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2;
    } else {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 20;
    }
    
    ctx.stroke();
    lastPositionRef.current = currentPosition;
  };

  const getEventPosition = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    let x, y;

    if ('touches' in e) {
      x = e.touches[0].clientX - rect.left;
      y = e.touches[0].clientY - rect.top;
    } else {
      x = e.clientX - rect.left;
      y = e.clientY - rect.top;
    }

    return { x, y };
  };

  const copyPlayer2Url = async () => {
    try {
      await navigator.clipboard.writeText(player2Url);
      alert('URL copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy URL:', err);
    }
  };

  const finishMove = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      const canvasData = canvas.toDataURL(); // Convert canvas to base64
      
      const response = await fetch(`/api/games/${params.gameId}/moves`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          playerId: params.playerId,
          canvasData,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to submit move');
      }

      setIsMyTurn(false);
    } catch (error) {
      console.error('Error submitting move:', error);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8">
      <div className="space-y-4 text-center">
        <h1 className="text-2xl font-bold">Game Room</h1>
        <p>Game ID: {params.gameId}</p>
        <p>You are: {playerRole}</p>
        
        {playerRole === 'Player 1' && !isMyTurn && (
          <p className="text-lg font-medium text-blue-600">Waiting for Player 2...</p>
        )}
        
        {playerRole === 'Player 2' && !isMyTurn && (
          <p className="text-lg font-medium text-blue-600">Waiting for Player 1...</p>
        )}
        
        {playerRole === 'Player 1' && (
          <div className="mt-8 space-y-2">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Share this link with player 2:
            </p>
            <button
              onClick={copyPlayer2Url}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              Copy Player 2 URL
            </button>
          </div>
        )}

        <div className="mt-8 space-y-4">
          {isMyTurn && (
            <>
              <div className="flex gap-2 justify-center">
                <button
                  onClick={() => setCurrentTool('pen')}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    currentTool === 'pen'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 dark:bg-gray-700'
                  }`}
                >
                  Pen
                </button>
                <button
                  onClick={() => setCurrentTool('eraser')}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    currentTool === 'eraser'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 dark:bg-gray-700'
                  }`}
                >
                  Eraser
                </button>
              </div>
              
              <button
                onClick={finishMove}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
              >
                Finish Move
              </button>
            </>
          )}
          
          <canvas
            ref={canvasRef}
            className="border border-gray-300 dark:border-gray-700 bg-white"
            onMouseDown={isMyTurn ? startDrawing : undefined}
            onMouseUp={isMyTurn ? stopDrawing : undefined}
            onMouseOut={isMyTurn ? stopDrawing : undefined}
            onMouseMove={isMyTurn ? draw : undefined}
            onTouchStart={isMyTurn ? startDrawing : undefined}
            onTouchEnd={isMyTurn ? stopDrawing : undefined}
            onTouchMove={isMyTurn ? draw : undefined}
            style={{ touchAction: 'none' }}
          />
        </div>
      </div>
    </div>
  );
} 