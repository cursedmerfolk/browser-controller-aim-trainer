export function createHitSoundController() {
  const audioState = {
    context: null,
    hitTickBuffer: null,
    hitTickBufferSampleRate: null,
    weaponShotBuffer: null,
    weaponShotBufferSampleRate: null
  };

  function getAudioContext() {
    if (audioState.context) {
      return audioState.context;
    }

    const AudioContextCtor = window.AudioContext ?? window.webkitAudioContext;
    if (!AudioContextCtor) {
      return null;
    }

    audioState.context = new AudioContextCtor();
    return audioState.context;
  }

  async function ensureAudioReady() {
    const context = getAudioContext();
    if (!context) {
      return null;
    }

    if (context.state === 'suspended') {
      try {
        await context.resume();
      } catch (error) {
        if (error instanceof DOMException && error.name === 'NotAllowedError') {
          return null;
        }
        throw error;
      }
    }

    return context.state === 'running' ? context : null;
  }

  function unlockAudioOnInteraction() {
    void ensureAudioReady();
  }

  function playHitTickSound() {
    void playHitTickSoundAsync();
  }

  function playWeaponShotSound() {
    return;
  }

  async function playHitTickSoundAsync() {
    const context = await ensureAudioReady();
    if (!context) {
      return;
    }

    const source = context.createBufferSource();
    const gain = context.createGain();
    source.buffer = getHitTickBuffer(audioState, context);

    gain.gain.value = 0.9;
    source.connect(gain);
    gain.connect(context.destination);

    source.start();
    source.addEventListener('ended', () => {
      source.disconnect();
      gain.disconnect();
    });
  }

  return {
    unlockAudioOnInteraction,
    playHitTickSound,
    playWeaponShotSound
  };
}

function getHitTickBuffer(audioState, context) {
  if (audioStateMatchesContext(audioState, context) && audioState.hitTickBuffer) {
    return audioState.hitTickBuffer;
  }

  const durationSeconds = 0.075;
  const frameCount = Math.ceil(context.sampleRate * durationSeconds);
  const buffer = context.createBuffer(1, frameCount, context.sampleRate);
  const channelData = buffer.getChannelData(0);
  let previousNoise = 0;
  let previousLowNoise = 0;
  let smoothedLowNoise = 0;

  for (let index = 0; index < frameCount; index += 1) {
    const time = index / context.sampleRate;
    const normalizedTime = time / durationSeconds;
    const envelope =
      Math.exp(-normalizedTime * 14) *
      Math.min(1, time / 0.0012) *
      Math.max(0, 1 - Math.max(0, time - 0.038) / 0.022);
    const whiteNoise = Math.random() * 2 - 1;
    const highPassedNoise = whiteNoise - previousNoise * 0.72;
    previousNoise = whiteNoise;
    const lowNoiseSource = Math.random() * 2 - 1;
    const lowerPassedNoise = lowNoiseSource - previousLowNoise * 0.28;
    previousLowNoise = lowNoiseSource;
    smoothedLowNoise += (lowerPassedNoise - smoothedLowNoise) * 0.18;
    const lowEnvelope =
      Math.exp(-normalizedTime * 9) *
      Math.min(1, time / 0.0018) *
      Math.max(0, 1 - Math.max(0, time - 0.05) / 0.025);
    const transient = time < 0.0035 ? (1 - time / 0.0035) * 0.3 * (Math.random() * 2 - 1) : 0;
    channelData[index] = highPassedNoise * 0.72 * envelope + smoothedLowNoise * 0.58 * lowEnvelope + transient * envelope;
  }

  audioState.hitTickBuffer = buffer;
  audioState.hitTickBufferSampleRate = context.sampleRate;
  return buffer;
}

function audioStateMatchesContext(audioState, context) {
  return audioState.hitTickBufferSampleRate === context.sampleRate;
}
