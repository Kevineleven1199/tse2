import { google } from "googleapis";

function getAuth() {
  const keyBase64 = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (!keyBase64) return null;

  try {
    const key = JSON.parse(Buffer.from(keyBase64, "base64").toString("utf8"));
    return new google.auth.GoogleAuth({
      credentials: key,
      scopes: ["https://www.googleapis.com/auth/drive"],
    });
  } catch (error) {
    console.error("Failed to initialize Google Auth:", error);
    return null;
  }
}

const PARENT_FOLDER_ID = process.env.GOOGLE_DRIVE_PARENT_FOLDER_ID || "";

export async function createClientFolder(
  customerName: string,
  address: string
): Promise<{ folderId: string; folderUrl: string } | null> {
  const auth = getAuth();
  if (!auth || !PARENT_FOLDER_ID) {
    console.warn("Google Drive not configured - missing auth or parent folder ID");
    return null;
  }

  const drive = google.drive({ version: "v3", auth });

  try {
    // Create main client folder: "CustomerName - 123 Main St"
    const folderName = `${customerName} - ${address}`.substring(0, 100);

    // Check if folder already exists
    const existing = await drive.files.list({
      q: `name='${folderName.replace(/'/g, "\\'")}' and '${PARENT_FOLDER_ID}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      fields: "files(id, webViewLink)",
      pageSize: 1,
    });

    if (existing.data.files?.length) {
      return {
        folderId: existing.data.files[0].id!,
        folderUrl: existing.data.files[0].webViewLink!,
      };
    }

    // Create new folder
    const folder = await drive.files.create({
      requestBody: {
        name: folderName,
        mimeType: "application/vnd.google-apps.folder",
        parents: [PARENT_FOLDER_ID],
      },
      fields: "id, webViewLink",
    });

    if (!folder.data.id || !folder.data.webViewLink) {
      console.error("Failed to get folder ID or URL from Drive API response");
      return null;
    }

    // Create subfolders
    const subfolders = ["Photos", "Invoices", "Contracts", "Notes"];
    for (const sub of subfolders) {
      await drive.files.create({
        requestBody: {
          name: sub,
          mimeType: "application/vnd.google-apps.folder",
          parents: [folder.data.id],
        },
        fields: "id",
      });
    }

    // Make folder viewable by anyone with link (so admins can access)
    await drive.permissions.create({
      fileId: folder.data.id,
      requestBody: {
        role: "reader",
        type: "anyone",
      },
      fields: "id",
    });

    return {
      folderId: folder.data.id,
      folderUrl: folder.data.webViewLink,
    };
  } catch (error) {
    console.error("Google Drive folder creation failed:", error);
    return null;
  }
}

export async function getOrCreateClientFolder(
  customerName: string,
  address: string
): Promise<{ folderId: string; folderUrl: string } | null> {
  return createClientFolder(customerName, address);
}

/**
 * Find a subfolder by name inside a parent folder
 */
export async function findSubfolder(
  parentFolderId: string,
  subfolderName: string
): Promise<string | null> {
  const auth = getAuth();
  if (!auth) return null;

  const drive = google.drive({ version: "v3", auth });

  try {
    const res = await drive.files.list({
      q: `name='${subfolderName}' and '${parentFolderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      fields: "files(id)",
      pageSize: 1,
    });
    return res.data.files?.[0]?.id ?? null;
  } catch (error) {
    console.error(`Failed to find subfolder "${subfolderName}":`, error);
    return null;
  }
}

/**
 * Upload a photo to Google Drive inside a client's Photos subfolder.
 * Returns Drive file metadata or null on failure.
 */
export async function uploadPhotoToDrive(
  clientFolderId: string,
  base64Data: string,
  filename: string
): Promise<{ fileId: string; fileUrl: string } | null> {
  const auth = getAuth();
  if (!auth) return null;

  const drive = google.drive({ version: "v3", auth });

  try {
    // Find the Photos subfolder
    let photosFolderId = await findSubfolder(clientFolderId, "Photos");

    // Create it if it doesn't exist
    if (!photosFolderId) {
      const folder = await drive.files.create({
        requestBody: {
          name: "Photos",
          mimeType: "application/vnd.google-apps.folder",
          parents: [clientFolderId],
        },
        fields: "id",
      });
      photosFolderId = folder.data.id ?? null;
    }

    if (!photosFolderId) return null;

    // Strip data URL prefix if present
    const rawBase64 = base64Data.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(rawBase64, "base64");

    // Determine MIME type
    const mimeType = base64Data.startsWith("data:image/png") ? "image/png" : "image/jpeg";

    // Upload file
    const { Readable } = await import("stream");
    const file = await drive.files.create({
      requestBody: {
        name: filename,
        parents: [photosFolderId],
      },
      media: {
        mimeType,
        body: Readable.from(buffer),
      },
      fields: "id, webViewLink, webContentLink",
    });

    if (!file.data.id) return null;

    // Make viewable by anyone with link
    await drive.permissions.create({
      fileId: file.data.id,
      requestBody: { role: "reader", type: "anyone" },
      fields: "id",
    });

    // Build a direct-view URL
    const fileUrl = `https://drive.google.com/uc?export=view&id=${file.data.id}`;

    return { fileId: file.data.id, fileUrl };
  } catch (error) {
    console.error("Drive photo upload failed:", error);
    return null;
  }
}
