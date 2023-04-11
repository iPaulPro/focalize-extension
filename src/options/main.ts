import "../app.pcss";
import App from "./Settings.svelte";

const app = new App({
    target: document.getElementById("app")!!,
});

export default app;
