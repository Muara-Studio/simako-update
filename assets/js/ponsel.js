/* SIMAKO . Perilaku ponsel global (agen K, 24 Oktober 2026). Pasangan assets/css/ponsel.css.
   Dimuat di template/footer.php setelah jQuery, Bootstrap, dan DataTables. Daftar kelas: simako-uat/perbaikan/mobile-pola.md.
   - Tabel kartu (table.s-tabel-kartu): label tiap sel diambil dari <th>, peran kolom dari th[data-kk].
   - Lipat filter (.s-lipat): tombol pembuka di ponsel dengan jumlah filter aktif.
   - Aksi kepala halaman: 3 tombol atau lebih membuat tombol sekunder menjadi ikon di ponsel.
   - Laci menu, pilihan museum, cari, mode gelap di menu akun, dropdown fixed di ponsel. */
(function () {
  'use strict';
  var mq = window.matchMedia ? window.matchMedia('(max-width: 767.98px)') : { matches: false };
  var teks = function (el) { return el ? (el.textContent || '').replace(/\s+/g, ' ').trim() : ''; };
  var tiap = function (daftar, fn) { Array.prototype.forEach.call(daftar || [], fn); };

  /* Dropdown di ponsel: footer.php memaksa .dropdown-menu position:fixed; Popper harus menghitung dengan strategi
     fixed juga, kalau tidak menu bergeser sejauh halaman sudah digulir. */
  if (mq.matches && window.bootstrap && bootstrap.Dropdown && bootstrap.Dropdown.Default) {
    var asal = bootstrap.Dropdown.Default.popperConfig;
    bootstrap.Dropdown.Default.popperConfig = function (bawaan) {
      var c = typeof asal === 'function' ? asal(bawaan) : (asal || bawaan);
      return Object.assign({}, c, { strategy: 'fixed' });
    };
  }

  /* ---------- Tabel kartu ---------- */
  var PERAN = { judul: 1, sub: 1, aksi: 1, sembunyi: 1, penuh: 1 };
  function kolom(table) {
    var kepala = table.tHead; if (!kepala || !kepala.rows.length) return [];
    var baris = kepala.rows[kepala.rows.length - 1], hasil = [];
    tiap(baris.cells, function (th) {
      var c = { label: th.hasAttribute('data-label') ? th.getAttribute('data-label') : teks(th), peran: th.getAttribute('data-kk') || '' };
      for (var k = 0; k < (th.colSpan || 1); k++) hasil.push(c);
    });
    return hasil;
  }
  function tandai(table) {
    var cols = kolom(table);
    tiap(table.tBodies, function (tb) {
      tiap(tb.rows, function (tr) {
        var idx = 0;
        if (tr.cells.length === 1 && (tr.cells[0].colSpan || 1) > 1) { tr.cells[0].classList.add('s-kk-baris'); return; }
        tiap(tr.cells, function (td) {
          var c = cols[idx] || {}; idx += td.colSpan || 1;
          if (!td.hasAttribute('data-label')) td.setAttribute('data-label', c.label || '');
          if (c.peran && PERAN[c.peran] && !td.classList.contains('s-kk-' + c.peran)) td.classList.add('s-kk-' + c.peran);
        });
      });
    });
    var w = table.closest('.table-responsive, .dataTables_scrollBody'); if (w && !w.classList.contains('s-kk-wadah')) w.classList.add('s-kk-wadah');
    var sc = table.closest('.dataTables_scroll'); if (sc && !sc.classList.contains('s-kk-scroll')) sc.classList.add('s-kk-scroll');
  }
  function kartu(table) {
    if (!table) { tiap(document.querySelectorAll('table.s-tabel-kartu'), kartu); return; }
    if (!table.classList || !table.classList.contains('s-tabel-kartu') || table.closest('.dataTables_scrollHead, .dataTables_scrollFoot')) return;
    tandai(table);
    if (!table.__kk && window.MutationObserver) {
      var tunda = null;
      table.__kk = new MutationObserver(function () { if (tunda) return; tunda = requestAnimationFrame(function () { tunda = null; tandai(table); }); });
      table.__kk.observe(table, { childList: true, subtree: true });
    }
  }
  window.simakoKartu = kartu;

  /* ---------- Lipat filter ---------- */
  var nLipat = 0;
  function lipat(el) {
    if (!el) { tiap(document.querySelectorAll('.s-lipat'), lipat); return; }
    if (el.__lipat) return; el.__lipat = true;
    if (!el.id) el.id = 's-lipat-' + (++nLipat);
    var b = document.createElement('button');
    b.type = 'button'; b.className = 's-lipat-tombol'; b.setAttribute('aria-controls', el.id);
    b.innerHTML = '<i class="ti ' + (el.getAttribute('data-lipat-ikon') || 'ti-adjustments-horizontal') + '" aria-hidden="true"></i><span></span><em class="s-lipat-n" hidden></em><i class="ti ti-chevron-down s-lipat-panah" aria-hidden="true"></i>';
    b.querySelector('span').textContent = el.getAttribute('data-lipat-judul') || 'Filter';
    el.parentNode.insertBefore(b, el);
    var em = b.querySelector('.s-lipat-n');
    function set(buka) { el.classList.toggle('buka', buka); b.classList.toggle('buka', buka); b.setAttribute('aria-expanded', buka ? 'true' : 'false'); }
    function hitung() {
      var n = 0;
      tiap(el.querySelectorAll('input, select, textarea'), function (i) {
        if (i.hasAttribute('data-lipat-abaikan') || i.disabled || /^(hidden|checkbox|radio|button|submit|reset)$/.test(i.type)) return;
        if (i.tagName === 'SELECT') { if (i.multiple ? i.selectedOptions.length : i.selectedIndex > 0) n++; }
        else if (String(i.value || '').trim() !== '') n++;
      });
      em.textContent = n; em.hidden = !n;
      b.setAttribute('aria-label', b.querySelector('span').textContent + (n ? ', ' + n + ' aktif' : ''));
    }
    set(el.hasAttribute('data-lipat-buka'));
    b.addEventListener('click', function () { set(!el.classList.contains('buka')); });
    el.addEventListener('change', hitung); el.addEventListener('input', hitung); hitung();
  }
  window.simakoLipat = lipat;

  /* ---------- Aksi kepala halaman ---------- */
  function aksiKepala() {
    tiap(document.querySelectorAll('.page-header-right-items-wrapper'), function (w) {
      var aksi = Array.prototype.filter.call(w.children, function (c) {
        if (c.hidden || c.classList.contains('d-none')) return false;
        return c.matches('.btn, .btn-group, .dropdown') || !!c.querySelector(':scope > .btn');
      });
      w.classList.toggle('s-aksi-padat', aksi.length >= 3);
      tiap(w.querySelectorAll(':scope > .btn'), function (b) {
        if (b.classList.contains('btn-primary') || b.classList.contains('dropdown-toggle') || b.classList.contains('s-aksi-ikon-oto')) return;
        var s = b.querySelector(':scope > span'); if (!b.querySelector(':scope > i') || !s || !teks(s)) return;
        b.classList.add('s-aksi-ikon-oto');
        if (!b.getAttribute('aria-label')) b.setAttribute('aria-label', teks(s));
        if (!b.getAttribute('title')) b.setAttribute('title', teks(s));
      });
      if (!w.__ak && window.MutationObserver) {
        w.__ak = new MutationObserver(function () { aksiKepala(); });
        w.__ak.observe(w, { attributes: true, subtree: true, attributeFilter: ['hidden'] });
      }
    });
  }

  /* ---------- Kerangka: laci menu, cari, mode gelap, museum ---------- */
  function kerangka() {
    var nav = document.querySelector('.nxl-navigation'), buka = document.getElementById('mobile-collapse');
    function tutupNav() {
      var ov = nav && nav.querySelector('.nxl-menu-overlay');
      if (ov && window.jQuery) jQuery(ov).trigger('click');
      else if (nav) { nav.classList.remove('mob-navigation-active'); if (ov) ov.remove(); }
    }
    if (nav && window.MutationObserver) {
      new MutationObserver(function () {
        var aktif = nav.classList.contains('mob-navigation-active');
        document.documentElement.classList.toggle('s-nav-buka', aktif && mq.matches);
        if (buka) buka.setAttribute('aria-expanded', aktif ? 'true' : 'false');
        if (aktif && mq.matches) { var t = nav.querySelector('.s-nav-tutup'); if (t) setTimeout(function () { t.focus({ preventScroll: true }); }, 60); }
      }).observe(nav, { attributes: true, attributeFilter: ['class'] });
      if (buka) { buka.setAttribute('aria-expanded', 'false'); buka.setAttribute('aria-controls', 's-laci'); nav.id = nav.id || 's-laci'; }
    }
    tiap(document.querySelectorAll('.s-nav-tutup'), function (b) {
      b.addEventListener('click', function () { tutupNav(); if (buka) buka.focus({ preventScroll: true }); });
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && nav && nav.classList.contains('mob-navigation-active')) { tutupNav(); if (buka) buka.focus({ preventScroll: true }); }
    });
    var cari = document.getElementById('s-cari-ponsel');
    if (cari) cari.addEventListener('click', function () { if (window.simakoSpotlight) simakoSpotlight.open(); });
    tiap(document.querySelectorAll('.s-spot-tutup'), function (b) { b.addEventListener('click', function () { if (window.simakoSpotlight) simakoSpotlight.close(); }); });
    var tema = document.getElementById('s-tema-ponsel');
    function labelTema() {
      if (!tema) return;
      var gelap = document.documentElement.classList.contains('app-skin-dark');
      tema.querySelector('i').className = 'ti me-2 ' + (gelap ? 'ti-sun' : 'ti-moon');
      tema.querySelector('span').textContent = gelap ? 'Mode terang' : 'Mode gelap';
    }
    if (tema) {
      labelTema();
      tema.addEventListener('click', function () {
        var gelap = document.documentElement.classList.contains('app-skin-dark');
        var t = document.querySelector(gelap ? '.dark-light-theme .light-button' : '.dark-light-theme .dark-button');
        if (t) t.click();
        setTimeout(labelTema, 60);
      });
    }
    var sel = document.getElementById('museum'), lbl = document.querySelector('.s-h-museum-teks b');
    if (sel && lbl) sel.addEventListener('change', function () { var o = sel.options[sel.selectedIndex]; if (o) lbl.textContent = o.text; });
  }

  function mulai() { kerangka(); kartu(); lipat(); aksiKepala(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mulai); else mulai();
  if (window.jQuery) jQuery(document).on('init.dt draw.dt', function (e) { if (e.target && e.target.tagName === 'TABLE') kartu(e.target); });
})();
