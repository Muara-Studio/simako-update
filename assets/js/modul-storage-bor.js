/* Pohon lokasi sebagai daftar bertingkat di ponsel (agen M2, 24/10/2026).
   Dipakai Tempat Penyimpanan 3.7 (listGedung.php) dan pemilih lokasi tujuan Mutasi 3.8 (mutasi.php).
   Bekerja di atas DOM pohon yang sudah ada (#pohon > ul.s-pohon-ul > li[data-kunci] > .s-pohon-baris + ul),
   jadi pohon desktop, pencarian, dan penangan klik view tetap sama. Di bawah 768 px dan selama kolom cari kosong,
   pohon tampil satu tingkat saja: isi simpul yang sedang dibuka, dengan tombol kembali ke tingkat di atasnya.
   CSS-nya ada di assets/css/modul-storage.css bagian "Ponsel M2".

   opsi: { pohon: '#pohon', kepala: '#bor-kepala', cari: '#cari-pohon',
           info(k)  -> { ikon, nama, sub } untuk simpul k,
           naik(kInduk) dipanggil saat tombol kembali ditekan (opsional; bawaan: buka tingkat induk),
           aksi(k)  -> HTML tambahan di kepala, misalnya tombol "Pilih lokasi ini" (opsional) } */
window.SimakoBor = function (opsi) {
    var $pohon = $(opsi.pohon), $kepala = $(opsi.kepala), mq = window.matchMedia('(max-width: 767.98px)');
    var sini = null;   // kunci simpul yang isinya sedang ditampilkan; null = tingkat teratas
    var esc = function (s) { return $('<span>').text(s == null ? '' : s).html(); };
    var li = function (k) { return k ? $pohon.find('li[data-kunci="' + k + '"]').first() : $(); };
    var induk = function (k) { var p = li(k).parent().closest('li[data-kunci]'); return p.length ? String(p.data('kunci')) : null; };
    var punyaAnak = function (k) { return li(k).children('ul.s-pohon-ul').length > 0; };

    function aktif() { return mq.matches && !(opsi.cari && String($(opsi.cari).val() || '').trim()); }

    function gambar() {
        var nyala = aktif();
        $pohon.toggleClass('s-bor', nyala);
        $pohon.find('li.s-jalur').removeClass('s-jalur'); $pohon.find('li.s-sini').removeClass('s-sini');
        if (sini && !li(sini).length) sini = null;
        $pohon.toggleClass('s-bor-dalam', nyala && !!sini);
        if (!nyala || !sini) { $kepala.prop('hidden', true).empty(); return; }
        var el = li(sini).addClass('s-sini');
        el.parents('li[data-kunci]').addBack().addClass('s-jalur').each(function () {
            $(this).children('ul.s-pohon-ul').prop('hidden', false);
            $(this).children('.s-pohon-baris').addClass('terbuka');
        });
        var kInduk = induk(sini), i = opsi.info(sini) || {}, iInduk = kInduk ? (opsi.info(kInduk) || {}) : null;
        var h = '<button type="button" class="s-bor-naik" data-ke="' + esc(kInduk || '') + '"><i class="ti ti-chevron-left" aria-hidden="true"></i><span>'
            + esc(iInduk ? iInduk.nama : (opsi.akar || 'Tingkat teratas')) + '</span></button>';
        h += '<div class="s-bor-judul"><i class="ti ti-' + esc(i.ikon || 'folder') + '" aria-hidden="true"></i><div><b>' + esc(i.nama) + '</b>'
            + (i.sub ? '<span>' + esc(i.sub) + '</span>' : '') + '</div></div>';
        if (opsi.aksi) h += opsi.aksi(sini) || '';
        $kepala.html(h).prop('hidden', false);
    }

    /* buka isi simpul k (k tanpa anak: tampilkan tingkat induknya) */
    function ikut(k) {
        if (!k) { sini = null; gambar(); return; }
        sini = punyaAnak(k) ? String(k) : induk(k);
        gambar();
    }
    function masuk(k) {
        sini = k ? String(k) : null; gambar();
        var atas = $pohon.closest('.modal').length ? null : $pohon.closest('.s-card');
        if (atas && atas.length && atas[0].getBoundingClientRect().top < 0) atas[0].scrollIntoView({ block: 'start' });
        if (!atas) $pohon.scrollTop(0);
    }

    $kepala.on('click', '.s-bor-naik', function () {
        var ke = $(this).data('ke') ? String($(this).data('ke')) : null;
        if (opsi.naik) opsi.naik(ke, sini); else masuk(ke);
        if (!ke) { sini = null; gambar(); }
    });
    if (opsi.cari) $(opsi.cari).on('input', gambar);
    if (mq.addEventListener) mq.addEventListener('change', gambar); else if (mq.addListener) mq.addListener(gambar);

    return { aktif: aktif, ikut: ikut, masuk: masuk, gambar: gambar, sini: function () { return sini; }, punyaAnak: punyaAnak };
};
