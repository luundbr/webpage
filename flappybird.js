const networkData = {
    layers: [],
    connections: []
};

const MODEL_INP = 32

function createDQNModel() {
    const model = tf.sequential();
  
    model.add(tf.layers.dense({inputShape: [MODEL_INP], units: 24, activation: 'relu'}));
    model.add(tf.layers.dense({units: 24, activation: 'relu'}));
    model.add(tf.layers.dense({units: 2, activation: 'linear'}));
  
    model.compile({optimizer: tf.train.adam(0.004), loss: 'meanSquaredError'});

    model.layers.forEach((layer, i) => {
        networkData.layers.push({
            name: layer.name,
            type: layer.getClassName(),
            units: layer.units,
            activation: layer.activation ? layer.activation : null,
            index: i,
            weights: [],
            biases: []
        });

        // TODO pretty graph
        if (i > 0) {
            const prevLayerUnits = model.layers[i - 1].units;
            for (let from = 0; from < prevLayerUnits; from++) {
                for (let to = 0; to < layer.units; to++) {
                    networkData.connections.push({
                        from: {
                            layer: i - 1,
                            neuron: from
                        },
                        to: {
                            layer: i,
                            neuron: to
                        }
                    });
                }
            }
        }
    });

    console.log(networkData);

    return model;
}

const model = createDQNModel()

function updateNetworkData(model) {
    model.layers.forEach((layer, i) => {
        const layerWeights = layer.getWeights();
        if (layerWeights.length > 0) {
            const weights = layerWeights[0].arraySync();
            const biases = layerWeights[1].arraySync();
            networkData.layers[i].weights = weights;
            networkData.layers[i].biases = biases;
        }
    });
}
  
function sample(array, size) {
    const shuffled = array.slice(0);
    let i = array.length;
    const min = i - size;
    let temp, index;

    while (i-- > min) {
        index = Math.floor((i + 1) * Math.random());
        temp = shuffled[index];
        shuffled[index] = shuffled[i];
        shuffled[i] = temp;
    }

    return shuffled.slice(min);
}


let _EPOCH = 0

async function trainAndPlay() {
    const numEpochs = 1000;
    const gamma = 0.95; // discount factor
    let epsilon = 1.0; // exploration rate
    const epsilonDecay = 0.995;
    const epsilonMin = 0.01;
    const batchSize = 32;
    const replayBuffer = [];

    for (let epoch = 0; epoch < numEpochs; epoch++) {
        restartGame();
        let state = getState();
        let done = false;
        let totalReward = 0;

        while (!done) {
            let action;
            if (Math.random() < epsilon) {
                action = Math.floor(Math.random() * 2); // random action
            } else {
                console.log(state.length)
                if (state.length > MODEL_INP) { // TODO fix the shapes
                    const diff = state.length - MODEL_INP
                    for (let i = 0; i < diff; i++) {
                        state.pop()
                    }
                }
                const qValues = model.predict(tf.tensor2d([state])).dataSync();
                action = qValues.indexOf(Math.max(...qValues));
            }

            const nextState = update(action);
            const reward = getReward();
            done = !isGameRunning;

            replayBuffer.push({ state, action, reward, nextState, done });

            if (replayBuffer.length > 10000) {
                replayBuffer.shift();
            }

            state = nextState;
            totalReward += reward;
            render();

            if (replayBuffer.length > batchSize) {
                const batch = sample(replayBuffer, batchSize);
                const states = batch.map(exp => exp.state);
                const actions = batch.map(exp => exp.action);
                const rewards = batch.map(exp => exp.reward);
                const nextStates = batch.map(exp => exp.nextState);
                const dones = batch.map(exp => exp.done);
                console.log(nextStates)
                const qNext = model.predict(tf.tensor2d(nextStates)).arraySync();
                const qTarget = model.predict(tf.tensor2d(states)).arraySync();

                for (let i = 0; i < batchSize; i++) {
                    qTarget[i][actions[i]] = rewards[i] + (dones[i] ? 0 : gamma * Math.max(...qNext[i]));
                }

                await model.fit(tf.tensor2d(states), tf.tensor2d(qTarget), { epochs: 1, callbacks: _ => updateNetworkData(model) });
            }
        }

        epsilon = Math.max(epsilonMin, epsilon * epsilonDecay);
        _EPOCH = epoch
        // console.log(`Epoch: ${epoch}, Total Reward: ${totalReward}`);
    }
}

const canvas = document.getElementById("flappyBirdCanvas");
const context = canvas.getContext("2d");

const birdImg = new Image();
const bgImg = new Image();
const fgImg = new Image();
const pipeImg = new Image();

birdImg.src = "https://github.com/samuelcust/flappy-bird-assets/blob/master/sprites/bluebird-midflap.png?raw=true";
bgImg.src = "https://github.com/samuelcust/flappy-bird-assets/blob/master/sprites/background-day.png?raw=true";
fgImg.src = "https://github.com/samuelcust/flappy-bird-assets/blob/master/sprites/base.png?raw=true";
pipeImg.src = "https://github.com/samuelcust/flappy-bird-assets/blob/master/sprites/pipe-green.png?raw=true";

let gap = 130;
let constant;
let birdX = 10;
let birdY = 150;
let birdVelocity = 0;
let gravity = 1.5;
let score = 0;
let isGameRunning = true;
let hitCeiling = false;

document.addEventListener("keydown", moveUp);

function moveUp() {
    birdVelocity = -7;
}

let pipe = [];

pipe[0] = {
    x: canvas.width,
    y: 0
};

function restartGame() {
    birdX = 10;
    birdY = 50;
    birdVelocity = 0;
    score = 0;
    pipe = [{
        x: canvas.width - 400,
        y: 0
    }];
    isGameRunning = true;
}

function getState() {
    let pipes = pipe.map(p => [p.x, p.y]);

    if (pipes.length <= 2) {
        // account for the max amount of pipes possible on the screen and pad
        // otherwise the shape will be variable
        for (let i = 0; i < 14; i++) {
            pipes.push([-1, -1])
        }
    }

    return [
        birdY,
        birdVelocity,
        ...pipes.flat()
    ];
}

function update(action) {
    if (!isGameRunning) return getState();

    if (action === 1) {
        birdVelocity = -7; // flap action
    }

    birdVelocity += gravity;
    birdY += birdVelocity;

    for (let i = 0; i < pipe.length; i++) {
        constant = pipeImg.height + gap;
        pipe[i].x--;

        if (pipe[i].x === 125) {
            pipe.push({
                x: canvas.width,
                y: Math.floor(Math.random() * pipeImg.height) - pipeImg.height
            });
        }

        // collision
        if (
            birdX + birdImg.width >= pipe[i].x &&
            birdX <= pipe[i].x + pipeImg.width &&
            (birdY <= pipe[i].y + pipeImg.height ||
                birdY + birdImg.height >= pipe[i].y + constant) ||
            birdY + birdImg.height >= canvas.height - fgImg.height
        ) {
            isGameRunning = false;
        }

        if (birdY <= 0) { // ceiling (penalize more)
            isGameRunning = false;
            hitCeiling = true;
        }

        if (pipe[i].x === 5) {
            score++;
        }
    }

    // remove off-screen pipes
    if (pipe.length > 0 && pipe[0].x + pipeImg.width < 0) {
        pipe.shift();
    }

    return getState();
}

function getReward() {
    if (!isGameRunning) {
        if (hitCeiling) {
            hitCeiling = false;
            return -200;
        } else {
            return -100;
        }
    }
    return 10;
}

function draw() {
    context.drawImage(bgImg, 0, 0, canvas.width, canvas.height);

    for (let i = 0; i < pipe.length; i++) {
        constant = pipeImg.height + gap;

        // north pipe
        context.save();
        context.translate(pipe[i].x + pipeImg.width / 2, pipe[i].y + pipeImg.height / 2);
        context.rotate(Math.PI);  // rotate 180 degrees
        context.drawImage(pipeImg, -pipeImg.width / 2, -pipeImg.height / 2);
        context.restore();

        // south pipe
        context.drawImage(pipeImg, pipe[i].x, pipe[i].y + constant);
    }

    context.drawImage(fgImg, 0, canvas.height - fgImg.height, canvas.width, fgImg.height);
    context.drawImage(birdImg, birdX, birdY);

    context.fillStyle = "#000";
    context.font = "20px Verdana";
    context.fillText("Flappy Bird DQN. Score: " + score + " Epoch: " + _EPOCH, 10, canvas.height - 20);
}

function render() {
    if (isGameRunning) {
        draw();
        requestAnimationFrame(render);
    }
}

restartGame();
render();

trainAndPlay();
