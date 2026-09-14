// animate.js is Motion's bundled chunk
import { animate } from "./animate.js";

// * This section converts a digit into its image URL.
// The array is shuffled; otherwise `digitToImagePath` could simply be:
// return "/img/" + GLYPH_IMAGE_HASHES[digit] + ".png";

const GLYPH_IMAGE_HASHES = [
	"5dad6d66",  // 3
	"6e1e98fb",  // 0
	"80a7ff9d",  // 5
	"6f33cb6e",  // 2
	"2d5de098",  // 7
	"210d58d4",  // 4
	"0f5e8956",  // 1
	"7051b5b1",  // 6
];

// The caller asks for the modular inverse of 5 mod 8, which is always 5.
function modInverse(value, modulus) {
	value = ((value % modulus) + modulus) % modulus;
	for (let candidate = 1; candidate < modulus; candidate++) {
		if ((value * candidate) % modulus === 1) {
			return candidate;
		}
	}
	return 1;
}

// Get the index in GLYPH_IMAGE_HASHES that corresponds to a digit.
function scrambleDigitToImageIndex(digit) {
	const key = modInverse(5, 8);  // always 5
	return ((((digit - 3) * key) % 8) + 8) % 8;
}

// Get the image URL for a digit.
function digitToImagePath(digit) {
	return "/img/" + GLYPH_IMAGE_HASHES[scrambleDigitToImageIndex(digit)] + ".png";
}

// Preload the images for all digits.
function preloadGlyphImages() {
	return Promise.all(
		GLYPH_IMAGE_HASHES.map(
			(_, index) => new Promise((resolve) => {
				const img = new Image();
				img.onload = img.onerror = () => resolve();
				img.src = digitToImagePath(index);
			}),
		),
	);
}

// * This section computes the countdown end time.
// Order-independent hash (apply a "nibble rotation" to each char code, then XOR all the results).
function hashStrings(...strings) {
	function rotateNibble(byte) {
		return (byte & 15) + (((byte >> 6) << 3) | (byte >> 6));
	}
	let hash = 0;
	for (const str of strings) {
		let acc = 0;
		for (const ch of str) {
			acc = (acc << 4) | rotateNibble(ch.charCodeAt(0));
		}
		hash ^= acc;
	}
	return hash >>> 0;
}

// Dedupe every data-asset-id string on the page, then hash them.
function computePageSeed() {
	const elements = document.querySelectorAll("[data-asset-id]");
	return hashStrings(...new Set([...elements].map((el) => el.dataset.assetId ?? "")));
}

// Convert a non-negative integers to octal (as a Number).
function toOctalDigitsAsNumber(n) {
	let digits = "";
	let remaining = n;
	if (remaining === 0) return 0;
	while (remaining > 0) {
		digits = (remaining % 8) + digits;
		remaining = Math.floor(remaining / 8);
	}
	return parseInt(digits);
}

// Compute the remaining seconds in octal (digits split into an array of Numbers).
function secondsRemainingAsOctalDigits(nowMs, seedSeconds) {
	const remainingSeconds = Math.max(0, Math.floor(seedSeconds - nowMs / 1000));
	let digits = toOctalDigitsAsNumber(remainingSeconds).toString().split("");
	while (digits.length < 8) {
		digits.unshift("0");
	}
	return digits.slice(0, 8).map((d) => parseInt(d));
}

// * This section holds the higher-level functions of the countdown clock.
// By now it's clear this "seed" isn't really a seed. Perhaps to stop datamining,
// the real countdown end time is disguised as a seed. Since every string on the page is
// (currently) fixed, the countdown always ends at 1787788800 (2026/8/27, 08:00:00 GMT+8).

// Digit switch animation (fade out → swap image source → fade in)
function crossfadeGlyphImage(imgEl, newSrc) {
	animate(imgEl, { opacity: [1, 0] }, { duration: 0.1 })
		.then(
			() =>
				new Promise((resolve) => {
					imgEl.onload = imgEl.onerror = () => {
						imgEl.onload = imgEl.onerror = null;
						resolve();
					};
					imgEl.src = newSrc;
				}),
		)
		.then(() => {
			animate(imgEl, { opacity: [0, 1] }, { duration: 0.1 });
		});
}

// Render the countdown clock
function renderClockDigits(seedSeconds) {
	secondsRemainingAsOctalDigits(Date.now(), seedSeconds).forEach((digit, slot) => {
		const imgEl = document.getElementById("i" + (slot + 1));  // #i1..#i8
		const newPath = digitToImagePath(digit);
		if (new URL(imgEl.src).pathname !== newPath) {
			crossfadeGlyphImage(imgEl, newPath);
		}
	});
}

// Start the countdown clock
async function startClock() {
	await preloadGlyphImages();
	const seed = computePageSeed();
	renderClockDigits(seed);
	setInterval(() => {
		renderClockDigits(seed);
	}, 1000);
}

// * Entry point.
// Query selectors
// ...

async function runIntro() {
	startClock();  // not awaited

	// Animations for the content of query selectors
	// ...
}

window.onload = async () => {
	await runIntro();
};