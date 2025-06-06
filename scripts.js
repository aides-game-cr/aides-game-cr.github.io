document.addEventListener('DOMContentLoaded', function() {
    //----------------------------------------------------
    // KHỞI TẠO CÁC THƯ VIỆN VÀ BIẾN
    //----------------------------------------------------
    AOS.init({
        duration: 1000,
        once: true,
        offset: 100,
        easing: 'ease-out-cubic'
    });

    const heroSection = document.querySelector('.hero-section');
    const glitchText = document.querySelector('.glitch-text');
    const interactiveElements = document.querySelectorAll('.logo-heading');

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

    interactiveElements.forEach(el => {
        el.addEventListener('mouseenter', () => cursor.classList.add('hover'));
        el.addEventListener('mouseleave', () => cursor.classList.remove('hover'));
    });

    //----------------------------------------------------
    // HIỆU ỨNG GLITCH TƯƠNG TÁC
    //----------------------------------------------------
    if (glitchText) {
        glitchText.addEventListener('mouseenter', () => {
            glitchText.classList.add('intensify');
        });
        glitchText.addEventListener('mouseleave', () => {
            glitchText.classList.remove('intensify');
        });
    }

    //----------------------------------------------------
    // HIỆU ỨNG PARALLAX KHI CUỘN
    //----------------------------------------------------
    let ticking = false;

    function updateScrollEffects() {
        const scrolled = window.pageYOffset;

        if (heroSection && scrolled < window.innerHeight) {
            const rate = scrolled * 0.4;
            heroSection.style.transform = `translateY(${rate}px)`;
        }

        ticking = false;
    }

    window.addEventListener('scroll', function() {
        if (!ticking) {
            window.requestAnimationFrame(updateScrollEffects);
            ticking = true;
        }
    });

    //----------------------------------------------------
    // MATRIX RAIN EFFECT
    //----------------------------------------------------
    function createMatrixRain() {
        const canvas = document.createElement('canvas');
        canvas.style.position = 'fixed';
        canvas.style.top = '0';
        canvas.style.left = '0';
        canvas.style.zIndex = '-2';
        document.body.appendChild(canvas);
        const ctx = canvas.getContext('2d');
        canvas.height = window.innerHeight;
        canvas.width = window.innerWidth;

        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%^&*';
        const fontSize = 14;
        const columns = canvas.width / fontSize;
        const drops = [];

        for (let x = 0; x < columns; x++) drops[x] = 1;

        function draw() {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#00ff80';
            ctx.font = `${fontSize}px monospace`;

            for (let i = 0; i < drops.length; i++) {
                const text = chars.charAt(Math.floor(Math.random() * chars.length));
                ctx.fillText(text, i * fontSize, drops[i] * fontSize);
                if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) drops[i] = 0;
                drops[i]++;
            }
        }

        setInterval(draw, 33);

        window.addEventListener('resize', () => {
            canvas.height = window.innerHeight;
            canvas.width = window.innerWidth;
        });
    }

    createMatrixRain();

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

    console.log('AIDES Website scripts fully loaded and enhanced! 🚀');
});