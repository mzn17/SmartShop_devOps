/**
 * Télécharge un blob renvoyé par l'API (PDF, Excel…) sans quitter la page.
 */
export function saveBlob(blob, filename) {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

/** Extrait le nom de fichier d'un en-tête Content-Disposition. */
export function filenameFromHeaders(headers, fallback) {
  const disposition = headers?.['content-disposition'] || '';
  const match = disposition.match(/filename="?([^";]+)"?/i);
  return match ? match[1] : fallback;
}
