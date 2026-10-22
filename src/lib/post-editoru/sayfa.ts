/**
 * Post editörünün sayfası. public/post-editoru/ altındaki dosyaları yükleyen
 * düz bir HTML: editör React değil, yerel editörün kendi kodu (app.js). Sayfa
 * buradan, superuser kontrolünden sonra veriliyor; dosyaları `<base>` ile
 * public klasöründen çekiyor.
 *
 * CSP `strict-dynamic` kullandığı için her script etiketi isteğin nonce'unu
 * taşımak zorunda (bkz. src/proxy.ts); `__NONCE__` istek başına değiştiriliyor.
 */
const SAYFA = `<!doctype html>
<html lang="tr">
<head>
<meta charset="utf-8">
<base href="/post-editoru/">
<meta name="robots" content="noindex">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>RentQR Post Editörü</title>
<link rel="icon" href="img/logo.png">
<link rel="stylesheet" href="post.css">
<link rel="stylesheet" href="styles.css">
<link rel="stylesheet" href="fonts.css">
<link rel="stylesheet" href="ekler.css">
</head>
<body>
<div class="app">
  <header class="bar">
    <a class="logo" href="/yonetim" title="Yönetim paneline dön" style="color:inherit;text-decoration:none"><img src="img/logo.png" alt="">RentQR <small>Post editörü</small></a>
    <div class="seg" role="group" aria-label="Format">
      <button type="button" data-fmt="feed" aria-pressed="true">Feed 4:5</button>
      <button type="button" data-fmt="story" aria-pressed="false">Story 9:16</button>
      <button type="button" data-fmt="kare" aria-pressed="false">Kare 1:1</button>
      <button type="button" data-fmt="yatay" aria-pressed="false">Yatay 16:9</button>
    </div>
    <button class="btn addtext" id="addText" type="button" title="Metin ekle"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7V5h12v2M10 5v14M7.5 19h5M17 13v8M13 17h8"/></svg>Metin ekle</button>
    <div class="grow"></div>
    <div class="team" id="team" role="group" aria-label="Editördeki kişiler" hidden></div>
    <span class="saved" id="saved" role="status" aria-live="polite">Kaydedildi</span>
    <button class="btn icon ghost" id="gecmisBtn" type="button" title="Sürüm geçmişi" aria-label="Sürüm geçmişi" aria-haspopup="dialog"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l3 2"/></svg></button>
    <button class="btn icon ghost" id="undo" title="Geri al (Ctrl+Z)" aria-label="Geri al"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/></svg></button>
    <button class="btn icon ghost" id="redo" title="Yinele (Ctrl+Y)" aria-label="Yinele"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 14 5-5-5-5"/><path d="M20 9H9.5a5.5 5.5 0 0 0 0 11H13"/></svg></button>
    <a class="btn ghost igopen" id="igOpen" target="_blank" rel="noopener" hidden title="Paylaşılan postu Instagram'da aç">Instagram'da aç ↗</a>
    <button class="btn igbtn" id="igBtn" type="button" aria-haspopup="dialog">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r=".6" fill="currentColor"/></svg><span>Instagram'da paylaş</span></button>
    <div class="menu" id="dl">
      <button class="btn primary" id="dlBtn" aria-haspopup="menu" aria-expanded="false" aria-controls="dlPop">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/></svg>PNG indir</button>
      <div class="pop" id="dlPop" role="menu" aria-label="İndirme seçenekleri">
        <button role="menuitem" data-dl="current">Bu formatı indir<small>Ekranda gördüğün post ve format</small></button>
        <button role="menuitem" data-dl="both">Feed ve story indir<small>Feed 1080×1350 ve story 1080×1920</small></button>
        <button role="menuitem" data-dl="all">Tüm postları indir<small>Her post için feed ve story PNG</small></button>
        <button role="menuitem" data-ex="jpg">JPG indir<small>Bu post, bu format · daha küçük dosya</small></button>
        <button role="menuitem" data-ex="pdf">PDF indir<small>Tüm postlar bu formatta, her biri bir sayfa</small></button>
        <button role="menuitem" data-ex="video">Animasyonlu video (MP4)<small>Öğeler sırayla belirir · Reels olarak paylaşılabilir</small></button>
        <button role="menuitemcheckbox" id="hq" aria-checked="false" class="opt"><span class="box" aria-hidden="true"></span>2160 px genişlik (baskı için)</button>
      </div>
    </div>
  </header>

  <aside class="posts" aria-label="Postlar">
    <h2>Postlar</h2>
    <ol class="plist" id="plist"></ol>
    <div class="foot"><div class="menu up" id="addMenu">
      <button class="btn" id="add" type="button" aria-haspopup="menu" aria-expanded="false" aria-controls="addPop">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>Yeni post</button>
      <div class="pop" id="addPop" role="menu" aria-label="Yeni post türü">
        <button role="menuitem" data-new="blank">Normal post<small>Boş şablonla başla, metni kendin yaz</small></button>
        <button role="menuitem" data-new="sablon">Şablondan başla<small>Kayıtlı tasarımlardan birini kopyala</small></button>
        <button role="menuitem" data-new="ai"><span class="spark" aria-hidden="true">✦</span>AI ile post üret<small>3 farklı tarz sunar, seçtikçe zevkini öğrenir</small></button>
      </div>
    </div></div>
  </aside>

  <main class="stagewrap">
    <div class="stage" id="stage" tabindex="-1">
      <div class="board" id="board">
        <div class="canvas" id="canvas" aria-label="Post önizlemesi"></div>
        <div class="hover" id="hover"></div>
        <div class="guides" id="guides"></div>
        <div class="sel" id="sel"><i></i><i></i><i></i><i></i><b></b>
          <span class="h hw" data-h="w" title="Genişliği değiştir"></span><span class="h he" data-h="e" title="Genişliği değiştir"></span><span class="h hse" data-h="se" title="Boyutu değiştir"></span><span class="h hs" data-h="s" title="Yüksekliği değiştir"></span></div>
      </div>
    </div>
    <div class="toolbar" id="toolbar" role="toolbar" aria-label="Seçili öğe araçları" hidden></div>
    <div class="zoom" role="group" aria-label="Yakınlaştırma">
      <button type="button" id="zOut" aria-label="Uzaklaştır">−</button>
      <button type="button" id="zFit" class="pct" title="Ekrana sığdır">%100</button>
      <button type="button" id="zIn" aria-label="Yakınlaştır">+</button>
      <span class="sep"></span>
      <button type="button" id="keys" aria-expanded="false" aria-controls="keyPop" title="Klavye kısayolları">Kısayollar</button>
      <div class="keypop" id="keyPop" hidden>
        <p><kbd>Ctrl</kbd>+<kbd>Z</kbd> Geri al</p><p><kbd>Ctrl</kbd>+<kbd>Y</kbd> Yinele</p>
        <p><kbd>Delete</kbd> Seçili öğeyi gizle</p><p><kbd>Esc</kbd> Seçimi kaldır</p>
        <p><kbd>Ok tuşları</kbd> Seçili öğeyi 1 px taşı (<kbd>Shift</kbd> ile 10 px)</p><p><kbd>Ctrl</kbd>+<kbd>D</kbd> Metni çoğalt</p>
        <p><kbd>Alt</kbd> basılıyken sürükle: hizalama kılavuzlarını kapat</p><p>Çift tıkla: metni yerinde düzenle</p>
      </div>
    </div>
    <div class="toast" id="toast" role="status" aria-live="polite"><span></span><button type="button" hidden>Geri al</button></div>
  </main>

  <aside class="side" aria-label="Düzenleme">
    <div class="tabs" role="tablist" aria-label="Panel">
      <button role="tab" id="tabEdit" data-tab="edit" aria-controls="props" aria-selected="true">Düzenle</button>
      <button role="tab" id="tabAdd" data-tab="add" aria-controls="addPane" aria-selected="false">Ekle</button>
      <button role="tab" id="tabLayers" data-tab="layers" aria-controls="layersPane" aria-selected="false">Katmanlar</button>
      <button role="tab" id="tabYorum" data-tab="yorum" aria-controls="yorumPane" aria-selected="false">Yorumlar<span class="tabsay" id="yorumSay" hidden></span></button>
    </div>
    <div class="pane" id="props" role="tabpanel" aria-labelledby="tabEdit"></div>
    <div class="pane" id="layersPane" role="tabpanel" aria-labelledby="tabLayers" hidden>
      <ul class="layers" id="layers"></ul>
      <h3 class="addh">Öğe ekle</h3>
      <ul class="adds" id="adds"></ul>
    </div>
    <div class="pane" id="addPane" role="tabpanel" aria-labelledby="tabAdd" hidden></div>
    <div class="pane" id="yorumPane" role="tabpanel" aria-labelledby="tabYorum" hidden></div>
  </aside>
</div>

<dialog class="dlg" id="aiDlg" aria-labelledby="aiTitle">
  <form id="aiForm">
    <header><h2 id="aiTitle"><span class="spark" aria-hidden="true">✦</span>AI ile post üret</h2>
      <button class="btn icon ghost" type="button" id="aiClose" aria-label="Kapat" title="Kapat">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg></button></header>
    <div class="dbody" id="aiSetup">
      <label class="f"><span>Sektör</span>
        <select id="aiSector">
          <option value="gelinlik">Gelinlik & Abiye</option><option value="kina">Kına & Bindallı</option>
          <option value="kamera">Kamera & Ekipman</option><option value="bisiklet">Bisiklet & Scooter</option>
          <option value="kamp">Kamp & Outdoor</option><option value="genel">Tüm kiralama işletmeleri</option>
        </select></label>
      <div class="f"><label for="aiTopic"><span>Konu <em>isteğe bağlı</em></span></label>
        <input type="text" id="aiTopic" maxlength="200" aria-describedby="aiTopicTip" placeholder="ör. iade gecikmesi, prova randevuları, hasar kaydı">
        <small class="tip" id="aiTopicTip">Boş bırakırsan Claude sektörün günlük bir derdini seçer ve mevcut başlıkları tekrar etmez.</small></div>
      <label class="check"><input type="checkbox" id="aiImages">Görselleri de Gemini ile üret <em>3 görsel, yaklaşık 15 sent, +1 dk</em></label>
      <p class="tip">Claude aynı konuyu 3 farklı tarzda yazar (metin yaklaşımı, renk teması, düzen); kutu işaretli değilse fotoğraflar kütüphaneden gelir · yaklaşık 1 dk.
        Birini seçip diğerlerini oylarsan sonraki turlar zevkine göre şekillenir.</p>
      <section class="prefs" id="aiPrefs" aria-label="Öğrenilen tarz tercihleri" hidden></section>
    </div>
    <div class="dbody" id="aiRun" hidden>
      <div class="progress" role="status" aria-live="polite"><i class="spin" aria-hidden="true"></i>
        <div><b id="aiStage">Başlatılıyor</b><small id="aiTime">0 sn</small></div></div>
      <p class="tip">Pencereyi kapatabilirsin; üretim arka planda sürer, bittiğinde post listeye eklenir.</p>
    </div>
    <div class="dbody" id="aiPick" hidden>
      <p class="tip">Beğendiğini seç. İstersen her seçeneği 👍/👎 ile oyla ya da not düş (ör. "renk güzel, başlık uzun"); seçmediklerin de zevkini öğretir.</p>
      <div class="aiopts" id="aiOpts"></div>
    </div>
    <div class="dbody" id="aiDone" hidden>
      <p class="ok" id="aiDoneMsg">Post hazır ve listeye eklendi.</p>
      <p class="tip" id="aiStyleMsg"></p>
      <label class="f"><span>Instagram açıklaması</span><textarea id="aiCaption" rows="8" readonly aria-describedby="aiCapChk"></textarea></label>
      <div class="capchk" id="aiCapChk"></div>
    </div>
    <p class="err" id="aiErr" role="alert" hidden></p>
    <footer>
      <button class="btn" type="button" id="aiCancel">Vazgeç</button>
      <button class="btn" type="button" id="aiCopy" hidden>Açıklamayı kopyala</button>
      <button class="btn" type="button" id="aiImg" hidden>Görseli bu tarzda üret</button>
      <button class="btn" type="button" id="aiNone" hidden>Hiçbiri olmadı · 3 yeni</button>
      <button class="btn primary" type="submit" id="aiGo"><span class="spark" aria-hidden="true">✦</span>3 tarz üret</button>
    </footer>
  </form>
</dialog>
<dialog class="dlg" id="rgDlg" aria-labelledby="rgTitle">
  <form id="rgForm">
    <header><h2 id="rgTitle"><span class="spark" aria-hidden="true">✦</span><span id="rgName">AI ile yeniden üret</span></h2>
      <button class="btn icon ghost" type="button" id="rgClose" aria-label="Kapat" title="Kapat">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg></button></header>
    <div class="dbody" id="rgSrc" hidden>
      <fieldset class="f choice"><legend>Yeni görsel nereden gelsin?</legend>
        <label><input type="radio" name="rgImage" value="gemini" checked><b>Gemini ile üret</b><small>Claude sahneyi tarif eder, Gemini çizer · yaklaşık 1 dk · görsel başına ~5 sent</small></label>
        <label><input type="radio" name="rgImage" value="library"><b>Kütüphaneden seç</b><small>Claude konuya uygun başka bir fotoğraf seçer · yaklaşık 1 dk</small></label>
      </fieldset>
      <div class="f" id="rgVisWrap" hidden><label for="rgVisual"><span>Görsel stili</span></label>
        <select id="rgVisual" aria-describedby="rgVisTip"></select>
        <small class="tip" id="rgVisTip">Gemini bu stilde üretir; kütüphane seçiminde kullanılmaz.</small></div>
    </div>
    <div class="dbody" id="rgRun" hidden>
      <div class="progress" role="status" aria-live="polite"><i class="spin" aria-hidden="true"></i>
        <div><b id="rgStage">Başlatılıyor</b><small id="rgTime">0 sn</small></div></div>
      <p class="tip" id="rgRunTip"></p>
    </div>
    <div class="dbody" id="rgPick" hidden>
      <p class="tip">Birine tıkla, post hemen güncellenir. Beğenmezsen yeni seçenekler iste; önceki öneriler tekrar gelmez.</p>
      <div class="rgopts" id="rgOpts" role="group" aria-label="Seçenekler"></div>
    </div>
    <p class="err" id="rgErr" role="alert" hidden></p>
    <footer>
      <button class="btn" type="button" id="rgCancel">Vazgeç</button>
      <button class="btn primary" type="submit" id="rgGo"><span class="spark" aria-hidden="true">✦</span><span id="rgGoText">Üret</span></button>
    </footer>
  </form>
</dialog>
<dialog class="dlg igdlg" id="igDlg" aria-labelledby="igTitle">
  <form id="igForm">
    <header><h2 id="igTitle">Instagram'da paylaş</h2>
      <button class="btn icon ghost" type="button" id="igClose" aria-label="Kapat" title="Kapat">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg></button></header>
    <div class="dbody" id="igSetup" hidden><p class="tip" id="igSetupMsg"></p></div>
    <div class="dbody" id="igForm1" hidden>
      <div class="igprev"><img id="igPrev" alt="" width="108" height="135">
        <p class="tip"><b id="igAcc"></b> hesabında feed gönderisi olarak paylaşılır (1080×1350). Paylaşılan post, Instagram'dan silinmedikçe yeniden paylaşılamaz.</p></div>
      <label class="f"><span>Instagram açıklaması</span><textarea id="igCaption" rows="7" aria-describedby="igCapChk" placeholder="İlk satır akışta görünür: derdi ya da kazancı tek cümlede söyleyin."></textarea></label>
      <div class="capchk" id="igCapChk"></div>
    </div>
    <div class="dbody" id="igRun" hidden>
      <div class="progress" role="status" aria-live="polite"><i class="spin" aria-hidden="true"></i>
        <div><b>Instagram'a gönderiliyor</b><small>Görsel yükleniyor ve yayınlanıyor, genelde 10–30 sn sürer</small></div></div>
    </div>
    <div class="dbody" id="igDone" hidden>
      <p class="ok">Post Instagram'da paylaşıldı.</p>
      <a class="btn" id="igLink" target="_blank" rel="noopener">Instagram'da aç ↗</a>
    </div>
    <p class="err" id="igErr" role="alert" hidden></p>
    <footer>
      <button class="btn" type="button" id="igCancel">Vazgeç</button>
      <button class="btn primary" type="submit" id="igGo">Paylaş</button>
    </footer>
  </form>
</dialog>
<script nonce="__NONCE__" src="lib/html-to-image.js"></script>
<script nonce="__NONCE__" src="lib/jspdf.umd.min.js"></script>
<script nonce="__NONCE__" src="lib/mp4-muxer.js"></script>
<script nonce="__NONCE__" src="ikonlar.js"></script>
<script nonce="__NONCE__" src="caption.js"></script>
<script nonce="__NONCE__" src="kutuphane.js"></script>
<script nonce="__NONCE__" src="ortak-ops.js"></script>
<script nonce="__NONCE__" src="ortak-istemci.js"></script>
<script nonce="__NONCE__" src="app.js"></script>
<script nonce="__NONCE__" src="ig.js"></script>
<script nonce="__NONCE__" src="ekle.js"></script>
<script nonce="__NONCE__" src="tasarim.js"></script>
<script nonce="__NONCE__" src="disa.js"></script>
</body>
</html>
`;

export const editorSayfasi = (nonce: string) => SAYFA.replaceAll("__NONCE__", nonce);
