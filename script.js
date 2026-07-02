const videoElement = document.getElementById('webcam');
const canvasElement = document.getElementById('outputCanvas');
const canvasCtx = canvasElement.getContext('2d');
const photoFrame = document.getElementById('photoFrame');
const statusText = document.getElementById('statusText');
const emotionStatus = document.getElementById('emotionStatus');

const audioLawan = document.getElementById('audioLawan');
const audioBlur = document.getElementById('audioBlur');
const audioTelunjuk = document.getElementById('audioTelunjuk');
const audioCemberut = document.getElementById('audioCemberut');
const audioTutupMulut = document.getElementById('audioTutupMulut');

const customModal = document.getElementById('customModal');
const modalTitle = document.getElementById('modalTitle');
const modalMessage = document.getElementById('modalMessage');
const startBtn = document.getElementById('startBtn');

let currentMode = 'normal';
let isDetecting = false;
let handMode = 'normal';
let faceMode = 'normal';

let mouthPos = null;
let handPos = null;

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

function stopAllSound() {
    audioLawan.pause();
    audioBlur.pause();
    audioTelunjuk.pause();
    audioCemberut.pause();
    audioTutupMulut.pause();
}

function playSound(audioToPlay) {
    stopAllSound();
    audioToPlay.currentTime = 0;
    if (audioToPlay.paused) {
        audioToPlay.play().catch(e => {});
    }
}

function checkCombinedState() {
    let finalMode = 'normal';

    if (mouthPos && handPos) {
        const distance = Math.hypot(mouthPos.x - handPos.x, mouthPos.y - handPos.y);
        if (distance < 0.15) {
            updateState('tutup_mulut');
            return;
        }
    }

    if (faceMode === 'cemberut') {
        finalMode = 'cemberut';
    } else if (handMode === 'lawan') {
        finalMode = 'lawan';
    } else if (handMode === 'blur') {
        finalMode = 'blur';
    } else if (handMode === 'telunjuk') {
        finalMode = 'telunjuk';
    }

    updateState(finalMode);
}

function onHandResults(results) {
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    
    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        const landmarks = results.multiHandLandmarks[0];
        
        handPos = { x: landmarks[9].x, y: landmarks[9].y };

        const indexOpen = landmarks[8].y < landmarks[6].y;
        const middleOpen = landmarks[12].y < landmarks[10].y;
        const ringOpen = landmarks[16].y < landmarks[14].y;
        const pinkyOpen = landmarks[20].y < landmarks[18].y;

        const openedFingers = [indexOpen, middleOpen, ringOpen, pinkyOpen].filter(Boolean).length;

        if (openedFingers === 4) { 
            handMode = 'normal';
        } else if (indexOpen && middleOpen && !ringOpen && !pinkyOpen) {
            handMode = 'blur';
        } else if (indexOpen && !middleOpen && !ringOpen && !pinkyOpen) {
            handMode = 'telunjuk';
        } else if (!indexOpen && !middleOpen && !ringOpen && !pinkyOpen) {
            handMode = 'lawan';
        } else {
            handMode = 'normal';
        }
    } else {
        handMode = 'normal';
        handPos = null;
    }
    
    checkCombinedState();
}

function onFaceResults(results) {
    if (!results.multiFaceLandmarks || results.multiFaceLandmarks.length === 0) {
        emotionStatus.innerText = "WAJAH: TIDAK TERDETEKSI";
        emotionStatus.style.background = "#fff";
        emotionStatus.style.color = "#000";
        faceMode = 'normal';
        mouthPos = null;
        checkCombinedState();
        return;
    }

    const lm = results.multiFaceLandmarks[0];
    
    mouthPos = { x: lm[13].x, y: lm[13].y };

    if (handPos) {
        const distance = Math.hypot(mouthPos.x - handPos.x, mouthPos.y - handPos.y);
        if (distance < 0.15) {
            emotionStatus.innerText = "WAJAH: TERTUTUP TANGAN 🤭";
            emotionStatus.style.background = "#ffcc00";
            emotionStatus.style.color = "#000";
            checkCombinedState();
            return;
        }
    }

    const leftMouth = lm[61].y;
    const rightMouth = lm[291].y;
    const bottomLip = lm[14].y;

    const avgCorner = (leftMouth + rightMouth) / 2;
    const diff = avgCorner - bottomLip;

    if (diff > 0.015) {
        emotionStatus.innerText = `WAJAH: 😡 CEMBERUT (SKOR: ${diff.toFixed(3)})`;
        emotionStatus.style.background = "#ff3333";
        emotionStatus.style.color = "#fff";
        faceMode = 'cemberut';
    } else if (diff < -0.01) {
        emotionStatus.innerText = `WAJAH: 😁 SENYUM (SKOR: ${diff.toFixed(3)})`;
        emotionStatus.style.background = "#5eff5e";
        emotionStatus.style.color = "#000";
        faceMode = 'normal';
    } else {
        emotionStatus.innerText = `WAJAH: 😐 DATAR (SKOR: ${diff.toFixed(3)})`;
        emotionStatus.style.background = "#fff";
        emotionStatus.style.color = "#000";
        faceMode = 'normal';
    }

    checkCombinedState();
}

function updateState(mode) {
    if (currentMode === mode) {
        if (mode === 'blur') spawnParticles('😆');
        if (mode === 'lawan') spawnParticles('🔥');
        if (mode === 'cemberut') spawnParticles('😡');
        if (mode === 'telunjuk') spawnParticles('☝️');
        if (mode === 'tutup_mulut') spawnParticles('🤭');
        return;
    }
    
    currentMode = mode;
    photoFrame.className = 'photo-frame';

    if (mode === 'normal') {
        statusText.innerText = "✋ NORMAL MODE";
        statusText.style.background = "#5eff5e";
        statusText.style.color = "#000";
        stopAllSound();
    } 
    else if (mode === 'blur') {
        statusText.innerText = "✌️ BLUR MODE! 😆";
        statusText.style.background = "var(--accent-blur)";
        statusText.style.color = "#000";
        photoFrame.classList.add('state-blur');
        playSound(audioBlur);
    } 
    else if (mode === 'lawan') {
        statusText.innerText = "✊ LAWAN!!! 🔥🔥🔥";
        statusText.style.background = "var(--accent-lawan)";
        statusText.style.color = "#fff";
        photoFrame.classList.add('state-lawan');
        playSound(audioLawan);
    }
    else if (mode === 'telunjuk') {
        statusText.innerText = "☝️ MODE TELUNJUK";
        statusText.style.background = "#ff9900";
        statusText.style.color = "#000";
        playSound(audioTelunjuk);
    }
    else if (mode === 'cemberut') {
        statusText.innerText = "😡 MODE CEMBERUT!!!";
        statusText.style.background = "#8b0000";
        statusText.style.color = "#fff";
        photoFrame.classList.add('state-lawan');
        playSound(audioCemberut);
    }
    else if (mode === 'tutup_mulut') {
        statusText.innerText = "🤭 MODE TUTUP MULUT";
        statusText.style.background = "#ffcc00";
        statusText.style.color = "#000";
        playSound(audioTutupMulut);
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
hands.onResults(onHandResults);

const faceMesh = new FaceMesh({
    locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`
});
faceMesh.setOptions({
    maxNumFaces: 1,
    refineLandmarks: true,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5
});
faceMesh.onResults(onFaceResults);

async function detectFrame() {
    if (!isDetecting) return;
    await hands.send({ image: videoElement });
    await faceMesh.send({ image: videoElement });
    requestAnimationFrame(detectFrame);
}

startBtn.addEventListener('click', () => {
    startBtn.innerText = "MEMINTA IZIN...";
    
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        modalTitle.innerText = "❌ TIDAK DIKUNG";
        modalMessage.innerText = "Browser atau Protokol HTTP kamu tidak mendukung akses kamera.";
        startBtn.innerText = "ERROR API";
        return;
    }

    audioLawan.play().then(() => audioLawan.pause()).catch(e => {});
    audioBlur.play().then(() => audioBlur.pause()).catch(e => {});
    audioTelunjuk.play().then(() => audioTelunjuk.pause()).catch(e => {});
    audioCemberut.play().then(() => audioCemberut.pause()).catch(e => {});
    audioTutupMulut.play().then(() => audioTutupMulut.pause()).catch(e => {});

    navigator.mediaDevices.getUserMedia({ 
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" } 
    })
    .then((stream) => {
        customModal.classList.add('hidden');
        videoElement.srcObject = stream;
        
        videoElement.onloadedmetadata = () => {
            videoElement.play();
            isDetecting = true;
            statusText.innerText = "AI SIAP MENDETEKSI";
            detectFrame();
        };
    })
    .catch((err) => {
        modalTitle.innerText = "❌ AKSES DITOLAK";
        modalMessage.innerText = `Gagal mendeteksi kamera. Pastikan memberikan izin dari pengaturan browser.`;
        startBtn.innerText = "COBA LAGI";
        startBtn.style.background = "var(--accent-lawan)";
        startBtn.style.color = "#fff";
    });
});
