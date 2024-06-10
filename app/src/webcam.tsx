import React, { useEffect, useRef } from 'react';
import * as blazeface from '@tensorflow-models/blazeface';
import '@tensorflow/tfjs-backend-webgl';

export const FaceDetection: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  let trackerModel: blazeface.BlazeFaceModel | null = null;

  useEffect(() => {
    const setupCamera = async (): Promise<HTMLVideoElement> => {
      return new Promise((resolve, reject) => {
        navigator.mediaDevices.getUserMedia({
          video: true,
        }).then((stream) => {
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.onloadedmetadata = () => {
              resolve(videoRef.current as HTMLVideoElement);
            };
          }
        }).catch((err) => {
          reject(err);
        });
      });
    };

    const loadModel = async (): Promise<void> => {
      trackerModel = await blazeface.load();
    };

    const detectFace = async (): Promise<void> => {
      if (!trackerModel || !videoRef.current || !canvasRef.current) return;

      const predictions = await trackerModel.estimateFaces(videoRef.current, false);
      const camCtx = canvasRef.current.getContext('2d');
      if (!camCtx) return;

      camCtx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

      if (predictions.length > 0) {
        predictions.forEach((prediction: any) => { // TODO
          const start = prediction.topLeft as [number, number];
          const end = prediction.bottomRight as [number, number];
          const size = [end[0] - start[0], end[1] - start[1]];

          camCtx.beginPath();
          camCtx.rect(start[0], start[1], size[0], size[1]);
          camCtx.strokeStyle = 'red';
          camCtx.lineWidth = 2;
          camCtx.stroke();

          const rightEye = prediction.landmarks[0] as [number, number];
          const leftEye = prediction.landmarks[1] as [number, number];

          camCtx.beginPath();
          camCtx.arc(rightEye[0], rightEye[1], 5, 0, 2 * Math.PI);
          camCtx.arc(leftEye[0], leftEye[1], 5, 0, 2 * Math.PI);
          camCtx.fillStyle = 'blue';
          camCtx.fill();
        });
      }
    };

    const main = async (): Promise<void> => {
      await setupCamera();
      await loadModel();
      if (videoRef.current) videoRef.current.play();
      setInterval(detectFace, 100);
    };

    main();
  }, []);

  return (
    <div>
      <video ref={videoRef} style={{ display: 'none' }} />
      <canvas ref={canvasRef} id="overlay" width="640" height="480" />
    </div>
  );
};