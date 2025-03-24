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

  // Theme switching functionality
  // Check for saved theme preference or use system preference
  const prefersDarkScheme = window.matchMedia("(prefers-color-scheme: dark)");
  const currentTheme = localStorage.getItem("theme");

  // Function to set theme
  function setTheme(theme) {
    if (theme === "dark") {
      document.documentElement.setAttribute("data-theme", "dark");
      themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
    } else {
      document.documentElement.removeAttribute("data-theme");
      themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
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
      }

      // Create and speak utterance
      currentUtterance = createUtterance(text);
      synth.speak(currentUtterance);

      // Add loading animation to speak button
      speakBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Speaking...';

      // Reset button after speech ends
      currentUtterance.onend = () => {
        speakBtn.innerHTML = '<i class="fas fa-play"></i> Speak';
        currentUtterance = null;
      };
    } else {
      // Give visual feedback if text is empty
      textInput.classList.add("empty");
      setTimeout(() => {
        textInput.classList.remove("empty");
      }, 1000);
    }
  });

  pauseBtn.addEventListener("click", () => {
    if (synth.speaking && !synth.paused) {
      synth.pause();
    }
  });

  resumeBtn.addEventListener("click", () => {
    if (synth.speaking && synth.paused) {
      synth.resume();
    }
  });

  stopBtn.addEventListener("click", () => {
    if (synth.speaking) {
      synth.cancel();
      speakBtn.innerHTML = '<i class="fas fa-play"></i> Speak';
    }
  });

  clearBtn.addEventListener("click", () => {
    textInput.value = "";
    if (synth.speaking) {
      synth.cancel();
      speakBtn.innerHTML = '<i class="fas fa-play"></i> Speak';
    }
  });

  // Update displays when sliders change
  rateInput.addEventListener("input", updateValueDisplay);
  pitchInput.addEventListener("input", updateValueDisplay);

  // Initialize displays
  updateValueDisplay();

  // Add animation effect on load
  const container = document.querySelector(".container");
  container.style.opacity = "0";
  container.style.transform = "translateY(20px)";

  setTimeout(() => {
    container.style.transition = "opacity 0.5s ease, transform 0.5s ease";
    container.style.opacity = "1";
    container.style.transform = "translateY(0)";
  }, 100);
});
