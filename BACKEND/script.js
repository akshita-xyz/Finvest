
document.addEventListener("DOMContentLoaded", () => {

const panel = document.getElementById("panel");
const toggleBtn = document.getElementById("toggle");
const sendBtn = document.getElementById("sendBtn");
const input = document.getElementById("input");
const messages = document.getElementById("messages");

if (!panel || !toggleBtn || !sendBtn || !input || !messages) {
  console.warn("FINVEST chat DOM nodes missing (panel, toggle, sendBtn, input, messages).");
  return;
}

/** Match Finvest/Finvest/BACKEND default PORT in .env.example */
const CHAT_URL = (window.FINVEST_CHAT_URL || "http://localhost:3001/chat");

console.log("JS LOADED ✅");

/* =========================
   OPEN / CLOSE CHAT
========================= */
toggleBtn.onclick = () => {
    console.log("CHAT TOGGLE CLICKED");
    panel.classList.toggle("active");
    toggleBtn.classList.toggle("active");
};

window.closeChat = function() {
    panel.classList.remove("active");
    toggleBtn.classList.remove("active");
};

/* =========================
   ADD MESSAGE
========================= */
function addMessage(text, type) {
    const msg = document.createElement("div");
    msg.className = "message " + type;
    msg.innerText = text;

    messages.appendChild(msg);

    messages.scrollTo({
        top: messages.scrollHeight,
        behavior: "smooth"
    });

    return msg;
}

/* =========================
   SEND MESSAGE
========================= */
async function sendMessage() {
    console.log("FUNCTION RUNNING 🚀");

    const text = input.value.trim();
    console.log("USER TEXT:", text);
    if (!text) return;

    addMessage(text, "user");
    const botMsg = addMessage("Thinking...", "bot");

    input.value = "";
    input.focus();

    try {
        console.log("SENDING REQUEST...");
        const res = await fetch(CHAT_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                message: text,
                userType: "beginner"
            })
        });

        console.log("RESPONSE RECEIVED");

        const data = await res.json().catch(() => ({}));
        console.log("DATA:", data);

        botMsg.innerText = typeof data.reply === "string" && data.reply
          ? data.reply
          : ("Error: " + (res.statusText || res.status || "unknown"));

   } catch (err) {
    console.error(err);
    botMsg.innerText = "Network error: " + (err && err.message ? err.message : String(err));
}
}

/* =========================
   BUTTON CLICK
========================= */
sendBtn.onclick = () => {
    console.log("BUTTON CLICKED 🔘");
    sendMessage();
};

/* =========================
   ENTER KEY SUPPORT
========================= */
input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
        console.log("ENTER PRESSED ⌨️");
        sendMessage();
    }
});

/* =========================
   RIPPLE EFFECT
========================= */
function ripple(button, e) {
    const circle = document.createElement("span");
    const size = 100;

    circle.style.width = size + "px";
    circle.style.height = size + "px";
    circle.style.position = "absolute";
    circle.style.borderRadius = "50%";
    circle.style.left = (e.offsetX - size / 2) + "px";
    circle.style.top = (e.offsetY - size / 2) + "px";
    circle.style.background = "rgba(255,255,255,0.5)";
    circle.style.transform = "scale(0)";
    circle.style.transition = "0.6s";

    button.appendChild(circle);

    setTimeout(() => {
        circle.style.transform = "scale(2)";
        circle.style.opacity = "0";
    }, 10);

    setTimeout(() => circle.remove(), 600);
}

/* APPLY RIPPLE */
toggleBtn.addEventListener("click", (e) => ripple(toggleBtn, e));
sendBtn.addEventListener("click", (e) => ripple(sendBtn, e));

});
