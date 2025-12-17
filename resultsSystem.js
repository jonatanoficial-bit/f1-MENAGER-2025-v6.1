/* ===========================
   resultsSystem.js (FULL)
   - Overlay de resultados ao final
   - Faces no pódio
   =========================== */

(function () {
  "use strict";

  const ResultsSystem = {
    show(state) {
      const overlay = document.getElementById("results-overlay");
      if (!overlay) return;

      overlay.classList.remove("hidden");
      overlay.innerHTML = "";

      const card = document.createElement("div");
      card.className = "results-card";

      const head = document.createElement("header");
      const h3 = document.createElement("h3");
      h3.textContent = "Resultados da Corrida";
      const close = document.createElement("button");
      close.className = "btn";
      close.textContent = "FECHAR";
      close.onclick = () => overlay.classList.add("hidden");

      head.appendChild(h3);
      head.appendChild(close);

      const body = document.createElement("div");
      body.className = "results-body";

      const top = state.drivers.slice(0, 10);
      top.forEach((d) => {
        const row = document.createElement("div");
        row.className = "results-row";

        const left = document.createElement("div");
        left.className = "results-left";

        const face = document.createElement("img");
        face.className = "results-face";
        face.src = `assets/faces/${d.code}.png`;
        face.alt = d.code;
        face.onerror = () => {
          face.onerror = null;
          face.style.display = "none";
        };

        const pos = document.createElement("div");
        pos.className = "pos-badge";
        pos.style.width = "34px";
        pos.style.height = "34px";
        pos.textContent = d.pos;

        const name = document.createElement("div");
        name.className = "results-name";
        name.innerHTML = `<div class="n">${d.name}</div><div class="t">${d.team} · Voltas: ${d.lap}</div>`;

        left.appendChild(pos);
        left.appendChild(face);
        left.appendChild(name);

        const right = document.createElement("div");
        right.style.fontWeight = "950";
        right.style.color = "rgba(255,255,255,.88)";
        right.textContent = d.pos === 1 ? "VENCEDOR" : `+${(d.gap || 0).toFixed(3)}`;

        row.appendChild(left);
        row.appendChild(right);
        body.appendChild(row);
      });

      const footer = document.createElement("footer");
      const back = document.createElement("button");
      back.className = "btn primary";
      back.textContent = "VOLTAR AO LOBBY";
      back.onclick = () => (location.href = "lobby.html");

      footer.appendChild(back);

      card.appendChild(head);
      card.appendChild(body);
      card.appendChild(footer);

      overlay.appendChild(card);
    },
  };

  window.ResultsSystem = ResultsSystem;
})();
