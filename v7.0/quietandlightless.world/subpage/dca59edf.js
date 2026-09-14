// animate.js is Motion's bundled chunk
import { animate, stagger } from "./animate.js";
import { resumeLoop, randomGlyph, spawnGridChar, createDrawLoop } from "./chars.js";

const textInput = document.getElementById("text-input");
const inputForm = document.getElementById("input-form");
const caret = document.querySelector(".caret-container");
const canvas = document.getElementById("bg");
const submissions = [];

caret?.addEventListener("click", async () => {
	await animate(caret, { opacity: [1, 0] }, { duration: 0.4 });
	caret.classList.add("inactive");
	textInput.focus();
});

textInput.addEventListener("blur", () => {
	if (textInput.value === "") {
		animate(caret, { opacity: [0, 1] }, { duration: 0.4 });
		caret?.classList.remove("inactive");
	}
});

window.onresize = () => {
	canvas.width = window.innerWidth;
	canvas.height = window.innerHeight;
	resumeLoop(canvas);
};
window.onresize(new UIEvent("resize"));

// Before the "neweye" update, the glitchDrawLoop value was discarded,
// and was written as just: `createDrawLoop(canvas, 5);`.
const drawLoop = createDrawLoop(canvas);  // for "sacrosanct", 1s
const glitchDrawLoop = createDrawLoop(canvas, 5);  // for "neweye", 5s

inputForm.addEventListener("submit", async (event) => {
	event.preventDefault();
	submissions.push(textInput.value);

	const endpoint = new URL("/de918bde", window.location.origin);
	endpoint.searchParams.set("submissions", submissions.join(","));

	const response = await fetch(endpoint, { method: "POST" });
	if (!response.ok) return;

	const { result, persist, reset } = await response.json();

	// * Wrong answers
	// Every 80th submission: reset submission history.
	if (reset === true) {
		submissions.length = 0;
	}

	// 1st–7th of every 8 submissions: junk value, draw a random glyph onto the background.
	// Why 67? Because Insight Six Seven.
	if (result === 67) {
		spawnGridChar(randomGlyph(), canvas.width, canvas.height, drawLoop, false);
		return;
	}

	// Every 8th submission: draw `result` onto the background.
	// (picked from the server's fixed glyph pool)
	if (!persist) {
		spawnGridChar(result, canvas.width, canvas.height, drawLoop, false);
		return;
	}

	// * Correct answer
	// ! From here on, the versions before and after the update are written together for convenience
	// "sacrosanct"
	// { "result": ["...", "...", "..."], "persist": true }
	// Fade out the input group, build lines from `result`, animate them line by line,
	// then clear the input element and make it read-only.
	await animate([
		[".input-2", { opacity: [1, 0] }, { duration: 2 }],
		[".input-container-bg", { opacity: [1, 0] }, { duration: 2, at: "<" }],
		["hr", { opacity: [0.5, 0] }, { duration: 2, at: "<" }],
	]);

	const outputContainer = document.createElement("div");
	outputContainer.classList.add("output");
	document.querySelector("main")?.appendChild(outputContainer);

	const lineElements = result.map((line) => {
		const lineEl = document.createElement("span");
		lineEl.classList.add("line");
		lineEl.textContent = line.toUpperCase();
		outputContainer.appendChild(lineEl);
		return lineEl;
	});

	await animate(
		lineElements,
		{
			opacity: [0, 1],
			filter: ["blur(8px)", "blur(0px)"],
			y: [16, 0],
		},
		{
			duration: 2,
			delay: stagger(2),
			ease: "easeInOut",
		},
	);

	textInput.value = "";
	textInput.readOnly = true;

	// "sacrosanct" → "neweye"
	// { "result": "neweye", "persist": true }
	// Write `result` into the input element and make it read-only,
	// then draw 4 glyphs every 20ms, each fading out over 5 seconds.
	textInput.value = result;
	textInput.readOnly = true;

	setInterval(() => {
		spawnGridChar(randomGlyph(), canvas.width, canvas.height, glitchDrawLoop, false);
		spawnGridChar(randomGlyph(), canvas.width, canvas.height, glitchDrawLoop, false);
		spawnGridChar(randomGlyph(), canvas.width, canvas.height, glitchDrawLoop, false);
		spawnGridChar(randomGlyph(), canvas.width, canvas.height, glitchDrawLoop, false);
	}, 20);
});