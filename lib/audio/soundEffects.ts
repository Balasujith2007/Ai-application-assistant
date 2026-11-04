/**
 * Premium Sound Effects System for Mystery Gift Animations
 * Uses Web Audio API to generate sounds programmatically
 */

type SoundType = 
  | 'gift_fall'
  | 'gift_land'
  | 'button_tap'
  | 'countdown'
  | 'gift_shake'
  | 'gift_open'
  | 'xp_reveal'
  | 'coin_reveal'
  | 'streak_rescue'
  | 'legendary_reveal'
  | 'claim_success';

class SoundEngine {
  private audioContext: AudioContext | null = null;
  private enabled: boolean = true;
  private volume: number = 0.5;

  constructor() {
    // Load sound preference from localStorage
    if (typeof window !== 'undefined') {
      const savedPref = localStorage.getItem('soundEnabled');
      this.enabled = savedPref !== 'false';
    }
  }

  private getAudioContext(): AudioContext {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return this.audioContext;
  }

  toggle(enabled?: boolean): void {
    this.enabled = enabled !== undefined ? enabled : !this.enabled;
    if (typeof window !== 'undefined') {
      localStorage.setItem('soundEnabled', String(this.enabled));
    }
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Play a sound effect
   */
  play(type: SoundType): void {
    if (!this.enabled) return;

    try {
      const ctx = this.getAudioContext();
      
      // Resume context if suspended (browser autoplay policy)
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      switch (type) {
        case 'gift_fall':
          this.playGiftFall(ctx);
          break;
        case 'gift_land':
          this.playGiftLand(ctx);
          break;
        case 'button_tap':
          this.playButtonTap(ctx);
          break;
        case 'countdown':
          this.playCountdown(ctx);
          break;
        case 'gift_shake':
          this.playGiftShake(ctx);
          break;
        case 'gift_open':
          this.playGiftOpen(ctx);
          break;
        case 'xp_reveal':
          this.playXpReveal(ctx);
          break;
        case 'coin_reveal':
          this.playCoinReveal(ctx);
          break;
        case 'streak_rescue':
          this.playStreakRescue(ctx);
          break;
        case 'legendary_reveal':
          this.playLegendaryReveal(ctx);
          break;
        case 'claim_success':
          this.playClaimSuccess(ctx);
          break;
      }
    } catch (error) {
      console.error('Error playing sound:', error);
    }
  }

  /**
   * Gift falling sound - whoosh effect
   */
  private playGiftFall(ctx: AudioContext): void {
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.frequency.setValueAtTime(800, ctx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.5);

    gainNode.gain.setValueAtTime(0, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(this.volume * 0.3, ctx.currentTime + 0.1);
    gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.5);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.5);
  }

  /**
   * Gift landing sound - soft thud
   */
  private playGiftLand(ctx: AudioContext): void {
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.frequency.setValueAtTime(150, ctx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.2);

    gainNode.gain.setValueAtTime(0, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(this.volume * 0.4, ctx.currentTime + 0.05);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.2);
  }

  /**
   * Button tap sound - click
   */
  private playButtonTap(ctx: AudioContext): void {
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.frequency.setValueAtTime(600, ctx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.1);

    gainNode.gain.setValueAtTime(0, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(this.volume * 0.2, ctx.currentTime + 0.02);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.1);
  }

  /**
   * Countdown sound - tick
   */
  private playCountdown(ctx: AudioContext): void {
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.frequency.setValueAtTime(440, ctx.currentTime);
    oscillator.frequency.setValueAtTime(880, ctx.currentTime + 0.05);

    gainNode.gain.setValueAtTime(0, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(this.volume * 0.3, ctx.currentTime + 0.02);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.15);
  }

  /**
   * Gift shake sound - rattle
   */
  private playGiftShake(ctx: AudioContext): void {
    for (let i = 0; i < 3; i++) {
      setTimeout(() => {
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);

        oscillator.frequency.setValueAtTime(200 + Math.random() * 100, ctx.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.1);

        gainNode.gain.setValueAtTime(0, ctx.currentTime);
        gainNode.gain.linearRampToValueAtTime(this.volume * 0.2, ctx.currentTime + 0.02);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);

        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + 0.1);
      }, i * 100);
    }
  }

  /**
   * Gift open sound - flourish
   */
  private playGiftOpen(ctx: AudioContext): void {
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.frequency.setValueAtTime(300, ctx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.3);

    gainNode.gain.setValueAtTime(0, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(this.volume * 0.5, ctx.currentTime + 0.1);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.4);

    // Add a second layer for richness
    const oscillator2 = ctx.createOscillator();
    const gainNode2 = ctx.createGain();

    oscillator2.connect(gainNode2);
    gainNode2.connect(ctx.destination);

    oscillator2.frequency.setValueAtTime(400, ctx.currentTime);
    oscillator2.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.2);

    gainNode2.gain.setValueAtTime(0, ctx.currentTime);
    gainNode2.gain.linearRampToValueAtTime(this.volume * 0.3, ctx.currentTime + 0.1);
    gainNode2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);

    oscillator2.start(ctx.currentTime);
    oscillator2.stop(ctx.currentTime + 0.3);
  }

  /**
   * XP reveal sound - magical chime
   */
  private playXpReveal(ctx: AudioContext): void {
    const frequencies = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    
    frequencies.forEach((freq, i) => {
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.1);

      gainNode.gain.setValueAtTime(0, ctx.currentTime + i * 0.1);
      gainNode.gain.linearRampToValueAtTime(this.volume * 0.3, ctx.currentTime + i * 0.1 + 0.05);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + i * 0.1 + 0.5);

      oscillator.start(ctx.currentTime + i * 0.1);
      oscillator.stop(ctx.currentTime + i * 0.1 + 0.5);
    });
  }

  /**
   * Coin reveal sound - coin chime
   */
  private playCoinReveal(ctx: AudioContext): void {
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.frequency.setValueAtTime(1200, ctx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(2000, ctx.currentTime + 0.1);
    oscillator.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.2);

    gainNode.gain.setValueAtTime(0, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(this.volume * 0.4, ctx.currentTime + 0.05);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.3);
  }

  /**
   * Streak rescue sound - protective shield
   */
  private playStreakRescue(ctx: AudioContext): void {
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.frequency.setValueAtTime(200, ctx.currentTime);
    oscillator.frequency.linearRampToValueAtTime(400, ctx.currentTime + 0.3);
    oscillator.frequency.linearRampToValueAtTime(300, ctx.currentTime + 0.5);

    gainNode.gain.setValueAtTime(0, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(this.volume * 0.4, ctx.currentTime + 0.1);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.6);
  }

  /**
   * Legendary reveal sound - epic fanfare
   */
  private playLegendaryReveal(ctx: AudioContext): void {
    const frequencies = [392, 523.25, 659.25, 783.99, 1046.50]; // G4, C5, E5, G5, C6
    
    frequencies.forEach((freq, i) => {
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.08);

      gainNode.gain.setValueAtTime(0, ctx.currentTime + i * 0.08);
      gainNode.gain.linearRampToValueAtTime(this.volume * 0.4, ctx.currentTime + i * 0.08 + 0.05);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + i * 0.08 + 0.6);

      oscillator.start(ctx.currentTime + i * 0.08);
      oscillator.stop(ctx.currentTime + i * 0.08 + 0.6);
    });
  }

  /**
   * Claim success sound - success chime
   */
  private playClaimSuccess(ctx: AudioContext): void {
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.frequency.setValueAtTime(523.25, ctx.currentTime);
    oscillator.frequency.setValueAtTime(659.25, ctx.currentTime + 0.1);
    oscillator.frequency.setValueAtTime(783.99, ctx.currentTime + 0.2);

    gainNode.gain.setValueAtTime(0, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(this.volume * 0.4, ctx.currentTime + 0.05);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.4);
  }
}

export const soundEngine = new SoundEngine();
