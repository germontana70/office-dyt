'use server';

import { google } from 'googleapis';
import { PassThrough } from 'stream';
import path from 'path';
import fs from 'fs';

// This safely ensures we can authenticate Google Drive if credentials exist
const getDriveClient = () => {
    try {
        const credentialsPath = path.join(process.cwd(), 'google-credentials', 'credentials.json');
        
        if (!fs.existsSync(credentialsPath)) {
            throw new Error('El archivo credentials.json no existe en el directorio google-credentials.');
        }

        const credentialsData = fs.readFileSync(credentialsPath, 'utf8');
        const credentials = JSON.parse(credentialsData);

        if (!credentials.private_key || !credentials.client_email) {
            throw new Error('El archivo credentials.json está vacío o mal configurado.');
        }

        const auth = new google.auth.GoogleAuth({
            credentials: {
                client_email: credentials.client_email,
                private_key: credentials.private_key.replace(/\\n/g, '\n'),
            },
            scopes: ['https://www.googleapis.com/auth/drive'],
        });
        
        return google.drive({ version: 'v3', auth });
    } catch (error: any) {
        console.error('[DRIVE SETUP] Missing or invalid google-credentials/credentials.json', error);
        throw new Error(error.message || 'Google Drive integration is not configured properly.');
    }
};

/**
 * Ensures a folder exists by name (and optionally within a parent).
 * If not, creates it and returns the ID.
 */
async function getOrCreateFolder(drive: any, folderName: string, parentId?: string): Promise<string> {
    const parentQuery = parentId ? ` and '${parentId}' in parents` : '';
    const query = `mimeType='application/vnd.google-apps.folder' and name='${folderName}' and trashed=false${parentQuery}`;
    
    const response = await drive.files.list({
        q: query,
        spaces: 'drive',
        fields: 'files(id, name)',
    });

    if (response.data.files && response.data.files.length > 0) {
        return response.data.files[0].id;
    }

    const folderMetadata: any = {
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder',
    };
    if (parentId) {
        folderMetadata.parents = [parentId];
    }

    const createResponse = await drive.files.create({
        requestBody: folderMetadata,
        fields: 'id',
    });

    return createResponse.data.id;
}

export async function uploadPaymentEvidence(
    formData: FormData
): Promise<{ success: boolean; url?: string; webViewLink?: string; error?: string }> {
    try {
        const file = formData.get('file') as File;
        const studentName = formData.get('studentName') as string;
        const studentDocument = formData.get('studentDocument') as string;
        const semester = formData.get('semester') as string;
        const paymentTitle = formData.get('paymentTitle') as string;

        if (!file || !studentName || !studentDocument || !semester || !paymentTitle) {
            return { success: false, error: 'Faltan parámetros requeridos.' };
        }

        const drive = getDriveClient();

        console.log(`[DRIVE UPLOAD] Phase 1 - Resolving Canvas (Semester): ${semester}`);
        const semesterFolderId = await getOrCreateFolder(drive, semester);

        const studentFolderName = `${studentName} - ${studentDocument}`;
        console.log(`[DRIVE UPLOAD] Phase 2 - Resolving Node (Student): ${studentFolderName}`);
        const studentFolderId = await getOrCreateFolder(drive, studentFolderName, semesterFolderId);

        console.log(`[DRIVE UPLOAD] Phase 3 - Generating Stream context...`);
        const fileExtension = file.name.split('.').pop();
        const customFileName = `Soporte_${paymentTitle.replace(/[\/\s]/g, '_')}_${Date.now()}.${fileExtension}`;
        
        // Convert File to a readable native stream
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const stream = new PassThrough();
        stream.end(buffer);

        console.log(`[DRIVE UPLOAD] Phase 4 - Transmitting payload to Drive...`);
        const media = {
            mimeType: file.type,
            body: stream,
        };

        const uploadResponse = await drive.files.create({
            requestBody: {
                name: customFileName,
                parents: [studentFolderId],
            },
            media: media,
            fields: 'id, webViewLink',
        });

        const fileId = uploadResponse.data.id;
        
        console.log(`[DRIVE UPLOAD] Phase 5 - Setting file permissions to public read...`);
        await drive.permissions.create({
            fileId: fileId as string,
            requestBody: {
                role: 'reader',
                type: 'anyone',
            },
        });

        console.log(`[DRIVE UPLOAD] Transaction SUCCESS.`);
        return { 
            success: true, 
            url: uploadResponse.data.webViewLink as string,
            webViewLink: uploadResponse.data.webViewLink as string 
        };

    } catch (error: any) {
        console.error('[DRIVE UPLOAD] Critical exception:', error);
        return { success: false, error: error.message || 'Error uploading file a Google Drive' };
    }
}
