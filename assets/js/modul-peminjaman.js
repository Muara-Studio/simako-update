/* Modul Peminjaman (2.5 detail dan 2.6 pelacak): dialog pengembalian yang mencatat kondisi saat kembali per koleksi.
   PRD 3.9 kriteria terima 2. Isian awal: kondisi dari Laporan Kondisi yang ditautkan ke peminjaman, bila tidak ada
   kondisi sebelum dipinjam. Server tetap memeriksa nilai dan kelengkapannya (Peminjaman::prosesKembalikan). */
(function () {
  function esc(s) { return $('<div>').text(s == null ? '' : String(s)).html(); }

  function isiDialog(o) {
    if (!o.koleksi || !o.koleksi.length) {
      return '<p class="s-kk-intro">' + esc(o.nomor) + ' akan berstatus Selesai' + (o.dariPelacak ? ' dan hilang dari pelacak' : '') + '. Tidak ada koleksi terdaftar pada peminjaman ini.</p>';
    }
    var h = '<p class="s-kk-intro">' + esc(o.nomor) + ' akan berstatus Selesai' + (o.dariPelacak ? ' dan hilang dari pelacak' : '') +
      '. Periksa tiap koleksi lalu pilih kondisinya saat diterima kembali. Kondisi yang menurun diteruskan ke Konservator.</p><div class="s-kk-daftar">';
    o.koleksi.forEach(function (k) {
      var awal = k.kembali || k.sebelum || '';
      var sumber = k.kembali ? 'Terisi dari Laporan Kondisi' : (k.sebelum ? 'Terisi sama dengan sebelum dipinjam' : 'Belum ada data kondisi');
      h += '<div class="s-kk-item" data-id="' + esc(k.id) + '">' +
        '<div class="s-kk-nama"><b>' + esc(k.nama || 'Koleksi tanpa nama') + '</b><span>' + (k.reg ? esc(k.reg) + ', ' : '') + 'sebelum dipinjam: ' + esc(k.sebelum || 'belum diisi') + '</span></div>' +
        '<div class="s-kk-isian">' +
        '<label for="s-kk-k-' + esc(k.id) + '">Kondisi saat kembali</label>' +
        '<select class="form-select s-kk-kondisi" id="s-kk-k-' + esc(k.id) + '"><option value="">Pilih kondisi</option>' +
        o.kondisi.map(function (v) { return '<option value="' + esc(v) + '"' + (v === awal ? ' selected' : '') + '>' + esc(v) + '</option>'; }).join('') +
        '</select><small>' + esc(sumber) + '</small>' +
        '<label for="s-kk-c-' + esc(k.id) + '">Catatan (opsional)</label>' +
        '<input type="text" class="form-control s-kk-catatan" id="s-kk-c-' + esc(k.id) + '" maxlength="500" placeholder="Contoh: retak rambut di sisi kiri">' +
        '</div></div>';
    });
    return h + '</div>';
  }

  window.SimakoPinjam = {
    /* o: {id, nomor, url, kondisi:[...], koleksi:[{id, nama, reg, sebelum, kembali}], judulSukses, dariPelacak} */
    dialogKembali: function (o) {
      Swal.fire({
        title: 'Tandai dikembalikan?', html: isiDialog(o), width: 600, icon: 'question',
        showCancelButton: true, confirmButtonText: 'Ya, kembalikan', cancelButtonText: 'Batal', reverseButtons: true,
        buttonsStyling: false, customClass: { confirmButton: 'btn btn-primary', cancelButton: 'btn btn-secondary', htmlContainer: 's-kk-swal', container: 's-lembar-wadah', popup: 's-lembar-hp' },
        preConfirm: function () {
          var data = { id: o.id, kondisi: {}, catatan: {} }, kosong = [];
          $('.s-kk-item').each(function () {
            var id = $(this).data('id'), v = $(this).find('.s-kk-kondisi').val(), c = $.trim($(this).find('.s-kk-catatan').val());
            if (!v) kosong.push($(this).find('.s-kk-nama b').text()); else data.kondisi[id] = v;
            if (c) data.catatan[id] = c;
          });
          if (kosong.length) { Swal.showValidationMessage('Pilih kondisi saat kembali untuk: ' + kosong.join(', ')); return false; }
          return data;
        }
      }).then(function (r) {
        if (!r.isConfirmed) return;
        $.post(o.url, r.value, null, 'json').done(function (res) {
          if (res.success) Swal.fire({ icon: 'success', title: o.judulSukses || 'Dikembalikan', text: res.message || '', timer: 1800, showConfirmButton: false }).then(function () { location.reload(); });
          else Swal.fire({ icon: 'error', title: 'Gagal', text: res.message || 'Tidak dapat mengembalikan' });
        }).fail(function (xhr) {
          var m = 'Tidak dapat mengembalikan'; try { m = JSON.parse(xhr.responseText).message || m; } catch (e) {}
          Swal.fire({ icon: 'error', title: 'Gagal', text: m });
        });
      });
    }
  };
})();
