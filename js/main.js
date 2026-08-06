// Keep shared JavaScript small. Individual activities can use their own files.
const year = document.querySelector("[data-year]");

if (year) {
  year.textContent = new Date().getFullYear();
}
