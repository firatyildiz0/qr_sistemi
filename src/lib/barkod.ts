/**
 * Etiket numarasının kuralı. Veritabanındaki `products_barcode_shape`
 * kısıtıyla (bkz. 0022) aynı; kameranın okuduğu bir sözcüğün numara
 * olabilip olamayacağına buradan bakılıyor.
 */
export const BARCODE_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._/-]{0,31}$/;
