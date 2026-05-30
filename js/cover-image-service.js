import {
  uploadImageFile,
  deleteStorageFile,
  getCoverImagesFromDB,
  newCoverImageRef,
  saveCoverImageDoc,
  deleteCoverImageDoc,
  getCoverImageDoc,
  updateCoverImageUsageInDB,
} from './firebase-service.js';

function compressImage(file, maxW = 800, maxH = 450, quality = 0.85) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      const ratio = Math.min(maxW / width, maxH / height, 1);
      width  = Math.round(width  * ratio);
      height = Math.round(height * ratio);
      const canvas = document.createElement('canvas');
      canvas.width  = width;
      canvas.height = height;
      canvas.getContext('2d').drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        blob => blob ? resolve(blob) : reject(new Error('Falha na compressão da imagem')),
        'image/jpeg',
        quality
      );
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Imagem inválida')); };
    img.src = url;
  });
}

export async function getCoverImages() {
  return getCoverImagesFromDB();
}

export async function uploadCoverImage(file, uploaderEmail, onProgress) {
  if (file.size > 5 * 1024 * 1024) throw new Error('Ficheiro demasiado grande (máx. 5 MB)');
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    throw new Error('Formato não suportado. Use JPG, PNG ou WebP');
  }

  const blob       = await compressImage(file);
  const docRef     = newCoverImageRef();
  const imageId    = docRef.id;
  const storagePath = `covers/${imageId}.jpg`;

  const url = await uploadImageFile(storagePath, blob, onProgress);

  const data = {
    url,
    storagePath,
    filename: file.name,
    uploadedBy: uploaderEmail,
    uploadedAt: new Date().toISOString(),
    usedBy: [],
  };
  await saveCoverImageDoc(docRef, data);
  return { id: imageId, ...data };
}

export async function deleteCoverImage(imageId) {
  const imgDoc = await getCoverImageDoc(imageId);
  if (!imgDoc) throw new Error('Imagem não encontrada');
  if (imgDoc.usedBy && imgDoc.usedBy.length > 0) {
    throw new Error(
      `Esta imagem está em uso por ${imgDoc.usedBy.length} formação(ões) e não pode ser apagada`
    );
  }
  await deleteStorageFile(imgDoc.storagePath);
  await deleteCoverImageDoc(imageId);
}

export async function setCoverImageUsage(imageId, courseId, used) {
  if (!imageId || !courseId) return;
  await updateCoverImageUsageInDB(imageId, courseId, used);
}
