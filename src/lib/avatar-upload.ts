import { supabase } from '@/integrations/supabase/client';

const MAX_INPUT_BYTES = 5 * 1024 * 1024;
const OUTPUT_SIZE = 400;

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Não foi possível ler a imagem.'));
    };
    img.src = url;
  });
}

async function resizeImage(file: File, maxSize: number): Promise<Blob> {
  const img = await loadImage(file);
  const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
  const width = Math.max(1, Math.round(img.width * scale));
  const height = Math.max(1, Math.round(img.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Não foi possível processar a imagem.');
  ctx.drawImage(img, 0, 0, width, height);

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob((b) => resolve(b), 'image/webp', 0.85),
  );
  if (!blob) throw new Error('Não foi possível processar a imagem.');
  return blob;
}

/** Redimensiona e envia a foto do usuário, retornando a URL pública com cache-busting. */
export async function uploadAvatar(
  userId: string,
  file: File,
): Promise<{ url: string | null; error: Error | null }> {
  try {
    if (!file.type.startsWith('image/')) {
      throw new Error('O arquivo precisa ser uma imagem.');
    }
    if (file.size > MAX_INPUT_BYTES) {
      throw new Error('A imagem deve ter no máximo 5 MB.');
    }

    const blob = await resizeImage(file, OUTPUT_SIZE);
    const path = `${userId}/avatar.webp`;

    const { error } = await supabase.storage
      .from('avatars')
      .upload(path, blob, { contentType: 'image/webp', upsert: true, cacheControl: '3600' });
    if (error) throw error;

    const { data } = supabase.storage.from('avatars').getPublicUrl(path);
    return { url: `${data.publicUrl}?v=${Date.now()}`, error: null };
  } catch (e) {
    return { url: null, error: e instanceof Error ? e : new Error('Falha ao enviar a imagem.') };
  }
}
