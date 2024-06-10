import React from 'react'
import Canvas from './canvasComponent'
import { getAssetImage } from './utils'
import useFlappyAnimation from './useFlappyAnimation'
import * as S from './screenStyle'

import { actOnFrame } from './dqn'

const config = {
  assets: {
    bird: getAssetImage('bird.png'),
    background: getAssetImage('bg.png'),
    foreground: getAssetImage('fg.png'),
    pipeNorth: getAssetImage('pipeNorth.png'),
    pipeSouth: getAssetImage('pipeSouth.png')
  },
  options: {
    delayFrameCount: 5,
    birdX: 50,
    gap: 400,
    upMovement: 30,
    gravity: 1.6
  }
}

export const FlappyBird: React.FC = () => {
  const [tap, draw, reset, getPipes, isGameOver, getState, endedByCeiling] = useFlappyAnimation(config)

  const controlFuncs = {
    isGameOver, getState, reset, endedByCeiling
  }

  return (
    <S.Screen>
      <Canvas onClick={tap} draw={draw} onFrame={actOnFrame} controlFuncs={controlFuncs} width="288" height="512"/>
    </S.Screen>
  )
}
