import * as tf from '@tensorflow/tfjs';

export interface IPipe {
    x: number,
    y: number
}

export interface IReplayBufferObject {
    state?: any
    action: any
    reward?: any
    nextState?: any
    done?: any
}

export const MODEL_INP = 8;

export const createDQNModel = (): tf.Sequential => {
  const model = tf.sequential();

  model.add(tf.layers.dense({ inputShape: [MODEL_INP], units: 24, activation: 'relu' }));
  model.add(tf.layers.dense({ units: 24, activation: 'relu' }));
  model.add(tf.layers.dense({ units: 24, activation: 'relu' }));
  model.add(tf.layers.dense({ units: 24, activation: 'relu' }));
  model.add(tf.layers.dense({ units: 2, activation: 'linear' }));

  model.compile({ optimizer: tf.train.adam(0.004), loss: 'meanSquaredError' });

  return model;
};

export const model = createDQNModel();

export const sample = <T,>(array: T[], size: number): T[] => {
    const shuffled = array.slice(0);
    let i = array.length;
    const min = i - size;
    let temp: T, index: number;

    while (i-- > min) {
      index = Math.floor((i + 1) * Math.random());
      temp = shuffled[index];
      shuffled[index] = shuffled[i];
      shuffled[i] = temp;
    }

    return shuffled.slice(min);
};

export let epsilon = 1.0 // exploration rate
export const gamma = 0.95; // discount factor
export const epsilonDecay = 0.995;
export const epsilonMin = 0.01;
export const batchSize = 32;
export const replayBuffer: IReplayBufferObject[] = [];

export const stateWrap: any = {
  state: []
}

export const epochWrap = { epoch: 0 }

export let totalRewardWrap = { totalReward: 0 }

export const actOnFrame = (actionCb: any) => {
    let action

    if (Math.random() < epsilon) {
        action = Math.floor(Math.random() * 2); // random action
    } else {
        if (stateWrap.state.length > MODEL_INP) { // TODO fix the shapes
            const diff = stateWrap.state.length - MODEL_INP
            for (let i = 0; i < diff; i++) {
                stateWrap.state.pop()
            }
        }
        const qValues = (model.predict(tf.tensor2d([stateWrap.state])) as any).dataSync();
        action = qValues.indexOf(Math.max(...qValues));
    }

    if (action === 1) {
        actionCb()
    }

    replayBuffer.push({ action })
}

export const train = (done: boolean, reset: any) => {
  if (replayBuffer.length > batchSize) {
    const batch = sample(replayBuffer, batchSize)

    const states = batch.map(exp => exp.state)

    const actions = batch.map(exp => exp.action)
    const rewards = batch.map(exp => exp.reward)
    const nextStates = batch.map(exp => exp.nextState)
    const dones = batch.map(exp => exp.done)

    const qNext = (model.predict(tf.tensor2d(nextStates)) as any).arraySync()
    const qTarget = (model.predict(tf.tensor2d(states)) as any).arraySync()

    for (let i = 0; i < batchSize; i++) {
      qTarget[i][actions[i]] = rewards[i] + (dones[i] ? 0 : gamma * Math.max(...qNext[i]))
    }

    model.fit(tf.tensor2d(states), tf.tensor2d(qTarget), { epochs: 1 }).then(_ => {
      if (done) {
        totalRewardWrap.totalReward = 0
        epsilon = Math.max(epsilonMin, epsilon * epsilonDecay)
        epochWrap.epoch++
        reset()
      }
    }).catch(e => null);
  } else {
    if (done) {
      totalRewardWrap.totalReward = 0;
      epsilon = Math.max(epsilonMin, epsilon * epsilonDecay)
    }
  }
}
