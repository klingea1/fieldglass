import { Capacitor } from '@capacitor/core';
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

/**
 * Hands a CSV to the user. On the phone it is written to the app cache and
 * opened in the Android share sheet; in a browser it downloads.
 */
export async function exportCSV(filename: string, csv: string): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    const { uri } = await Filesystem.writeFile({
      path: filename,
      data: csv,
      directory: Directory.Cache,
      encoding: Encoding.UTF8,
    });
    try {
      await Share.share({ title: filename, files: [uri] });
    } catch (error) {
      // Closing the share sheet without picking a target is not a failure.
      if (!String(error).toLowerCase().includes('cancel')) throw error;
    }
    return;
  }

  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
