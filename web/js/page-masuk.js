Hal.daftar('#/masuk', {
  nama: 'masuk',
  render: function (wadah, query) {
    let mode = query.mode === 'daftar' ? 'daftar' : 'masuk';

    const judul = h('h1', { text: mode === 'daftar' ? 'Daftar Akun' : 'Masuk' });
    const sub = h('p', { class: 'hint', text: '' });
    const form = h('form', { class: 'card', novalidate: true });
    wadah.appendChild(judul);
    wadah.appendChild(sub);
    wadah.appendChild(form);

    let pesan = h('div', { class: 'pesan-sistem' });
    form.appendChild(pesan);

    const sekolahSelect = h('select', { class: 'input', name: 'sekolah_id' });
    const namaInput = h('input', { class: 'input', name: 'nama', autocomplete: 'name', placeholder: 'Nama lengkap' });
    const userInput = h('input', { class: 'input mono', name: 'username', autocapitalize: 'none', autocomplete: 'username', placeholder: 'username' });
    const passInput = h('input', { class: 'input', name: 'password', type: 'password', autocomplete: 'current-password', placeholder: 'Minimal 6 karakter' });

    const tombol = h('button', { class: 'btn btn--primary btn--block', type: 'submit' });
    const ganti = h('button', {
      class: 'btn btn--block btn--flat',
      type: 'button',
      style: 'margin-top:10px;box-shadow:none;background:transparent;border-style:dashed',
      onclick: function () { mode = mode === 'masuk' ? 'daftar' : 'masuk'; gambar(); }
    });

    function pesanError(teks) {
      pesan.innerHTML = '';
      if (!teks) return;
      pesan.appendChild(h('div', { class: 'card card--warn card--tight' }, [
        h('div', { class: 'pesan-sistem__teks', text: teks })
      ]));
    }

    function gambar() {
      judul.textContent = mode === 'daftar' ? 'Daftar Akun' : 'Masuk';
      form.innerHTML = '';
      pesanError('');
      pesan = h('div', { class: 'pesan-sistem' });

      if (mode === 'daftar') {
        sub.textContent = 'Buat akun guru/kelas di sekolah Anda. Akun aktif setelah disetujui admin sekolah.';
        form.appendChild(pesan);
        form.appendChild(h('div', { class: 'field' }, [h('label', { class: 'label', text: 'Sekolah' }), sekolahSelect]));
        form.appendChild(h('div', { class: 'field' }, [h('label', { class: 'label', text: 'Nama lengkap' }), namaInput]));
        form.appendChild(h('div', { class: 'field' }, [h('label', { class: 'label', text: 'Username' }), userInput]));
        form.appendChild(h('div', { class: 'field' }, [
          h('label', { class: 'label', text: 'Password' }), passInput,
          h('div', { class: 'hint', text: 'Huruf kecil, angka, titik, garis bawah, strip. Minimal 3 karakter.' })
        ]));
        tombol.textContent = 'Daftar Sekarang';
      } else {
        sub.textContent = 'Gunakan akun yang sudah disetujui admin sekolah.';
        form.appendChild(pesan);
        form.appendChild(h('div', { class: 'field' }, [h('label', { class: 'label', text: 'Username' }), userInput]));
        form.appendChild(h('div', { class: 'field' }, [h('label', { class: 'label', text: 'Password' }), passInput]));
        tombol.textContent = 'Masuk';
      }

      form.appendChild(tombol);
      form.appendChild(ganti);
      ganti.textContent = mode === 'masuk' ? 'Belum punya akun? Daftar' : 'Sudah punya akun? Masuk';
     Ui.kirimEnter(userInput, function () { passInput.focus(); });
      Ui.kirimEnter(passInput, function () { form.requestSubmit ? form.requestSubmit() : tombol.click(); });
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      pesanError('');
      const jalankan = Ui.tombolMuat(tombol, function () {
        if (mode === 'daftar') {
          if (!sekolahSelect.value) {
            Ui.toast('Pilih sekolah terlebih dahulu.', 'err');
            return Promise.reject({ pesan: 'sekolah kosong' });
          }
          return Api.panggil('auth.register', {
            nama: namaInput.value,
            username: userInput.value,
            password: passInput.value,
            sekolah_id: sekolahSelect.value
          });
        }
        return Api.panggil('auth.login', {
          username: userInput.value,
          password: passInput.value,
          device: navigator.userAgent.slice(0, 60)
        }).then(function (res) {
          Api.simpanSesi(res);
          return res;
        });
      });
      jalankan().then(function (hasil) {
        if (!hasil) return;
        if (mode === 'daftar') {
          Ui.modal({
            judul: 'Pendaftaran Terkirim',
            isi: h('p', { text: hasil.message }),
            aksi: [{ label: 'Ke Halaman Masuk', class: 'btn--primary', jalankan: function () { mode = 'masuk'; gambar(); } }]
          });
        } else {
          location.hash = App.RUTE.BERANDA;
          App.render();
        }
      });
    });

    gambar();

    return Api.panggil('sekolah.list', {}).then(function (res) {
      sekolahSelect.innerHTML = '';
      sekolahSelect.appendChild(h('option', { value: '', text: '— Pilih sekolah —' }));
      (res.data || []).forEach(function (s) {
        sekolahSelect.appendChild(h('option', { value: s.id, text: s.nama }));
      });
    }).catch(function (err) {
      pesanError(Api.kelasGalat(err));
    });
  }
});