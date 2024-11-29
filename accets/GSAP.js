gsap.from(".banner-text", {
    y: 30,
    delay: 0.3,
    duration: 2,
    opacity: 0,
    stagger: 0.4
})

gsap.from('.banner-image, .Banner-btn', {
    x: 50,
    opacity: 0,
    duration: 2,
    delay: 0.3
})


gsap.from('nav a', {
    y: 30,
    // delay: 1,
    opacity: 0,
    stagger: 0.1
})


gsap.from(".count", {
    textContent: 0,
    duration: 5,
    snap: { textContent: 1 },
    scrollTrigger: {
        trigger: ".count",
        scroller: "body",
        // markers: true,
        start: "top 75%",
    },
})

gsap.utils.toArray(".FadeUp").forEach((element) => {
    gsap.from(element, {
        y: 30,
        duration: 1,
        delay: 0.2,
        opacity: 0,
        id: "example",
        stagger: 5,
        scrollTrigger: {
            trigger: element,
            scroller: "body",
            // markers: true,
            // start: "top 65%",
        },
    });
});



console.clear();

gsap.registerPlugin(ScrollTrigger, Draggable);

let iteration = 0; // gets iterated when we scroll all the way to the end or start and wraps around - allows us to smoothly continue the playhead scrubbing in the correct direction.

// set initial state of items
gsap.set(".cards li", { xPercent: 400, opacity: 0, scale: 0 });

const spacing = 0.08, // spacing of the cards (stagger)
    snapTime = gsap.utils.snap(spacing), // we'll use this to snapTime the playhead on the seamlessLoop
    cards = gsap.utils.toArray(".cards li"),
    // this function will get called for each element in the buildSeamlessLoop() function, and we just need to return an animation that'll get inserted into a master timeline, spaced
    animateFunc = (element) => {
        const tl = gsap.timeline();
        tl.fromTo(
            element,
            { scale: 0, opacity: 0 },
            {
                scale: 2,
                opacity: 1,
                zIndex: 100,
                duration: 0.5,
                yoyo: true,
                repeat: 1,
                ease: "power1.in",
                immediateRender: false
            }
        ).fromTo(
            element,
            { xPercent: 480 },
            { xPercent: -500, duration: 1, ease: "none", immediateRender: false },
            0
        );
        return tl;
    },
    seamlessLoop = buildSeamlessLoop(cards, spacing, animateFunc),
    playhead = { offset: 0 }, // a proxy object we use to simulate the playhead position, but it can go infinitely in either direction and we'll just use an onUpdate to convert it to the corresponding time on the seamlessLoop timeline.
    wrapTime = gsap.utils.wrap(0, seamlessLoop.duration()), // feed in any offset (time) and it'll return the corresponding wrapped time (a safe value between 0 and the seamlessLoop's duration)
    scrub = gsap.to(playhead, {
        // we reuse this tween to smoothly scrub the playhead on the seamlessLoop
        offset: 0,
        onUpdate() {
            seamlessLoop.time(wrapTime(playhead.offset)); // convert the offset to a "safe" corresponding time on the seamlessLoop timeline
        },
        duration: 0.5,
        ease: "power3",
        paused: true
    }),
    trigger = ScrollTrigger.create({
        start: 0
    }),
    // converts a progress value (0-1, but could go outside those bounds when wrapping) into a "safe" scroll value that's at least 1 away from the start or end because we reserve those for sensing when the user scrolls ALL the way up or down, to wrap.
    progressToScroll = (progress) =>
        gsap.utils.clamp(
            1,
            trigger.end - 1,
            gsap.utils.wrap(0, 1, progress) * trigger.end
        ),
    wrap = (iterationDelta, scrollTo) => {
        iteration += iterationDelta;
        trigger.scroll(scrollTo);
        trigger.update(); // by default, when we trigger.scroll(), it waits 1 tick to update().
    };

// when the user stops scrolling, snap to the closest item.
// ScrollTrigger.addEventListener("scrollEnd", () =>
//     scrollToOffset(scrub.vars.offset)
// );

// feed in an offset (like a time on the seamlessLoop timeline, but it can exceed 0 and duration() in either direction; it'll wrap) and it'll set the scroll position accordingly. That'll call the onUpdate() on the trigger if there's a change.
function scrollToOffset(offset) {
    // moves the scroll playhead to the place that corresponds to the totalTime value of the seamlessLoop, and wraps if necessary.
    let snappedTime = snapTime(offset),
        progress =
            (snappedTime - seamlessLoop.duration() * iteration) /
            seamlessLoop.duration(),
        scroll = progressToScroll(progress);
    if (progress >= 1 || progress < 0) {
        return wrap(Math.floor(progress), scroll);
    }
    // trigger.scroll(scroll);
}

document
    .querySelector(".next")
    .addEventListener("click", () => scrollToOffset(scrub.vars.offset + spacing));
document
    .querySelector(".prev")
    .addEventListener("click", () => scrollToOffset(scrub.vars.offset - spacing));

function buildSeamlessLoop(items, spacing, animateFunc) {
    let rawSequence = gsap.timeline({ paused: true }), // this is where all the "real" animations live
        seamlessLoop = gsap.timeline({
            // this merely scrubs the playhead of the rawSequence so that it appears to seamlessly loop
            paused: true,
            repeat: -1, // to accommodate infinite scrolling/looping
            onRepeat() {
                // works around a super rare edge case bug that's fixed GSAP 3.6.1
                this._time === this._dur && (this._tTime += this._dur - 0.01);
            },
            onReverseComplete() {
                this.totalTime(this.rawTime() + this.duration() * 100); // seamless looping backwards
            }
        }),
        cycleDuration = spacing * items.length,
        dur; // the duration of just one animateFunc() (we'll populate it in the .forEach() below...

    // loop through 3 times so we can have an extra cycle at the start and end - we'll scrub the playhead only on the 2nd cycle
    items
        .concat(items)
        .concat(items)
        .forEach((item, i) => {
            let anim = animateFunc(items[i % items.length]);
            rawSequence.add(anim, i * spacing);
            dur || (dur = anim.duration());
        });

    // animate the playhead linearly from the start of the 2nd cycle to its end (so we'll have one "extra" cycle at the beginning and end)
    seamlessLoop.fromTo(
        rawSequence,
        {
            time: cycleDuration + dur / 2
        },
        {
            time: "+=" + cycleDuration,
            duration: cycleDuration,
            ease: "none"
        }
    );
    return seamlessLoop;
}

// below is the dragging functionality (mobile-friendly too)...
Draggable.create(".drag-proxy", {
    type: "x",
    trigger: ".cards",
    onPress() {
        this.startOffset = scrub.vars.offset;
    },
    onDrag() {
        scrub.vars.offset = this.startOffset + (this.startX - this.x) * 0.001;
        scrub.invalidate().restart(); // same thing as we do in the ScrollTrigger's onUpdate
    },
    onDragEnd() {
        scrollToOffset(scrub.vars.offset);
    }
});

