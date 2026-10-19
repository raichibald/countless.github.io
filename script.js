(() => {
    "use strict";

    const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Header border once the page scrolls.
    const header = document.querySelector(".site-header");
    const onScroll = () => header.classList.toggle("scrolled", window.scrollY > 8);
    onScroll();
    addEventListener("scroll", onScroll, { passive: true });

    // Reveal on scroll.
    const reveals = document.querySelectorAll(".reveal");
    if ("IntersectionObserver" in window && !reduceMotion) {
        const io = new IntersectionObserver(
            (entries) => {
                for (const e of entries) {
                    if (e.isIntersecting) {
                        e.target.classList.add("in");
                        io.unobserve(e.target);
                    }
                }
            },
            { threshold: 0.12, rootMargin: "0px 0px -6% 0px" }
        );
        reveals.forEach((el, i) => {
            el.style.transitionDelay = `${(i % 3) * 70}ms`;
            io.observe(el);
        });
    } else {
        reveals.forEach((el) => el.classList.add("in"));
    }

    // Hero: crossfade through the real screens.
    const heroImgs = [...document.querySelectorAll("#hero-screens img")];
    if (heroImgs.length > 1 && !reduceMotion) {
        let i = 0;
        setInterval(() => {
            if (document.hidden) return;
            heroImgs[i].classList.remove("on");
            i = (i + 1) % heroImgs.length;
            heroImgs[i].classList.add("on");
        }, 3600);
    }

    // Gallery arrows.
    const track = document.querySelector(".gallery-track");
    if (track) {
        const step = () => Math.max(track.clientWidth * 0.7, 280);
        const go = (dir) => track.scrollBy({ left: dir * step(), behavior: reduceMotion ? "auto" : "smooth" });
        document.getElementById("g-prev").addEventListener("click", () => go(-1));
        document.getElementById("g-next").addEventListener("click", () => go(1));
    }

    // How it works: a live rep counter, ticking at a steady tempo.
    const canvas = document.getElementById("demo-canvas");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const countEl = document.getElementById("demo-count");
    const tickEl = document.getElementById("demo-tick");

    const MAX = 25;
    const GAP = 1200; // ms between reps
    const HOLD = 2600; // ms the finished set stays on screen
    const RING = 150;
    const TAU = Math.PI * 2;

    let size = 0;
    let count = 0;
    let pulse = 0;
    let ripples = [];
    let nextRep = 0;
    let restartAt = 0;
    let lastT = 0;
    let raf = 0;

    function resize() {
        const rect = canvas.getBoundingClientRect();
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        size = rect.width;
        canvas.width = canvas.height = Math.round(size * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function setCount(n) {
        count = n;
        countEl.textContent = String(n);
    }

    function rep(t) {
        setCount(count + 1);
        pulse = 1;
        ripples.push(t);
        tickEl.textContent = count % 10 === 0 ? "tick · marker" : "tick";
        tickEl.classList.add("on");
        requestAnimationFrame(() => requestAnimationFrame(() => tickEl.classList.remove("on")));
    }

    function draw(t) {
        const c = size / 2;
        const base = size * 0.33;
        ctx.clearRect(0, 0, size, size);

        const glow = ctx.createRadialGradient(c, c, 0, c, c, size * 0.5);
        glow.addColorStop(0, `rgba(195,255,61,${0.05 + pulse * 0.1})`);
        glow.addColorStop(1, "rgba(195,255,61,0)");
        ctx.fillStyle = glow;
        ctx.fillRect(0, 0, size, size);

        for (const t0 of ripples) {
            const age = (t - t0) / 1400;
            if (age < 0 || age > 1) continue;
            ctx.beginPath();
            ctx.arc(c, c, base + age * size * 0.2, 0, TAU);
            ctx.strokeStyle = `rgba(195,255,61,${(1 - age) * 0.4})`;
            ctx.lineWidth = 1.5;
            ctx.stroke();
        }

        for (let i = 0; i < RING; i++) {
            const a = (i / RING) * TAU;
            const wob = Math.sin(a * 5 + t * 0.0012) * 1.6 + Math.sin(a * 9 - t * 0.0017) * 1.3;
            const r = base + wob * (1 + pulse * 2.4) + pulse * size * 0.02;
            const alpha = 0.3 + 0.4 * (Math.sin(a * 3 + t * 0.002) * 0.5 + 0.5) + 0.3 * pulse;
            ctx.beginPath();
            ctx.arc(c + Math.cos(a) * r, c + Math.sin(a) * r, 1.5 + pulse * 1.2, 0, TAU);
            ctx.fillStyle = `rgba(195,255,61,${Math.min(alpha, 1)})`;
            ctx.fill();
        }
    }

    function frame(t) {
        const dt = Math.min(t - lastT, 64);
        lastT = t;
        pulse = Math.max(0, pulse - dt / 520);
        ripples = ripples.filter((t0) => t - t0 < 1400);

        if (restartAt) {
            if (t >= restartAt) {
                restartAt = 0;
                setCount(0);
                nextRep = t + 900;
            }
        } else if (t >= nextRep) {
            rep(t);
            if (count >= MAX) restartAt = t + HOLD;
            else nextRep = t + GAP;
        }

        draw(t);
        raf = requestAnimationFrame(frame);
    }

    function start() {
        if (raf) return;
        lastT = performance.now();
        nextRep = lastT + 700;
        raf = requestAnimationFrame(frame);
    }

    function stop() {
        cancelAnimationFrame(raf);
        raf = 0;
    }

    resize();
    addEventListener("resize", () => {
        resize();
        if (!raf) draw(performance.now());
    });

    if (reduceMotion) {
        setCount(MAX);
        draw(0);
        return;
    }

    draw(0);
    new IntersectionObserver((entries) => (entries[0].isIntersecting ? start() : stop()), { threshold: 0.2 }).observe(
        canvas
    );
})();
