const fs = require('fs');
const readline = require('readline');
const {google} = require('googleapis');

// If modifying these scopes, delete token.json.
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets.readonly'];
const TOKEN_PATH = 'token.json';

// Load client secrets from a local file.
console.log('Reading credentials');
fs.readFile('credentials.json', (err, content) => {
    if (err) return console.log('Error loading client secret file:', err);
    // Authorize a client with credentials, then call the Google Sheets API.
    authorize(JSON.parse(content), getNeededData);
});

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
function authorize(credentials, callback) {
    const {client_secret, client_id, redirect_uris} = credentials.installed;
    const oAuth2Client = new google.auth.OAuth2(
        client_id, client_secret, redirect_uris[0]);

    // Check if we have previously stored a token.
    fs.readFile(TOKEN_PATH, (err, token) => {
        if (err) return getNewToken(oAuth2Client, callback);
        oAuth2Client.setCredentials(JSON.parse(token));
        callback(oAuth2Client);
    });
}


/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 * @param {google.auth.OAuth2} oAuth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback for the authorized client.
 */
function getNewToken(oAuth2Client, callback) {
    const authUrl = oAuth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES,
    });
    console.log('Authorize this app by visiting this url:', authUrl);
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });
    rl.question('Enter the code from that page here: ', (code) => {
        rl.close();
        oAuth2Client.getToken(code, (err, token) => {
            if (err) return console.error('Error while trying to retrieve access token', err);
            oAuth2Client.setCredentials(token);
            // Store the token to disk for later program executions
            fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
                if (err) console.error(err);
                console.log('Token stored to', TOKEN_PATH);
            });
            callback(oAuth2Client);
        });
    });
}


/**
 * Prints the names and majors of students in a sample spreadsheet:
 * @see https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit
 * @param {google.auth.OAuth2} auth The authenticated Google OAuth client.
 */
function listMajors(auth) {
    const sheets = google.sheets({version: 'v4', auth});
    sheets.spreadsheets.values.get({
        spreadsheetId: '1iGmKHDSYiIzuw5M4h88boy-UTsT_2IPT08AiCAAtdj4',
        range: 'Strings!D4:D27',
    }, (err, res) => {
        if (err) return console.log('The API returned an error: ' + err);
        const rows = res.data.values;
        if (rows.length) {
            console.log('Name, Major:');
            // Print columns A and E, which correspond to indices 0 and 4.
            rows.map((row) => {
                console.log(`${row[0]}`);
            });
        } else {
            console.log('No data found.');
        }
    });
}





















let DOCUMENT_ID = '';
let PLATFORM = '';
let LOCALE_COLUMN = '';
let LOCALE_NAME = '';
let COLUMN_LENGTH = '';

let PLATFORMS = [];
let NAMESPACES = [];
let KEYS = [];
let LOCALE = [];
let STRINGS = [];
//both
function askingInputData() {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });
    return new Promise(resolve => {
        rl.question('Enter platform(IOS/ANDROID), document id, column length, locale column name (A/B/C), locale name (de/ru/base) (split data with commas): ', (code) => {
            rl.close();

            const data = code.split(',');
            PLATFORM = data[0];
            DOCUMENT_ID = data[1];
            COLUMN_LENGTH = data[2];
            LOCALE_COLUMN = data[3];
            LOCALE_NAME = data[4];
            resolve();
        })
    });
}

//both
function getStringsData(sheets, symbol) {
    return new Promise(resolve => {
        sheets.spreadsheets.values.get({
            spreadsheetId: DOCUMENT_ID,
            range: 'Strings!' + symbol + '4:' + symbol + '' + COLUMN_LENGTH,
        }, (err, res) => {
            if (err) return console.log('The API returned an error: ' + err);
            const rows = res.data.values;
            if (rows.length) {
                resolve(rows);
            } else {
                resolve();
                console.log('No data found.');
            }
        });
    });
}

//android
function makeStringsReadyToBeWrittenAndroid() {
    let result = '<?xml version="1.0" encoding="utf-8"?>\n<resources>\n\n';
    for (let i = 0; i< STRINGS.length; i++) {
        if ((i===0) || (i!==0 && NAMESPACES[i-1].toString() !== NAMESPACES[i].toString()))
            result += '     <!--' +NAMESPACES[i]+'-->\n';
        result += '    ' + STRINGS[i] + '\n';
    }
    result += '</resources>';
    return result;
}

//android
function writeFilesAndroid() {
    if (LOCALE_NAME === 'base') {
        if (!fs.existsSync('./values'))
            fs.mkdirSync('./values');
        fs.writeFile('./values/' + 'strings' + '.xml', makeStringsReadyToBeWrittenAndroid(), function (err) {
            if (err) throw err;
            console.log('Saved');
        });
    }else {
        if (!fs.existsSync('./values-'+LOCALE_NAME))
            fs.mkdirSync('./values-'+LOCALE_NAME);
        fs.writeFile('./values-' + LOCALE_NAME + '/strings' + '.xml', makeStringsReadyToBeWrittenAndroid(), function (err) {
            if (err) throw err;
            console.log('Saved');
        });
    }
}

//both
async function getNeededData(auth) {
    await askingInputData();
    const sheets = google.sheets({version: 'v4', auth});
    const platforms = await getStringsData(sheets, 'A');
    const namespaces = await getStringsData(sheets, 'B');
    const keys = await getStringsData(sheets, 'C');
    const locale = await getStringsData(sheets, LOCALE_COLUMN);

    if (!platforms || !namespaces || !keys || !locale)
        throw 'NotFound';

    filterByPlatform(platforms, namespaces, keys, locale);
    if (PLATFORM.toUpperCase() === 'ANDROID') {
        parseAndroidStrings();
        writeFilesAndroid();
    }
    else if (PLATFORM.toUpperCase() === 'IOS') {
        parseIosStrings();

    }
    else {
        console.log('Invalid platform');
    }

}

//both
function insertUnderScoresInsteadSpaces(key) {
    const data = key.split(' ');
    let res = '';
    for (let i = 0; i < data.length; i++) {
        res += data[i] + '_';
    }
    return res.slice(0, -1);
}


//both
function makeLocalesGreatAgain(locale){
    let result = '';
    let howManyInsertions = 1;
    for (let i = 0; i<locale.length; i++) {
        if(locale[i] === '%' && locale[i+1] === 's') {
            if (PLATFORM.toUpperCase() === 'ANDROID')
                result += '%' + howManyInsertions  + '$s';
            else
                result += '%@';
            i++;
            howManyInsertions++;
            continue;
        }
        result += locale[i];
    }
    return result;
}

//android
function parseAndroidStrings() {
    for (let i = 0; i < PLATFORMS.length; i++) {
        if(!NAMESPACES[i].toString() || !KEYS[i].toString() || !LOCALE[i].toString() || !PLATFORMS[i].toString())
            continue;
        let res = 'string name=' + '"' + insertUnderScoresInsteadSpaces(NAMESPACES[i].toString().toLocaleLowerCase()) + '_' + insertUnderScoresInsteadSpaces(KEYS[i].toString().toLocaleLowerCase()) + '">' + makeLocalesGreatAgain(LOCALE[i].toString()) + '</string';
        res = '<' + res + '>';
        STRINGS.push(res);
        console.log(res);
    }
}

//ios
function parseIosStrings() {
    for (let i = 0; i < PLATFORMS.length; i++) {
        if(!NAMESPACES[i].toString() || !KEYS[i].toString() || !LOCALE[i].toString() || !PLATFORMS[i].toString())
            continue;
        let res = '"' + insertUnderScoresInsteadSpaces(NAMESPACES[i].toString().toLocaleLowerCase()) + '_' + insertUnderScoresInsteadSpaces(KEYS[i].toString().toLocaleLowerCase()) + '" = "' + makeLocalesGreatAgain(LOCALE[i].toString()) + '";';
        STRINGS.push(res);
        console.log(res);
    }
}


//both
function filterByPlatform(platforms, namespaces, keys, locale) {
    for (let i = 0; i < platforms.length; i++) {
        if (platforms[i].toString().toUpperCase() === PLATFORM.toUpperCase() || platforms[i].toString().toUpperCase() === 'BOTH') {
            PLATFORMS.push(platforms[i]);
            NAMESPACES.push(namespaces[i]);
            KEYS.push(keys[i]);
            LOCALE.push(locale[i]);
        }
    }
}