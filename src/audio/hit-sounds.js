export function createHitSoundController() {
  const audioState = {
    context: null
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

  async function playHitTickSoundAsync() {
    const context = await ensureAudioReady();
    if (!context) {
      return;
    }

    const now = context.currentTime;
    const oscillator = context.createOscillator();
    const filter = context.createBiquadFilter();
    const gain = context.createGain();

    oscillator.type = 'triangle';
    oscillator.frequency.setValueAtTime(1500, now);
    oscillator.frequency.exponentialRampToValueAtTime(950, now + 0.05);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1200, now);
    filter.Q.value = 2.5;

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.03, now + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.06);

    oscillator.connect(filter);
    filter.connect(gain);
    gain.connect(context.destination);

    oscillator.start(now);
    oscillator.stop(now + 0.065);
    oscillator.addEventListener('ended', () => {
      oscillator.disconnect();
      filter.disconnect();
      gain.disconnect();
    });
  }

  return {
    unlockAudioOnInteraction,
    playHitTickSound
  };
}
