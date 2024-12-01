import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(
  request: Request,
  { params }: { params: { gameId: string } }
) {
  const gameId = await params.gameId;

  try {
    const game = await prisma.game.findUnique({
      where: {
        id: gameId,
      },
    });

    if (!game) {
      return NextResponse.json(
        { error: 'Game not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      gameId: game.id,
      player1Id: game.player1Id,
      player2Id: game.player2Id,
      status: game.status,
    });
  } catch (error) {
    console.error('Failed to fetch game:', error);
    return NextResponse.json(
      { error: 'Failed to fetch game' },
      { status: 500 }
    );
  }
} 