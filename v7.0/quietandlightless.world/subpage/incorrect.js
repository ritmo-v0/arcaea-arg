import { resumeLoop, randomGlyph, spawnGridChar, createDrawLoop } from "./chars.js";

const canvas = document.getElementById("bg");

window.onresize = () => {
	canvas.width = window.innerWidth;
	canvas.height = window.innerHeight;
	resumeLoop(canvas);
};
window.onresize(new UIEvent("resize"));

const drawFrame = createDrawLoop(canvas);

setInterval(() => {
	spawnGridChar(randomGlyph(), canvas.width, canvas.height, drawFrame, false);
	spawnGridChar(randomGlyph(), canvas.width, canvas.height, drawFrame, false);
	spawnGridChar(randomGlyph(), canvas.width, canvas.height, drawFrame, false);
	spawnGridChar(randomGlyph(), canvas.width, canvas.height, drawFrame, false);
}, 20);