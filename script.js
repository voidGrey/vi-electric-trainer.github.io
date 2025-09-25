let startTime;
let timerInterval;
let isPressed = false;
let isAnimating = false; // Prevent animation spam

const keyEl = document.getElementById("num5");
const resultEl = document.getElementById("result");
const timerEl = document.getElementById("timer");
const historyDots = document.getElementById("history-dots");
const subtitleEl = document.getElementById("subtitle");

// Stats elements
const successRateEl = document.getElementById("success-rate");
const currentStreakEl = document.getElementById("current-streak");
const bestStreakEl = document.getElementById("best-streak");

// Settings state
let settings = {
  lightningEffects: true,
  steamParticles: true,
  liveTimer: true,
  soundEffects: true,
  keyBinding: "Numpad5"
};

// History array - keep only last 10 attempts for compact display
let attemptHistory = [];
const MAX_HISTORY = 10;

// Stats tracking
let currentStreak = 0;
let bestStreak = 0;
let totalAttempts = 0;
let successfulAttempts = 0;

// Audio elements for custom sounds - using multiple instances
let perfectAudioPool = [];
let failedAudioPool = [];
const AUDIO_POOL_SIZE = 5; // Create 5 instances for overlapping

// Audio Context for electric effects only
let audioContext;
let isAudioInitialized = false;

// Audio cooldown to prevent conflicts (only for electric sounds)
let lastSoundTime = 0;
const SOUND_COOLDOWN = 100; // 100ms minimum between sounds

// Initialize audio pool
function initializeAudioPool() {
  // Create multiple audio instances for success sounds
  for (let i = 0; i < AUDIO_POOL_SIZE; i++) {
    const perfectAudio = new Audio('./perfect.wav');
    perfectAudio.preload = 'auto';
    perfectAudio.volume = 0.7;
    perfectAudioPool.push(perfectAudio);
    
    const failedAudio = new Audio('./failed.wav');
    failedAudio.preload = 'auto';
    failedAudio.volume = 0.7;
    failedAudioPool.push(failedAudio);
  }
}

function initializeAudio() {
  if (!isAudioInitialized && !audioContext) {
    try {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
      isAudioInitialized = true;
    } catch (e) {
      console.log('Audio not supported');
    }
  }
}

function playElectricSound() {
  if (!audioContext || !settings.soundEffects) return;
  
  // Apply cooldown only for electric sounds to prevent conflicts
  const currentTime = Date.now();
  if (currentTime - lastSoundTime < SOUND_COOLDOWN) return;
  lastSoundTime = currentTime;
  
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();
  
  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);
  
  // Electric crack sound
  oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
  oscillator.frequency.exponentialRampToValueAtTime(200, audioContext.currentTime + 0.1);
  oscillator.frequency.exponentialRampToValueAtTime(1200, audioContext.currentTime + 0.15);
  oscillator.frequency.exponentialRampToValueAtTime(100, audioContext.currentTime + 0.3);
  
  gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
  
  oscillator.type = 'sawtooth';
  oscillator.start(audioContext.currentTime);
  oscillator.stop(audioContext.currentTime + 0.3);
}

let currentSuccessAudio = 0;
let currentFailAudio = 0;

function playSuccessSound() {
  if (!settings.soundEffects) return;
  
  try {
    // Use next audio instance from pool for overlapping
    const audio = perfectAudioPool[currentSuccessAudio];
    currentSuccessAudio = (currentSuccessAudio + 1) % AUDIO_POOL_SIZE;
    
    // Reset and play
    audio.currentTime = 0;
    const playPromise = audio.play();
    
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          console.log('Success sound played successfully');
        })
        .catch(e => {
          console.log('Success audio play failed:', e);
        });
    }
  } catch (error) {
    console.log('Success sound error:', error);
  }
}

function playFailSound() {
  if (!settings.soundEffects) return;
  
  try {
    // Use next audio instance from pool for overlapping
    const audio = failedAudioPool[currentFailAudio];
    currentFailAudio = (currentFailAudio + 1) % AUDIO_POOL_SIZE;
    
    // Reset and play
    audio.currentTime = 0;
    const playPromise = audio.play();
    
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          console.log('Fail sound played successfully');
        })
        .catch(e => {
          console.log('Fail audio play failed:', e);
        });
    }
  } catch (error) {
    console.log('Fail sound error:', error);
  }
}

function playSteamSound() {
  if (!audioContext) return;
  
  // White noise for steam
  const bufferSize = audioContext.sampleRate * 0.8;
  const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
  const output = buffer.getChannelData(0);
  
  for (let i = 0; i < bufferSize; i++) {
    output[i] = Math.random() * 2 - 1;
  }
  
  const whiteNoise = audioContext.createBufferSource();
  const gainNode = audioContext.createGain();
  const filter = audioContext.createBiquadFilter();
  
  whiteNoise.buffer = buffer;
  whiteNoise.connect(filter);
  filter.connect(gainNode);
  gainNode.connect(audioContext.destination);
  
  filter.type = 'highpass';
  filter.frequency.setValueAtTime(2000, audioContext.currentTime);
  
  gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.8);
  
  whiteNoise.start(audioContext.currentTime);
  whiteNoise.stop(audioContext.currentTime + 0.8);
}

// Initialize particle background
particlesJS('particles-js', {
  particles: {
    number: { value: 50 },
    color: { value: ["#ff7b00", "#87cefa", "#0088ff"] },
    shape: { type: "circle" },
    opacity: {
      value: 0.3,
      random: true,
      animation: { enable: true, speed: 1, sync: false }
    },
    size: {
      value: 3,
      random: true,
      animation: { enable: true, speed: 2, sync: false }
    },
    line_linked: {
      enable: true,
      distance: 150,
      color: "#87cefa",
      opacity: 0.2,
      width: 1
    },
    move: {
      enable: true,
      speed: 1,
      direction: "none",
      random: true,
      straight: false,
      out_mode: "out",
      bounce: false
    }
  },
  interactivity: {
    detect_on: "canvas",
    events: {
      onhover: { enable: true, mode: "repulse" },
      onclick: { enable: true, mode: "push" }
    }
  },
  retina_detect: true
});

// Professional Lightning Effects without screen flash
function createProfessionalLightning() {
  if (!settings.lightningEffects) return;
  
  // Create lightning container without background flash
  const container = document.createElement('div');
  container.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    z-index: 9999;
    pointer-events: none;
  `;
  document.body.appendChild(container);
  
  // Professional lightning bolts using SVG - full screen height
  for (let i = 0; i < 6; i++) {
    setTimeout(() => {
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.style.cssText = `
        position: fixed;
        top: 0;
        left: ${Math.random() * 80 + 10}%;
        width: 150px;
        height: 100vh;
        z-index: 9998;
        pointer-events: none;
      `;
      
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      const d = generateFullScreenLightningPath();
      path.setAttribute('d', d);
      path.setAttribute('stroke', '#87ceeb');
      path.setAttribute('stroke-width', '2.5');
      path.setAttribute('fill', 'none');
      path.setAttribute('filter', 'drop-shadow(0 0 8px #87ceeb)');
      path.style.opacity = '0';
      
      svg.appendChild(path);
      container.appendChild(svg);
      
      // Simple flash animation without screen background
      gsap.timeline()
        .to(path, { opacity: 1, duration: 0.05 })
        .to(path, { opacity: 0, duration: 0.05 })
        .to(path, { opacity: 0.8, duration: 0.03 })
        .to(path, { opacity: 0, duration: 0.1 });
      
      setTimeout(() => svg.remove(), 400);
    }, i * 60);
  }
  
  // Remove container
  setTimeout(() => container.remove(), 1000);
}

function generateFullScreenLightningPath() {
  let path = 'M 75 0';
  let x = 75, y = 0;
  const screenHeight = window.innerHeight;
  const segments = Math.floor(screenHeight / 40); // Dynamic segments based on screen height
  
  for (let i = 0; i < segments; i++) {
    x += (Math.random() - 0.5) * 60;
    y += screenHeight / segments;
    
    // Keep lightning within reasonable bounds
    x = Math.max(20, Math.min(130, x));
    
    path += ` L ${x} ${y}`;
  }
  
  return path;
}

function createEnhancedSteamEffects() {
  if (!settings.steamParticles) return;
  
  // Get button position
  const rect = keyEl.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  
  // Create steam from LEFT side of button
  for (let i = 0; i < 8; i++) {
    setTimeout(() => {
      const steam = document.createElement('div');
      steam.className = 'steam-particle-enhanced';
      
      // Position on left side of button
      const leftSideX = rect.left - 15 - Math.random() * 25;
      const leftSideY = centerY + (Math.random() - 0.5) * 60;
      const width = 20 + Math.random() * 25;
      const height = 15 + Math.random() * 20;
      
      steam.style.cssText = `
        position: fixed;
        left: ${leftSideX}px;
        top: ${leftSideY}px;
        width: ${width}px;
        height: ${height}px;
        background: rgba(255, 255, 255, 0.7);
        border-radius: ${Math.random() * 20 + 10}px ${Math.random() * 25 + 15}px ${Math.random() * 20 + 10}px ${Math.random() * 25 + 15}px;
        z-index: 5;
        pointer-events: none;
        opacity: 0.8;
        filter: blur(1px);
        transform: rotate(${Math.random() * 360}deg);
      `;
      
      document.body.appendChild(steam);
      
      // Shorter animation duration
      gsap.to(steam, {
        y: -80 - Math.random() * 60,
        x: -30 - Math.random() * 50,
        scale: 1.2 + Math.random() * 0.5,
        rotation: Math.random() * 180,
        opacity: 0,
        duration: 0.8 + Math.random() * 0.4,
        ease: "power2.out"
      });
      
      setTimeout(() => steam.remove(), 1200);
    }, i * 30);
  }
  
  // Create steam from RIGHT side of button
  for (let i = 0; i < 8; i++) {
    setTimeout(() => {
      const steam = document.createElement('div');
      steam.className = 'steam-particle-enhanced';
      
      // Position on right side of button
      const rightSideX = rect.right + 15 + Math.random() * 25;
      const rightSideY = centerY + (Math.random() - 0.5) * 60;
      const width = 20 + Math.random() * 25;
      const height = 15 + Math.random() * 20;
      
      steam.style.cssText = `
        position: fixed;
        left: ${rightSideX}px;
        top: ${rightSideY}px;
        width: ${width}px;
        height: ${height}px;
        background: rgba(255, 255, 255, 0.7);
        border-radius: ${Math.random() * 20 + 10}px ${Math.random() * 25 + 15}px ${Math.random() * 20 + 10}px ${Math.random() * 25 + 15}px;
        z-index: 5;
        pointer-events: none;
        opacity: 0.8;
        filter: blur(1px);
        transform: rotate(${Math.random() * 360}deg);
      `;
      
      document.body.appendChild(steam);
      
      // Shorter animation duration
      gsap.to(steam, {
        y: -80 - Math.random() * 60,
        x: 30 + Math.random() * 50,
        scale: 1.2 + Math.random() * 0.5,
        rotation: Math.random() * 180,
        opacity: 0,
        duration: 0.8 + Math.random() * 0.4,
        ease: "power2.out"
      });
      
      setTimeout(() => steam.remove(), 1200);
    }, i * 30);
  }
}

function createSteamParticles() {
  // Reduce particle count for better performance
  for (let i = 0; i < 8; i++) {
    setTimeout(() => {
      const steam = document.createElement("div");
      steam.className = "steam-particle";
      
      const width = 10 + Math.random() * 25;
      const height = 15 + Math.random() * 35;
      
      // Buharları tuşun etrafına daha dağınık şekilde yerleştir
      const buttonCenterX = keyEl.offsetLeft + keyEl.offsetWidth/2;
      const buttonCenterY = keyEl.offsetTop + keyEl.offsetHeight/2;
      
      let startX, startY;
      
      // %40 ihtimalle tuşun kenarlarından çıkacak
      if (Math.random() < 0.4) {
        // Sol veya sağ kenardan
        if (Math.random() < 0.5) {
          startX = keyEl.offsetLeft - 20 + Math.random() * 40; // Sol kenar
          startY = buttonCenterY + (Math.random() - 0.5) * keyEl.offsetHeight;
        } else {
          startX = keyEl.offsetLeft + keyEl.offsetWidth - 20 + Math.random() * 40; // Sağ kenar
          startY = buttonCenterY + (Math.random() - 0.5) * keyEl.offsetHeight;
        }
      } else {
        // Tuşun alt kısmından ve etrafından
        startX = buttonCenterX + (Math.random() - 0.5) * 180;
        startY = keyEl.offsetTop + keyEl.offsetHeight - 20 + Math.random() * 40;
      }
      
      steam.style.width = width + "px";
      steam.style.height = height + "px";
      steam.style.left = startX + "px";
      steam.style.top = startY + "px";
      steam.style.transform = `rotate(${(Math.random() - 0.5) * 45}deg)`;
      
      document.body.appendChild(steam);
      
      // Farklı yönlerde dalgalı yükselme
      const direction = (Math.random() - 0.5) * 2; // -1 ile 1 arası
      const timeline = gsap.timeline({
        onComplete: () => steam.remove()
      });
      
      timeline
        .to(steam, {
          y: -40 - Math.random() * 60,
          x: direction * (20 + Math.random() * 40),
          rotation: direction * (30 + Math.random() * 60),
          scale: 1.1 + Math.random() * 0.6,
          duration: 0.5 + Math.random() * 0.3,
          ease: "power2.out"
        })
        .to(steam, {
          y: -90 - Math.random() * 80,
          x: direction * (50 + Math.random() * 80),
          rotation: direction * (80 + Math.random() * 100),
          scale: 1.6 + Math.random() * 0.8,
          opacity: 0.4,
          duration: 0.7 + Math.random() * 0.4,
          ease: "sine.inOut"
        }, "-=0.2")
        .to(steam, {
          y: -160 - Math.random() * 100,
          x: direction * (80 + Math.random() * 140),
          scale: 2.2 + Math.random() * 1.2,
          opacity: 0,
          duration: 0.8 + Math.random() * 0.5,
          ease: "power2.in"
        }, "-=0.3");
    }, i * 80 + Math.random() * 60); // Slower spawn rate
  }
}

function createElectricRing() {
  const ring = document.createElement("div");
  ring.className = "electric-ring";
  ring.style.left = keyEl.offsetLeft + keyEl.offsetWidth/2 + "px";
  ring.style.top = keyEl.offsetTop + keyEl.offsetHeight/2 + "px";
  document.body.appendChild(ring);
  setTimeout(() => ring.remove(), 800);
}

function animateSuccess() {
  // Initialize audio if not done
  initializeAudio();
  
  // ALWAYS play success sound - not blocked by animation state
  playSuccessSound();
  
  // Only prevent visual effects spam, not audio
  if (isAnimating) return;
  isAnimating = true;
  
  // Button success state
  keyEl.classList.add("success");
  
  // Professional Enhanced Effects
  if (settings.lightningEffects) {
    createProfessionalLightning();
  }
  
  if (settings.steamParticles) {
    createEnhancedSteamEffects();
  }
  
  // Enhanced button animation
  gsap.timeline()
    .to(keyEl, {
      scale: 1.2,
      rotation: "+=15",
      duration: 0.2,
      ease: "power2.out"
    })
    .to(keyEl, {
      scale: 1.1,
      rotation: "+=345", // Complete 360 degrees
      duration: 0.6,
      ease: "back.out(1.7)"
    })
    .to(keyEl, {
      scale: 1,
      duration: 0.2,
      ease: "power2.out"
    });
  
  // Reset animation flag
  setTimeout(() => {
    isAnimating = false;
  }, 1000);
}

// Settings toggle functionality
function setupSettingsToggles() {
  const toggleLightning = document.getElementById("toggle-lightning");
  const toggleSteam = document.getElementById("toggle-steam");
  const toggleTimer = document.getElementById("toggle-timer");
  const toggleSound = document.getElementById("toggle-sound");
  const keyBindingBtn = document.getElementById("key-binding-btn");

  toggleLightning.addEventListener("click", () => {
    settings.lightningEffects = !settings.lightningEffects;
    toggleLightning.classList.toggle("active", settings.lightningEffects);
  });

  toggleSteam.addEventListener("click", () => {
    settings.steamParticles = !settings.steamParticles;
    toggleSteam.classList.toggle("active", settings.steamParticles);
  });

  toggleTimer.addEventListener("click", () => {
    settings.liveTimer = !settings.liveTimer;
    toggleTimer.classList.toggle("active", settings.liveTimer);
    if (!settings.liveTimer && !isPressed) {
      timerEl.innerText = "Duration: ? ms";
    }
  });

  toggleSound.addEventListener("click", () => {
    settings.soundEffects = !settings.soundEffects;
    toggleSound.classList.toggle("active", settings.soundEffects);
  });

  // Key binding functionality
  let isListening = false;
  keyBindingBtn.addEventListener("click", () => {
    if (isListening) return;
    
    isListening = true;
    keyBindingBtn.textContent = "Press Key...";
    keyBindingBtn.classList.add("listening");
    
    const handleKeyPress = (e) => {
      e.preventDefault();
      settings.keyBinding = e.code;
      
      // Display friendly name
      const friendlyNames = {
        "Numpad5": "Num5",
        "Space": "Space",
        "KeyM": "M",
        "Enter": "Enter",
        "NumpadEnter": "Num Enter"
      };
      
      keyBindingBtn.textContent = friendlyNames[e.code] || e.code.replace('Key', '').replace('Digit', '');
      keyBindingBtn.classList.remove("listening");
      isListening = false;
      
      // Update subtitle with new key
      updateSubtitle();
      
      document.removeEventListener("keydown", handleKeyPress);
    };
    
    document.addEventListener("keydown", handleKeyPress);
    
    // Auto-cancel after 10 seconds
    setTimeout(() => {
      if (isListening) {
        keyBindingBtn.textContent = "Num5";
        keyBindingBtn.classList.remove("listening");
        isListening = false;
        document.removeEventListener("keydown", handleKeyPress);
      }
    }, 10000);
  });
}

// Update subtitle with current key binding
function updateSubtitle() {
  const friendlyNames = {
    "Numpad5": "Num5",
    "Space": "Space",
    "KeyM": "M",
    "Enter": "Enter",
    "NumpadEnter": "Num Enter"
  };
  
  const keyName = friendlyNames[settings.keyBinding] || settings.keyBinding.replace('Key', '').replace('Digit', '');
  subtitleEl.innerHTML = `Hold <strong>${keyName}</strong> for exactly <strong>500-550ms</strong>`;
}

// Timing classification function
function classifyTiming(duration) {
  if (duration >= 500 && duration <= 550) {
    return 'perfect'; // Perfect range
  } else if (duration >= 480 && duration <= 570) {
    return 'close'; // Close range - will show as yellow
  } else {
    return 'fail'; // Failed attempt
  }
}

// Update stats display
function updateStatsDisplay() {
  // Calculate success rate
  const successRate = totalAttempts > 0 ? Math.round((successfulAttempts / totalAttempts) * 100) : 0;
  successRateEl.textContent = successRate + '%';
  
  // Update streak displays
  currentStreakEl.textContent = currentStreak;
  bestStreakEl.textContent = bestStreak;
  
  // Add glow effect to current streak if active
  if (currentStreak > 0) {
    currentStreakEl.classList.add('streak-active');
  } else {
    currentStreakEl.classList.remove('streak-active');
  }
}

// Compact History management with dots
function addToHistory(duration, classification) {
  const isSuccess = classification === 'perfect';
  const attempt = { 
    duration, 
    classification, // Store classification instead of just success/fail
    success: isSuccess,
    timestamp: Date.now() 
  };
  attemptHistory.push(attempt); // Add to end for left-to-right display (latest on right)
  
  // Keep only last 10 attempts
  if (attemptHistory.length > MAX_HISTORY) {
    attemptHistory.shift(); // Remove oldest (first) element
  }
  
  // Update global stats
  totalAttempts++;
  
  if (isSuccess) {
    successfulAttempts++;
    currentStreak++;
    bestStreak = Math.max(bestStreak, currentStreak);
  } else {
    currentStreak = 0; // Reset streak on any non-perfect attempt
  }
  
  updateHistoryDisplay(true);
  updateStatsDisplay();
}

function updateHistoryDisplay(isNewItem = false) {
  historyDots.innerHTML = "";
  
  // Always show 10 dots - filled ones for attempts, empty ones for remaining slots
  for (let i = 0; i < MAX_HISTORY; i++) {
    const dot = document.createElement("div");
    dot.className = "history-dot";
    
    if (i < attemptHistory.length) {
      const attempt = attemptHistory[i];
      // Use the classification to determine dot color
      if (attempt.classification === 'perfect') {
        dot.classList.add("success");
      } else if (attempt.classification === 'close') {
        dot.classList.add("close");
      } else {
        dot.classList.add("fail");
      }
      
      dot.setAttribute("data-time", `${Math.round(attempt.duration)}ms`);
      
      // Only animate the newest item (last in array) when it's just added
      if (isNewItem && i === attemptHistory.length - 1) {
        dot.style.animation = "pulse 0.6s ease-out";
      }
    } else {
      dot.classList.add("empty");
    }
    
    historyDots.appendChild(dot);
  }
}

function clearHistory() {
  attemptHistory = [];
  // Reset all stats
  currentStreak = 0;
  bestStreak = 0;
  totalAttempts = 0;
  successfulAttempts = 0;
  
  updateHistoryDisplay();
  updateStatsDisplay();
  
  // Visual feedback - use the correct element reference
  const historyContainer = document.querySelector('.compact-history');
  gsap.to(historyContainer, {
    scale: 0.9,
    yoyo: true,
    repeat: 1,
    duration: 0.1,
    ease: "power2.inOut"
  });
}

document.addEventListener("keydown", (e) => {
  if (e.code === settings.keyBinding && !isPressed) {
    isPressed = true;
    startTime = performance.now();
    keyEl.classList.add("active");
    
    // Animate button press with GSAP
    gsap.to(keyEl, {
      scale: 1.1,
      duration: 0.1,
      ease: "power2.out"
    });
    
    timerInterval = setInterval(() => {
      let now = performance.now() - startTime;
      if (settings.liveTimer) {
        timerEl.innerText = `Duration: ${Math.round(now)} ms`;
      } else {
        timerEl.innerText = `Duration: ? ms`;
      }
    }, 10);
  }
});

document.addEventListener("keyup", (e) => {
  if (e.code === settings.keyBinding && isPressed) {
    let duration = performance.now() - startTime;
    clearInterval(timerInterval);
    isPressed = false;
    keyEl.classList.remove("active");
    keyEl.classList.remove("success");
    
    timerEl.innerText = `Duration: ${Math.round(duration)} ms`;

    // Classify the timing attempt
    const classification = classifyTiming(duration);
    
    // Add to history with classification
    addToHistory(duration, classification);
    
    // Handle different result types
    if (classification === 'perfect') {
      resultEl.innerHTML = `⚡ PERFECT COMBO! ${Math.round(duration)} ms ⚡`;
      resultEl.className = "success-text";
      animateSuccess();
      
      // Reset success state after animation
      setTimeout(() => {
        keyEl.classList.remove("success");
        gsap.set(keyEl, { rotation: 0 });
        resultEl.className = "";
      }, 2000);
    } else if (classification === 'close') {
      // Close attempt - show in yellow/orange
      const diff = duration < 500 ? "CLOSE - A BIT FAST" : "CLOSE - A BIT SLOW";
      resultEl.innerHTML = `🔶 ${diff}: ${Math.round(duration)} ms`;
      resultEl.className = "close-text";
      
      // Initialize audio if not done
      initializeAudio();
      
      // Play a softer fail sound for close attempts
      playFailSound();
      
      // Gentle shake for close attempts
      gsap.to(keyEl, {
        x: "+=10",
        yoyo: true,
        repeat: 1,
        duration: 0.15,
        ease: "power2.inOut"
      });
      
      setTimeout(() => {
        resultEl.className = "";
      }, 2000);
    } else {
      // Failed attempt
      // Initialize audio if not done
      initializeAudio();
      
      const diff = duration < 480 ? "TOO FAST" : "TOO SLOW";
      resultEl.innerHTML = `✘ ${diff}: ${Math.round(duration)} ms`;
      resultEl.className = "fail-text";
      
      // Play fail sound
      playFailSound();
      
      // Shake animation for failure
      gsap.to(keyEl, {
        x: "+=20",
        yoyo: true,
        repeat: 3,
        duration: 0.1,
        ease: "power2.inOut"
      });
      
      setTimeout(() => {
        resultEl.className = "";
      }, 2000);
    }
    
    // Reset button scale
    gsap.to(keyEl, {
      scale: 1,
      duration: 0.2,
      ease: "power2.out"
    });
  }
});

// Add click functionality for testing
keyEl.addEventListener("mousedown", (e) => {
  if (!isPressed) {
    document.dispatchEvent(new KeyboardEvent("keydown", { code: settings.keyBinding }));
  }
});

keyEl.addEventListener("mouseup", (e) => {
  if (isPressed) {
    document.dispatchEvent(new KeyboardEvent("keyup", { code: settings.keyBinding }));
  }
});

// Prevent context menu on right click
keyEl.addEventListener("contextmenu", (e) => e.preventDefault());

// Initialize audio pool and settings
initializeAudioPool();
setupSettingsToggles();
updateHistoryDisplay();
updateStatsDisplay();
updateSubtitle();
