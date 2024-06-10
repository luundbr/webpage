import { useRef, useEffect } from 'react'

import * as tf from '@tensorflow/tfjs';

import { replayBuffer, stateWrap, totalRewardWrap, batchSize, sample, model, train, epochWrap } from './dqn'

type DrawProps = (context: CanvasRenderingContext2D, frameCount: number) => void

const useCanvas = (draw: DrawProps, onFrame: any, controlFuncs: any) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const frameCount = useRef(0)
  const frameId = useRef(0)

  const { isGameOver, getState, reset, endedByCeiling } = controlFuncs

  useEffect(() => {
    const canvas = canvasRef.current

    if (canvas !== null) {
      const jump = () => {
        const event = new MouseEvent('click', {
          view: window,
          bubbles: true,
          cancelable: true
        })
        
        canvas.dispatchEvent(event)
      }

      const context = canvas.getContext('2d')
      if (context !== null) {
        const render = () => {

          if (!stateWrap.state || !stateWrap.state.length) {
            stateWrap.state = getState()
          }

          frameCount.current = frameCount.current + 1

          onFrame(jump)

          const done = isGameOver()

          const reward = isGameOver() ? (endedByCeiling() ? -300 : -100) : 10

          console.log('EPOCH', epochWrap.epoch, 'REWARD', reward)

          replayBuffer[replayBuffer.length - 1].state = stateWrap.state
          replayBuffer[replayBuffer.length - 1].done = done
          replayBuffer[replayBuffer.length - 1].nextState = getState()
          replayBuffer[replayBuffer.length - 1].reward = reward

          if (replayBuffer.length > 10000) {
            replayBuffer.shift()
          }

          stateWrap.state = getState()

          draw(context, frameCount.current)

          train(done, reset)

          frameId.current = window.requestAnimationFrame(render)
        }
        render()
      }
    }

    return () => {
      window.cancelAnimationFrame(frameId.current)
    }
  }, [draw])

  return canvasRef
}

export default useCanvas
