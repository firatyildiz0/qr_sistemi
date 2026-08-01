-- Başarılı giriş kayıtlarını tutmayı bırakıyoruz.
--
-- 0017'de başarılı girişler de yazılıyordu: başarısız denemelerin arasında
-- hangi oturumların gerçekten açıldığını görmek içindi. Pratikte ekranı sıradan
-- günlük girişlerle dolduruyor ve gerçekten dikkat gerektiren olayları
-- gölgeliyordu — üstelik her giriş için bir kullanıcı adı + IP satırı
-- biriktiriyordu. Uygulama artık bu olayı hiç yazmıyor (bkz. login/actions.ts).
--
-- Geçmişte birikenler de siliniyor: tutmama kararı geriye de dönük.
delete from security_events where kind = 'login_ok';
