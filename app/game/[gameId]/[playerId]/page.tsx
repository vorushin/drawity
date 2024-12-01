'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

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
  const [copySuccess, setCopySuccess] = useState(false);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef(false);
  const lastPositionRef = useRef({ x: 0, y: 0 });

  // Fetch game state periodically
  useEffect(() => {
    const checkGameState = async () => {
      try {
        const response = await fetch(`/api/games/${params.gameId}`);
        const data = await response.json();
        
        // Set player role
        if (params.playerId === data.player1Id) {
          setPlayerRole('Player 1');
          const url = `${window.location.origin}/game/${params.gameId}/${data.player2Id}`;
          setPlayer2Url(url);
        } else if (params.playerId === data.player2Id) {
          setPlayerRole('Player 2');
        } else {
          setPlayerRole('Unknown Player');
        }

        // Update turn status
        const newIsMyTurn = data.currentPlayerId === params.playerId;
        setIsMyTurn(newIsMyTurn);
        
        // Only update canvas if:
        // 1. We're receiving the turn (switching from not our turn to our turn)
        // 2. We don't have the turn (to see other player's moves)
        if (data.canvasData && (!newIsMyTurn || (newIsMyTurn && !isMyTurn))) {
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

        setGameState({
          currentPlayerId: data.currentPlayerId,
          canvasData: data.canvasData
        });
      } catch (error) {
        console.error('Error fetching game:', error);
      }
    };

    checkGameState();
    const interval = setInterval(checkGameState, 2000);
    return () => clearInterval(interval);
  }, [params.gameId, params.playerId, isMyTurn]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Make canvas fill most of the screen width on mobile
    const updateCanvasSize = () => {
      const maxWidth = Math.min(600, window.innerWidth - 32); // 32px for padding
      const aspectRatio = 3/2; // Keep 600x400 aspect ratio
      canvas.width = maxWidth;
      canvas.height = maxWidth / aspectRatio;

      // Redraw canvas content if exists
      const ctx = canvas.getContext('2d');
      if (ctx && gameState?.canvasData) {
        const img = new Image();
        img.onload = () => {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        };
        img.src = gameState.canvasData;
      } else if (ctx) {
        // Set default styles
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
    };

    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);
    return () => window.removeEventListener('resize', updateCanvasSize);
  }, [gameState?.canvasData]);

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
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000); // Reset after 2 seconds
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
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-white to-gray-50 dark:from-gray-900 dark:to-black">
      <div className="w-full max-w-2xl mx-auto p-4 sm:p-8 space-y-6">
        <header className="text-center space-y-3">
          <Link 
            href="/"
            className="inline-block hover:opacity-80 transition-opacity"
          >
            <h1 className="text-3xl sm:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400">
              Drawity
            </h1>
          </Link>
          <div className="flex items-center justify-center gap-2">
            <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <p className="text-lg font-medium">{playerRole}</p>
          </div>
        </header>
        
        {(playerRole === 'Player 1' && !isMyTurn) && (
          <div className="flex items-center justify-center gap-2 animate-pulse">
            <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-lg font-medium text-blue-600">
              Waiting for Player 2...
            </p>
          </div>
        )}
        
        {(playerRole === 'Player 2' && !isMyTurn) && (
          <div className="flex items-center justify-center gap-2 animate-pulse">
            <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-lg font-medium text-blue-600">
              Waiting for Player 1...
            </p>
          </div>
        )}
        
        {playerRole === 'Player 1' && (
          <div className="text-center space-y-3 bg-white dark:bg-gray-800 rounded-xl p-4 shadow-lg">
            <div className="flex items-center justify-center gap-2">
              <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Share with Player 2
              </p>
            </div>
            <div className="flex items-center justify-center gap-2">
              <div className="relative flex-1 max-w-md">
                <input
                  type="text"
                  readOnly
                  value={player2Url}
                  className="w-full px-4 py-2 pr-12 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm shadow-inner"
                />
                <button
                  onClick={copyPlayer2Url}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-md transition-colors"
                  title="Copy to clipboard"
                >
                  {copySuccess ? (
                    <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-4">
          {isMyTurn && (
            <div className="flex flex-col sm:flex-row gap-3 items-center justify-center bg-white dark:bg-gray-800 rounded-xl p-4 shadow-lg">
              <div className="flex gap-3">
                <button
                  onClick={() => setCurrentTool('pen')}
                  className={`flex items-center gap-2 px-6 py-2.5 rounded-lg transition-all transform hover:scale-105 text-sm font-medium ${
                    currentTool === 'pen'
                      ? 'bg-blue-600 text-white shadow-lg'
                      : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                  Pen
                </button>
                <button
                  onClick={() => setCurrentTool('eraser')}
                  className={`flex items-center gap-2 px-6 py-2.5 rounded-lg transition-all transform hover:scale-105 text-sm font-medium ${
                    currentTool === 'eraser'
                      ? 'bg-blue-600 text-white shadow-lg'
                      : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Eraser
                </button>
              </div>
              
              <button
                onClick={finishMove}
                className="w-full sm:w-auto px-6 py-2.5 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-medium rounded-lg transition-all transform hover:scale-105 shadow-lg flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Finish Move
              </button>
            </div>
          )}
          
          <div className="flex justify-center">
            <div className="relative bg-white dark:bg-gray-800 rounded-xl p-2 shadow-lg">
              <canvas
                ref={canvasRef}
                className="border border-gray-200 dark:border-gray-700 bg-white rounded-lg touch-none"
                onMouseDown={isMyTurn ? startDrawing : undefined}
                onMouseUp={isMyTurn ? stopDrawing : undefined}
                onMouseOut={isMyTurn ? stopDrawing : undefined}
                onMouseMove={isMyTurn ? draw : undefined}
                onTouchStart={isMyTurn ? startDrawing : undefined}
                onTouchEnd={isMyTurn ? stopDrawing : undefined}
                onTouchMove={isMyTurn ? draw : undefined}
                style={{ touchAction: 'none', maxWidth: '100%' }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 