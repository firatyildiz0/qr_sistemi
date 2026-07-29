/**
 * Ana ekran simgesi. `ImageResponse` (satori) yalnızca CSS'in bir alt kümesini
 * anlıyor — flexbox ve mutlak konumlama var, `border-radius` var, ama gradient
 * ya da SVG `path` yok. Simge bu yüzden salt geometriden kuruluyor: bir QR
 * karesinin üç köşe göstergesi ve bir modül bloğu. Yazı tipi de gerekmiyor,
 * yani hiçbir font indirmesine bağlı değil.
 *
 * Android maskeleme uygularken simgenin kenarlarını kırpar; işaret bu yüzden
 * kenarlardan %20 içeride duruyor (güvenli alan).
 */
export function BrandIcon({ size }: { size: number }) {
  const unit = size / 100;
  const corner = 22 * unit;
  const thickness = Math.max(2, 5 * unit);

  const eye = (extra: React.CSSProperties) => (
    <div
      style={{
        position: "absolute",
        width: corner,
        height: corner,
        border: `${thickness}px solid #ff5a1f`,
        borderRadius: 6 * unit,
        ...extra,
      }}
    />
  );

  return (
    <div
      style={{
        width: size,
        height: size,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#0f2a22",
      }}
    >
      <div style={{ position: "relative", width: 60 * unit, height: 60 * unit, display: "flex" }}>
        {eye({ top: 0, left: 0 })}
        {eye({ top: 0, right: 0 })}
        {eye({ bottom: 0, left: 0 })}
        {/* Dördüncü köşede göstergenin olmaması QR kodunun kendi kuralı;
            yerine bir modül bloğu duruyor. */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            right: 0,
            width: 22 * unit,
            height: 22 * unit,
            borderRadius: 4 * unit,
            background: "#ff5a1f",
          }}
        />
      </div>
    </div>
  );
}
