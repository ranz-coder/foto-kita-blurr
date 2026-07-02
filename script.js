let currentStep = 1;
const totalSteps = 4;
const onboardingModal = document.getElementById('onboardingModal');
const btnNext = document.getElementById('btnNext');
const btnBack = document.getElementById('btnBack');
const dots = document.querySelectorAll('.dot');

const burgerBtn = document.getElementById('burgerBtn');
const closeMenuBtn = document.getElementById('closeMenuBtn');
const sideMenu = document.getElementById('sideMenu');

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
const audioNgangap = document.getElementById('audioNgangap');

let currentMode = 'normal';
let isDetecting = false;
let handMode = 'normal';
let faceMode = 'normal';
let mouthPos = null;
let handPos = null;
let lastParticleTime = 0;

function updateStepper() {
    for (let i = 1; i <= totalSteps; i++) {
        document.getElementById(`step${i}`).style.display = (i === currentStep) ? 'block' : 'none';
    }
    dots.forEach((dot, index) => {
        dot.classList.toggle('active', index + 1 === currentStep);
    });
    btnBack.style.visibility = (currentStep === 1) ? 'hidden' : 'visible';
    btnNext.innerText = (currentStep === totalSteps) ? 'MULAI KAMERA' : 'LANJUT';
}

btnNext.addEventListener('click', () => {
    if (currentStep < totalSteps) {
        currentStep++;
        updateStepper();
    } else {
        startSystem();
    }
});

btnBack.addEventListener('click', () => {
    if (currentStep > 1) {
        currentStep--;
        updateStepper();
    }
});

burgerBtn.addEventListener('click', () => sideMenu.classList.add('open'));
closeMenuBtn.addEventListener('click', () => sideMenu.classList.remove('open'));

function stopAllSound() {
    [audioLawan, audioBlur, audioTelunjuk, audioCemberut, audioTutupMulut, audioNgangap].forEach(audio => {
        audio.pause();
        audio.currentTime = 0;
    });
}

function playSound(audioToPlay) {
    stopAllSound();
    if (audioToPlay.paused) {
        audioToPlay.play().catch(() => {});
    }
}

function spawnParticles(emoji) {
    const now = Date.now();
    if (now - lastParticleTime < 280) return;
    lastParticleTime = now;

    const frameRect = photoFrame.getBoundingClientRect();
    for (let i = 0; i < 3; i++) {
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

function updateState(mode) {
    if (currentMode === mode) {
        if (mode === 'blur') spawnParticles('😆');
        if (mode === 'lawan') spawnParticles('🔥');
        if (mode === 'cemberut') spawnParticles('😡');
        if (mode === 'telunjuk') spawnParticles('☝️');
        if (mode === 'tutup_mulut') spawnParticles('🤭');
        if (mode === 'ngangap') spawnParticles('😲');
        return;
    }
    
    currentMode = mode;
    
    if (mode === 'normal') {
        statusText.innerText = "✋ NORMAL MODE";
        photoFrame.className = 'photo-frame';
        stopAllSound();
    } else if (mode === 'blur') {
        statusText.innerText = "✌️ BLUR MODE! 😆";
        photoFrame.className = 'photo-frame state-blur';
        playSound(audioBlur);
    } else if (mode === 'lawan') {
        statusText.innerText = "✊ LAWAN!!! 🔥🔥🔥";
        photoFrame.className = 'photo-frame state-lawan';
        playSound(audioLawan);
    } else if (mode === 'telunjuk') {
        statusText.innerText = "☝️ MODE TELUNJUK";
        photoFrame.className = 'photo-frame';
        playSound(audioTelunjuk);
    } else if (mode === 'cemberut') {
        statusText.innerText = "😡 MODE CEMBERUT!!!";
        photoFrame.className = 'photo-frame state-lawan';
        playSound(audioCemberut);
    } else if (mode === 'tutup_mulut') {
        statusText.innerText = "🤭 MODE TUTUP MULUT";
        photoFrame.className = 'photo-frame';
        playSound(audioTutupMulut);
    } else if (mode === 'ngangap') {
        statusText.innerText = "😲 MODE NGANGAP!!!";
        photoFrame.className = 'photo-frame';
        playSound(audioNgangap);
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

    if (faceMode === 'ngangap') {
        finalMode = 'ngangap';
    } else if (faceMode === 'cemberut') {
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

        if (openedFingers === 4) handMode = 'normal';
        else if (indexOpen && middleOpen && !ringOpen && !pinkyOpen) handMode = 'blur';
        else if (indexOpen && !middleOpen && !ringOpen && !pinkyOpen) handMode = 'telunjuk';
        else if (!indexOpen && !middleOpen && !ringOpen && !pinkyOpen) handMode = 'lawan';
        else handMode = 'normal';
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

    const upperInnerLip = lm[13];
    const lowerInnerLip = lm[14];
    const mouthOpenDist = Math.hypot(upperInnerLip.x - lowerInnerLip.x, upperInnerLip.y - lowerInnerLip.y);

    const leftMouth = lm[61].y;
    const rightMouth = lm[291].y;
    const bottomLip = lm[14].y;
    const avgCorner = (leftMouth + rightMouth) / 2;
    const diff = avgCorner - bottomLip;

    if (mouthOpenDist > 0.04) {
        emotionStatus.innerText = `WAJAH: 😲 NGANGAP (GAP: ${mouthOpenDist.toFixed(3)})`;
        emotionStatus.style.background = "#00e5ff";
        emotionStatus.style.color = "#000";
        faceMode = 'ngangap';
    } else if (diff > 0.005) {
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

async function startSystem() {
    onboardingModal.style.display = 'none';
    statusText.innerText = "MEMINTA IZIN KAMERA...";

    [audioLawan, audioBlur, audioTelunjuk, audioCemberut, audioTutupMulut, audioNgangap].forEach(audio => {
        audio.play().then(() => audio.pause()).catch(() => {});
    });

    try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" } 
        });
        
        videoElement.srcObject = stream;
        videoElement.onloadedmetadata = () => {
            videoElement.play();
            isDetecting = true;
            statusText.innerText = "✋ KAMERA SIAP!";
            runAI();
        };
    } catch (err) {
        statusText.innerText = "❌ AKSES KAMERA DITOLAK!";
    }
}

function runAI() {
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
    detectFrame();
}
