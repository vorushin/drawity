import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function POST() {
  try {
    const game = await prisma.game.create({
      data: {} // Prisma will auto-generate IDs for us
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