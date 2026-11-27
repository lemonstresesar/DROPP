import { bootstrapTestAccounts, firebaseConfig } from './_lib/droppAuth';

export default async function handler(_req: any, res: any) {
  const authSetupStatus = await bootstrapTestAccounts();
  res.status(200).json({
    ok: true,
    projectId: firebaseConfig.projectId,
    cloudinaryConfigured: Boolean(
      process.env.CLOUDINARY_CLOUD_NAME &&
        process.env.CLOUDINARY_API_KEY &&
        process.env.CLOUDINARY_API_SECRET
    ),
    authSetupStatus,
  });
}
