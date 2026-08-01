// assets/js/mermaid-init.js
(function () {
  function initMermaid() {
    if (!window.mermaid) return;

    // 1) Find code fences produced by Markdown like: <code class="language-mermaid">...</code>
    const blocks = document.querySelectorAll("pre > code.language-mermaid, pre > code.mermaid");

    blocks.forEach((code) => {
      const pre = code.parentElement;
      const parent = pre.parentElement;

      // Avoid double-processing
      if (parent && parent.classList && parent.classList.contains("mermaid")) return;

      const container = document.createElement("div");
      container.className = "mermaid";
      container.textContent = code.textContent;

      pre.replaceWith(container);
    });

    // 2) Render
    window.mermaid.initialize({
      startOnLoad: true,
      securityLevel: "strict"
    });

    // Some pages load fast; force render pass
    window.mermaid.run?.();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initMermaid);
  } else {
    initMermaid();
  }
})();
