import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function POST() {
  try {
    const game = await prisma.game.create({
      data: {
        currentPlayerId: '', // Will be set to player1Id after creation
      }
    })

    // Update the game with the currentPlayerId set to player1Id
    await prisma.game.update({
      where: { id: game.id },
      data: {
        currentPlayerId: game.player1Id,
      },
    })

    return NextResponse.json({
      gameId: game.id,
      player1Id: game.player1Id,
      player2Id: game.player2Id
    })
  } catch (error) {
    console.error('Failed to create game:', error)
    return NextResponse.json(
      { error: 'Failed to create game' },
      { status: 500 }
    )
  }
} 