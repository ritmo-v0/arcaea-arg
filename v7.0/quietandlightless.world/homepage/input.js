// animate.js is Motion's bundled chunk
import { animate } from "./animate.js";

const modal = document.getElementById("modal");

document.getElementById("modal-bg")?.addEventListener("click", () => {
	modal?.classList.remove("active");
});

async function submitAnswer() {
	const input = document.getElementById("entry");
	const value = input.value.replace(/\s/g, "");

	const res = await fetch("https://quietandlightless.world/71c12d42?value=" + encodeURI(value), {
		method: "POST",
	});

	if (!(res.ok || res.status === 429)) return;

	const data = await res.json();

	// { "result": "denied" }
	if (data.result === "denied") {
		const failBtn = document.getElementById("button-fail");
		const flashTargets = document.querySelectorAll(".modal-content-bg, .input, hr");

		await animate([
			[failBtn, { opacity: [0, 1] }, { duration: 0.4 }],
			[
				flashTargets,
				{ filter: ["grayscale(0)", "grayscale(1)"] },
				{ duration: 0.4, at: "<" },
			],
			[failBtn, { opacity: [1, 0] }, { duration: 0.8, at: "1" }],
			[
				flashTargets,
				{ filter: ["grayscale(1)", "grayscale(0)"] },
				{ duration: 0.8, at: "<" },
			],
		]);
		return;
	}

	// { "result": "https://www.youtube.com/watch?v=lpFOdkLgHi4" }
	const clearBtn = document.getElementById("button-clear");
	document.querySelector(".modal-content-bg")?.classList.add("clear");
	await animate([[clearBtn, { opacity: [0, 1] }, { duration: 0.4 }]]);

	const insert = document.getElementById("insert");
	insert?.classList.add("active");

	await animate([
		[insert, { opacity: [0, 1] }, { duration: 2, delay: 1 }],
		[input, { borderBottomColor: ["#504d77FF", "#504d7700"] }, { duration: 2, delay: 1 }],
	]);

	setTimeout(() => {
		window.location.assign(data.result);
	}, 500);
}

document.getElementById("entry")?.addEventListener("keydown", async (e) => {
	if (e.key === "Enter") await submitAnswer();
});

document.getElementById("enter")?.addEventListener("click", submitAnswer);