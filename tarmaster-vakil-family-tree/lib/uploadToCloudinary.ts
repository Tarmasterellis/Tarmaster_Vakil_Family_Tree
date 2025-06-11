import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
	cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
	api_key: process.env.CLOUDINARY_API_KEY!,
	api_secret: process.env.CLOUDINARY_API_SECRET!,
});


export async function uploadToCloudinary(file: File): Promise<string> {
	const formData = new FormData();
	formData.append('file', file);
	formData.append('upload_preset', 'tarmaster-vakil-family-tree'); // Or use unsigned preset created in Cloudinary

	const response = await fetch(`https://api.cloudinary.com/v1_1/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload`, {
		method: 'POST',
		body: formData,
	});

	const data = await response.json();

	if (!response.ok) {
		console.error('Cloudinary error:', data);
		throw new Error(data.error?.message || 'Upload failed');
	}

	return data.secure_url;
}