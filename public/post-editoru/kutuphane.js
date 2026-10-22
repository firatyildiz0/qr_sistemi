// Fotoğraf kütüphanesi: post editörü (app.js), video sayfası (video.js) ve sunucu (video-ai.js) aynı listeyi kullanır.
// Eski p*.jpg yolları kayıtlı postlarda kullanıldığı için değişmez.
(function (root) {
  const CATS = [
    ['Gelinlik & Abiye', [
      { src: 'img/p1.jpg', name: 'Gelinlik' }, { src: 'img/p5.jpg', name: 'Ütülenen gelinlik' }, { src: 'img/p5b.jpg', name: 'Ütülenen gelinlik 2' },
      { src: 'img/g-gelinlik-askisi.jpg', name: 'Gelinlik askısı' }, { src: 'img/g-abiye.jpg', name: 'Abiye' }, { src: 'img/g-damatlik.jpg', name: 'Damatlık' }]],
    ['Kına & Bindallı', [
      { src: 'img/p4.jpg', name: 'Bindallı kaftan' }, { src: 'img/k-mor-bindalli.jpg', name: 'Mor bindallı' }, { src: 'img/k-kina-seti.jpg', name: 'Kına seti' }]],
    ['Kamera & Ekipman', [
      { src: 'img/p3.jpg', name: 'Kamera' }, { src: 'img/p3b.jpg', name: 'Kamera 2' }, { src: 'img/e-lens-seti.jpg', name: 'Lens seti' },
      { src: 'img/e-drone.jpg', name: 'Drone' }, { src: 'img/e-video-kiti.jpg', name: 'Video ekipmanı' }]],
    ['Bisiklet & Scooter', [
      { src: 'img/p6a.jpg', name: 'Bisiklet' }, { src: 'img/b-yol-bisikleti.jpg', name: 'Yol bisikleti' }, { src: 'img/b-scooter.jpg', name: 'Elektrikli scooter' }]],
    ['Kamp & Outdoor', [
      { src: 'img/p6b.jpg', name: 'Kamp çadırı' }, { src: 'img/o-kamp-seti.jpg', name: 'Kamp seti' }, { src: 'img/o-sirt-cantasi.jpg', name: 'Sırt çantası' }]],
    ['Genel', [
      { src: 'img/p2.jpg', name: 'QR okutma' }, { src: 'img/x-teslim.jpg', name: 'Teslim' }, { src: 'img/x-depo.jpg', name: 'Depo' }]],
  ];
  const api = {
    /** Kategorili liste; her çağrı yeni kopya döner (editör başına "AI üretimleri" ekleyebilir). */
    cats: () => CATS.map(([c, items]) => [c, items.map(i => ({ ...i }))]),
    /** Claude istemleri için düz liste: { src, name, cat } */
    flat: () => CATS.flatMap(([cat, items]) => items.map(({ src, name }) => ({ src, name, cat }))),
  };
  if (typeof module === 'object' && module.exports) module.exports = api; else root.Kutuphane = api;
})(typeof window !== 'undefined' ? window : globalThis);
