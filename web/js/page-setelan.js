Hal.daftar('#/setelan', {
  nama: 'setelan',
  render: function (wadah) {
    const kartu = h('div', { class: 'card' });
    const url = h('input', {
      class: 'input mono',
      type: 'url',
      id: 'in-url',
      inputmode: 'url',
      autocomplete: 'off',
      placeholder: 'https://script.google.com/macros/s/AKfy.../exec',
      value: Api.url()
    });
    const status = h('div', { class: 'hint', id: 'st-url', text: 'Belum diisi. URL ini diperoleh setelah Deploy → New deployment → Web app.' });

    const tombol = h('button', {
      class: 'btn btn--primary btn--block',
      type: 'button',
      text: 'Simpan & Uji Koneksi'
    });
    const jalankan = Ui.tombolMuat(tombol, function () {
      const v = url.value.trim();
      if (!/^https:\/\/.+\/exec$/.test(v)) {
        Ui.toast('URL harus diawali https:// dan diakhiri /exec', 'err');
        return Promise.reject({ pesan: 'URL tidak valid' });
      }
      Api.aturUrl(v);
      return Api.panggil('app.info', {}).then(function (res) {
        Ui.toast('Terhubung. ' + res.app + ' v' + res.versi, 'ok');
        return true;
      });
    });
    tombol.addEventListener('click', function () {
      jalankan().then(function (ok) {
        if (!ok) return;
        location.hash = Api.adaToken() ? App.RUTE.BERANDA : App.RUTE.MASUK;
        App.render();
      });
    });

    kartu.appendChild(h('h2', { text: 'Pengaturan Koneksi' }));
    kartu.appendChild(h('p', { class: 'hint', text: 'Masukkan URL Web App dari Google Apps Script. Data tidak pernah disimpan di perangkat ini.' }));
    kartu.appendChild(h('div', { class: 'field' }, [h('label', { class: 'label', for: 'in-url', text: 'URL Web App (POST /exec)' }), url]));
    kartu.appendChild(status);
    kartu.appendChild(h('div', { style: 'margin-top:14px' }, [tombol]));
    wadah.appendChild(kartu);

    const info = h('div', { class: 'card card--flat' }, [
      h('h3', { text: 'Cara mendapatkan URL' }),
      h('ol', { class: 'hint', style: 'padding-left:18px' }, [
        h('li', { text: 'Di editor Apps Script: Deploy → New deployment.' }),
        h('li', { text: 'Pilih tipe "Web app".' }),
        h('li', { text: 'Execute as: Me. Who has access: Anyone.' }),
        h('li', { text: 'Deploy, lalu salin URL Web app.' })
      ])
    ]);
    wadah.appendChild(info);
    return Promise.resolve();
  }
});