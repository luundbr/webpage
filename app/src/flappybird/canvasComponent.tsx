import React from 'react'
import useCanvas from './useCanvas'

interface ICanvas {
  draw: (() => void) | ((context: CanvasRenderingContext2D, frameCount: number) => void)
  onClick: (() => void) | ((context: CanvasRenderingContext2D) => void)
  controlFuncs: any
  onFrame: any
  width: string
  height: string
}

const Canvas: React.FC<ICanvas> = (props: any) => {
  const { draw, onClick, onFrame, controlFuncs, ...rest } = props
  const canvasRef = useCanvas(draw, onFrame, controlFuncs)

  const handleClick = () => {
    const canvas = canvasRef.current
    const ctx = canvas !== null ? canvas.getContext('2d') : null

    if (ctx !== null) {
      onClick(ctx)
    }
  }

  return <canvas onClick={handleClick} ref={canvasRef} {...rest} />
}

export default Canvas
