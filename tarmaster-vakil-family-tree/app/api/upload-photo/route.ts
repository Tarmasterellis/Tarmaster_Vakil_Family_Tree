import { NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
	cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
	api_key: process.env.CLOUDINARY_API_KEY!,
	api_secret: process.env.CLOUDINARY_API_SECRET!,
});

export async function POST(req: Request) {
	const formData = await req.formData();
	const file = formData.get('file') as File;

	if (!file) {
		return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
	}

	const buffer = Buffer.from(await file.arrayBuffer());

	try {
		const result = await new Promise((resolve, reject) => {
			cloudinary.uploader
				.upload_stream({ resource_type: 'image' }, (error, result) => {
					if (error) reject(error);
					else resolve(result);
				})
				.end(buffer);
		});

		return NextResponse.json(result);
	} catch (err) {
		return NextResponse.json({ error: 'Upload failed', detail: err }, { status: 500 });
	}
}
