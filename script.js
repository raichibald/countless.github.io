(() => {
    "use strict";

    const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Header border once the page scrolls.
    const header = document.querySelector(".site-header");
    const onScroll = () => header.classList.toggle("scrolled", window.scrollY > 8);
    onScroll();
    addEventListener("scroll", onScroll, { passive: true });

    // Privacy and terms pages: start the table of contents collapsed on phones.
    const toc = document.querySelector("details.toc");
    if (toc && matchMedia("(max-width: 719px)").matches) toc.open = false;

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

    // Support button: the address is only assembled on click, so it isn't sitting in the page source.
    document.querySelectorAll("[data-mail]").forEach((a) => {
        a.addEventListener("click", (e) => {
            e.preventDefault();
            location.href = `mailto:${["saripo.raitis", "gmail.com"].join("@")}?subject=Countless%20support`;
        });
    });

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

    const MAX = 25;
    const GAP = 1200; // ms between reps
    const HOLD = 2600; // ms the finished set stays on screen
    const RING = 240;
    const TAU = Math.PI * 2;

    // A fixed ring of dots like the app's counting screen: a true circle, each dot with its own
    // size, brightness and tiny radial offset.
    const rnd = (n) => {
        const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
        return x - Math.floor(x);
    };
    const dots = Array.from({ length: RING }, (_, i) => ({
        a: (i / RING) * TAU,
        off: (rnd(i) - 0.5) * 1.6,
        size: 1.3 + rnd(i + 500) * 1.1,
        base: 0.45 + rnd(i + 1000) * 0.55,
        phase: rnd(i + 1500) * TAU,
    }));

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

        const r = base + pulse * size * 0.012;
        for (const d of dots) {
            const alpha = Math.min(1, d.base * (0.85 + 0.15 * Math.sin(t * 0.002 + d.phase)) + 0.35 * pulse);
            ctx.beginPath();
            ctx.arc(c + Math.cos(d.a) * (r + d.off), c + Math.sin(d.a) * (r + d.off), d.size * (1 + pulse * 0.5), 0, TAU);
            ctx.fillStyle = `rgba(195,255,61,${alpha})`;
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
