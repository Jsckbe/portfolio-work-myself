/* =========================================================
   pragz.io — script.js
   1. Tema (lima ⇄ naranja)
   2. Menú móvil
   3. Efecto de escritura del título
   4. Avatar del hero
        · Escritorio → el mouse controla el currentTime del video
        · Móvil      → bucle "ping-pong" automático
   5. Copiar correo
========================================================= */
'use strict';


/* =========================================================
   1. TEMA
   El tema guardado ya se aplicó en el <head> (antes del primer render);
   aquí solo se sincronizan el aria-label, el <meta theme-color> y el clic.
========================================================= */
(() => {
    const root = document.documentElement;
    const toggle = document.getElementById('theme-toggle');
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    const STORAGE_KEY = 'pragz-theme';
    const THEME_COLORS = { lime: '#AAB12D', orange: '#f65a00' };

    const currentTheme = () => (root.dataset.theme === 'orange' ? 'orange' : 'lime');

    function applyTheme(theme, persist = false) {
        if (theme === 'orange') root.dataset.theme = 'orange';
        else delete root.dataset.theme; // lima = tema por defecto, sin atributo

        metaThemeColor?.setAttribute('content', THEME_COLORS[theme]);
        toggle.setAttribute('aria-label', theme === 'lime' ? 'Cambiar a tema naranja' : 'Cambiar a tema lima');

        if (!persist) return;
        try {
            localStorage.setItem(STORAGE_KEY, theme);
        } catch (error) {
            /* Almacenamiento bloqueado (modo privado): el tema solo dura esta visita */
        }
    }

    applyTheme(currentTheme());
    toggle.addEventListener('click', () => applyTheme(currentTheme() === 'lime' ? 'orange' : 'lime', true));
})();


/* =========================================================
   2. MENÚ MÓVIL
   La animación (fade + slide) vive en el CSS; aquí solo se alterna el estado.
========================================================= */
(() => {
    const root = document.documentElement;
    const menuButton = document.getElementById('menu-btn');
    const navigation = document.getElementById('nav-links');
    const mobileQuery = window.matchMedia('(max-width: 767px)');

    function setMenu(open) {
        navigation.classList.toggle('active', open);
        root.classList.toggle('menu-open', open); // Bloquea el scroll y pasa el header a colores claros
        menuButton.setAttribute('aria-expanded', String(open));
        menuButton.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
    }

    const isOpen = () => navigation.classList.contains('active');

    menuButton.addEventListener('click', () => setMenu(!isOpen()));

    // Cierra al elegir un enlace
    navigation.addEventListener('click', (event) => {
        if (event.target.closest('a')) setMenu(false);
    });

    // Cierra con Escape y devuelve el foco al botón
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && isOpen()) {
            setMenu(false);
            menuButton.focus();
        }
    });

    // Si se agranda la ventana a escritorio con el menú abierto, se limpia el estado
    mobileQuery.addEventListener('change', (event) => {
        if (!event.matches) setMenu(false);
    });
})();


/* =========================================================
   3. EFECTO DE ESCRITURA DEL TÍTULO
========================================================= */
(() => {
    const textToType = 'Webs que traen clientes, no solo visitas. ¿Qué construimos hoy?';
    const typewriter = document.getElementById('typewriter-text');
    const cursor = document.getElementById('cursor');
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let typedCharacters = 0;

    function typeNextCharacter() {
        if (typedCharacters >= textToType.length) return;

        typewriter.insertBefore(document.createTextNode(textToType.charAt(typedCharacters)), cursor);
        typedCharacters += 1;
        setTimeout(typeNextCharacter, Math.random() * 50 + 30);
    }

    if (prefersReducedMotion) {
        typewriter.insertBefore(document.createTextNode(textToType), cursor);
    } else {
        setTimeout(typeNextCharacter, 500);
    }
})();


/* =========================================================
   4. AVATAR DEL HERO
   ---------------------------------------------------------
   Línea de tiempo del video (beast-video-hero1_alpha[_lite].webm, 10 s, 30 fps):
       0.0 – 1.0 s   mira al frente
       1.0 – 3.5 s   gira la cabeza a la izquierda   ← rango que sigue al mouse
       3.5 – 10 s    se marea y termina inclinado    ← solo se ve en el ping-pong móvil
   Para que buscar cuadros (currentTime) hacia adelante y hacia atrás sea fluido, el video
   debe ser liviano de decodificar: por eso se usa la versión _lite (recortada, sin audio,
   keyframe cada 4 cuadros). Ver README para regenerarla con ffmpeg.
========================================================= */
(() => {
    /* ----- Configuración: toca solo estos valores para afinar el comportamiento ----- */
    const CONFIG = {
        fps: 30,

        desktop: {
            trackStart: 1.0,   // Segundo del video con el personaje mirando al frente (mouse centrado)
            trackEnd: 3.5,     // Segundo con la cabeza girada al máximo (mouse en el borde)
            smoothingMs: 160   // Inercia del seguimiento: más alto = movimiento más suave/lento
        },

        mobile: {
            initialDelayMs: 700,   // Espera antes del primer ciclo
            pauseMs: 3500,         // Pausa mirando al frente entre ciclos (3–4 s)
            forwardRate: 1,        // Velocidad de ida (1 = normal)
            reverseRate: 1,        // Velocidad de la reversa (1 = misma que la ida)
            alternateSides: true   // true: un ciclo mira a la izquierda y el siguiente a la derecha (espejo)
        }
    };

    const avatar = document.getElementById('cat-avatar');
    const video = document.getElementById('cat-video');
    const hero = document.querySelector('.hero');
    if (!avatar || !video || !hero) return;

    const { fps, desktop, mobile } = CONFIG;
    const mobileQuery = window.matchMedia('(max-width: 767px)');
    const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

    let isMobile = mobileQuery.matches;
    let videoReady = false;
    let isMirrored = false;
    let heroVisible = true;

    const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
    const snapToFrame = (time) => Math.round(time * fps) / fps;

    /** Voltea el video horizontalmente (mirar a la derecha). Solo toca el DOM si cambia. */
    function setMirrored(mirrored) {
        if (mirrored === isMirrored) return;
        isMirrored = mirrored;
        avatar.classList.toggle('is-video-mirrored', mirrored);
    }

    /** Mueve el video a `time` y resuelve cuando el cuadro ya está decodificado. */
    function seekTo(time) {
        return new Promise((resolve) => {
            if (!video.seeking && Math.abs(video.currentTime - time) < 0.001) return resolve();

            const finish = () => {
                clearTimeout(safetyTimer);
                video.removeEventListener('seeked', finish);
                resolve();
            };
            const safetyTimer = setTimeout(finish, 500); // Por si 'seeked' nunca llega
            video.addEventListener('seeked', finish);
            video.currentTime = time;
        });
    }


    /* ---------------------------------------------------------
       4.1 ESCRITORIO — el mouse controla el currentTime
       gaze: -1 (mouse a la izquierda) … 0 (sobre el avatar) … 1 (derecha)
       El video solo sabe girar a la izquierda; a la derecha se usa el espejo.
    --------------------------------------------------------- */
    let targetGaze = 0;
    let currentGaze = 0;
    let gazeFrameId = null;
    let previousTimestamp = null;
    let targetTime = desktop.trackStart;
    let activeTouchPointerId = null;
    let bounds = { centerX: 0, leftSpace: 1, rightSpace: 1 };

    /** Cachea las medidas para no forzar un layout en cada pointermove. */
    function measure() {
        const avatarRect = avatar.getBoundingClientRect();
        const heroRect = hero.getBoundingClientRect();
        const centerX = avatarRect.left + avatarRect.width / 2;

        bounds = {
            centerX,
            leftSpace: Math.max(1, centerX - heroRect.left),
            rightSpace: Math.max(1, heroRect.right - centerX)
        };
    }

    /** Pide al video el cuadro objetivo, sin acumular seeks pendientes. */
    function applyTargetTime() {
        if (video.seeking) return; // El listener de 'seeked' reintenta con el valor más reciente
        if (Math.abs(video.currentTime - targetTime) < 0.5 / fps) return; // Ya estamos en ese cuadro
        video.currentTime = targetTime;
    }

    video.addEventListener('seeked', () => {
        if (!isMobile && videoReady) applyTargetTime();
    });

    function updateVideoFromGaze(gaze) {
        const range = desktop.trackEnd - desktop.trackStart;
        targetTime = snapToFrame(desktop.trackStart + Math.abs(gaze) * range);
        setMirrored(gaze > 0.015);
        applyTargetTime();
    }

    function animateGaze(timestamp) {
        const distance = targetGaze - currentGaze;

        // Llegó al destino: fija el último cuadro y detiene el bucle (no gasta CPU en reposo)
        if (Math.abs(distance) < 0.001) {
            currentGaze = targetGaze;
            updateVideoFromGaze(currentGaze);
            gazeFrameId = null;
            previousTimestamp = null;
            return;
        }

        const elapsed = previousTimestamp === null ? 16.67 : Math.min(timestamp - previousTimestamp, 64);
        // Suavizado exponencial independiente de los FPS de la pantalla
        const smoothing = reducedMotionQuery.matches ? 1 : 1 - Math.exp(-elapsed / desktop.smoothingMs);

        currentGaze += distance * smoothing;
        previousTimestamp = timestamp;
        updateVideoFromGaze(currentGaze);
        gazeFrameId = requestAnimationFrame(animateGaze);
    }

    function requestGazeFrame() {
        if (gazeFrameId === null) gazeFrameId = requestAnimationFrame(animateGaze);
    }

    /** Convierte la posición X del puntero en un valor entre -1 y 1. */
    function lookToward(clientX) {
        const distance = clientX - bounds.centerX;
        const availableWidth = distance < 0 ? bounds.leftSpace : bounds.rightSpace;

        targetGaze = clamp(distance / availableWidth, -1, 1);
        requestGazeFrame();
    }

    window.addEventListener('pointermove', (event) => {
        if (isMobile) return;

        const isMouse = event.pointerType === 'mouse';
        const isActiveTouch = event.pointerType === 'touch' && event.pointerId === activeTouchPointerId;
        if (isMouse || isActiveTouch) lookToward(event.clientX);
    });

    // Tabletas ≥ 768 px: el arrastre con el dedo también mueve la mirada
    window.addEventListener('pointerdown', (event) => {
        if (isMobile || event.pointerType !== 'touch' || event.target.closest('a, button')) return;

        activeTouchPointerId = event.pointerId;
        lookToward(event.clientX);
    });

    function releaseTouch(event) {
        if (event.pointerId === activeTouchPointerId) activeTouchPointerId = null;
    }

    window.addEventListener('pointerup', releaseTouch);
    window.addEventListener('pointercancel', releaseTouch);

    // Cuando el mouse sale de la ventana, el personaje vuelve a mirar al frente
    document.documentElement.addEventListener('mouseleave', () => {
        if (isMobile) return;
        targetGaze = 0;
        requestGazeFrame();
    });


    /* ---------------------------------------------------------
       4.2 MÓVIL — bucle ping-pong
       pausa mirando al frente → ida (reproducción nativa) → reversa → pausa → …

       `video.playbackRate` negativo no es fiable entre navegadores, así que la
       reversa se hace "a mano": un reloj basado en requestAnimationFrame que
       mueve currentTime hacia atrás. Si el decodificador va más lento que la
       pantalla, se salta cuadros pero el tiempo transcurrido sigue siendo real,
       por lo que la velocidad nunca se distorsiona.

       Cancelación: cada ejecución del bucle lleva un `token`; al cambiar
       loopToken, todas las esperas pendientes se resuelven en `false` y el
       bucle termina solo.
    --------------------------------------------------------- */
    let loopToken = 0;
    let loopRunning = false;

    /** Espera `ms`; resuelve true si el bucle sigue vigente. */
    const wait = (ms, token) => new Promise((resolve) => setTimeout(() => resolve(token === loopToken), ms));

    /** Recorre el video de `from` a `to` buscando cuadros al ritmo de `rate`. */
    function scrub(from, to, rate, token) {
        return new Promise((resolve) => {
            const direction = Math.sign(to - from);
            let startTimestamp = null;

            const step = (now) => {
                if (token !== loopToken) return resolve(false);
                if (startTimestamp === null) startTimestamp = now;

                const time = from + direction * rate * ((now - startTimestamp) / 1000);
                const finished = direction > 0 ? time >= to : time <= to;

                if (finished) {
                    seekTo(to).then(() => resolve(token === loopToken));
                    return;
                }

                if (!video.seeking) video.currentTime = time; // Si aún hay un seek en curso, se salta este cuadro
                requestAnimationFrame(step);
            };

            requestAnimationFrame(step);
        });
    }

    /** Ida: reproducción nativa (la más suave). Si el navegador bloquea el autoplay, avanza "a mano". */
    async function playForward(token) {
        video.playbackRate = mobile.forwardRate;

        try {
            await video.play();
        } catch (error) {
            // Autoplay bloqueado (p. ej. ahorro de batería en iOS): mismo recorrido, pero con seeks
            return scrub(video.currentTime, video.duration, mobile.forwardRate, token);
        }

        if (token !== loopToken) {
            if (!loopRunning) video.pause(); // play() se resolvió tarde, después de cancelar el bucle
            return false;
        }

        return new Promise((resolve) => {
            const poll = () => {
                if (token !== loopToken) return resolve(false);

                if (video.ended || video.currentTime >= video.duration - 1 / fps) {
                    video.pause();
                    return resolve(true);
                }
                requestAnimationFrame(poll);
            };
            poll();
        });
    }

    async function mobileLoop(token) {
        let isFirstCycle = true;

        while (token === loopToken) {
            await seekTo(0); // Pose inicial: mirando al frente

            // En ciclos alternos se refleja el video: la pausa oculta el cambio
            if (mobile.alternateSides && !isFirstCycle) setMirrored(!isMirrored);

            const delay = isFirstCycle ? mobile.initialDelayMs : mobile.pauseMs;
            if (!(await wait(delay, token))) return;
            isFirstCycle = false;

            if (!(await playForward(token))) return;                                    // →  ida
            if (!(await scrub(video.currentTime, 0, mobile.reverseRate, token))) return; // ←  reversa
        }
    }

    function startMobileLoop() {
        if (loopRunning) return;

        loopRunning = true;
        const token = ++loopToken;
        mobileLoop(token).finally(() => {
            if (token === loopToken) loopRunning = false;
        });
    }

    function stopMobileLoop() {
        loopToken += 1; // Invalida cualquier espera pendiente
        loopRunning = false;
        video.pause();
    }

    /** Solo anima cuando se ve: móvil + video listo + hero en pantalla + pestaña visible + sin "reducir movimiento". */
    function syncMobileLoop() {
        const shouldRun = videoReady && isMobile && heroVisible && !document.hidden && !reducedMotionQuery.matches;

        if (shouldRun) startMobileLoop();
        else if (loopRunning) stopMobileLoop();
    }

    new IntersectionObserver(([entry]) => {
        heroVisible = entry.isIntersecting;
        syncMobileLoop();
    }, { threshold: 0.05 }).observe(hero);

    document.addEventListener('visibilitychange', syncMobileLoop);


    /* ---------------------------------------------------------
       4.3 MODO (móvil ⇄ escritorio) y carga del video
    --------------------------------------------------------- */
    async function syncMode() {
        if (!videoReady) return;

        // Reinicio limpio del modo anterior
        stopMobileLoop();
        cancelAnimationFrame(gazeFrameId);
        gazeFrameId = null;
        previousTimestamp = null;
        activeTouchPointerId = null;
        targetGaze = 0;
        currentGaze = 0;
        setMirrored(false);

        if (isMobile) {
            await seekTo(0);
            syncMobileLoop(); // Con "reducir movimiento" se queda en el primer cuadro
        } else {
            targetTime = desktop.trackStart;
            await seekTo(desktop.trackStart);
        }
    }

    async function onVideoReady() {
        if (videoReady) return;
        if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA || !(video.duration > 0)) return;

        videoReady = true;
        video.pause();

        // El tamaño del avatar sale de la proporción real del video (ver .cat-avatar en el CSS)
        if (video.videoWidth && video.videoHeight) {
            avatar.style.setProperty('--avatar-ratio', `${video.videoWidth} / ${video.videoHeight}`);
        }
        measure();
        await syncMode();
        avatar.classList.add('has-video'); // Fade-in cuando el primer cuadro ya está listo
    }

    video.addEventListener('loadedmetadata', onVideoReady);
    video.addEventListener('loadeddata', onVideoReady);
    video.addEventListener('canplay', onVideoReady);

    // 'error' no burbujea desde <source>; se captura para detectar "ningún formato compatible"
    video.addEventListener('error', () => {
        if (video.networkState !== HTMLMediaElement.NETWORK_NO_SOURCE) return;
        stopMobileLoop();
        avatar.classList.remove('has-video');
        console.error('No se pudo cargar el video del avatar (beast-video-hero1_alpha.webm).');
    }, true);

    mobileQuery.addEventListener('change', (event) => {
        isMobile = event.matches;
        measure();
        syncMode();
    });

    reducedMotionQuery.addEventListener('change', syncMode);

    new ResizeObserver(measure).observe(hero);
    window.addEventListener('load', measure); // Las fuentes pueden cambiar el layout al terminar de cargar

    // El archivo puede estar en caché antes de registrar los eventos
    onVideoReady();
})();


/* =========================================================
   5. COPIAR CORREO
========================================================= */
(() => {
    const copyButton = document.getElementById('copy-email');
    const EMAIL = 'hello@pragz.io';
    let resetTimer = null;

    /** Respaldo para contextos sin Clipboard API (p. ej. abrir el archivo con file://). */
    function legacyCopy(text) {
        const field = document.createElement('textarea');
        field.value = text;
        field.setAttribute('readonly', '');
        field.style.cssText = 'position:fixed;opacity:0;pointer-events:none';
        document.body.appendChild(field);
        field.select();
        const succeeded = document.execCommand('copy');
        field.remove();
        if (!succeeded) throw new Error('execCommand(copy) falló');
    }

    copyButton.addEventListener('click', async () => {
        if (resetTimer !== null) return; // Ya está mostrando el mensaje de confirmación

        const originalContent = copyButton.innerHTML;

        try {
            if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(EMAIL);
            else legacyCopy(EMAIL);

            copyButton.textContent = '¡Copiado! ✓';
            copyButton.classList.add('is-copied');
        } catch (error) {
            copyButton.textContent = 'No se pudo copiar';
            console.error('No se pudo copiar el correo al portapapeles:', error);
        }

        resetTimer = setTimeout(() => {
            copyButton.innerHTML = originalContent;
            copyButton.classList.remove('is-copied');
            resetTimer = null;
        }, 2000);
    });
})();
