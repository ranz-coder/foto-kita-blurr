const videoElement = document.getElementById('webcam');
const photoFrame = document.getElementById('photoFrame');
const statusText = document.getElementById('statusText');
const audioLawan = document.getElementById('audioLawan');
const audioBlur = document.getElementById('audioBlur');

const customModal = document.getElementById('customModal');
const modalTitle = document.getElementById('modalTitle');
const modalMessage = document.getElementById('modalMessage');
const startBtn = document.getElementById('startBtn');

let currentMode = 'normal';

function spawnParticles(emoji) {
    const frameRect = photoFrame.getBoundingClientRect();
    for (let i = 0; i < 5; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        particle.innerText = emoji;
        
        const randomX = frameRect.left + Math.random() * frameRect.width;
        const randomY = frameRect.top + Math.random() * frameRect.height;
        
        particle.style.left = `${randomX}px`;
        particle.style.top = `${randomY}px`;
        
        document.body.appendChild(particle);
        
        setTimeout(() => particle.remove(), 1000);
    }
}

function playSound(audioToPlay, audioToStop) {
    audioToStop.pause();
    audioToStop.currentTime = 0;
    if (audioToPlay.paused) {
        audioToPlay.play().catch(e => {});
    }
}

function stopAllSound() {
    audioLawan.pause();
    audioBlur.pause();
}

function onResults(results) {
    if (!results.multiHandLandmarks || results.multiHandLandmarks.length === 0) {
        updateState('normal');
        return;
    }

    const landmarks = results.multiHandLandmarks[0];

    const indexOpen = landmarks[8].y < landmarks[6].y;
    const middleOpen = landmarks[12].y < landmarks[10].y;
    const ringOpen = landmarks[16].y < landmarks[14].y;
    const pinkyOpen = landmarks[20].y < landmarks[18].y;

    const openedFingers = [indexOpen, middleOpen, ringOpen, pinkyOpen].filter(Boolean).length;

    if (openedFingers === 4) { 
        updateState('normal');
    } else if (indexOpen && middleOpen && !ringOpen && !pinkyOpen) {
        updateState('blur');
    } else if (!indexOpen && !middleOpen && !ringOpen && !pinkyOpen) {
        updateState('lawan');
    }
}

function updateState(mode) {
    if (currentMode === mode) {
        if (mode === 'blur') spawnParticles('😆');
        if (mode === 'lawan') spawnParticles('🔥');
        return;
    }
    
    currentMode = mode;
    photoFrame.className = 'photo-frame';

    if (mode === 'normal') {
        statusText.innerText = "✋ NORMAL MODE";
        statusText.style.background = "#5eff5e";
        stopAllSound();
    } 
    else if (mode === 'blur') {
        statusText.innerText = "✌️ BLUR MODE! 😆";
        statusText.style.background = "var(--accent-blur)";
        photoFrame.classList.add('state-blur');
        playSound(audioBlur, audioLawan);
    } 
    else if (mode === 'lawan') {
        statusText.innerText = "✊ LAWAN!!! 🔥🔥🔥";
        statusText.style.background = "var(--accent-lawan)";
        photoFrame.classList.add('state-lawan');
        playSound(audioLawan, audioBlur);
    }
}

const hands = new Hands({
    locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
});

hands.setOptions({
    maxNumHands: 1,
    modelComplexity: 1,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5
});

hands.onResults(onResults);

const camera = new Camera(videoElement, {
    onFrame: async () => {
        await hands.send({ image: videoElement });
    },
    width: 640,
    height: 480
});

startBtn.addEventListener('click', () => {
    startBtn.innerText = "MEMUAT...";
    
    audioLawan.play().then(() => audioLawan.pause()).catch(e => {});
    audioBlur.play().then(() => audioBlur.pause()).catch(e => {});

    navigator.mediaDevices.getUserMedia({ video: true })
        .then((stream) => {
            stream.getTracks().forEach(track => track.stop());
            
            customModal.classList.add('hidden');
            
            camera.start().then(() => {
                statusText.innerText = "✋ Kamera Siap! Silahkan Bergaya";
            }).catch(err => {
                statusText.innerText = "Kamera gagal dimuat oleh sistem ❌";
            });
        })
        .catch((err) => {
            modalTitle.innerText = "❌ AKSES DITOLAK";
            modalMessage.innerText = "Browser memblokir kamera! Klik ikon gembok/pengaturan di sebelah kiri link URL di atas, lalu 'Izinkan' Kamera dan refresh halaman.";
            startBtn.innerText = "COBA LAGI";
            startBtn.style.background = "var(--accent-lawan)";
            startBtn.style.color = "#fff";
        });
});
