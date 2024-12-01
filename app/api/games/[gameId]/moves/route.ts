import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(
  request: Request,
  { params }: { params: { gameId: string } }
) {
  try {
    const { playerId, canvasData } = await request.json();
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