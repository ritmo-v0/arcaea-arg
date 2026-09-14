const particles = [];
let rafHandle;

function spawnParticle(
	value,
	colCount,
	rowCount,
	cellSize,
	onNeedsFrame,
	permanent = false,
	offsetX = 0,
	offsetY = 0,
) {
	particles.push({
		value,
		x: Math.floor(Math.random() * colCount) * cellSize + offsetX,
		y: (Math.floor(Math.random() * rowCount) + 1) * cellSize + offsetY,
		createdAt: performance.now(),
		permanent,
	});
	if (rafHandle === undefined) {
		rafHandle = requestAnimationFrame(onNeedsFrame);
	}
}

function spawnGridChar(char, canvasWidth, canvasHeight, onNeedsFrame, permanent = false) {
	const CELL = 32;  // px
	const cols = Math.max(1, Math.floor(canvasWidth / CELL));
	const rows = Math.max(1, Math.floor(canvasHeight / CELL));
	const offsetX = (canvasWidth - cols * CELL) / 2;
	const offsetY = (canvasHeight - rows * CELL) / 2;
	spawnParticle(char, cols, rows, CELL, onNeedsFrame, permanent, offsetX, offsetY);
}

function createDrawLoop(canvas, fadeDurationSeconds = 1) {
	const ctx = canvas.getContext("2d");
	if (!ctx) return () => {};

	return function drawFrame(now) {
		if (!ctx) return;

		const fontFamily = window
			.getComputedStyle(document.documentElement)
			.getPropertyValue("--font-spacemono")
			.trim();

		ctx.clearRect(0, 0, canvas.width, canvas.height);
		ctx.font = "32px " + fontFamily;

		for (let idx = particles.length - 1; idx >= 0; idx--) {
			const p = particles[idx];
			const opacity = p.permanent
				? 1
				: 1 - (now - p.createdAt) / (fadeDurationSeconds * 1000);

			if (opacity <= 0) {
				particles.splice(idx, 1);
				continue;
			}
			ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
			ctx.fillText(p.value, p.x, p.y);
		}

		rafHandle = particles.some((particle) => !particle.permanent)
			? requestAnimationFrame(drawFrame)
			: undefined;
	};
}

function randomGlyph() {
	const ranges = [
		[0x2200, 0x22ff],  // Mathematical Operators
		[0x4dc0, 0x4dff],  // Yijing Hexagram Symbols
		[0x2150, 0x218f],  // Number Forms
	];
	const codepoints = ranges.flatMap(([start, end]) =>
		Array.from({ length: end - start + 1 }, (_, k) => start + k),
	);
	const pick = codepoints[Math.floor(Math.random() * codepoints.length)];
	return String.fromCodePoint(pick);
}

function resumeLoop(canvas) {
	if (particles.length > 0 && rafHandle === undefined) {
		rafHandle = requestAnimationFrame(createDrawLoop(canvas));
	}
}

export { resumeLoop, randomGlyph, spawnGridChar, createDrawLoop };