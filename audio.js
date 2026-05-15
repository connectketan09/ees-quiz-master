
// Audio Synthesis Engine for KBC Cinematic Effects
class AudioEngine {
    constructor() {
        this.ctx = null;
        this.masterGain = null;
        this.isMuted = false;
        
        this.bgmOscillator = null;
        this.bgmGain = null;
        this.bgmLfo = null;
    }
    
    init() {
        if (!this.ctx) {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
            this.masterGain = this.ctx.createGain();
            this.masterGain.connect(this.ctx.destination);
            
            const volSlider = document.getElementById('vol-slider');
            if(volSlider) {
                this.masterGain.gain.value = volSlider.value;
            } else {
                this.masterGain.gain.value = 0.5;
            }
        }
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }
    
    setVolume(vol) {
        if (this.masterGain && !this.isMuted) this.masterGain.gain.value = vol;
    }
    
    toggleMute() {
        this.isMuted = !this.isMuted;
        const btn = document.getElementById('mute-btn');
        const slider = document.getElementById('vol-slider');
        if (this.isMuted) {
            if (this.masterGain) this.masterGain.gain.value = 0;
            if (btn) btn.innerText = '🔇';
        } else {
            if (this.masterGain) this.masterGain.gain.value = slider ? slider.value : 0.5;
            if (btn) btn.innerText = '🔊';
        }
    }
    
    playHover() {
        if(this.isMuted) return;
        this.init();
        this._playTone(500, 'sine', 0.01, 0.05);
    }
    
    playClick() {
        if(this.isMuted) return;
        this.init();
        this._playTone(300, 'triangle', 0.01, 0.1);
    }
    
    playTick() {
        if(this.isMuted) return;
        this.init();
        // High pitch short blip like a countdown
        this._playTone(1200, 'square', 0.01, 0.05);
    }
    
    playCorrect() {
        if(this.isMuted) return;
        this.init();
        // Ascending major chord C E G C
        this._playTone(523.25, 'sine', 0.1, 1.0); // C5
        setTimeout(() => this._playTone(659.25, 'sine', 0.1, 1.0), 100); // E5
        setTimeout(() => this._playTone(783.99, 'sine', 0.1, 1.0), 200); // G5
        setTimeout(() => this._playTone(1046.50, 'sine', 0.1, 1.5), 300); // C6
    }
    
    playWrong() {
        if(this.isMuted) return;
        this.init();
        // Dissonant descending chord
        this._playTone(300, 'sawtooth', 0.1, 1.0);
        setTimeout(() => this._playTone(285, 'sawtooth', 0.1, 1.2), 150);
        setTimeout(() => this._playTone(270, 'sawtooth', 0.1, 1.5), 300);
    }
    
    playLock() {
        if(this.isMuted) return;
        this.init();
        // Deep drum-like thud
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        
        osc.frequency.setValueAtTime(150, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(40, this.ctx.currentTime + 0.5);
        
        osc.connect(gain);
        gain.connect(this.masterGain);
        
        gain.gain.setValueAtTime(1, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.5);
        
        osc.start();
        osc.stop(this.ctx.currentTime + 0.5);
    }

    startSuspenseBGM() {
        if(this.isMuted) return;
        this.init();
        if (this.bgmOscillator) this.stopSuspenseBGM(); // ensure clean state
        
        this.bgmOscillator = this.ctx.createOscillator();
        this.bgmGain = this.ctx.createGain();
        this.bgmLfo = this.ctx.createOscillator();
        
        // Deep drone
        this.bgmOscillator.type = 'triangle';
        this.bgmOscillator.frequency.value = 65; // C2
        
        // Pulsing LFO
        this.bgmLfo.type = 'sine';
        this.bgmLfo.frequency.value = 1.0; // 1 beat per second
        
        const lfoGain = this.ctx.createGain();
        lfoGain.gain.value = 5; // modulate frequency by 5 Hz
        this.bgmLfo.connect(lfoGain);
        lfoGain.connect(this.bgmOscillator.frequency);
        
        // Volume modulation for pulse effect
        const volLfo = this.ctx.createOscillator();
        volLfo.type = 'sine';
        volLfo.frequency.value = 1.0;
        const volLfoGain = this.ctx.createGain();
        volLfoGain.gain.value = 0.3;
        volLfo.connect(volLfoGain);
        volLfoGain.connect(this.bgmGain.gain);
        volLfo.start();
        
        // Fade in
        this.bgmGain.gain.setValueAtTime(0, this.ctx.currentTime);
        this.bgmGain.gain.linearRampToValueAtTime(0.4, this.ctx.currentTime + 2);
        
        this.bgmOscillator.connect(this.bgmGain);
        this.bgmGain.connect(this.masterGain);
        
        this.bgmOscillator.start();
        this.bgmLfo.start();
    }
    
    stopSuspenseBGM() {
        if (this.bgmOscillator && this.ctx) {
            const tempOsc = this.bgmOscillator;
            const tempGain = this.bgmGain;
            const tempLfo = this.bgmLfo;
            
            tempGain.gain.cancelScheduledValues(this.ctx.currentTime);
            tempGain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 1); // fade out over 1s
            
            setTimeout(() => {
                try {
                    tempOsc.stop();
                    tempLfo.stop();
                    tempOsc.disconnect();
                    tempLfo.disconnect();
                    tempGain.disconnect();
                } catch(e) {}
            }, 1000);
            
            this.bgmOscillator = null;
            this.bgmLfo = null;
            this.bgmGain = null;
        }
    }
    
    _playTone(freq, type, attack, release) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = type;
        osc.frequency.value = freq;
        
        osc.connect(gain);
        gain.connect(this.masterGain);
        
        gain.gain.setValueAtTime(0, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.5, this.ctx.currentTime + attack);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + attack + release);
        
        osc.start();
        osc.stop(this.ctx.currentTime + attack + release);
    }
}

// Speech Synthesis Engine
class VoiceEngine {
    constructor() {
        this.synth = window.speechSynthesis;
        this.voice = null;
        this.isMuted = false;
        
        if (speechSynthesis.onvoiceschanged !== undefined) {
            speechSynthesis.onvoiceschanged = () => this.setVoice();
        } else {
            this.setVoice();
        }
    }
    
    setVoice() {
        const voices = this.synth.getVoices();
        // Try finding Indian English or Hindi for KBC feel
        this.voice = voices.find(v => v.lang.includes('en-IN') || v.lang.includes('hi-IN')) || voices[0];
    }
    
    speak(text, onEnd = null) {
        if (audioEngine.isMuted) return;
        
        if (this.synth.speaking) {
            this.synth.cancel();
        }
        const utterance = new SpeechSynthesisUtterance(text);
        if (this.voice) utterance.voice = this.voice;
        utterance.rate = 0.85; // Slightly slower
        utterance.pitch = 0.9; // Deep dramatic voice
        
        if (onEnd) {
            utterance.onend = onEnd;
        }
        this.synth.speak(utterance);
    }
    
    stop() {
        this.synth.cancel();
    }
}
