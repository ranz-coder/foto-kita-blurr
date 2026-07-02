import React, { useState, useEffect, useRef } from 'react';
import StaggeredMenu from './StaggeredMenu';
import Stepper, { Step } from './Stepper';
import './style.css';

export default function App() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const photoFrameRef = useRef(null);

  const [statusText, setStatusText] = useState('Menunggu Panduan Selesai...');
  const [emotionText, setEmotionText] = useState('WAJAH: MENUNGGU AI...');
  const [emotionBg, setEmotionBg] = useState('#fff');
  const [emotionColor, setEmotionColor] = useState('#000');
  const [frameClass, setFrameClass] = useState('photo-frame');
  const [showModal, setShowModal] = useState(true);

  const audioLawan = useRef(null);
  const audioBlur = useRef(null);
  const audioTelunjuk = useRef(null);
  const audioCemberut = useRef(null);
  const audioTutupMulut = useRef(null);
  const audioNgangap = useRef(null);

  let currentMode = 'normal';
  let isDetecting = false;
  let handMode = 'normal';
  let faceMode = 'normal';
  let mouthPos = null;
  let handPos = null;
  let lastParticleTime = 0;

  const menuItems = [
    { label: '✋ 5 JARI: NORMAL', ariaLabel: 'Mode Normal', link: '#' },
    { label: '☝️ 1 JARI: TELUNJUK', ariaLabel: 'Mode Suara Telunjuk', link: '#' },
    { label: '✌️ 2 JARI: BLUR FOTO', ariaLabel: 'Mode Blur', link: '#' },
    { label: '✊ KEPAL: LAWAN 🔥', ariaLabel: 'Mode Lawan', link: '#' },
    { label: '😲 NGANGAP: MULUT BUKA', ariaLabel: 'Mode Mulut Terbuka', link: '#' },
    { label: '😡 CEMBERUT: MARAH', ariaLabel: 'Mode Sensor Wajah', link: '#' }
  ];

  const stopAllSound = () => {
    [audioLawan, audioBlur, audioTelunjuk, audioCemberut, audioTutupMulut, audioNgangap].forEach(audio => {
      if (audio.current) {
        audio.current.pause();
        audio.current.currentTime = 0;
      }
    });
  };

  const playSound = (audioRef) => {
    stopAllSound();
    if (audioRef.current && audioRef.current.paused) {
      audioRef.current.play().catch(() => {});
    }
  };

  const spawnParticles = (emoji) => {
    const now = Date.now();
    if (now - lastParticleTime < 280) return;
    lastParticleTime = now;

    if (!photoFrameRef.current) return;
    const frameRect = photoFrameRef.current.getBoundingClientRect();

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
  };

  const updateState = (mode) => {
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
      setStatusText('✋ NORMAL MODE');
      setFrameClass('photo-frame');
      stopAllSound();
    } else if (mode === 'blur') {
      setStatusText('✌️ BLUR MODE! 😆');
      setFrameClass('photo-frame state-blur');
      playSound(audioBlur);
    } else if (mode === 'lawan') {
      setStatusText('✊ LAWAN!!! 🔥🔥🔥');
      setFrameClass('photo-frame state-lawan');
      playSound(audioLawan);
    } else if (mode === 'telunjuk') {
      setStatusText('☝️ MODE TELUNJUK');
      setFrameClass('photo-frame');
      playSound(audioTelunjuk);
    } else if (mode === 'cemberut') {
      setStatusText('😡 MODE CEMBERUT!!!');
      setFrameClass('photo-frame state-lawan');
      playSound(audioCemberut);
    } else if (mode === 'tutup_mulut') {
      setStatusText('🤭 MODE TUTUP MULUT');
      setFrameClass('photo-frame');
      playSound(audioTutupMulut);
    } else if (mode === 'ngangap') {
      setStatusText('😲 MODE NGANGAP!!!');
      setFrameClass('photo-frame');
      playSound(audioNgangap);
    }
  };

  const checkCombinedState = () => {
    let finalMode = 'normal';
    
    // Prioritas Tertinggi: Tutup Mulut
    if (mouthPos && handPos) {
      const distance = Math.hypot(mouthPos.x - handPos.x, mouthPos.y - handPos.y);
      if (distance < 0.15) {
        updateState('tutup_mulut');
        return;
      }
    }
    
    // Hirarki Prioritas Mode
    if (faceMode === 'ngangap') finalMode = 'ngangap';
    else if (faceMode === 'cemberut') finalMode = 'cemberut';
    else if (handMode === 'lawan') finalMode = 'lawan';
    else if (handMode === 'blur') finalMode = 'blur';
    else if (handMode === 'telunjuk') finalMode = 'telunjuk';

    updateState(finalMode);
  };

  const onHandResults = (results) => {
    if (!canvasRef.current) return;
    const canvasCtx = canvasRef.current.getContext('2d');
    canvasCtx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      const landmarks = results.multiHandLandmarks[0];
      handPos = { x: landmarks[9].x, y: landmarks[9].y }; // Posisi tengah telapak tangan

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
  };

  const onFaceResults = (results) => {
    if (!results.multiFaceLandmarks || results.multiFaceLandmarks.length === 0) {
      setEmotionText('WAJAH: TIDAK TERDETEKSI');
      setEmotionBg('#fff');
      setEmotionColor('#000');
      faceMode = 'normal';
      mouthPos = null;
      checkCombinedState();
      return;
    }

    const lm = results.multiFaceLandmarks[0];
    mouthPos = { x: lm[13].x, y: lm[13].y }; // Titik bibir atas bagian dalam

    // Cek Interaksi Tangan + Mulut
    if (handPos) {
      const distance = Math.hypot(mouthPos.x - handPos.x, mouthPos.y - handPos.y);
      if (distance < 0.15) {
        setEmotionText('WAJAH: TERTUTUP TANGAN 🤭');
        setEmotionBg('#ffcc00');
        setEmotionColor('#000');
        checkCombinedState();
        return;
      }
    }

    // Kalkulasi Mulut Terbuka (Ngangap) - Jarak vertikal antara bibir atas & bawah
    const upperInnerLip = lm[13];
    const lowerInnerLip = lm[14];
    const mouthOpenDist = Math.hypot(upperInnerLip.x - lowerInnerLip.x, upperInnerLip.y - lowerInnerLip.y);

    // Kalkulasi Cemberut - Titik ujung bibir terhadap bibir bawah
    const leftMouth = lm[61].y;
    const rightMouth = lm[291].y;
    const bottomLip = lm[14].y;
    const avgCorner = (leftMouth + rightMouth) / 2;
    const diff = avgCorner - bottomLip;

    if (mouthOpenDist > 0.04) {
      // Threshold 0.04 untuk deteksi mulut terbuka lebar
      setEmotionText(`WAJAH: 😲 NGANGAP (GAP: ${mouthOpenDist.toFixed(3)})`);
      setEmotionBg('#00e5ff');
      setEmotionColor('#000');
      faceMode = 'ngangap';
    } else if (diff > 0.005) {
      setEmotionText(`WAJAH: 😡 CEMBERUT (SKOR: ${diff.toFixed(3)})`);
      setEmotionBg('#ff3333');
      setEmotionColor('#fff');
      faceMode = 'cemberut';
    } else if (diff < -0.01) {
      setEmotionText(`WAJAH: 😁 SENYUM (SKOR: ${diff.toFixed(3)})`);
      setEmotionBg('#5eff5e');
      setEmotionColor('#000');
      faceMode = 'normal';
    } else {
      setEmotionText(`WAJAH: 😐 DATAR (SKOR: ${diff.toFixed(3)})`);
      setEmotionBg('#fff');
      setEmotionColor('#000');
      faceMode = 'normal';
    }
    
    checkCombinedState();
  };

  const initAI = async () => {
    setShowModal(false);
    setStatusText('MEMINTA IZIN KAMERA...');

    // Bypass kebijakan autoplay browser untuk semua audio
    [audioLawan, audioBlur, audioTelunjuk, audioCemberut, audioTutupMulut, audioNgangap].forEach(audio => {
      if (audio.current) {
        audio.current.play().then(() => audio.current.pause()).catch(() => {});
      }
    });

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' }
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play();
          isDetecting = true;
          setStatusText('✋ Kamera Siap! Bergayalah');
          startDetectionLoop();
        };
      }
    } catch (err) {
      setStatusText('❌ AKSES KAMERA DITOLAK!');
    }
  };

  const startDetectionLoop = async () => {
    const hands = new window.Hands({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
    });
    hands.setOptions({ maxNumHands: 1, modelComplexity: 1, minDetectionConfidence: 0.5, minTrackingConfidence: 0.5 });
    hands.onResults(onHandResults);

    const faceMesh = new window.FaceMesh({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`
    });
    faceMesh.setOptions({ maxNumFaces: 1, refineLandmarks: true, minDetectionConfidence: 0.5, minTrackingConfidence: 0.5 });
    faceMesh.onResults(onFaceResults);

    const frameLoop = async () => {
      if (!isDetecting || !videoRef.current) return;
      await hands.send({ image: videoRef.current });
      await faceMesh.send({ image: videoRef.current });
      requestAnimationFrame(frameLoop);
    };
    frameLoop();
  };

  return (
    <div className="app-container">
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content-wrapper">
            <Stepper initialStep={1} onFinalStepCompleted={initAI} backButtonText="MUNDUR" nextButtonText="LANJUT" stepCircleContainerClassName="brutal-stepper-container">
              <Step>
                <h2>⚠️ PERSIAPAN SISTEM</h2>
                <p>Website ini memuat AI sinkronisasi wajah dan tangan. Pastikan pencahayaan ruangan cukup terang.</p>
              </Step>
              <Step>
                <h2>✋ DETEKSI JARI</h2>
                <p>✋ 5 JARI: Normal | ✌️ 2 JARI: Efek Blur | ☝️ 1 JARI: Efek Suara Telunjuk | ✊ KEPAL: Mode Perang.</p>
              </Step>
              <Step>
                <h2>😡 SENSOR KECEMBERUTAN</h2>
                <p>Pertahankan ekspresi senyum. Jika wajah kamu menekuk cemberut melewati batas 0.005, audio bahaya menyala.</p>
              </Step>
              <Step>
                <h2>😲 & 🤭 SENSOR MULUT</h2>
                <p>Buka mulut lebar-lebar untuk mode <b>NGANGAP</b>. Tempelkan telapak tangan menutupi mulut untuk mengunci fungsi dan memicu audio rahasia.</p>
              </Step>
            </Stepper>
          </div>
        </div>
      )}

      <StaggeredMenu position="right" items={menuItems} displaySocials={false} displayItemNumbering={true} menuButtonColor="#000" openMenuButtonColor="#000" changeMenuColorOnOpen={false} colors={['#ffe600', '#000']} accentColor="#ff3333" isFixed={true} />

      <header><h1>GESTURE CONTROL : BRUTAL</h1></header>

      <div className="main-container">
        <div className="photo-frame-wrapper">
          <div className={frameClass} ref={photoFrameRef}>
            <video ref={videoRef} autoPlay playsInline muted></video>
            <canvas ref={canvasRef} width="640" height="480"></canvas>
          </div>
          <div className="status-banner" style={{ background: '#5eff5e', color: '#000' }}>{statusText}</div>
          <div className="status-banner" style={{ background: emotionBg, color: emotionColor, fontSize: '1.2rem' }}>{emotionText}</div>
        </div>
      </div>

      <audio ref={audioLawan} src="https://cdn.ranzzawok.my.id/media/music/med_6cae0737736f3f08.mp3" loop></audio>
      <audio ref={audioBlur} src="https://cdn.ranzzawok.my.id/media/music/med_8b7250a727afaac0.mp3" loop></audio>
      <audio ref={audioTelunjuk} src="https://cdn.ranzzawok.my.id/media/music/med_cf4dd8e9f4f15298.mp3" loop></audio>
      <audio ref={audioCemberut} src="https://cdn.ranzzawok.my.id/media/music/med_c080885d7aa2ab64.mp3" loop></audio>
      <audio ref={audioTutupMulut} src="https://cdn.ranzzawok.my.id/media/music/med_a32f55f242434b67.mp3" loop></audio>
      <audio ref={audioNgangap} src="https://cdn.ranzzawok.my.id/media/music/med_925f4b301de666b6.mp3" loop></audio>
    </div>
  );
}
