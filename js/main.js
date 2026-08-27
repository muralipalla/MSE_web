// Keep shared JavaScript small. Individual activities can use their own files.
document.querySelectorAll("[data-year]").forEach((year) => {
  year.textContent = new Date().getFullYear();
});

const siteFooter = document.querySelector(".site-footer");

if (siteFooter && !siteFooter.querySelector(".site-license")) {
  const mainScript = [...document.scripts].find((script) => /\/js\/main\.js(?:\?|$)/.test(script.src));
  const siteRoot = mainScript ? new URL("../", mainScript.src) : new URL("./", document.baseURI);
  const licensePage = new URL("licenses/", siteRoot).href;
  const paragraph = document.createElement("p");
  paragraph.className = "site-license";

  const addText = (value) => paragraph.append(document.createTextNode(value));
  const addLink = (label, href) => {
    const link = document.createElement("a");
    link.href = href;
    link.target = "_blank";
    link.rel = "noopener license";
    link.textContent = label;
    paragraph.append(link);
  };

  addText("© 2026 Murali Palla · Original text and visual content licensed under ");
  addLink("CC BY-NC-SA 4.0", "https://creativecommons.org/licenses/by-nc-sa/4.0/");
  addText(". Code is open source under the ");
  addLink("MIT License", "https://opensource.org/license/mit");
  addText(". Third-party materials retain their stated licenses. ");
  addLink("Licenses & attributions", licensePage);
  addText(".");
  siteFooter.append(paragraph);
}
