import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(request: Request, props: { params: Promise<{ gameId: string }> }) {
  const params = await props.params;
  try {
    const { playerId, canvasData } = await request.json();
    
    // Debug received data
    console.log(`API: Received move from player ${playerId}, canvas data length: ${canvasData.length}`);
    
    await params;

    // Create the move
    await prisma.move.create({
      data: {
        gameId: params.gameId,
        playerId,
        canvasData,
      },
    });

    // Update the game's current player and canvas data
    const game = await prisma.game.findUnique({
      where: { id: params.gameId },
    });

    if (!game) {
      return NextResponse.json(
        { error: 'Game not found' },
        { status: 404 }
      );
    }

    // Switch current player
    const nextPlayerId = playerId === game.player1Id ? game.player2Id : game.player1Id;

    await prisma.game.update({
      where: { id: params.gameId },
      data: {
        currentPlayerId: nextPlayerId,
        canvasData,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to submit move:', error);
    return NextResponse.json(
      { error: 'Failed to submit move' },
      { status: 500 }
    );
  }
} 