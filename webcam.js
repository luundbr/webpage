const video = document.getElementById('webcam');
const camCanvas = document.getElementById('overlay');
const camCtx = camCanvas.getContext('2d');
let trackerModel;

async function setupCamera() {
    return new Promise((resolve, reject) => {
        navigator.mediaDevices.getUserMedia({
            video: true
        }).then(stream => {
            video.srcObject = stream;
            video.onloadedmetadata = () => {
                resolve(video);
            };
        }).catch(err => {
            reject(err);
        });
    });
}

async function loadModel() {
    trackerModel = await blazeface.load();
}

async function detectFace() {
    const predictions = await trackerModel.estimateFaces(video, false);

    camCtx.clearRect(0, 0, camCanvas.width, camCanvas.height);

    if (predictions.length > 0) {
        predictions.forEach(prediction => {
            const start = prediction.topLeft;
            const end = prediction.bottomRight;
            const size = [end[0] - start[0], end[1] - start[1]];

            camCtx.beginPath();
            camCtx.rect(start[0], start[1], size[0], size[1]);
            camCtx.strokeStyle = 'red';
            camCtx.lineWidth = 2;
            camCtx.stroke();

            // function drawCannon() {
            //     const x = camCanvas.width / 2;
            //     const y = 3;
            //     camCtx.beginPath();
            //     camCtx.moveTo(camCanvas.width / 2, camCanvas.height);
            //     camCtx.lineTo(x, y);
            //     camCtx.strokeStyle = 'green';
            //     camCtx.lineWidth = 5;
            //     camCtx.stroke();
            // }

            // drawCannon()

            const rightEye = prediction.landmarks[0];
            const leftEye = prediction.landmarks[1];

            camCtx.beginPath();
            camCtx.arc(rightEye[0], rightEye[1], 5, 0, 2 * Math.PI);
            camCtx.arc(leftEye[0], leftEye[1], 5, 0, 2 * Math.PI);
            camCtx.fillStyle = 'blue';
            camCtx.fill();
        });
    }
}

async function main() {
    await setupCamera();
    await loadModel();
    video.play();
    setInterval(detectFace, 100);
}

main();
