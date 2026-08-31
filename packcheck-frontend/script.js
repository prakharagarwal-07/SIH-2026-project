const fileInput = document.getElementById("fileInput");
const fileName = document.getElementById("fileName");
const uploadBox = document.getElementById("uploadBox");

function scrollToSection(id) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
}

function showLogin() {
  document.getElementById("loginModal").classList.add("show");
}

function closeLogin() {
  document.getElementById("loginModal").classList.remove("show");
}

document.getElementById("loginModal").addEventListener("click", (event) => {
  if (event.target.id === "loginModal") closeLogin();
});

fileInput.addEventListener("change", () => {
  const file = fileInput.files[0];
  if (!file) return;

  fileName.textContent = `Selected: ${file.name}`;

  setTimeout(() => {
    document.getElementById("mockResult").scrollIntoView({
      behavior: "smooth",
      block: "center"
    });
  }, 150);
});

["dragenter", "dragover"].forEach(eventName => {
  uploadBox.addEventListener(eventName, e => {
    e.preventDefault();
    uploadBox.classList.add("dragging");
  });
});

["dragleave", "drop"].forEach(eventName => {
  uploadBox.addEventListener(eventName, e => {
    e.preventDefault();
    uploadBox.classList.remove("dragging");
  });
});

uploadBox.addEventListener("drop", e => {
  const file = e.dataTransfer.files[0];
  if (!file || !file.type.startsWith("image/")) return;

  fileName.textContent = `Selected: ${file.name}`;
});
