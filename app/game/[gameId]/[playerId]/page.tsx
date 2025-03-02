'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

type Tool = 'pen' | 'eraser' | 'brush' | 'marker' | 'pencil' | 'spray' | 'highlighter';
type GameState = {
  currentPlayerId: string;
  canvasData: string | null;
};

export default function GamePage() {
  const params = useParams();
  const [playerRole, setPlayerRole] = useState<string>('');
  const [player2Url, setPlayer2Url] = useState<string>('');
  const [currentTool, setCurrentTool] = useState<Tool>('pen');
  const [currentColor, setCurrentColor] = useState('#000000');
  const [brushSize, setBrushSize] = useState(2);
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
        
        // Debug received data
        if (data.canvasData) {
          console.log("Received canvas data length:", data.canvasData.length);
        }
        
        // Always update canvas when we have canvas data from the server
        // The only time we don't update is when we're actively drawing (isMyTurn is true)
        // and we haven't just finished our move
        const shouldUpdateCanvas = data.canvasData && (!isMyTurn || newIsMyTurn !== isMyTurn);
        
        if (shouldUpdateCanvas) {
          console.log("Updating canvas from server data, isMyTurn:", isMyTurn, "newIsMyTurn:", newIsMyTurn);
          
          const canvas = canvasRef.current;
          if (!canvas) return;
          const ctx = canvas.getContext('2d');
          if (!ctx) return;
          
          // Create a new image and wait for it to load before manipulating the canvas
          const img = new Image();
          
          img.onload = () => {
            // Once the image is loaded, update the canvas
            console.log("Image loaded, dimensions:", img.width, "x", img.height);
            
            // Reset canvas state
            ctx.globalCompositeOperation = 'source-over';
            ctx.globalAlpha = 1;
            
            // Clear canvas
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            // Draw the loaded image
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          };
          
          // Set up error handling
          img.onerror = (err) => {
            console.error("Failed to load canvas image:", err);
          };
          
          // Set the source to load the image
          img.src = data.canvasData;
        }

        // Update game state and turn status
        setGameState({
          currentPlayerId: data.currentPlayerId,
          canvasData: data.canvasData
        });
        setIsMyTurn(newIsMyTurn);
      } catch (error) {
        console.error('Error fetching game:', error);
      }
    };

    checkGameState();
    const interval = setInterval(checkGameState, 2000);
    return () => clearInterval(interval);
  }, [params.gameId, params.playerId, isMyTurn, gameState?.canvasData]);

  // Initial canvas setup and resize handling
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Initialize canvas with proper size once at startup
    const initCanvas = () => {
      const maxWidth = Math.min(600, window.innerWidth - 32); // 32px for padding
      const aspectRatio = 3/2; // Keep 600x400 aspect ratio
      canvas.width = maxWidth;
      canvas.height = maxWidth / aspectRatio;

      // Set default styles
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      
      ctx.strokeStyle = currentColor;
      ctx.lineWidth = brushSize;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Logging for debugging
      console.log("Canvas initialized with dimensions:", canvas.width, "x", canvas.height);
    };

    initCanvas();
    
    // Handle resize events
    const handleResize = () => {
      // Capture current canvas state
      const tempCanvas = document.createElement('canvas');
      const tempCtx = tempCanvas.getContext('2d');
      if (!tempCtx) return;
      
      // Copy existing canvas to temp canvas
      tempCanvas.width = canvas.width;
      tempCanvas.height = canvas.height;
      tempCtx.drawImage(canvas, 0, 0);
      
      // Resize main canvas
      const maxWidth = Math.min(600, window.innerWidth - 32);
      const aspectRatio = 3/2;
      canvas.width = maxWidth;
      canvas.height = maxWidth / aspectRatio;
      
      // Clear and reset main canvas
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      
      ctx.strokeStyle = currentColor;
      ctx.lineWidth = brushSize;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Draw temp canvas back onto resized canvas
      ctx.drawImage(tempCanvas, 0, 0, canvas.width, canvas.height);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    if (!canvasRef.current) return;
    
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;
    
    isDrawingRef.current = true;
    const position = getEventPosition(e);
    lastPositionRef.current = position;
    
    // For tools with transparency, draw the initial point using our improved algorithm
    if (['brush', 'marker', 'highlighter'].includes(currentTool)) {
      let lineWidth = brushSize;
      let opacity = 1;
      
      switch (currentTool) {
        case 'brush':
          lineWidth = brushSize * 2;
          opacity = 0.8;
          break;
        case 'marker':
          lineWidth = brushSize * 1.5;
          opacity = 0.7;
          break;
        case 'highlighter':
          lineWidth = brushSize * 3;
          opacity = 0.3;
          break;
      }
      
      // Draw a tiny line at the start point (almost like a dot) with the improved algorithm
      // This ensures the starting point has the same appearance as the rest of the line
      const offsetPoint = {
        x: position.x + 0.1,  // Tiny offset
        y: position.y + 0.1   // Tiny offset
      };
      
      drawSmoothLine(ctx, position, offsetPoint, lineWidth, currentColor, opacity);
    }
  };

  const stopDrawing = () => {
    isDrawingRef.current = false;
    
    // Reset any global composite operations when done
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1;
      }
    }
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawingRef.current || !canvasRef.current) return;

    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    const currentPosition = getEventPosition(e);
    
    if (currentTool === 'eraser') {
      // Hard eraser implementation using globalCompositeOperation
      ctx.save();
      // Set the composite operation to "destination-out" to create a hard eraser effect
      ctx.globalCompositeOperation = 'destination-out';
      // Reset global alpha to fully remove pixels
      ctx.globalAlpha = 1;
      
      // Set line properties
      ctx.beginPath();
      ctx.moveTo(lastPositionRef.current.x, lastPositionRef.current.y);
      ctx.lineTo(currentPosition.x, currentPosition.y);
      ctx.strokeStyle = 'rgba(0,0,0,1)'; // Color doesn't matter for destination-out
      ctx.lineWidth = brushSize * 3;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke();
      
      ctx.restore(); // Restore previous context state
    } else {
      // Regular drawing tools
      ctx.save(); // Save context state
      
      // Set common properties
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      
      if (currentTool === 'spray') {
        // For spray, we'll add dots along the line
        ctx.globalAlpha = 0.4;
        drawSpray(ctx, currentPosition.x, currentPosition.y, brushSize * 3, currentColor);
      } else if (['brush', 'marker', 'highlighter'].includes(currentTool)) {
        // Use our improved smooth line algorithm for semi-transparent brushes
        switch (currentTool) {
          case 'brush':
            drawSmoothLine(ctx, lastPositionRef.current, currentPosition, brushSize * 2, currentColor, 0.8);
            break;
          case 'marker':
            drawSmoothLine(ctx, lastPositionRef.current, currentPosition, brushSize * 1.5, currentColor, 0.7);
            break;
          case 'highlighter':
            drawSmoothLine(ctx, lastPositionRef.current, currentPosition, brushSize * 3, currentColor, 0.3);
            break;
        }
      } else {
        // For tools without transparency issues (pen, pencil), use standard stroke
        ctx.beginPath();
        
        switch (currentTool) {
          case 'pen':
            // Standard line for pen
            ctx.strokeStyle = currentColor;
            ctx.lineWidth = 2;
            ctx.globalAlpha = 1;
            break;
          case 'pencil':
            // Thinner line for pencil
            ctx.strokeStyle = currentColor;
            ctx.lineWidth = brushSize * 0.5;
            ctx.globalAlpha = 0.9;
            break;
          default:
            // Default drawing
            ctx.strokeStyle = currentColor;
            ctx.lineWidth = brushSize;
            ctx.globalAlpha = 1;
        }
        
        ctx.moveTo(lastPositionRef.current.x, lastPositionRef.current.y);
        ctx.lineTo(currentPosition.x, currentPosition.y);
        ctx.stroke();
      }
      
      ctx.restore(); // Restore previous context state
    }
    
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
  
  // Improved drawing algorithm that eliminates darker areas between line segments
  const drawSmoothLine = (
    ctx: CanvasRenderingContext2D, 
    from: {x: number, y: number}, 
    to: {x: number, y: number}, 
    lineWidth: number, 
    color: string, 
    opacity: number
  ) => {
    // Create a temporary canvas for this segment to avoid alpha compositing issues
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) return;
    
    // Set temp canvas to the size needed for this line segment (with some padding)
    const padding = lineWidth * 2;
    const minX = Math.min(from.x, to.x) - padding;
    const minY = Math.min(from.y, to.y) - padding;
    const width = Math.abs(from.x - to.x) + padding * 2;
    const height = Math.abs(from.y - to.y) + padding * 2;
    
    // Ensure we have some size to work with
    tempCanvas.width = Math.max(width, 1);
    tempCanvas.height = Math.max(height, 1);
    
    // Draw the line on the temp canvas
    tempCtx.lineCap = 'round';
    tempCtx.lineJoin = 'round';
    tempCtx.strokeStyle = color;
    tempCtx.lineWidth = lineWidth;
    tempCtx.beginPath();
    tempCtx.moveTo(from.x - minX, from.y - minY);
    tempCtx.lineTo(to.x - minX, to.y - minY);
    tempCtx.stroke();
    
    // Draw the temp canvas onto the main canvas with the desired opacity
    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.drawImage(tempCanvas, minX, minY);
    ctx.restore();
  };
  
  const drawSpray = (ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, color: string) => {
    // Save current context state
    ctx.save();
    
    ctx.fillStyle = color;
    
    // Create spray effect with random dots
    const dots = radius * 2;
    for (let i = 0; i < dots; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radiusRandom = Math.random() * radius;
      
      ctx.beginPath();
      ctx.arc(
        x + radiusRandom * Math.cos(angle),
        y + radiusRandom * Math.sin(angle),
        0.5, 0, Math.PI * 2
      );
      ctx.fill();
    }
    
    // Restore context state
    ctx.restore();
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
      // Create a clean version of the canvas for sending
      const tempCanvas = document.createElement('canvas');
      const tempCtx = tempCanvas.getContext('2d');
      if (!tempCtx) return;
      
      // Set the temp canvas to the same size
      tempCanvas.width = canvas.width;
      tempCanvas.height = canvas.height;
      
      // Fill with white
      tempCtx.fillStyle = '#ffffff';
      tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
      
      // Draw the current canvas onto the temp canvas with all default settings
      tempCtx.globalCompositeOperation = 'source-over';
      tempCtx.globalAlpha = 1;
      tempCtx.drawImage(canvas, 0, 0);
      
      // Convert the temp canvas to base64 - this ensures a clean state
      const canvasData = tempCanvas.toDataURL('image/png'); 
      
      // Debug the canvas data
      console.log("Sending canvas data length:", canvasData.length);
      console.log("First 100 chars:", canvasData.substring(0, 100));
      
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

      // Update turn state immediately
      setIsMyTurn(false);
      
      // The game state will be updated via polling from the checkGameState function
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
            <div className="flex flex-col gap-3 items-center justify-center bg-white dark:bg-gray-800 rounded-xl p-3 shadow-lg">
              <div className="w-full flex items-center justify-between">
                {/* Tools in a dropdown/select on mobile */}
                <div className="flex items-center gap-2">
                  <div className="sm:hidden relative">
                    <select
                      value={currentTool}
                      onChange={(e) => setCurrentTool(e.target.value as Tool)}
                      className="block appearance-none bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg py-2 px-3 pr-8 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="pen">Pen</option>
                      <option value="pencil">Pencil</option>
                      <option value="brush">Brush</option>
                      <option value="marker">Marker</option>
                      <option value="highlighter">Highlighter</option>
                      <option value="spray">Spray Paint</option>
                      <option value="eraser">Eraser</option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2">
                      <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                  
                  {/* Tools as buttons on desktop */}
                  <div className="hidden sm:flex flex-wrap gap-2">
                    <button
                      onClick={() => setCurrentTool('pen')}
                      className={`w-9 h-9 flex items-center justify-center rounded-lg transition-all ${
                        currentTool === 'pen'
                          ? 'bg-blue-600 text-white shadow-lg'
                          : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                      title="Pen"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>
                    
                    <button
                      onClick={() => setCurrentTool('pencil')}
                      className={`w-9 h-9 flex items-center justify-center rounded-lg transition-all ${
                        currentTool === 'pencil'
                          ? 'bg-blue-600 text-white shadow-lg'
                          : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                      title="Pencil"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    
                    <button
                      onClick={() => setCurrentTool('brush')}
                      className={`w-9 h-9 flex items-center justify-center rounded-lg transition-all ${
                        currentTool === 'brush'
                          ? 'bg-blue-600 text-white shadow-lg'
                          : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                      title="Brush"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                      </svg>
                    </button>
                    
                    <button
                      onClick={() => setCurrentTool('marker')}
                      className={`w-9 h-9 flex items-center justify-center rounded-lg transition-all ${
                        currentTool === 'marker'
                          ? 'bg-blue-600 text-white shadow-lg'
                          : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                      title="Marker"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                    </button>
                    
                    <button
                      onClick={() => setCurrentTool('highlighter')}
                      className={`w-9 h-9 flex items-center justify-center rounded-lg transition-all ${
                        currentTool === 'highlighter'
                          ? 'bg-blue-600 text-white shadow-lg'
                          : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                      title="Highlighter"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                      </svg>
                    </button>
                    
                    <button
                      onClick={() => setCurrentTool('spray')}
                      className={`w-9 h-9 flex items-center justify-center rounded-lg transition-all ${
                        currentTool === 'spray'
                          ? 'bg-blue-600 text-white shadow-lg'
                          : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                      title="Spray"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </button>
                    
                    <button
                      onClick={() => setCurrentTool('eraser')}
                      className={`w-9 h-9 flex items-center justify-center rounded-lg transition-all ${
                        currentTool === 'eraser'
                          ? 'bg-blue-600 text-white shadow-lg'
                          : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                      title="Eraser"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
                
                <button
                  onClick={finishMove}
                  className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-medium rounded-lg shadow-lg flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="sm:inline hidden">Finish Move</span>
                  <span className="sm:hidden inline">Done</span>
                </button>
              </div>
              
              <div className="flex w-full gap-2 items-center">
                {/* Color selection */}
                <div className="flex-1 flex items-center gap-1 justify-start">
                  {['#000000', '#e53e3e', '#3182ce', '#38a169', '#d69e2e', '#805ad5', '#dd6b20', '#718096'].map(color => (
                    <button
                      key={color}
                      onClick={() => setCurrentColor(color)}
                      className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full transition-transform ${currentColor === color ? 'ring-2 ring-offset-1 ring-blue-500' : ''}`}
                      style={{ backgroundColor: color }}
                      aria-label={`Color ${color}`}
                    />
                  ))}
                </div>
                
                {/* Size slider */}
                <div className="flex-1 flex items-center gap-1">
                  <svg className="w-4 h-4 text-gray-600 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                  <input
                    type="range"
                    min="1"
                    max="20"
                    value={brushSize}
                    onChange={(e) => setBrushSize(parseInt(e.target.value))}
                    className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
                  />
                  <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <circle cx="12" cy="12" r="6" />
                  </svg>
                </div>
              </div>
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