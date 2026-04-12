export const MAX_IMAGE_FILE_SIZE_BYTES = 5 * 1024 * 1024;
export const MAX_IMAGE_FILE_SIZE_LABEL = '5 MB';

export const ALLOWED_IMAGE_MIME_TYPES = new Set([
	'image/jpeg',
	'image/png',
	'image/gif',
	'image/webp',
]);

export const ALLOWED_IMAGE_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp']);

export const PRODUCT_IMAGE_PATH_PATTERN = /^[0-9a-f-]{36}\/[A-Za-z0-9._-]+$/i;