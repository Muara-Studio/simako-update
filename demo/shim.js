/* SIMAKO demo statis: mesin di peramban (CONTRACT.md, bagian "Perilaku shim").
 *
 * Dimuat sebagai skrip pertama di <head> setiap halaman rekaman:
 *   <script src="/simako-update/demo/shim.js" data-peran="<slug>" data-dasar="/simako-update/"></script>
 * Isinya:
 * - XMLHttpRequest (jQuery, DataTables) dan fetch() ke jalur aplikasi dijawab dari <slug>/_data/index.json.
 *   Urutan cocok: kunci persis, tiruan DataTables dari varian "semua", lalu kunci cadangan jalur.
 * - Tulis tanpa rekaman dijawab JSON demo dan toast. Kiriman formulir, tautan yang mengubah data,
 *   cetak dan ekspor dicegah dengan toast. Keluar kembali ke halaman pilih peran.
 * - Lencana "Demo · <Peran> · Ganti peran" di pojok kanan bawah, bisa ditutup.
 * Kunci rekaman dikanonkan sama dengan mesin/kanon.py. ES2017 tanpa dependensi.
 */
(function (w, d) {
  'use strict';
  if (w.__simakoDemo) return;

  /* ---------- Alamat dasar dan peran ---------- */
  var TOKEN = '__DA' + 'SAR__'; /* dipecah agar bangun.py tidak menggantinya */
  var skrip = d.currentScript || (function () {
    var s = d.querySelectorAll('script[src*="demo/shim.js"]');
    return s[s.length - 1] || null;
  })();

  function rapikanDasar(v) {
    if (/^https?:\/\//i.test(v)) { try { v = new URL(v).pathname; } catch (e) { v = '/'; } }
    v = '/' + String(v).replace(/^\/+|\/+$/g, '') + '/';
    return v === '//' ? '/' : v;
  }
  var DASAR = (skrip && skrip.getAttribute('data-dasar')) || '';
  if (!DASAR || DASAR.indexOf(TOKEN) >= 0) {
    var src = skrip ? skrip.src : '', i0 = src.indexOf('demo/shim.js');
    DASAR = i0 >= 0 ? src.slice(0, i0) : '/';
  }
  DASAR = rapikanDasar(DASAR);

  var LABEL = {
    'super-admin': 'Super Administrator', 'head-of-iha': 'Head of IHA', 'admin-museum': 'Admin Museum',
    'kurator': 'Kurator', 'registrar': 'Registrar', 'konservator': 'Konservator',
    'tim-pengolah-data': 'Tim Pengolah Data SIMAKO'
  };
  var SLUG = (skrip && skrip.getAttribute('data-peran')) || '';
  if (!SLUG) {
    var p0 = w.location.pathname;
    SLUG = p0.indexOf(DASAR) === 0 ? p0.slice(DASAR.length).split('/')[0] : '';
  }
  var PERAN = {}; Object.keys(LABEL).forEach(function (k) { PERAN[k] = 1; }); if (SLUG) PERAN[SLUG] = 1;
  var LABEL_PERAN = (skrip && skrip.getAttribute('data-label')) || LABEL[SLUG] ||
    SLUG.replace(/-/g, ' ').replace(/\b\w/g, function (c) { return c.toUpperCase(); });

  var PESAN_TULIS = 'Mode demo: perubahan tidak disimpan.';
  var PESAN_EKSPOR = 'Mode demo: cetak dan ekspor berkas tidak tersedia.';
  var PESAN_KOSONG = 'Mode demo: data ini tidak tersedia.';
  var JSON_TULIS = { success: false, status: false, ok: false, message: PESAN_TULIS, pesan: PESAN_TULIS };
  var JEDA = 40; /* ms, agar urutan peristiwa sama dengan permintaan jaringan */

  /* ---------- Penggolong alamat ---------- */
  var SEG_STATIS = { assets: 1, themes: 1, media: 1, demo: 1, data_uploads: 1, uploads: 1, 'peran.json': 1, 'index.html': 1, '404.html': 1, 'favicon.ico': 1 };
  var EKST_STATIS = /\.(js|mjs|css|map|png|jpe?g|gif|svg|webp|avif|ico|bmp|woff2?|ttf|otf|eot|json|html?|txt|xml|pdf|mp4|webm|mp3|wav|csv|xlsx?|docx?|zip)$/i;
  var KATA_BAHAYA = ['delete', 'hapus', 'remove', 'destroy', 'setuju', 'tolak', 'approve', 'reject', 'reset', 'restore', 'pulihkan'];
  /* GET lewat AJAX yang mengubah data (misalnya dashboard/change_museum). Daftar sempit: GET "edit" atau "tambah" biasanya hanya membuka formulir. */
  var KATA_UBAH_GET = ['change', 'ganti', 'simpan', 'save', 'update', 'toggle', 'set', 'store', 'insert', 'upload', 'unggah',
    'kirim', 'ajukan', 'batal', 'batalkan', 'kembalikan', 'baca'];
  /* POST yang hanya punya rekaman cadangan: toast bila jalurnya jelas menulis. */
  var KATA_UBAH = KATA_UBAH_GET.concat(['ubah', 'tambah', 'add', 'edit', 'impor', 'import', 'proses', 'putuskan']);
  var KATA_EKSPOR = ['cetak', 'print', 'pdf', 'ekspor', 'export', 'excel', 'xlsx', 'csv', 'unduh', 'download'];

  /* Potongan jalur per kata: "ajukanHapus" -> ajukan, hapus; "delete.5" -> delete, 5 */
  function kataJalur(jalur) {
    var out = [];
    String(jalur || '').split('/').forEach(function (seg) {
      try { seg = decodeURIComponent(seg); } catch (e) {}
      seg.replace(/([a-z0-9])([A-Z])/g, '$1 $2').toLowerCase().split(/[^a-z0-9]+/).forEach(function (k) { if (k) out.push(k); });
    });
    return out;
  }
  function adaKata(jalur, daftar, awalan) {
    var k = kataJalur(jalur);
    for (var i = 0; i < k.length; i++) {
      for (var j = 0; j < daftar.length; j++) {
        if (awalan ? k[i].indexOf(daftar[j]) === 0 : k[i] === daftar[j]) return true;
      }
    }
    return false;
  }
  var bahaya = function (j) { return adaKata(j, KATA_BAHAYA, true); };
  var ubah = function (j) { return adaKata(j, KATA_UBAH, false); };
  var ubahGet = function (j) { return adaKata(j, KATA_UBAH_GET, false); };
  var ekspor = function (j) { return adaKata(j, KATA_EKSPOR, true); };
  var keluar = function (j) { return /(^|\/)(logout|keluar)(\/|$)/i.test(j); };

  /* Jalur aplikasi halaman ini, untuk alamat relatif: /<dasar>/<slug>/koleksi/menu/1.1/ -> /koleksi/menu/1.1 */
  function jalurHalaman() {
    var p = w.location.pathname, awal = DASAR + SLUG;
    if (SLUG && p.indexOf(awal + '/') === 0) p = p.slice(awal.length); else if (SLUG && p === awal) p = '/';
    p = p.replace(/\/index\.html?$/i, '/');
    if (p.length > 1) p = p.replace(/\/+$/, '');
    return p || '/';
  }
  function relatif(s) { return !/^([a-z][a-z0-9+.-]*:|\/|\?|#)/i.test(s); }

  /* Hasil: null (bukan urusan shim) atau {url, jalur, search, hash, luar, relatif, alihkan} */
  function telaah(alamat) {
    if (alamat == null) return null;
    var s = String(alamat && alamat.href ? alamat.href : alamat).trim(), u, rel = false;
    if (/^(javascript|mailto|tel|data|blob|about):/i.test(s)) return null;
    try {
      if (relatif(s) && SLUG && !d.querySelector('base[href]')) {
        rel = true;
        u = new URL(s, w.location.origin + DASAR + SLUG + jalurHalaman());
      } else {
        u = new URL(s, d.baseURI);
      }
    } catch (e) { return null; }
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
    var sama = u.origin === w.location.origin;
    var luar = !sama && /^(localhost|127\.0\.0\.1|0\.0\.0\.0)$/i.test(u.hostname) && /^808[0-9]$/.test(u.port);
    if (!sama && !luar) return null;
    var p = u.pathname, jalur = null;
    if (luar) {
      jalur = p;
    } else if (p.indexOf(DASAR) === 0 || p + '/' === DASAR) {
      var sisa = p.slice(DASAR.length), seg = sisa.split('/')[0];
      if (PERAN[seg]) {
        jalur = sisa.slice(seg.length) || '/';
        if (/^\/_data(\/|$)/.test(jalur)) return null;
        if (/\/index\.html?$/i.test(jalur)) return null;
      } else if (SEG_STATIS[seg] || seg === '' || EKST_STATIS.test(sisa)) {
        return null;
      } else {
        jalur = '/' + sisa;
      }
    } else {
      if (EKST_STATIS.test(p)) return null;
      jalur = p;
    }
    jalur = jalur.replace(/\/{2,}/g, '/');
    var info = { url: u.href, jalur: jalur, search: u.search, hash: u.hash, luar: luar, relatif: rel, alihkan: null };
    /* Berkas statis yang dipanggil lewat alamat aplikasi: satu salinan bersama di dasar. */
    var m = /^\/(assets|themes|data_uploads)\/(.+)$/.exec(jalur);
    if (m) info.alihkan = DASAR + m[1] + '/' + m[2] + u.search;
    m = /^\/koleksi\/getImage\/([^/]+)$/i.exec(jalur);
    if (m) info.alihkan = DASAR + 'media/' + m[1];
    m = /^\/kondisi\/foto\/(\d+)$/i.exec(jalur);
    if (m) info.alihkan = DASAR + 'media/kondisi-foto-' + m[1] + '.jpg';
    return info;
  }

  /* ---------- Kunci kanon (sama dengan kanon() di perekam/rekam.mjs dan mesin/kanon.py) ---------- */
  var ABAIKAN = { '_': 1, draw: 1, simako_csrf: 1, csrf_token: 1, t: 1, ts: 1, timestamp: 1, waktu: 1, nocache: 1 };
  function abaikan(k, v) { return ABAIKAN[k] === 1 || (/^\d{13}$/.test(String(v)) && /^(_|t|ts|time|waktu|cache)/i.test(k)); }
  function urai(s) {
    if (s == null || s === '') return [];
    return String(s).replace(/^\?/, '').split('&').filter(Boolean).map(function (bag) {
      var i = bag.indexOf('='), k = i < 0 ? bag : bag.slice(0, i), v = i < 0 ? '' : bag.slice(i + 1);
      return [dekode(k), dekode(v)];
    });
  }
  function dekode(s) { try { return decodeURIComponent(s.replace(/\+/g, ' ')); } catch (e) { return s; } }
  function urutStabil(arr, fn) {
    return arr.map(function (x, i) { return [x, i]; })
      .sort(function (a, b) { return fn(a[0], b[0]) || a[1] - b[1]; })
      .map(function (x) { return x[0]; });
  }
  function banding(a, b) { return a < b ? -1 : a > b ? 1 : 0; }
  function kanonPasangan(ps) {
    return urutStabil(ps.filter(function (p) { return !abaikan(p[0], p[1]); }), function (a, b) { return banding(a[0], b[0]); })
      .map(function (p) { return p[0] + '=' + p[1]; }).join('&');
  }
  /* JSON: kunci diurutkan dan kunci ABAIKAN dibuang di semua tingkat, tanpa spasi. */
  function jsonUrut(v) {
    if (Array.isArray(v)) return '[' + v.map(function (x) { return x === undefined ? 'null' : jsonUrut(x); }).join(',') + ']';
    if (v && typeof v === 'object') {
      return '{' + Object.keys(v).filter(function (k) { return ABAIKAN[k] !== 1 && v[k] !== undefined; }).sort(banding)
        .map(function (k) { return JSON.stringify(k) + ':' + jsonUrut(v[k]); }).join(',') + '}';
    }
    return JSON.stringify(v);
  }
  /* body: {jenis: 'form', pasangan} | {jenis: 'json', nilai} | {jenis: 'mentah', teks} | null */
  function kanonBody(b) {
    if (!b) return '';
    if (b.jenis === 'json') return jsonUrut(b.nilai);
    if (b.jenis === 'mentah') return b.teks;
    return kanonPasangan(b.pasangan || []);
  }
  function rapikanJalur(j) {
    j = String(j || '/').replace(/\/{2,}/g, '/');
    if (j.charAt(0) !== '/') j = '/' + j;
    if (j.length > 1) j = j.replace(/\/+$/, '');
    return j;
  }
  function kunci(metode, jalur, query, body) {
    var k = String(metode).toUpperCase() + ' ' + rapikanJalur(jalur);
    var q = kanonPasangan(query || []);
    if (q) k += '?' + q;
    var b = kanonBody(body);
    if (b) k += '#' + b;
    return k;
  }
  /* Seperti perekam: JSON hanya bila Content-Type menyebut json (tebak=true untuk kunci rekaman yang diurai ulang). */
  function bodyDariTeks(s, tipe, tebak) {
    if (s == null || s === '') return null;
    s = String(s);
    if (/multipart/i.test(tipe || '') || (tebak && s === 'multipart')) return { jenis: 'mentah', teks: 'multipart' };
    var t = s.replace(/^\s+/, '');
    if (/json/i.test(tipe || '') || (tebak && (t.charAt(0) === '{' || t.charAt(0) === '['))) {
      try { return { jenis: 'json', nilai: JSON.parse(s) }; } catch (e) { return { jenis: 'mentah', teks: s }; }
    }
    return { jenis: 'form', pasangan: urai(s) };
  }
  /* Kunci rekaman dari perekam diurai lalu dikanonkan ulang, agar beda format kecil tetap cocok. */
  function uraiKunci(k) {
    var sp = k.indexOf(' ');
    if (sp < 1) return null;
    var metode = k.slice(0, sp).toUpperCase(), sisa = k.slice(sp + 1), body = null, query = [];
    var ih = sisa.indexOf('#');
    if (ih >= 0) { body = bodyDariTeks(sisa.slice(ih + 1), '', true); sisa = sisa.slice(0, ih); }
    var iq = sisa.indexOf('?');
    if (iq >= 0) { query = urai(sisa.slice(iq + 1)); sisa = sisa.slice(0, iq); }
    var jalur = sisa;
    try { jalur = new URL(sisa, 'http://x').pathname; } catch (e) {}
    return { metode: metode, jalur: rapikanJalur(jalur), query: query, body: body };
  }

  /* ---------- DataTables ---------- */
  var PARAM_DT = /^(draw|start|length|columns\[|order\[|search\[)/;
  function peta(ps) { var m = {}; ps.forEach(function (p) { if (!(p[0] in m)) m[p[0]] = p[1]; }); return m; }
  function paramPermintaan(r) {
    var ps = (r.query || []).slice();
    if (r.body && r.body.jenis === 'form') ps = ps.concat(r.body.pasangan);
    if (r.body && r.body.jenis === 'json' && r.body.nilai && typeof r.body.nilai === 'object') {
      ps = ps.concat(Object.keys(r.body.nilai).map(function (k) { var v = r.body.nilai[k]; return [k, typeof v === 'object' ? JSON.stringify(v) : String(v)]; }));
    }
    return ps;
  }
  function apakahDt(m) { return 'draw' in m || ('start' in m && 'length' in m); }
  function tandaFilter(ps) { return kanonPasangan(ps.filter(function (p) { return !PARAM_DT.test(p[0]); })); }
  function polosTeks(v) {
    if (v == null) return '';
    if (typeof v === 'object') v = Object.keys(v).map(function (k) { return polosTeks(v[k]); }).join(' ');
    return String(v).replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/\s+/g, ' ').trim();
  }
  function ambilSel(baris, kunciData) {
    if (Array.isArray(baris)) return baris[parseInt(kunciData, 10)];
    if (baris && typeof baris === 'object') {
      return String(kunciData).split('.').reduce(function (o, k) { return o == null ? o : o[k]; }, baris);
    }
    return baris;
  }
  function kolomDt(m) {
    var kol = [];
    for (var i = 0; ('columns[' + i + '][data]') in m || ('columns[' + i + '][searchable]') in m; i++) {
      var dk = m['columns[' + i + '][data]'];
      kol.push({ data: dk === '' || dk == null ? i : dk, cari: m['columns[' + i + '][searchable]'] !== 'false', nilai: m['columns[' + i + '][search][value]'] || '' });
    }
    return kol;
  }
  function kataCari(s) {
    var m = String(s).match(/"[^"]+"|\S+/g) || [];
    return m.map(function (x) { return x.replace(/^"|"$/g, '').toLowerCase(); }).filter(Boolean);
  }
  function tiruDt(teks, m) {
    var j = JSON.parse(teks), kunciBaris = Array.isArray(j.data) ? 'data' : Array.isArray(j.aaData) ? 'aaData' : null;
    if (!kunciBaris) { Object.keys(j).some(function (k) { if (Array.isArray(j[k])) { kunciBaris = k; return true; } return false; }); }
    if (!kunciBaris) return teks;
    var semua = j[kunciBaris], kol = kolomDt(m);
    var baris = semua.map(function (b, i) { return { b: b, i: i }; });
    var global = kataCari(m['search[value]'] || '');
    if (global.length) {
      baris = baris.filter(function (x) {
        var t = kol.length ? kol.filter(function (c) { return c.cari; }).map(function (c) { return polosTeks(ambilSel(x.b, c.data)); }).join(' ') : polosTeks(x.b);
        t = t.toLowerCase();
        return global.every(function (w0) { return t.indexOf(w0) >= 0; });
      });
    }
    kol.forEach(function (c) {
      if (!c.nilai) return;
      var kk = kataCari(c.nilai);
      baris = baris.filter(function (x) { var t = polosTeks(ambilSel(x.b, c.data)).toLowerCase(); return kk.every(function (w0) { return t.indexOf(w0) >= 0; }); });
    });
    var urut = [];
    for (var o = 0; ('order[' + o + '][column]') in m; o++) {
      var ci = parseInt(m['order[' + o + '][column]'], 10);
      urut.push({ data: kol[ci] ? kol[ci].data : ci, turun: String(m['order[' + o + '][dir]']).toLowerCase() === 'desc' });
    }
    if (urut.length) {
      var angka = /^-?\d+(?:[.,]\d+)?$/;
      baris.sort(function (a, b) {
        for (var k = 0; k < urut.length; k++) {
          var va = polosTeks(ambilSel(a.b, urut[k].data)), vb = polosTeks(ambilSel(b.b, urut[k].data)), h;
          if (angka.test(va) && angka.test(vb)) h = parseFloat(va.replace(',', '.')) - parseFloat(vb.replace(',', '.'));
          else h = va.localeCompare(vb, 'id', { numeric: true, sensitivity: 'base' });
          if (h) return urut[k].turun ? -h : h;
        }
        return a.i - b.i;
      });
    }
    var mulai = Math.max(0, parseInt(m.start, 10) || 0), panjang = parseInt(m.length, 10);
    var hal = isNaN(panjang) || panjang < 0 ? baris.slice(mulai) : baris.slice(mulai, mulai + panjang);
    j[kunciBaris] = hal.map(function (x) { return x.b; });
    var draw = parseInt(m.draw, 10) || 0;
    if ('aaData' === kunciBaris || 'iTotalRecords' in j) {
      j.sEcho = draw; j.iTotalRecords = semua.length; j.iTotalDisplayRecords = baris.length;
    }
    j.draw = draw; j.recordsTotal = semua.length; j.recordsFiltered = baris.length;
    return JSON.stringify(j);
  }
  function gantiDraw(teks, m) {
    try {
      var j = JSON.parse(teks);
      if (j && typeof j === 'object' && !Array.isArray(j)) { j.draw = parseInt(m.draw, 10) || 0; return JSON.stringify(j); }
    } catch (e) {}
    return teks;
  }

  /* ---------- Rekaman ---------- */
  var asliFetch = typeof w.fetch === 'function' ? w.fetch.bind(w) : null;
  var XP = w.XMLHttpRequest && w.XMLHttpRequest.prototype;
  var xhrAsli = XP ? { open: XP.open, send: XP.send, set: XP.setRequestHeader, abort: XP.abort, get: XP.getResponseHeader, all: XP.getAllResponseHeaders } : null;
  var INDEKS = { peta: Object.create(null), semua: Object.create(null), muat: false };
  var cacheIsi = Object.create(null);
  var urlData = DASAR + SLUG + '/_data/';

  /* Isi jawaban gagal (404.html dari Pages) dibuang agar koneksi selesai. */
  function buang(r) { try { if (r.body) r.body.cancel().catch(function () {}); } catch (e) {} }
  function susunIndeks(data) {
    var entri = (data && data.entri) || {};
    Object.keys(entri).forEach(function (k) { INDEKS.peta[k] = entri[k]; });
    Object.keys(entri).forEach(function (k) {
      var e = entri[k], p = uraiKunci(k);
      if (!p) return;
      var kn = kunci(p.metode, p.jalur, p.query, p.body);
      if (!(kn in INDEKS.peta)) INDEKS.peta[kn] = e;
      var cad = p.metode + ' ' + p.jalur;
      if (!(cad in INDEKS.peta)) INDEKS.peta[cad] = e;
      if (e.semua) {
        var ps = p.query.slice();
        if (p.body && p.body.jenis === 'form') ps = ps.concat(p.body.pasangan);
        (INDEKS.semua[cad] = INDEKS.semua[cad] || []).push({ e: e, tanda: tandaFilter(ps) });
      }
    });
    INDEKS.muat = true;
    return INDEKS;
  }
  function ambilTeksSinkron(url) {
    var x = new w.XMLHttpRequest();
    xhrAsli.open.call(x, 'GET', url, false);
    try { xhrAsli.send.call(x); } catch (e) { return null; }
    var st = Object.getOwnPropertyDescriptor(XP, 'status');
    return { s: st && st.get ? st.get.call(x) : 0, x: x };
  }
  var siap = (function () {
    var url = urlData + 'index.json';
    var p = asliFetch
      ? asliFetch(url, { credentials: 'same-origin' }).then(function (r) { if (r.ok) return r.json(); buang(r); return null; })
      : Promise.reject(new Error('fetch tidak ada'));
    return p.catch(function () { return null; }).then(susunIndeks);
  })();

  function isiRekaman(e) {
    var f = e.f || '';
    if (!cacheIsi[f]) {
      cacheIsi[f] = (f ? asliFetch(urlData + f, { credentials: 'same-origin' }).then(function (r) {
        if (!r.ok) { buang(r); throw new Error('isi rekaman tidak ada: ' + f); }
        return r.arrayBuffer();
      }) : Promise.resolve(new ArrayBuffer(0))).then(function (buf) {
        return { buf: buf, teks: new TextDecoder('utf-8').decode(buf) };
      });
      cacheIsi[f].catch(function () { delete cacheIsi[f]; });
    }
    return cacheIsi[f];
  }

  var log = [];
  function catat(r, k, cara) {
    log.push({ metode: r.metode, jalur: r.jalur, kunci: k, cara: cara, waktu: Date.now() });
    if (log.length > 300) log.shift();
  }
  var TEKS_STATUS = { 200: 'OK', 201: 'Created', 204: 'No Content', 400: 'Bad Request', 403: 'Forbidden', 404: 'Not Found', 500: 'Internal Server Error' };
  function respons(status, tipe, teks, buf) {
    return { status: status, statusText: TEKS_STATUS[status] || '', tipe: tipe, teks: teks == null ? '' : teks, buf: buf || null };
  }
  function responsJson(status, obj) { return respons(status, 'application/json; charset=utf-8', JSON.stringify(obj)); }
  function mauHtml(r) { var a = String(r.h.accept || ''); return /text\/html/i.test(a) && !/json/i.test(a); }
  function responsHtml(pesan) { return respons(200, 'text/html; charset=utf-8', '<div class="demo-kosong" role="note">' + pesan + '</div>'); }

  /* r: {metode, jalur, query, body, h, url} */
  function jawab(r) {
    return siap.then(function () {
      var k = kunci(r.metode, r.jalur, r.query, r.body), ps = paramPermintaan(r), m = peta(ps), dt = apakahDt(m);
      var e = INDEKS.peta[k];
      if (e) {
        catat(r, k, 'persis');
        return isiRekaman(e).then(function (x) {
          var teks = e.dt && dt ? gantiDraw(x.teks, m) : x.teks;
          return respons(e.s || 200, e.t || 'application/json', teks, teks === x.teks ? x.buf : null);
        });
      }
      var cad = r.metode.replace(/^HEAD$/, 'GET') + ' ' + rapikanJalur(r.jalur);
      if (dt && INDEKS.semua[cad]) {
        var calon = INDEKS.semua[cad], tanda = tandaFilter(ps), pilih = null;
        calon.forEach(function (c) { if (!pilih && c.tanda === tanda) pilih = c; });
        if (!pilih) pilih = calon.slice().sort(function (a, b) { return a.tanda.length - b.tanda.length; })[0];
        catat(r, k, pilih.tanda === tanda ? 'semua' : 'semua-lain');
        return isiRekaman(pilih.e).then(function (x) {
          return respons(pilih.e.s || 200, pilih.e.t || 'application/json', tiruDt(x.teks, m));
        });
      }
      var ec = INDEKS.peta[cad];
      if (ec) {
        catat(r, k, 'cadangan');
        if (r.metode !== 'GET' && r.metode !== 'HEAD' && (bahaya(r.jalur) || ubah(r.jalur))) toast(PESAN_TULIS);
        return isiRekaman(ec).then(function (x) {
          var teks = ec.dt && dt ? gantiDraw(x.teks, m) : x.teks;
          return respons(ec.s || 200, ec.t || 'application/json', teks, teks === x.teks ? x.buf : null);
        });
      }
      if (ekspor(r.jalur)) {
        catat(r, k, 'ekspor');
        toast(PESAN_EKSPOR);
        return responsJson(404, { success: false, status: false, ok: false, message: PESAN_EKSPOR, pesan: PESAN_EKSPOR });
      }
      if ((r.metode !== 'GET' && r.metode !== 'HEAD') || bahaya(r.jalur) || ubahGet(r.jalur)) {
        if (dt) { catat(r, k, 'kosong'); return responsJson(200, { draw: parseInt(m.draw, 10) || 0, recordsTotal: 0, recordsFiltered: 0, data: [] }); }
        catat(r, k, 'tulis');
        toast(PESAN_TULIS);
        return mauHtml(r) ? responsHtml(PESAN_TULIS) : responsJson(200, JSON_TULIS);
      }
      if (dt) { catat(r, k, 'kosong'); return responsJson(200, { draw: parseInt(m.draw, 10) || 0, recordsTotal: 0, recordsFiltered: 0, data: [] }); }
      catat(r, k, 'tidak-ada');
      return mauHtml(r) ? responsHtml('Bagian ini tidak termasuk demo.')
        : responsJson(404, { success: false, status: false, ok: false, data: [], message: PESAN_KOSONG, pesan: PESAN_KOSONG });
    }).catch(function (err) {
      catat(r, '', 'galat');
      if (w.console) w.console.warn('[demo] rekaman gagal dimuat', err);
      return responsJson(404, { success: false, status: false, ok: false, message: PESAN_KOSONG, pesan: PESAN_KOSONG });
    });
  }

  function bodyPermintaan(body, h) {
    if (body == null) return null;
    if (typeof body === 'string') return bodyDariTeks(body, h['content-type']);
    if (w.URLSearchParams && body instanceof w.URLSearchParams) return { jenis: 'form', pasangan: Array.from(body.entries()) };
    if (w.FormData && body instanceof w.FormData) return { jenis: 'mentah', teks: 'multipart' };
    return null; /* Blob, ArrayBuffer, Document: unggahan, cukup jalur */
  }
  function permintaan(metode, info, body, h) {
    return { metode: String(metode || 'GET').toUpperCase(), jalur: info.jalur, query: urai(info.search), body: bodyPermintaan(body, h || {}), h: h || {}, url: info.url };
  }

  /* ---------- XMLHttpRequest ---------- */
  function picu(sasaran, jenis, n) {
    var ev;
    try {
      ev = /^(load|loadend|loadstart|progress|abort|error|timeout)$/.test(jenis) && typeof w.ProgressEvent === 'function'
        ? new w.ProgressEvent(jenis, { lengthComputable: n != null, loaded: n || 0, total: n || 0 })
        : new w.Event(jenis);
    } catch (e) { ev = d.createEvent('Event'); ev.initEvent(jenis, false, false); }
    try { sasaran.dispatchEvent(ev); } catch (e) { setTimeout(function () { throw e; }); }
  }
  function antar(xhr, dm, res) {
    if (dm.batal || xhr.__demo !== dm) return;
    var n = res.teks.length;
    if (dm.unggah) { picu(xhr.upload, 'progress', 1); picu(xhr.upload, 'load', 1); picu(xhr.upload, 'loadend', 1); }
    dm.res = res;
    dm.rs = 2; picu(xhr, 'readystatechange');
    dm.rs = 3; picu(xhr, 'readystatechange'); picu(xhr, 'progress', n);
    dm.rs = 4; picu(xhr, 'readystatechange');
    picu(xhr, 'load', n); picu(xhr, 'loadend', n);
  }
  if (XP && !XP.__simakoDemo) {
    XP.__simakoDemo = true;
    XP.open = function (metode, alamat) {
      var args = Array.prototype.slice.call(arguments), info = null;
      try { info = telaah(alamat); } catch (e) { info = null; }
      this.__demo = null;
      if (info && info.alihkan) { args[1] = info.alihkan; }
      else if (info) { this.__demo = { metode: String(metode || 'GET').toUpperCase(), info: info, async: args.length < 3 || args[2] !== false, h: {}, rs: 1 }; }
      return xhrAsli.open.apply(this, args);
    };
    XP.setRequestHeader = function (k, v) {
      var dm = this.__demo;
      if (dm) { dm.h[String(k).toLowerCase()] = String(v); return undefined; }
      return xhrAsli.set.apply(this, arguments);
    };
    XP.send = function (body) {
      var dm = this.__demo;
      if (!dm) return xhrAsli.send.apply(this, arguments);
      if (dm.terkirim) throw new DOMException('Permintaan sudah dikirim.', 'InvalidStateError');
      dm.terkirim = true;
      dm.unggah = body != null && typeof body !== 'string';
      var xhr = this, r = permintaan(dm.metode, dm.info, body, dm.h);
      picu(xhr, 'loadstart', 0);
      if (dm.unggah) picu(xhr.upload, 'loadstart', 0);
      if (!dm.async) { antar(xhr, dm, jawabSinkron(r)); return undefined; }
      jawab(r).then(function (res) { setTimeout(function () { antar(xhr, dm, res); }, JEDA); });
      return undefined;
    };
    XP.abort = function () {
      var dm = this.__demo;
      if (!dm) return xhrAsli.abort.apply(this, arguments);
      if (dm.terkirim && dm.rs < 4 && !dm.batal) {
        dm.batal = true; dm.res = respons(0, '', '');
        dm.rs = 4; picu(this, 'readystatechange'); picu(this, 'abort'); picu(this, 'loadend');
      }
      dm.rs = 0;
      return undefined;
    };
    XP.getResponseHeader = function (nama) {
      var dm = this.__demo;
      if (!dm) return xhrAsli.get.apply(this, arguments);
      if (dm.rs < 2 || !dm.res || dm.batal) return null;
      return String(nama).toLowerCase() === 'content-type' && dm.res.tipe ? dm.res.tipe : null;
    };
    XP.getAllResponseHeaders = function () {
      var dm = this.__demo;
      if (!dm) return xhrAsli.all.apply(this, arguments);
      return dm.rs < 2 || !dm.res || dm.batal || !dm.res.tipe ? '' : 'content-type: ' + dm.res.tipe + '\r\n';
    };
    var timpa = function (nama, fn) {
      var desk = Object.getOwnPropertyDescriptor(XP, nama);
      if (!desk || !desk.get) return;
      Object.defineProperty(XP, nama, {
        configurable: true, enumerable: desk.enumerable, set: desk.set,
        get: function () { var dm = this.__demo; return dm ? fn.call(this, dm) : desk.get.call(this); }
      });
    };
    timpa('readyState', function (dm) { return dm.rs; });
    timpa('status', function (dm) { return dm.rs >= 2 && dm.res ? dm.res.status : 0; });
    timpa('statusText', function (dm) { return dm.rs >= 2 && dm.res ? dm.res.statusText : ''; });
    timpa('responseURL', function (dm) { return dm.rs >= 2 ? dm.info.url : ''; });
    timpa('responseText', function (dm) { return dm.rs >= 3 && dm.res ? dm.res.teks : ''; });
    timpa('responseXML', function (dm) {
      if (dm.rs < 4 || !dm.res || !/(xml|html)/i.test(dm.res.tipe)) return null;
      try { return new DOMParser().parseFromString(dm.res.teks, /html/i.test(dm.res.tipe) ? 'text/html' : 'application/xml'); } catch (e) { return null; }
    });
    timpa('response', function (dm) {
      var jenis = this.responseType || '';
      if (jenis === '' || jenis === 'text') return dm.rs >= 3 && dm.res ? dm.res.teks : '';
      if (dm.rs < 4 || !dm.res) return null;
      var buf = dm.res.buf || new TextEncoder().encode(dm.res.teks).buffer;
      if (jenis === 'json') { try { return JSON.parse(dm.res.teks); } catch (e) { return null; } }
      if (jenis === 'arraybuffer') return buf;
      if (jenis === 'blob') return new Blob([buf], { type: dm.res.tipe });
      if (jenis === 'document') { try { return new DOMParser().parseFromString(dm.res.teks, 'text/html'); } catch (e) { return null; } }
      return dm.res.teks;
    });
  }

  /* Permintaan sinkron (jarang): baca indeks dan isi lewat XHR sinkron asli. */
  function jawabSinkron(r) {
    if (!INDEKS.muat) {
      var hi = ambilTeksSinkron(urlData + 'index.json');
      try { if (hi && hi.s === 200) susunIndeks(JSON.parse(hi.x.responseText)); else susunIndeks(null); } catch (e) { susunIndeks(null); }
    }
    var k = kunci(r.metode, r.jalur, r.query, r.body), e = INDEKS.peta[k] || INDEKS.peta[r.metode + ' ' + rapikanJalur(r.jalur)];
    if (e) {
      var hb = ambilTeksSinkron(urlData + e.f);
      if (hb && hb.s === 200) { catat(r, k, 'sinkron'); return respons(e.s || 200, e.t || 'application/json', hb.x.responseText); }
    }
    catat(r, k, 'sinkron-kosong');
    if (r.metode !== 'GET' && r.metode !== 'HEAD') { toast(PESAN_TULIS); return responsJson(200, JSON_TULIS); }
    return responsJson(404, { success: false, status: false, ok: false, message: PESAN_KOSONG, pesan: PESAN_KOSONG });
  }

  /* ---------- fetch ---------- */
  if (asliFetch) {
    w.fetch = function (masukan, opsi) {
      var req = typeof w.Request === 'function' && masukan instanceof w.Request ? masukan : null, info = null;
      try { info = telaah(req ? req.url : masukan); } catch (e) { info = null; }
      if (!info) return asliFetch(masukan, opsi);
      if (info.alihkan) return asliFetch(req ? new w.Request(info.alihkan, req) : info.alihkan, opsi);
      var metode = String((opsi && opsi.method) || (req ? req.method : 'GET')).toUpperCase();
      var h = {};
      try { new w.Headers((opsi && opsi.headers) || (req ? req.headers : undefined)).forEach(function (v, k) { h[k.toLowerCase()] = v; }); } catch (e) {}
      var sinyal = (opsi && opsi.signal) || (req ? req.signal : null);
      var batal = function () { return new DOMException('Permintaan dibatalkan.', 'AbortError'); };
      if (sinyal && sinyal.aborted) return Promise.reject(batal());
      var bodyP = opsi && opsi.body != null ? Promise.resolve(opsi.body)
        : req && metode !== 'GET' && metode !== 'HEAD' ? req.clone().text().catch(function () { return null; }) : Promise.resolve(null);
      return bodyP.then(function (body) { return jawab(permintaan(metode, info, body, h)); }).then(function (res) {
        return new Promise(function (ok, gagal) {
          setTimeout(function () {
            if (sinyal && sinyal.aborted) return gagal(batal());
            var tanpaIsi = res.status === 204 || res.status === 304 || metode === 'HEAD';
            try {
              ok(new w.Response(tanpaIsi ? null : (res.buf || res.teks), { status: res.status || 200, statusText: res.statusText, headers: { 'Content-Type': res.tipe || 'text/plain' } }));
            } catch (e) { gagal(e); }
          }, JEDA);
        });
      });
    };
  }

  /* navigator.sendBeacon ke jalur aplikasi: dianggap terkirim, tidak ada jaringan. */
  var nav = w.navigator;
  if (nav && typeof nav.sendBeacon === 'function') {
    var asliBeacon = nav.sendBeacon;
    nav.sendBeacon = function (alamat) {
      var info = null;
      try { info = telaah(alamat); } catch (e) {}
      if (info && !info.alihkan) { catat({ metode: 'POST', jalur: info.jalur }, '', 'beacon'); return true; }
      return asliBeacon.apply(nav, arguments);
    };
  }

  /* ---------- Navigasi: tautan, formulir, window.open ---------- */
  function keDasarPeran(info) { return DASAR + SLUG + rapikanJalur(info.jalur).replace(/\/?$/, '/') + (info.search || '') + (info.hash || ''); }
  function keluarDemo() {
    try { w.sessionStorage.removeItem('simako-demo-lencana'); } catch (e) {}
    w.location.href = DASAR;
  }
  /* Penjaga stopPropagation: penangan halaman yang menghentikan rambatan tetap melewati pemeriksaan shim. */
  function jaga(e, periksa) {
    var sp = e.stopPropagation, sip = e.stopImmediatePropagation, jalan = function () {
      if (e.__demoJaga) return;
      e.__demoJaga = true;
      Promise.resolve().then(function () { periksa(e); });
    };
    try {
      e.stopPropagation = function () { jalan(); return sp.apply(this, arguments); };
      e.stopImmediatePropagation = function () { jalan(); return sip.apply(this, arguments); };
    } catch (er) {}
  }
  function periksaKlik(e) {
    if (e.__demoKlik) return;
    e.__demoKlik = true;
    if (e.defaultPrevented || e.button > 0) return;
    var a = e.target && e.target.closest ? e.target.closest('a[href]') : null;
    if (!a || a.hasAttribute('data-demo-lewat')) return;
    var href = a.getAttribute('href') || '';
    if (!href || href.charAt(0) === '#') return;
    var info = telaah(href);
    if (!info || info.alihkan) return;
    if (keluar(info.jalur)) { e.preventDefault(); keluarDemo(); return; }
    if (bahaya(info.jalur)) { e.preventDefault(); toast(PESAN_TULIS); return; }
    if (ekspor(info.jalur)) { e.preventDefault(); toast(PESAN_EKSPOR); return; }
    var baru = e.metaKey || e.ctrlKey || e.shiftKey || (a.target && a.target !== '_self');
    if ((info.relatif || info.luar) && !baru) { e.preventDefault(); w.location.href = keDasarPeran(info); }
  }
  function infoFormulir(f, tombol) {
    var metode = String((tombol && tombol.getAttribute && tombol.getAttribute('formmethod')) || f.getAttribute('method') || 'get').toLowerCase();
    var aksi = String((tombol && tombol.getAttribute && tombol.getAttribute('formaction')) || f.getAttribute('action') || '').trim();
    var info = aksi ? telaah(aksi) : { url: w.location.href, jalur: jalurHalaman(), search: '', hash: '', luar: false, relatif: false, alihkan: null };
    return { metode: metode, info: info };
  }
  /* true bila formulir boleh jalan sendiri (tujuan di luar demo atau berkas statis); selain itu shim yang menangani */
  function tanganiFormulir(f, tombol) {
    var x = infoFormulir(f, tombol);
    if (x.metode === 'dialog' || !x.info || x.info.alihkan) return true;
    if (x.metode === 'get' && !bahaya(x.info.jalur) && !ekspor(x.info.jalur) && !keluar(x.info.jalur)) {
      var q = '';
      try { q = new URLSearchParams(tombol ? new FormData(f, tombol) : new FormData(f)).toString(); }
      catch (e) { try { q = new URLSearchParams(new FormData(f)).toString(); } catch (e2) {} }
      w.location.href = DASAR + SLUG + rapikanJalur(x.info.jalur).replace(/\/?$/, '/') + (q ? '?' + q : '');
      return false;
    }
    if (keluar(x.info.jalur)) { keluarDemo(); return false; }
    toast(ekspor(x.info.jalur) ? PESAN_EKSPOR : PESAN_TULIS);
    return false;
  }
  function periksaKirim(e) {
    if (e.__demoKirim) return;
    e.__demoKirim = true;
    if (e.defaultPrevented) return;
    var f = e.target;
    if (!f || f.nodeName !== 'FORM') return;
    if (!tanganiFormulir(f, e.submitter || null)) e.preventDefault();
  }
  w.addEventListener('click', function (e) { jaga(e, periksaKlik); }, true);
  w.addEventListener('click', periksaKlik, false);
  w.addEventListener('submit', function (e) { jaga(e, periksaKirim); }, true);
  w.addEventListener('submit', periksaKirim, false);

  var FP = w.HTMLFormElement && w.HTMLFormElement.prototype;
  if (FP && typeof FP.submit === 'function' && !FP.__simakoDemo) {
    FP.__simakoDemo = true;
    var asliSubmit = FP.submit;
    FP.submit = function () { if (tanganiFormulir(this, null)) return asliSubmit.apply(this, arguments); return undefined; };
  }
  if (typeof w.open === 'function') {
    var asliOpen = w.open;
    w.open = function (alamat) {
      var info = null;
      try { info = alamat ? telaah(alamat) : null; } catch (e) {}
      if (info && !info.alihkan) {
        if (keluar(info.jalur)) { keluarDemo(); return null; }
        if (bahaya(info.jalur)) { toast(PESAN_TULIS); return null; }
        if (ekspor(info.jalur)) { toast(PESAN_EKSPOR); return null; }
        if (info.relatif || info.luar) { var args = Array.prototype.slice.call(arguments); args[0] = keDasarPeran(info); return asliOpen.apply(w, args); }
      }
      return asliOpen.apply(w, arguments);
    };
  }

  /* Gambar yang memakai alamat aplikasi (koleksi/getImage, assets di bawah peran, localhost): coba salinan bersama. */
  w.addEventListener('error', function (e) {
    var el = e.target;
    if (!el || el.nodeName !== 'IMG' || el.__demoGambar) return;
    var info = null;
    try { info = telaah(el.getAttribute('src')); } catch (er) {}
    if (info && info.alihkan) { el.__demoGambar = true; el.src = info.alihkan; }
  }, true);

  /* ---------- Toast dan lencana ---------- */
  var IKON = {
    info: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 12a9 9 0 1 0 18 0a9 9 0 0 0 -18 0"/><path d="M12 9h.01"/><path d="M11 12h1v4h1"/></svg>',
    flask: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 3l6 0"/><path d="M10 9l4 0"/><path d="M10 3v6l-4 11a.7 .7 0 0 0 .5 1h11a.7 .7 0 0 0 .5 -1l-4 -11v-6"/></svg>',
    x: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6l-12 12"/><path d="M6 6l12 12"/></svg>'
  };
  var wadahToast = null, toastEl = null, toastTimer = null, antreToast = null, lencana = null;
  function siapkanDom() {
    if (wadahToast || !d.body) return;
    wadahToast = d.createElement('div');
    wadahToast.className = 'demo-toast-wadah';
    wadahToast.setAttribute('role', 'status');
    wadahToast.setAttribute('aria-live', 'polite');
    d.body.appendChild(wadahToast);
    pasangLencana();
    aturPosisi();
    var lama = toastTersimpan();
    if (antreToast) { var t = antreToast; antreToast = null; toast(t, true); }
    else if (lama) toast(lama, true);
  }
  /* Toast yang muncul tepat sebelum halaman dimuat ulang (misalnya ganti museum) ditampilkan lagi di halaman berikutnya. */
  var KUNCI_TOAST = 'simako-demo-toast';
  function simpanToast(pesan) { try { w.sessionStorage.setItem(KUNCI_TOAST, JSON.stringify({ p: pesan, t: Date.now() })); } catch (e) {} }
  function hapusToastTersimpan() { try { w.sessionStorage.removeItem(KUNCI_TOAST); } catch (e) {} }
  function toastTersimpan() {
    try {
      var x = JSON.parse(w.sessionStorage.getItem(KUNCI_TOAST) || 'null');
      hapusToastTersimpan();
      return x && Date.now() - x.t < 4000 ? x.p : null;
    } catch (e) { return null; }
  }
  function toast(pesan, pulihan) {
    if (!pulihan) { simpanToast(pesan); setTimeout(hapusToastTersimpan, 2500); }
    if (!wadahToast) { antreToast = pesan; return; }
    if (!toastEl) {
      toastEl = d.createElement('div');
      toastEl.className = 'demo-toast';
      toastEl.innerHTML = IKON.info + '<span class="demo-toast-teks"></span>';
      wadahToast.appendChild(toastEl);
    }
    toastEl.querySelector('.demo-toast-teks').textContent = pesan;
    toastEl.classList.remove('demo-tampil');
    void toastEl.offsetWidth;
    toastEl.classList.add('demo-tampil');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { if (toastEl) toastEl.classList.remove('demo-tampil'); }, 4000);
  }
  function lencanaTertutup() { try { return w.sessionStorage.getItem('simako-demo-lencana') === 'tutup'; } catch (e) { return false; } }
  function pasangLencana() {
    if (lencana || lencanaTertutup()) return;
    lencana = d.createElement('aside');
    lencana.className = 'demo-lencana';
    lencana.setAttribute('aria-label', 'Mode demo');
    lencana.innerHTML = '<span class="demo-lencana-ikon">' + IKON.flask + '</span>' +
      '<span class="demo-lencana-teks"><b>Demo</b><span class="demo-titik" aria-hidden="true">·</span>' +
      '<span class="demo-lencana-peran"></span><span class="demo-titik" aria-hidden="true">·</span>' +
      '<a class="demo-lencana-ganti" href="' + DASAR + '">Ganti peran</a></span>' +
      '<button type="button" class="demo-lencana-tutup" aria-label="Tutup lencana demo" title="Tutup">' + IKON.x + '</button>';
    lencana.querySelector('.demo-lencana-peran').textContent = LABEL_PERAN;
    lencana.querySelector('.demo-lencana-peran').title = LABEL_PERAN;
    lencana.querySelector('.demo-lencana-ganti').setAttribute('data-demo-lewat', '');
    lencana.querySelector('.demo-lencana-tutup').addEventListener('click', function () {
      try { w.sessionStorage.setItem('simako-demo-lencana', 'tutup'); } catch (e) {}
      if (lencana && lencana.parentNode) lencana.parentNode.removeChild(lencana);
      lencana = null;
    });
    d.body.appendChild(lencana);
  }
  /* Di ponsel, lencana dan toast naik di atas bilah aksi bawah yang lengket (.s-aksi-bawah). */
  var rafPosisi = 0;
  function aturPosisi() {
    rafPosisi = 0;
    var angkat = 0, vh = w.innerHeight || d.documentElement.clientHeight;
    var bar = d.querySelectorAll('.s-aksi-bawah, .modal-footer.s-lengket');
    for (var i = 0; i < bar.length; i++) {
      var r = bar[i].getBoundingClientRect();
      if (r.height && r.top < vh && r.bottom > vh - 4 && r.top > vh / 2) angkat = Math.max(angkat, vh - r.top);
    }
    d.documentElement.style.setProperty('--demo-angkat', angkat + 'px');
  }
  function jadwalPosisi() { if (!rafPosisi) rafPosisi = w.requestAnimationFrame(aturPosisi); }
  w.addEventListener('scroll', jadwalPosisi, { passive: true });
  w.addEventListener('resize', jadwalPosisi);
  w.addEventListener('load', jadwalPosisi);

  if (d.readyState === 'loading') d.addEventListener('DOMContentLoaded', siapkanDom); else siapkanDom();

  w.__simakoDemo = {
    dasar: DASAR, peran: SLUG, label: LABEL_PERAN, log: log, siap: siap, indeks: INDEKS,
    kunci: kunci, urai: urai, telaah: telaah, toast: function (p) { toast(p); }, versi: 1
  };
})(window, document);
