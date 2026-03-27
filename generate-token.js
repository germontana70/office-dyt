const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { google } = require('googleapis');

const CREDENTIALS_PATH = path.join(__dirname, 'google-credentials', 'credentials.json');
const TOKEN_PATH = path.join(__dirname, 'google-credentials', 'token.json');

const SCOPES = ['https://www.googleapis.com/auth/calendar.readonly'];

function authorize() {
    console.log('--- GENERADOR DE TOKENS OAUTH2 [ADMIN DELEGATION] ---');
    console.log(`Leyendo credenciales desde: ${CREDENTIALS_PATH}`);
    
    fs.readFile(CREDENTIALS_PATH, 'utf8', (err, content) => {
        if (err) {
            console.error('\n❌ Error cargando el archivo de credenciales. Asegúrate de pasarlo descargado desde Google Cloud al directorio: google-credentials/credentials.json\n', err.message);
            return;
        }

        const credentials = JSON.parse(content);
        const keys = credentials.installed || credentials.web;
        const { client_id, client_secret, redirect_uris } = keys;
        
        const oAuth2Client = new google.auth.OAuth2(
            client_id, 
            client_secret, 
            redirect_uris[0]
        );

        getAccessToken(oAuth2Client);
    });
}

function getAccessToken(oAuth2Client) {
    const authUrl = oAuth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES,
    });

    console.log('\nPor favor, autoriza esta aplicación visitando la siguiente URL:');
    console.log('\n======================================================');
    console.log(authUrl);
    console.log('======================================================\n');

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    rl.question('Pega el código de autorización aquí y presiona ENTER: ', (code) => {
        rl.close();
        
        oAuth2Client.getToken(code, (err, token) => {
            if (err) {
                console.error('\n❌ Error recuperando el token de acceso:', err.message);
                return;
            }
            
            // Guárdalo legíblemente en el disco para la ejecución del motor
            try {
                fs.writeFileSync(TOKEN_PATH, JSON.stringify(token, null, 2), 'utf8');
                console.log('\n✅ Token guardado exitosamente.');
                console.log(`Ruta: ${TOKEN_PATH}`);
                console.log('Ya puedes encender npm run dev para inicializar el sync de calendarios.');
            } catch (writeErr) {
                console.error('\n❌ Error escribiendo token.json:', writeErr.message);
            }
        });
    });
}

authorize();
