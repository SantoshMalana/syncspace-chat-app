/**
 * Optimizes a Cloudinary image URL for faster loading.
 * Cloudinary URLs look like: https://res.cloudinary.com/cloud_name/image/upload/v12345/public_id.png
 * This inserts transformation parameters right after 'upload/' to compress and crop the image on the server.
 */
export const optimizeCloudinaryUrl = (
  url: string | undefined | null, 
  width: number = 40, 
  height: number = 40,
  crop: string = 'fill',
  quality: string = 'auto',
  fetchFormat: string = 'auto'
): string => {
  if (!url) return '';
  
  // If it's not a Cloudinary URL (e.g. default placeholder or external link), just return it
  if (!url.includes('cloudinary.com/image/upload/')) {
    return url;
  }

  // Insert transformations immediately after "upload/"
  const transform = `upload/w_${width},h_${height},c_${crop},q_${quality},f_${fetchFormat}/`;
  return url.replace('upload/', transform);
};
