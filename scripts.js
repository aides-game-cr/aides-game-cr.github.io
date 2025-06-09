
import { Game } from './game.js';

document.addEventListener('DOMContentLoaded', function() {
    //----------------------------------------------------
    // KHỞI TẠO CÁC THƯ VIỆN VÀ BIẾN
    //----------------------------------------------------
    AOS.init({
        duration: 1000,
        once: true,
        offset: 150,
        easing: 'ease-out-cubic'
    });
    
    //----------------------------------------------------
    // HIỆU ỨNG CON TRỎ CHUỘT TÙY CHỈNH
    //----------------------------------------------------
    let cursor = document.createElement('div');
    cursor.className = 'custom-cursor';
    document.body.appendChild(cursor);

    document.addEventListener('mousemove', function(e) {
        cursor.style.left = e.clientX + 'px';
        cursor.style.top = e.clientY + 'px';
    });

    const interactiveElements = document.querySelectorAll('.logo-heading, .social-icon, .social-button, .coming-soon-container');
    interactiveElements.forEach(el => {
        el.addEventListener('mouseenter', () => cursor.classList.add('hover'));
        el.addEventListener('mouseleave', () => cursor.classList.remove('hover'));
    });

    //----------------------------------------------------
    // COUNTDOWN TIMER
    //----------------------------------------------------
    //----------------------------------------------------
// ENHANCED COUNTDOWN TIMER WITH ANIMATIONS
//----------------------------------------------------
function startCountdown() {
    const launchDate = new Date('2025-12-31T00:00:00').getTime();
    const daysEl = document.getElementById('days');
    const hoursEl = document.getElementById('hours');
    const minutesEl = document.getElementById('minutes');
    const secondsEl = document.getElementById('seconds');
    const countdownContainer = document.querySelector('.countdown-container');

    // Lưu giá trị cũ để detect thay đổi
    let previousValues = {
        days: '',
        hours: '',
        minutes: '',
        seconds: ''
    };

    // Hàm thêm hiệu ứng khi số thay đổi
    function animateNumberChange(element, newValue, oldValue) {
        if (newValue !== oldValue && element) {
            element.classList.add('changing');
            
            // Tạo hiệu ứng số bay lên
            const flyingNumber = document.createElement('span');
            flyingNumber.textContent = oldValue;
            flyingNumber.style.cssText = `
                position: absolute;
                top: 0;
                left: 50%;
                transform: translateX(-50%);
                color: #00cc66;
                font-size: inherit;
                font-weight: inherit;
                pointer-events: none;
                z-index: 10;
                animation: numberFlyUp 0.6s ease-out forwards;
            `;
            
            element.parentElement.style.position = 'relative';
            element.parentElement.appendChild(flyingNumber);
            
            // Xóa hiệu ứng sau khi hoàn thành
            setTimeout(() => {
                element.classList.remove('changing');
                if (flyingNumber.parentElement) {
                    flyingNumber.parentElement.removeChild(flyingNumber);
                }
            }, 600);
        }
    }

    // Hàm tạo particles khi số thay đổi
    function createParticles(element) {
        const rect = element.getBoundingClientRect();
        const particles = [];
        for (let i = 0; i < 6; i++) {
            const particle = document.createElement('div');
            particle.style.cssText = `
                position: fixed;
                width: 4px;
                height: 4px;
                background: #00cc66;
                border-radius: 50%;
                pointer-events: none;
                z-index: 1000;
                left: ${rect.left + rect.width / 2}px;
                top: ${rect.top + rect.height / 2}px;
                animation: particleExplosion 0.8s ease-out forwards;
                animation-delay: ${i * 0.1}s;
            `;
            document.body.appendChild(particle);
            particles.push(particle);
            particle.addEventListener('animationend', () => {
                if (particle.parentElement) {
                    particle.parentElement.removeChild(particle);
                }
            });
        }
    }

    function updateCountdown() {
        const now = new Date().getTime();
        const distance = launchDate - now;

        if (distance < 0) {
            // Countdown finished
            daysEl.textContent = '00';
            hoursEl.textContent = '00';
            minutesEl.textContent = '00';
            secondsEl.textContent = '00';
            
            // Thêm hiệu ứng hoàn thành
            countdownContainer.classList.add('countdown-finished');
            return;
        }

        const days = Math.floor(distance / (1000 * 60 * 60 * 24));
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);

        const newValues = {
            days: days.toString().padStart(2, '0'),
            hours: hours.toString().padStart(2, '0'),
            minutes: minutes.toString().padStart(2, '0'),
            seconds: seconds.toString().padStart(2, '0')
        };

        // Animate changes và update display
        if (daysEl) {
            animateNumberChange(daysEl, newValues.days, previousValues.days);
            if (newValues.days !== previousValues.days && previousValues.days !== '') {
                createParticles(daysEl);
            }
            daysEl.textContent = newValues.days;
        }

        if (hoursEl) {
            animateNumberChange(hoursEl, newValues.hours, previousValues.hours);
            if (newValues.hours !== previousValues.hours && previousValues.hours !== '') {
                createParticles(hoursEl);
            }
            hoursEl.textContent = newValues.hours;
        }

        if (minutesEl) {
            animateNumberChange(minutesEl, newValues.minutes, previousValues.minutes);
            if (newValues.minutes !== previousValues.minutes && previousValues.minutes !== '') {
                createParticles(minutesEl);
            }
            minutesEl.textContent = newValues.minutes;
        }

        if (secondsEl) {
            animateNumberChange(secondsEl, newValues.seconds, previousValues.seconds);
            secondsEl.textContent = newValues.seconds;
        }

        // Thêm hiệu ứng urgent khi còn ít thời gian
        if (days < 7) {
            countdownContainer.classList.add('countdown-urgent');
        }

        // Lưu giá trị cũ
        previousValues = newValues;
    }

    updateCountdown();
    setInterval(updateCountdown, 1000);
}

    // Thêm CSS cho animations mới
    const additionalStyles = `
        @keyframes numberFlyUp {
            0% {
                transform: translateX(-50%) translateY(0) scale(1);
                opacity: 1;
            }
            100% {
                transform: translateX(-50%) translateY(-30px) scale(0.5);
                opacity: 0;
            }
        }

        @keyframes particleExplosion {
            0% {
                transform: translate(0, 0) scale(1);
                opacity: 1;
            }
            100% {
                transform: translate(${Math.random() * 60 - 30}px, ${Math.random() * 60 - 30}px) scale(0);
                opacity: 0;
            }
        }

        .countdown-finished .countdown-item {
            animation: 
                countdownPulse 3s ease-in-out infinite,
                celebrationPulse 1s ease-in-out infinite;
            border-color: #00ff00;
            box-shadow: 0 0 20px rgba(0, 255, 0, 0.5);
        }

        .countdown-finished .countdown-number {
            background: linear-gradient(45deg, #00ff00, #00ff88, #00ff00);
            background-size: 200% 200%;
            background-clip: text;
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }

        @keyframes celebrationPulse {
            0%, 100% {
                transform: scale(1);
            }
            50% {
                transform: scale(1.05);
            }
        }
    `;

    // Thêm styles vào head
    const styleSheet = document.createElement('style');
    styleSheet.textContent = additionalStyles;
    document.head.appendChild(styleSheet);

    //----------------------------------------------------
    // THÊM INTERACTIVE HOVER EFFECTS
    //----------------------------------------------------
    function addCountdownInteractivity() {
        const countdownItems = document.querySelectorAll('.countdown-item');
        
        countdownItems.forEach((item, index) => {
            // Mouse enter effect
            item.addEventListener('mouseenter', function() {
                this.style.animationDelay = `${index * 0.1}s`;
                this.style.transform = 'translateY(-5px) scale(1.08)';
                
                // Tạo ring effect
                const ring = document.createElement('div');
                ring.style.cssText = `
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    width: 0;
                    height: 0;
                    border: 2px solid #00cc66;
                    border-radius: 50%;
                    pointer-events: none;
                    transform: translate(-50%, -50%);
                    animation: ringExpand 0.6s ease-out forwards;
                `;
                
                this.appendChild(ring);
                
                setTimeout(() => {
                    if (ring.parentElement) {
                        ring.parentElement.removeChild(ring);
                    }
                }, 600);
            });

            // Mouse leave effect
            item.addEventListener('mouseleave', function() {
                this.style.transform = '';
            });

            // Click effect
            item.addEventListener('click', function() {
                // Tạo ripple effect
                const ripple = document.createElement('div');
                const rect = this.getBoundingClientRect();
                const size = Math.max(rect.width, rect.height);
                
                ripple.style.cssText = `
                    position: absolute;
                    width: ${size}px;
                    height: ${size}px;
                    background: rgba(0, 204, 102, 0.3);
                    border-radius: 50%;
                    pointer-events: none;
                    transform: translate(-50%, -50%) scale(0);
                    left: 50%;
                    top: 50%;
                    animation: rippleEffect 0.8s ease-out forwards;
                `;
                
                this.appendChild(ripple);
                
                setTimeout(() => {
                    if (ripple.parentElement) {
                        ripple.parentElement.removeChild(ripple);
                    }
                }, 800);
            });
        });
    }

    // CSS cho ring và ripple effects
    const interactiveStyles = `
        @keyframes ringExpand {
            0% {
                width: 0;
                height: 0;
                opacity: 1;
            }
            100% {
                width: 120%;
                height: 120%;
                opacity: 0;
            }
        }

        @keyframes rippleEffect {
            0% {
                transform: translate(-50%, -50%) scale(0);
                opacity: 1;
            }
            100% {
                transform: translate(-50%, -50%) scale(1);
                opacity: 0;
            }
        }
    `;

    const interactiveStyleSheet = document.createElement('style');
    interactiveStyleSheet.textContent = interactiveStyles;
    document.head.appendChild(interactiveStyleSheet);

    // Khởi tạo tất cả các hiệu ứng
    document.addEventListener('DOMContentLoaded', function() {
        setTimeout(() => {
            addCountdownInteractivity();
        }, 1000);
    });

        startCountdown();

        //----------------------------------------------------
        // ENHANCED MATRIX RAIN EFFECT
        //----------------------------------------------------
        function createMatrixRain() {
            const canvas = document.createElement('canvas');
            canvas.style.position = 'fixed';
            canvas.style.top = '0';
            canvas.style.left = '0';
            canvas.style.zIndex = '-2';
            canvas.style.opacity = '0.4';
            document.body.appendChild(canvas);

            const ctx = canvas.getContext('2d');
            canvas.height = window.innerHeight;
            canvas.width = window.innerWidth;

            const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%^&*()_+-=[]{}|;:,.<>?AIDES';
            const fontSize = 14;
            const columns = canvas.width / fontSize;
            const drops = [];

            for (let x = 0; x < columns; x++) {
                drops[x] = Math.random() * canvas.height / fontSize;
            }

            function draw() {
                ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
                ctx.fillRect(0, 0, canvas.width, canvas.height);

                ctx.fillStyle = '#00cc66';
                ctx.font = `${fontSize}px monospace`;
                ctx.textAlign = 'center';

                for (let i = 0; i < drops.length; i++) {
                    const text = chars.charAt(Math.floor(Math.random() * chars.length));
                    const x = i * fontSize;
                    const y = drops[i] * fontSize;

                    const alpha = Math.random() * 0.5 + 0.2;
                    ctx.fillStyle = `rgba(0, 204, 102, ${alpha})`;

                    ctx.fillText(text, x, y);

                    if (y > canvas.height && Math.random() > 0.975) {
                        drops[i] = 0;
                    }

                    drops[i]++;
                }
            }

            setInterval(draw, 35);

            window.addEventListener('resize', () => {
                canvas.height = window.innerHeight;
                canvas.width = window.innerWidth;
            });
        }

        createMatrixRain();

    //----------------------------------------------------
    // DYNAMIC MATRIX TEXT GENERATION (LOADING ANIMATION)
    //----------------------------------------------------
    function generateMatrixText() {
        const matrixTexts = [
            'INITIALIZING...',
            'LOADING GAME...',
            'CONNECTING...',
            'SYSTEM READY',
            'WELCOME TO AIDES'
        ];

        const matrixItem = document.querySelector('.matrix-item');
        let currentIndex = 0;
        let isStopped = false;

        function updateMatrixText() {
            if (!isStopped && currentIndex < matrixTexts.length && matrixItem) {
                matrixItem.innerHTML = `<span class="matrix-text">${matrixTexts[currentIndex]}</span>`;
                currentIndex++;
                if (currentIndex === matrixTexts.length) {
                    isStopped = true;
                }
            }
        }

        updateMatrixText();
        const interval = setInterval(updateMatrixText, 1000);
        setTimeout(() => clearInterval(interval), matrixTexts.length * 1000);
    }

    setTimeout(generateMatrixText, 2000);

    //----------------------------------------------------
    // LOADER HANDLING
    //----------------------------------------------------
    window.addEventListener('load', () => {
        const loader = document.querySelector('.loader');
        if (loader) {
            loader.classList.add('hidden');
            setTimeout(() => loader.remove(), 500);
        }
    });
    //----------------------------------------------------
// [QUAN TRỌNG] LOGIC ĐIỀU KHIỂN GAME
//----------------------------------------------------
    const gameContainer = document.getElementById('game-container');
    if (gameContainer) {
        console.log("Game container found. Initializing AIDES...");

        // 1. Tạo ra cỗ máy game
        const aidesGame = new Game(gameContainer);
        aidesGame.initGame(); // Chỉ chuẩn bị scene, models... game chưa chạy

        // 2. Lấy các phần tử giao diện
        const startButton = document.getElementById('start-button');
        const startScreen = document.getElementById('start-screen');
        const restartButton = document.getElementById('restart-button');
        const fullscreenButton = document.getElementById('fullscreen-btn');
        const downloadButton = document.getElementById('download-log-btn');

        // 3. Gán sự kiện cho nút "Start"
        if (startButton && startScreen) {
            startButton.addEventListener('click', () => {
                console.log("Start button clicked. Starting game...");
                startScreen.style.opacity = '0';
                setTimeout(() => {
                    startScreen.style.display = 'none';
                }, 500);

                aidesGame.resetGame(); // Ra lệnh cho cỗ máy bắt đầu
            });
        }

        // 4. Gán sự kiện cho nút "Restart"
        if (restartButton) {
            restartButton.addEventListener('click', () => {
                console.log("Restart button clicked. Resetting game...");
                aidesGame.resetGame(); // Ra lệnh cho cỗ máy bắt đầu lại
            });
        }

        // 5. Thêm Joystick cho Mobile
        if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
            const joystickContainer = document.getElementById('joystick-container');
            if (joystickContainer) {
                const joystickOptions = {
                    zone: joystickContainer,
                    mode: 'static',
                    position: { left: '50%', top: '50%' },
                    color: 'white',
                    size: 100
                };
                const manager = nipplejs.create(joystickOptions);

                manager.on('move', (evt, data) => {
                    if (data.vector) {
                        aidesGame.joystickDirection.set(data.vector.x, 0, -data.vector.y);
                    }
                });

                manager.on('end', () => {
                    aidesGame.joystickDirection.set(0, 0, 0);
                });
            }
        }

        // 6. Thêm nút Toàn màn hình cho Mobile
        if (fullscreenButton) {
            fullscreenButton.addEventListener('click', () => {
                const gameElement = document.documentElement;
                const isFullscreen = document.fullscreenElement || document.webkitFullscreenElement;

                if (!isFullscreen) {
                    const requestFullscreen = gameElement.requestFullscreen || gameElement.webkitRequestFullscreen;
                    if (requestFullscreen) {
                        requestFullscreen.call(gameElement).then(() => {
                            if (screen.orientation && typeof screen.orientation.lock === 'function') {
                                screen.orientation.lock('landscape').catch(err => console.warn("Không thể khóa xoay màn hình:", err));
                            }
                        }).catch(err => console.error(`Lỗi khi vào toàn màn hình: ${err.message}`));
                    }
                } else {
                    const exitFullscreen = document.exitFullscreen || document.webkitExitFullscreen;
                    if (exitFullscreen) {
                        exitFullscreen.call(document);
                    }
                }
            });
        }

        // 7. Thêm nút Tải Log
        if (downloadButton) {
            downloadButton.addEventListener('click', () => {
                if (aidesGame) {
                    aidesGame.downloadTrainingData();
                }
            });
        }

    } else {
        console.error("Fatal Error: Game container 'game-container' not found!");
    }
});
