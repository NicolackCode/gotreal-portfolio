// js/project.js - Version V1 Corrigée (F5 & Barba proof)

document.addEventListener("DOMContentLoaded", () => window.deployProject());

window.deployProject = async function(data) {
    const urlParams = new URLSearchParams(window.location.search);
    const projectId = urlParams.get('id');
    if (!projectId) return;

    try {
        let projects = data || window.allProjects;
        if (!projects) {
            const response = await fetch('/data/projects.json');
            projects = await response.json();
            window.allProjects = projects;
        }

        // 1. MATCHING INTELLIGENT (Fixe le bug du F5)
        // On cherche soit l'ID exact, soit un ID qui contient le nom (ex: Crystal_Chardonnay)
        const cleanSearch = projectId.toLowerCase().replace(/\[.*?\]_?/, '');
        const project = projects.find(p => 
            p.id === projectId || 
            p.id.toLowerCase().includes(cleanSearch)
        );

        if (!project) {
            console.error("Projet non trouvé :", projectId);
            // On montre quand même la page pour éviter l'écran noir
            if (typeof gsap !== 'undefined') gsap.to(".project-container", { opacity: 1 });
            return;
        }

        // 2. INJECTION DES TEXTES SÉCURISÉE
        const cleanTitle = project.displayTitle || project.id.replace(/\[.*?\]_?/, '').replace(/_/g, ' ');
        document.getElementById('title-current').textContent = cleanTitle;
        document.getElementById('role-main').textContent = project.category || "DIRECTOR";
        document.getElementById('pt-synopsis').textContent = project.synopsis || "Aucune description disponible.";

        // Sécurité Crédits : on vérifie si c'est du texte avant le replace
        const creditsEl = document.getElementById('project-credits-list');
        if (creditsEl) {
            if (typeof project.credits === 'string') {
                creditsEl.innerHTML = project.credits.replace(/\n/g, '<br>');
            } else {
                creditsEl.innerHTML = "-";
            }
        }

        // 3. INJECTION DE LA VIDÉO
        const videoElement = document.getElementById('video-current');
        const baseGCS = "https://storage.googleapis.com/gotreal-assets-paris"; 
        
        if (videoElement) {
            videoElement.crossOrigin = "anonymous";
            // On s'assure que l'URL est propre
            const category = project.category || "Commercials";
            videoElement.src = `${baseGCS}/assets/videos/${encodeURIComponent(category)}/${encodeURIComponent(project.id)}.mp4`;
            videoElement.load();
            
            // On force le play après un petit délai
            setTimeout(() => {
                videoElement.play().catch(() => {
                    document.addEventListener('click', () => videoElement.play(), { once: true });
                });
            }, 200);
        }

        // 4. ON LÈVE LE RIDEAU (C'est ça qui manquait !)
        if (typeof gsap !== 'undefined') {
            gsap.to(".project-container", { opacity: 1, duration: 0.8, ease: "power2.out" });
        }

        if (typeof window.initAmbilight === 'function') window.initAmbilight();

    } catch (error) {
        console.error("Erreur de chargement du projet :", error);
        if (typeof gsap !== 'undefined') gsap.to(".project-container", { opacity: 1 });
    }
};

    // === 2. LOGIQUE DU LECTEUR VIDÉO CUSTOM ===
    const video = document.getElementById('video-current');
    const btnPause = document.getElementById('btn-pause');
    const btnSound = document.getElementById('btn-sound');
    const volumeSlider = document.getElementById('volume-immersive');
    const btnFullscreen = document.getElementById('btn-fullscreen');
    const timeline = document.getElementById('timeline');
    const timelineProgress = document.getElementById('timeline-progress');
    const videoWrapper = document.getElementById('main-video-wrapper');

    if (!video) return;

    // Play / Pause
    btnPause.addEventListener('click', () => {
        if (video.paused) {
            video.play();
            btnPause.textContent = "PAUSE";
        } else {
            video.pause();
            btnPause.textContent = "PLAY";
        }
    });

    // Mute / Unmute
    btnSound.addEventListener('click', () => {
        video.muted = !video.muted;
        btnSound.textContent = video.muted ? "SON: OFF" : "SON: ON";
        if (!video.muted && video.volume === 0) {
            video.volume = 1;
            volumeSlider.value = 1;
        }
    });

    // Volume Slider
    volumeSlider.addEventListener('input', (e) => {
        video.volume = e.target.value;
        if (video.volume > 0) {
            video.muted = false;
            btnSound.textContent = "SON: ON";
        } else {
            video.muted = true;
            btnSound.textContent = "SON: OFF";
        }
    });

    // Timeline Update (Progression)
    video.addEventListener('timeupdate', () => {
        if (!video.duration) return;
        const progress = (video.currentTime / video.duration) * 100;
        timelineProgress.style.width = `${progress}%`;
    });

    // Clic sur la Timeline pour naviguer
    timeline.addEventListener('click', (e) => {
        const rect = timeline.getBoundingClientRect();
        const clickPos = (e.clientX - rect.left) / rect.width;
        video.currentTime = clickPos * video.duration;
    });

    // Fullscreen API
    btnFullscreen.addEventListener('click', () => {
        if (!document.fullscreenElement) {
            if (videoWrapper.requestFullscreen) {
                videoWrapper.requestFullscreen();
            } else if (videoWrapper.webkitRequestFullscreen) { /* Safari */
                videoWrapper.webkitRequestFullscreen();
            }
            btnFullscreen.textContent = "QUITTER";
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            }
            btnFullscreen.textContent = "PLEIN ECRAN";
        }
    });
