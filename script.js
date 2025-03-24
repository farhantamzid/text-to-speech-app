document.addEventListener("DOMContentLoaded", () => {
  // DOM Elements
  const textInput = document.getElementById("text-input");
  const voiceSelect = document.getElementById("voice-select");
  const rateInput = document.getElementById("rate");
  const rateValue = document.getElementById("rate-value");
  const pitchInput = document.getElementById("pitch");
  const pitchValue = document.getElementById("pitch-value");
  const speakBtn = document.getElementById("speak-btn");
  const pauseBtn = document.getElementById("pause-btn");
  const resumeBtn = document.getElementById("resume-btn");
  const stopBtn = document.getElementById("stop-btn");
  const clearBtn = document.getElementById("clear-btn");
  const themeToggle = document.getElementById("theme-toggle");
  const saveBtn = document.getElementById("save-btn");
  const textCounter = document.querySelector(".text-counter");
  const visualizer = document.getElementById("audio-visualizer");

  // Audio recording variables
  let mediaRecorder = null;
  let audioChunks = [];
  let isRecording = false;
  let audioContext = null;
  let audioDestination = null;
  let visualizerContext = null;
  let analyser = null;
  let animationFrame = null;

  // Initialize particles background
  initParticles();

  // Initialize audio context for recording
  try {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    audioDestination = audioContext.createMediaStreamDestination();

    // Setup visualizer
    if (visualizer) {
      visualizerContext = visualizer.getContext("2d");
      analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
    }
  } catch (e) {
    console.error("Web Audio API is not supported in this browser", e);
  }

  // Character counter for textarea
  textInput.addEventListener("input", () => {
    const count = textInput.value.length;
    textCounter.textContent = `${count} character${count !== 1 ? "s" : ""}`;

    // Highlight counter if approaching limit
    if (count > 2000) {
      textCounter.style.color = "#ff4757";
      textCounter.style.opacity = "1";
    } else {
      textCounter.style.color = "";
      textCounter.style.opacity = "0.6";
    }
  });

  // Theme switching functionality
  // Check for saved theme preference or use system preference
  const prefersDarkScheme = window.matchMedia("(prefers-color-scheme: dark)");
  const currentTheme = localStorage.getItem("theme");

  // Function to set theme
  function setTheme(theme) {
    if (theme === "dark") {
      document.documentElement.setAttribute("data-theme", "dark");
      themeToggle.innerHTML = '<i class="fas fa-sun"></i>';

      // Update particles for dark mode
      if (window.pJSDom && window.pJSDom[0]) {
        const particles = window.pJSDom[0].pJS.particles;
        particles.color.value = "#8c83ff";
        particles.line_linked.color = "#534fb7";
        window.pJSDom[0].pJS.fn.particlesRefresh();
      }
    } else {
      document.documentElement.removeAttribute("data-theme");
      themeToggle.innerHTML = '<i class="fas fa-moon"></i>';

      // Update particles for light mode
      if (window.pJSDom && window.pJSDom[0]) {
        const particles = window.pJSDom[0].pJS.particles;
        particles.color.value = "#6c63ff";
        particles.line_linked.color = "#8e87e3";
        window.pJSDom[0].pJS.fn.particlesRefresh();
      }
    }
  }

  // Apply saved theme or use system preference
  if (currentTheme) {
    setTheme(currentTheme);
  } else if (prefersDarkScheme.matches) {
    setTheme("dark");
    localStorage.setItem("theme", "dark");
  }

  // Toggle theme when button is clicked
  themeToggle.addEventListener("click", () => {
    const theme =
      document.documentElement.getAttribute("data-theme") === "dark"
        ? "light"
        : "dark";
    setTheme(theme);
    localStorage.setItem("theme", theme);
  });

  // Initialize speech synthesis
  const synth = window.speechSynthesis;
  let voices = [];
  let currentUtterance = null;

  // Get and populate voices
  function populateVoiceList() {
    voices = synth.getVoices();

    // Clear existing options
    voiceSelect.innerHTML = "";

    // Add voice options
    voices.forEach((voice) => {
      const option = document.createElement("option");
      option.textContent = `${voice.name} (${voice.lang})`;
      option.setAttribute("data-name", voice.name);
      option.setAttribute("data-lang", voice.lang);
      voiceSelect.appendChild(option);
    });
  }

  // Check if voices are available
  if (synth.onvoiceschanged !== undefined) {
    synth.onvoiceschanged = populateVoiceList;
  }

  // Initial populate
  populateVoiceList();

  // Create a speech utterance
  function createUtterance(text) {
    const utterance = new SpeechSynthesisUtterance(text);

    // Set voice
    const selectedVoice = voices.find(
      (voice) =>
        voice.name === voiceSelect.selectedOptions[0].getAttribute("data-name")
    );
    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }

    // Set rate and pitch
    utterance.rate = parseFloat(rateInput.value);
    utterance.pitch = parseFloat(pitchInput.value);

    return utterance;
  }

  // Function to start recording audio
  function startRecording() {
    audioChunks = [];

    if (audioContext && audioDestination) {
      try {
        mediaRecorder = new MediaRecorder(audioDestination.stream);

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunks.push(event.data);
          }
        };

        mediaRecorder.onstop = () => {
          const audioBlob = new Blob(audioChunks, { type: "audio/mpeg" });
          saveAudio(audioBlob);
        };

        mediaRecorder.start();
        isRecording = true;

        // Visual feedback for recording state
        saveBtn.innerHTML =
          '<i class="fas fa-circle-notch fa-spin"></i> Recording...';
        saveBtn.classList.add("recording");
      } catch (e) {
        console.error("Error starting recording", e);
        alert(
          "Could not start recording. Your browser may not support this feature."
        );
      }
    } else {
      alert("Audio recording is not supported in your browser");
    }
  }

  // Function to stop recording
  function stopRecording() {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      isRecording = false;
      saveBtn.innerHTML = '<i class="fas fa-save"></i> Save Audio';
      saveBtn.classList.remove("recording");
    }
  }

  // Function to save the recorded audio
  function saveAudio(audioBlob) {
    const fileName = `speak-it-${new Date().toISOString().slice(0, 10)}.mp3`;
    const url = URL.createObjectURL(audioBlob);

    const a = document.createElement("a");
    document.body.appendChild(a);
    a.style.display = "none";
    a.href = url;
    a.download = fileName;
    a.click();

    setTimeout(() => {
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    }, 100);

    // Show success notification
    showNotification("Audio saved successfully!");
  }

  // Function to show notification
  function showNotification(message) {
    const notification = document.createElement("div");
    notification.className = "notification";
    notification.innerHTML = `
      <div class="notification-content">
        <i class="fas fa-check-circle"></i>
        <span>${message}</span>
      </div>
    `;

    document.body.appendChild(notification);

    // Animate notification
    setTimeout(() => {
      notification.classList.add("show");
    }, 10);

    // Remove notification after 3 seconds
    setTimeout(() => {
      notification.classList.remove("show");
      setTimeout(() => {
        document.body.removeChild(notification);
      }, 300);
    }, 3000);
  }

  // Function to start audio visualization
  function startVisualization() {
    if (!audioContext || !visualizer || !visualizerContext) return;

    // Connect the audio graph for visualization
    const source = audioContext.createOscillator();
    source.connect(analyser);
    analyser.connect(audioContext.destination);

    // Set up the analyzer
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    // Clear the canvas
    visualizerContext.clearRect(0, 0, visualizer.width, visualizer.height);

    // Set canvas dimensions
    visualizer.width = visualizer.offsetWidth;
    visualizer.height = visualizer.offsetHeight;

    // Function to draw the visualizer
    function draw() {
      // Request next frame
      animationFrame = requestAnimationFrame(draw);

      // Get frequency data
      analyser.getByteFrequencyData(dataArray);

      // Clear canvas
      visualizerContext.clearRect(0, 0, visualizer.width, visualizer.height);

      // Draw visualization
      const barWidth = (visualizer.width / bufferLength) * 2.5;
      let x = 0;

      // Get visualization color from CSS variable
      const isDark =
        document.documentElement.getAttribute("data-theme") === "dark";
      const gradientColor = isDark ? "#8c83ff" : "#6c63ff";

      // Create gradient
      const gradient = visualizerContext.createLinearGradient(
        0,
        0,
        0,
        visualizer.height
      );
      gradient.addColorStop(0, gradientColor);
      gradient.addColorStop(1, "transparent");

      for (let i = 0; i < bufferLength; i++) {
        const barHeight = dataArray[i] / 2;

        if (synth.speaking) {
          // Simulate random sound activity when speaking
          const randomHeight = Math.random() * 40 + 5;

          visualizerContext.fillStyle = gradient;
          visualizerContext.fillRect(
            x,
            visualizer.height - randomHeight,
            barWidth,
            randomHeight
          );

          // Add glow effect
          visualizerContext.beginPath();
          visualizerContext.arc(
            x + barWidth / 2,
            visualizer.height - randomHeight / 2,
            randomHeight / 3,
            0,
            Math.PI * 2
          );
          visualizerContext.fillStyle = "rgba(108, 99, 255, 0.2)";
          visualizerContext.fill();
        } else {
          // Just draw small idle bars when not speaking
          const idleHeight = 3;
          visualizerContext.fillStyle = "rgba(108, 99, 255, 0.2)";
          visualizerContext.fillRect(
            x,
            visualizer.height - idleHeight,
            barWidth,
            idleHeight
          );
        }

        x += barWidth + 1;
      }
    }

    // Start the visualization
    draw();
  }

  // Function to stop visualization
  function stopVisualization() {
    if (animationFrame) {
      cancelAnimationFrame(animationFrame);
      animationFrame = null;

      // Clear canvas
      if (visualizer && visualizerContext) {
        visualizerContext.clearRect(0, 0, visualizer.width, visualizer.height);
      }
    }
  }

  // Initialize particles.js
  function initParticles() {
    if (window.particlesJS) {
      const isDark =
        document.documentElement.getAttribute("data-theme") === "dark";
      const particleColor = isDark ? "#8c83ff" : "#6c63ff";
      const lineColor = isDark ? "#534fb7" : "#8e87e3";

      window.particlesJS("particles", {
        particles: {
          number: {
            value: 30,
            density: {
              enable: true,
              value_area: 800,
            },
          },
          color: {
            value: particleColor,
          },
          shape: {
            type: "circle",
            stroke: {
              width: 0,
              color: "#000000",
            },
          },
          opacity: {
            value: 0.3,
            random: false,
            anim: {
              enable: false,
            },
          },
          size: {
            value: 3,
            random: true,
            anim: {
              enable: false,
            },
          },
          line_linked: {
            enable: true,
            distance: 150,
            color: lineColor,
            opacity: 0.2,
            width: 1,
          },
          move: {
            enable: true,
            speed: 2,
            direction: "none",
            random: true,
            straight: false,
            out_mode: "out",
            bounce: false,
          },
        },
        interactivity: {
          detect_on: "canvas",
          events: {
            onhover: {
              enable: true,
              mode: "grab",
            },
            onclick: {
              enable: true,
              mode: "push",
            },
            resize: true,
          },
          modes: {
            grab: {
              distance: 140,
              line_linked: {
                opacity: 0.4,
              },
            },
            push: {
              particles_nb: 3,
            },
          },
        },
        retina_detect: true,
      });
    }
  }

  // Update value displays
  function updateValueDisplay() {
    rateValue.textContent = rateInput.value;
    pitchValue.textContent = pitchInput.value;
  }

  // Event listeners
  speakBtn.addEventListener("click", () => {
    const text = textInput.value.trim();

    if (text !== "") {
      // Stop any ongoing speech
      if (synth.speaking) {
        synth.cancel();
        stopVisualization();
      }

      // Create and speak utterance
      currentUtterance = createUtterance(text);
      synth.speak(currentUtterance);

      // Add loading animation to speak button
      speakBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Speaking...';

      // Start visualization
      startVisualization();

      // Reset button after speech ends
      currentUtterance.onend = () => {
        speakBtn.innerHTML = '<i class="fas fa-play"></i> Speak';
        currentUtterance = null;
        stopVisualization();
      };
    } else {
      // Give visual feedback if text is empty
      textInput.classList.add("empty");
      setTimeout(() => {
        textInput.classList.remove("empty");
      }, 1000);
    }
  });

  // Save button event listener
  if (saveBtn) {
    saveBtn.addEventListener("click", () => {
      const text = textInput.value.trim();

      if (text === "") {
        textInput.classList.add("empty");
        setTimeout(() => {
          textInput.classList.remove("empty");
        }, 1000);
        return;
      }

      if (!isRecording) {
        // Start recording and then speak
        startRecording();

        // Stop any ongoing speech
        if (synth.speaking) {
          synth.cancel();
          stopVisualization();
        }

        // Create and speak utterance
        currentUtterance = createUtterance(text);

        // Listen for end of speech to stop recording
        currentUtterance.onend = () => {
          stopRecording();
          speakBtn.innerHTML = '<i class="fas fa-play"></i> Speak';
          currentUtterance = null;
          stopVisualization();
        };

        synth.speak(currentUtterance);
        speakBtn.innerHTML =
          '<i class="fas fa-spinner fa-spin"></i> Speaking...';
        startVisualization();
      }
    });
  }

  pauseBtn.addEventListener("click", () => {
    if (synth.speaking && !synth.paused) {
      synth.pause();

      // Pause visualization
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
        animationFrame = null;
      }
    }
  });

  resumeBtn.addEventListener("click", () => {
    if (synth.speaking && synth.paused) {
      synth.resume();

      // Resume visualization
      if (!animationFrame && visualizer) {
        startVisualization();
      }
    }
  });

  stopBtn.addEventListener("click", () => {
    if (synth.speaking) {
      synth.cancel();
      speakBtn.innerHTML = '<i class="fas fa-play"></i> Speak';
      stopVisualization();
    }
  });

  clearBtn.addEventListener("click", () => {
    textInput.value = "";
    textCounter.textContent = "0 characters";
    if (synth.speaking) {
      synth.cancel();
      speakBtn.innerHTML = '<i class="fas fa-play"></i> Speak';
      stopVisualization();
    }
  });

  // Update displays when sliders change
  rateInput.addEventListener("input", updateValueDisplay);
  pitchInput.addEventListener("input", updateValueDisplay);

  // Initialize displays
  updateValueDisplay();

  // Resize handler for visualizer
  window.addEventListener("resize", () => {
    if (visualizer) {
      visualizer.width = visualizer.offsetWidth;
      visualizer.height = visualizer.offsetHeight;
    }
  });

  // Add animation effect on load
  const container = document.querySelector(".container");
  container.style.opacity = "0";
  container.style.transform = "translateY(20px)";

  setTimeout(() => {
    container.style.transition =
      "opacity 0.8s cubic-bezier(0.165, 0.84, 0.44, 1), transform 0.8s cubic-bezier(0.165, 0.84, 0.44, 1)";
    container.style.opacity = "1";
    container.style.transform = "translateY(0)";
  }, 100);

  // Add animations to buttons
  const buttons = document.querySelectorAll("button");
  buttons.forEach((button, index) => {
    button.style.opacity = "0";
    button.style.transform = "translateY(20px)";

    setTimeout(() => {
      button.style.transition =
        "opacity 0.5s ease, transform 0.5s ease, background 0.3s ease, box-shadow 0.3s ease";
      button.style.opacity = "1";
      button.style.transform = "translateY(0)";
    }, 300 + index * 100);
  });
});
