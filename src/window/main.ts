import "../app.pcss";
import "./editor.pcss";
import App from "./Composer.svelte";

const app = new App({
    target: document.getElementById("app")!!,
});

export default app;
