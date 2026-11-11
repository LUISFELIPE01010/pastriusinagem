/* Pastri Usinagem — interacoes do site. JavaScript puro, sem dependencias. */
(function () {
  "use strict";

  var WHATSAPP = "5511996513914";
  var $ = function (sel, ctx) { return (ctx || document).querySelector(sel); };
  var $$ = function (sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); };

  /* ---------- 1. Ano no rodape ---------- */
  var ano = $("#ano");
  if (ano) ano.textContent = new Date().getFullYear();

  /* ---------- 2. Sombra do header ao rolar ---------- */
  // Um marcador de 12px no topo da pagina (#sentinela-topo) avisa quando a pagina saiu do topo.
  // Assim nao lemos window.scrollY (leitura de geometria que forca o navegador a recalcular o
  // layout na hora) nem usamos o evento de scroll.
  var header = $("#header");
  var sentinela = $("#sentinela-topo");
  if (header && sentinela && "IntersectionObserver" in window) {
    new IntersectionObserver(function (entries) {
      header.classList.toggle("is-scrolled", !entries[entries.length - 1].isIntersecting);
    }).observe(sentinela);
  } else if (header) {
    var agendado = false;
    var atualizar = function () { agendado = false; header.classList.toggle("is-scrolled", window.pageYOffset > 12); };
    window.addEventListener("scroll", function () {
      if (!agendado) { agendado = true; requestAnimationFrame(atualizar); }
    }, { passive: true });
  }

  /* ---------- 3. Menu do celular ---------- */
  var burger = $("#burger");
  var drawer = $("#drawer");

  function fecharDrawer() {
    if (!burger || !drawer) return;
    burger.setAttribute("aria-expanded", "false");
    burger.setAttribute("aria-label", "Abrir menu");
    drawer.classList.remove("is-open");
  }

  if (burger && drawer) {
    burger.addEventListener("click", function () {
      var aberto = burger.getAttribute("aria-expanded") === "true";
      burger.setAttribute("aria-expanded", String(!aberto));
      burger.setAttribute("aria-label", aberto ? "Abrir menu" : "Fechar menu");
      drawer.classList.toggle("is-open", !aberto);
    });
    drawer.addEventListener("click", function (e) {
      if (e.target.closest("a")) fecharDrawer();
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") fecharDrawer();
    });
    window.addEventListener("resize", function () {
      if (window.innerWidth >= 1150) fecharDrawer();
    });
  }

  /* ---------- 4. Item do menu que acompanha a rolagem ---------- */
  var links = $$(".nav__link");
  var secoes = links
    .map(function (a) { return $(a.getAttribute("href")); })
    .filter(Boolean);

  if (secoes.length && "IntersectionObserver" in window) {
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        links.forEach(function (a) {
          a.classList.toggle("is-active", a.getAttribute("href") === "#" + en.target.id);
        });
      });
    }, { rootMargin: "-45% 0px -50% 0px", threshold: 0 });
    secoes.forEach(function (s) { spy.observe(s); });
  }

  /* ---------- 5. Animacoes de entrada ---------- */
  window.__ok = true; // avisa o <head> que o script carregou (senao a classe .js e removida)
  var reduz = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  var animar = "IntersectionObserver" in window && !reduz;

  var entradas = $$(
    ".reveal, [data-stagger] > *, .section > .wrap > .eyebrow, .section > .wrap > h2, " +
    ".section > .wrap > .sec-head__row, .section > .wrap > .lead"
  );

  if (!animar) {
    entradas.forEach(function (el) { el.classList.add("is-in"); });
  } else {
    // posicao do item na sua linha da grade (0, 1, 2...): so os vizinhos de linha sao escalonados.
    // So LE a geometria (devolve o indice); quem escreve no DOM e o observador, depois de ler tudo.
    var colunaNaLinha = function (el) {
      var pai = el.parentNode;
      if (!pai || !pai.hasAttribute("data-stagger")) return null;
      var i = 0;
      var topo = el.offsetTop;
      for (var s = el.previousElementSibling; s; s = s.previousElementSibling) {
        if (!s.hidden && Math.abs(s.offsetTop - topo) < 6) i++;
      }
      return i;
    };

    var rev = new IntersectionObserver(function (entries, obs) {
      var chegaram = [];
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        chegaram.push(en.target);
        obs.unobserve(en.target);
      });
      if (!chegaram.length) return;
      // fase 1: leitura de tudo (sem escrever nada entre as leituras: evita reflow forcado)
      var indices = chegaram.map(colunaNaLinha);
      // fase 2: escrita de tudo
      chegaram.forEach(function (el, k) {
        if (indices[k] !== null) el.style.setProperty("--i", indices[k]);
        el.classList.add("is-in");
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.12 });
    entradas.forEach(function (el) { rev.observe(el); });
  }

  /* ---------- 6. Formulario -> WhatsApp ---------- */
  var form = $("#form-orcamento");
  if (!form) return;

  form.addEventListener("submit", function (e) {
    e.preventDefault();

    var faltando = null;
    ["f-nome", "f-telefone", "f-msg"].forEach(function (id) {
      var campo = document.getElementById(id);
      if (!campo) return;
      var vazio = !campo.value.trim();
      campo.setAttribute("aria-invalid", vazio ? "true" : "false");
      campo.style.borderColor = vazio ? "#c0392b" : "";
      if (vazio && !faltando) faltando = campo;
    });

    if (faltando) { faltando.focus(); return; }

    var v = function (id) {
      var el = document.getElementById(id);
      return el ? el.value.trim() : "";
    };

    var linhas = [
      "Ola, Pastri Usinagem! Gostaria de solicitar um orcamento.",
      "",
      "Nome: " + v("f-nome"),
      v("f-empresa") ? "Empresa: " + v("f-empresa") : "",
      "Telefone: " + v("f-telefone"),
      v("f-email") ? "E-mail: " + v("f-email") : "",
      "Servico: " + v("f-servico"),
      "",
      "Necessidade:",
      v("f-msg")
    ].filter(function (l) { return l !== ""; });

    window.open(
      "https://wa.me/" + WHATSAPP + "?text=" + encodeURIComponent(linhas.join("\n")),
      "_blank",
      "noopener"
    );
  });
})();
