/* SIMAKO, keamanan tahap 2 (23 Oktober 2026): token CSRF untuk setiap permintaan yang mengubah data.
 *
 * Dimuat di <head> setiap halaman HTML oleh application/hooks/Keamanan_hook.php (sisipkanToken), sebelum skrip view.
 * Token dibaca dari <meta name="csrf-token"> (cookie token HttpOnly, jadi tidak dibaca dari cookie), lalu:
 * - XMLHttpRequest (dipakai jQuery $.ajax/$.post, DataTables, unggahan FormData): header X-CSRF-Token;
 * - fetch(): header X-CSRF-Token;
 * - navigator.sendBeacon(): token ditambahkan ke isi kiriman;
 * - <form method="post"> (submit biasa, requestSubmit, form.submit(), jQuery .submit()): input tersembunyi.
 * Hanya untuk alamat di situs yang sama dan metode selain GET/HEAD/OPTIONS, sehingga token tidak terkirim
 * ke situs lain dan tidak masuk URL. Server menyalin header ke $_POST sebelum CodeIgniter memeriksa.
 */
(function (w, d) {
    'use strict';
    if (w.SIMAKO_CSRF) return;

    function meta(n) {
        var m = d.querySelector('meta[name="' + n + '"]');
        return m ? (m.getAttribute('content') || '') : '';
    }
    var nama = meta('csrf-nama'), token = meta('csrf-token');
    if (!nama || !token) return;

    var HEADER = 'X-CSRF-Token';
    var csrf = w.SIMAKO_CSRF = { nama: nama, token: token, header: HEADER };

    function perlu(metode, alamat) {
        if (/^(GET|HEAD|OPTIONS|TRACE|DIALOG)$/i.test(String(metode || 'GET'))) return false;
        try { return new URL(alamat == null ? '' : String(alamat), d.baseURI).origin === w.location.origin; }
        catch (e) { return false; }
    }

    /* XMLHttpRequest: jQuery, DataTables, dan pustaka unggah memakai ini. Prototipe diambil dari objek nyata,
       karena pustaka seperti Pace bisa mengganti window.XMLHttpRequest dengan pembungkus. */
    var X = null;
    try { X = Object.getPrototypeOf(new w.XMLHttpRequest()); } catch (e) {}
    if (!X && w.XMLHttpRequest) X = w.XMLHttpRequest.prototype;
    if (X && typeof X.open === 'function' && !X.__simakoCsrfAktif) {
        X.__simakoCsrfAktif = true;
        var buka = X.open, kirim = X.send, pasang = X.setRequestHeader;
        X.open = function (metode, alamat) {
            this.__simakoCsrf = perlu(metode, alamat) ? 1 : 0;
            return buka.apply(this, arguments);
        };
        X.setRequestHeader = function (kunci) {
            if (this.__simakoCsrf && String(kunci).toLowerCase() === HEADER.toLowerCase()) this.__simakoCsrf = 2;
            return pasang.apply(this, arguments);
        };
        X.send = function () {
            if (this.__simakoCsrf === 1) { try { pasang.call(this, HEADER, csrf.token); } catch (e) {} }
            return kirim.apply(this, arguments);
        };
    }

    /* fetch() */
    var asliFetch = typeof w.fetch === 'function' ? w.fetch : null;
    if (asliFetch) {
        w.fetch = function (masukan, opsi) {
            try {
                var req = (typeof w.Request === 'function' && masukan instanceof w.Request) ? masukan : null;
                var metode = (opsi && opsi.method) || (req ? req.method : 'GET');
                if (perlu(metode, req ? req.url : masukan)) {
                    var h = new w.Headers((opsi && opsi.headers) || (req ? req.headers : undefined));
                    if (!h.has(HEADER)) {
                        h.set(HEADER, csrf.token);
                        opsi = Object.assign({}, opsi || {}, { headers: h });
                    }
                }
            } catch (e) {}
            return asliFetch.call(w, masukan, opsi);
        };
    }

    /* navigator.sendBeacon() tidak bisa memasang header: token masuk ke isi kiriman. */
    var nav = w.navigator;
    if (nav && typeof nav.sendBeacon === 'function') {
        var asliBeacon = nav.sendBeacon;
        nav.sendBeacon = function (alamat, data) {
            if (!perlu('POST', alamat)) return asliBeacon.apply(nav, arguments);
            if (data == null || data instanceof w.URLSearchParams) {
                var isi = new w.URLSearchParams(data || '');
                if (!isi.has(nama)) isi.append(nama, csrf.token);
                return asliBeacon.call(nav, alamat, isi);
            }
            if (w.FormData && data instanceof w.FormData) {
                if (!data.has(nama)) data.append(nama, csrf.token);
                return asliBeacon.call(nav, alamat, data);
            }
            /* Teks atau Blob: kirim lewat fetch keepalive agar token bisa di header. */
            if (w.fetch) { w.fetch(alamat, { method: 'POST', body: data, keepalive: true, credentials: 'same-origin' }).catch(function () {}); return true; }
            return asliBeacon.apply(nav, arguments);
        };
    }

    /* Formulir yang dikirim langsung oleh peramban: input tersembunyi. */
    function isiFormulir(f, tombol) {
        if (!f || f.nodeName !== 'FORM') return;
        var metode = (tombol && tombol.getAttribute && tombol.getAttribute('formmethod')) || f.getAttribute('method') || 'GET';
        var tujuan = (tombol && tombol.getAttribute && tombol.getAttribute('formaction')) || f.getAttribute('action') || w.location.href;
        if (!perlu(metode, tujuan)) return;
        var el = null, ada = f.querySelectorAll('input[type="hidden"]');
        for (var i = 0; i < ada.length; i++) { if (ada[i].name === nama) { el = ada[i]; break; } }
        if (!el) { el = d.createElement('input'); el.type = 'hidden'; el.name = nama; f.appendChild(el); }
        el.value = csrf.token;
    }
    d.addEventListener('submit', function (e) { isiFormulir(e.target, e.submitter); }, true);
    var F = w.HTMLFormElement && w.HTMLFormElement.prototype;
    if (F && typeof F.submit === 'function') {
        var asliSubmit = F.submit;
        F.submit = function () { isiFormulir(this); return asliSubmit.apply(this, arguments); };
    }
})(window, document);
