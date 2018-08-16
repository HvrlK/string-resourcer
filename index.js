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
                process.exit();
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


















const START_POINT_STRINGS = 4;
const START_POINT_PLURALS = 3;
const HOW_MANY_QUANTITIES = 6;


let DOCUMENT_ID = '';
let PLATFORM = '';
let LOCALE_COLUMN = '';
let LOCALE_NAME = '';
let COLUMN_LENGTH = '';
let PLURALS_LOCALE_COLUMN = '';
let PLURALS_COLUMN_LENGTH = '';

let PLATFORMS = [];
let NAMESPACES = [];
let KEYS = [];
let LOCALE = [];
let STRINGS = [];

let PLURALS = [];
let PLURAL_PLAFORMS = [];
let PLURAL_NAMESPACES = [];
let PLURAL_KEYS = [];
let PLURAL_QUANTITY = [];
let PLURAL_LOCALE = [];
//both
function askingInputData() {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });
    return new Promise(resolve => {
        rl.question('Enter platform(IOS/ANDROID), document id, locale column name in STRINGS (A/B/C), locale name (de/ru/base), locale column name in PLURALS (A/B/C): ', (code) => {
            rl.close();

            const data = code.split(',');
            PLATFORM = data[0];
            DOCUMENT_ID = data[1];
            LOCALE_COLUMN = data[2];
            LOCALE_NAME = data[3];
            PLURALS_LOCALE_COLUMN = data[4];
            resolve();
        })
    });
}



//android
function makeStringsReadyToBeWrittenAndroid() {
    let result = '<?xml version="1.0" encoding="utf-8"?>\n<resources>\n\n';
    for (let i = 0; i< STRINGS.length; i++) {
        if ((i===0) || (i!==0 && NAMESPACES[i-1].toString() !== NAMESPACES[i].toString())){
            result += '\n';
            result += '     <!--' +NAMESPACES[i]+'-->\n';
        }

        result += '    ' + STRINGS[i] + '\n';
    }
    for (let i = 0; i<PLURALS.length; i++) {
        if (PLURALS[i].startsWith('<plurals') || PLURALS[i].startsWith('</plurals') || PLURALS[i].startsWith('\n<!--'))
            result += '    ';
        else
            result += '        ';
        result += PLURALS[i] + '\n';
    }
    result += '</resources>';
    return result;
}

function makePluralsReadyToBeWrittenIos() {
    let result = '<?xml version="1.0" encoding="UTF-8"?>\n';
    result += '<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" ';
    result += '"http://www.apple.com/DTDs/PropertyList-1.0.dtd">\n';
    result += '<plist version="1.0">\n';
    result += '<dict>';
    for (let i = 0; i< PLURALS.length; i++) {
        result += PLURALS[i];
    }
    result += '</dict>\n';
    result += '</plist>';
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
function getStringsData(tableName, sheets, symbol, length, start) {
    return new Promise(resolve => {
        sheets.spreadsheets.values.get({
            spreadsheetId: DOCUMENT_ID,
            range: tableName + '!' + symbol + start + ':' + symbol + '' + length,
        }, (err, res) => {
            if (err) return resolve(undefined);
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

function validateData(data) {
    let undefCounter = 0;
    if(!data)
        return false;
    for (let i = 0; i < data.length; i ++){
        if (!data[i])
            undefCounter++;
    }
    if (undefCounter === data.length - 1)
        return false;
    else
        return true;
}

//both
async function getNeededData(auth) {
    await askingInputData();
    const sheets = google.sheets({version: 'v4', auth});
    let checkForDataPresence = [];
    for (let i = 1; i < 100; i++) {
        checkForDataPresence = await getStringsData('Strings',sheets, 'A', i * 100 + START_POINT_STRINGS, (i - 1) * 100 + START_POINT_STRINGS);
        if (!validateData(checkForDataPresence)){
            COLUMN_LENGTH = (i - 1) * 100 + START_POINT_STRINGS;
            break;
        }
    }
    console.log('PLURALS');
    for (let i = 1; i < 100; i++) {
        checkForDataPresence = await getStringsData('Plurals',sheets, 'D', i * 5 + START_POINT_PLURALS, (i - 1) * 5 + START_POINT_PLURALS);
        if((i - 1) * 5 + START_POINT_PLURALS > 20)
            console.log(checkForDataPresence);
        if (!validateData(checkForDataPresence)){
            PLURALS_COLUMN_LENGTH = (i - 1) * 5 + START_POINT_PLURALS;
            break;
        }
    }
    const platforms = await getStringsData('Strings',sheets, 'A', COLUMN_LENGTH, START_POINT_STRINGS);
    const namespaces = await getStringsData('Strings',sheets, 'B', COLUMN_LENGTH, START_POINT_STRINGS);
    const keys = await getStringsData('Strings',sheets, 'C', COLUMN_LENGTH, START_POINT_STRINGS);
    const locale = await getStringsData('Strings',sheets, LOCALE_COLUMN, COLUMN_LENGTH, START_POINT_STRINGS);


    const pluralsPlatform = await getStringsData('Plurals',sheets, 'A', PLURALS_COLUMN_LENGTH, START_POINT_PLURALS);
    const pluralsNamespace = await getStringsData('Plurals',sheets, 'B', PLURALS_COLUMN_LENGTH, START_POINT_PLURALS);
    const pluralsKeys = await getStringsData('Plurals',sheets, 'C', PLURALS_COLUMN_LENGTH, START_POINT_PLURALS);
    const pluralsQuantity = await getStringsData('Plurals',sheets, 'D', PLURALS_COLUMN_LENGTH, START_POINT_PLURALS);
    const pluralsLocale = await getStringsData('Plurals',sheets, PLURALS_LOCALE_COLUMN, PLURALS_COLUMN_LENGTH, START_POINT_PLURALS);



    filterByPlatform(platforms, namespaces, keys, locale);
    filterPluralsByPlatform(pluralsPlatform, pluralsNamespace, pluralsKeys, pluralsQuantity, pluralsLocale);
    if (PLATFORM.toUpperCase() === 'ANDROID') {
        parseAndroidStrings();
        parsePluralsAndroid();
        writeFilesAndroid();
    }
    else if (PLATFORM.toUpperCase() === 'IOS') {
        parseIosStrings();
        parsePluralsIos();
        writeFilesIos();
    }
    else {
        console.log('Invalid platform');
    }
}


function writeFilesIos() {
    let name = '';
    if (LOCALE_NAME.toLocaleLowerCase() === 'base')
        name = 'Base';
    else
        name = LOCALE_NAME.toLowerCase();
    if (!fs.existsSync('./' + name + '.lproj'))
        fs.mkdirSync('./' + name + '.lproj');
    fs.writeFile('./' + name + '.lproj' + '/Localizable' + '.strings', makeStringsReadyToBeWrittenIos(), function (err) {
        if (err) throw err;
        console.log('Saved');
    });
    fs.writeFile('./' + name + '.lproj' + '/Localizable' + '.stringsdict', makePluralsReadyToBeWrittenIos(), function (err) {
        if (err) throw err;
        console.log('Saved');
    });
}

function makeStringsReadyToBeWrittenIos() {
    let result = '';
    for (let i = 0; i< STRINGS.length; i++) {
        if ((i===0) || (i!==0 && NAMESPACES[i-1].toString() !== NAMESPACES[i].toString())){
            if(NAMESPACES[i] !== '' && NAMESPACES[i] !== undefined){
                result += '\n';
                result += '//MARK: ' +NAMESPACES[i]+'\n';
            }
        }
        result += STRINGS[i] + '\n';
    }

    return result;
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

function parsePluralsIos() {
    let writeHeader = true;
    for (let i = 0; i < PLURAL_PLAFORMS.length; i++) {
        let res = '';

        if(!PLURAL_NAMESPACES[i] || !PLURAL_PLAFORMS[i] || !PLURAL_QUANTITY[i] || !PLURAL_LOCALE[i] || !PLURAL_KEYS[i])
            continue;
        if(writeHeader) {
            res = '\n    <key>' + insertUnderScoresInsteadSpaces(PLURAL_NAMESPACES[i].toLocaleLowerCase()) + '_' + insertUnderScoresInsteadSpaces(PLURAL_KEYS[i]).toLocaleLowerCase() + '</key>\n';
            res += '    <dict>\n';

            res += '        <key>' + 'NSStringLocalizedFormatKey' + '</key>\n';
            res += '        <string>' + '%#@placeholder' + '1@' + '</string>\n';
            res += '        <key>' + 'placeholder' + '1' + '</key>\n';


            res += '        <dict>\n';
            res += '            <key>' + 'NSStringFormatSpecTypeKey' + '</key>\n';
            res += '            <string>' + 'NSStringPluralRuleType' + '</string>\n';
            res += '            <key>' + 'NSStringFormatValueTypeKey' + '</key>\n';
            res += '            <string>d</string>\n';

            PLURALS.push(res);
            res = '';
            writeHeader = false;
        }
        res = '            <key>' + PLURAL_QUANTITY[i] + '</key>\n';
        res += '            <string>' + PLURAL_LOCALE[i] + '</string>\n';
        PLURALS.push(res);
        if(PLURAL_NAMESPACES[i] !== PLURAL_NAMESPACES[i+1] || PLURAL_KEYS[i] !== PLURAL_KEYS[i+1]){
            res = '        </dict>\n';
            res += '    </dict>\n';
            PLURALS.push(res);
            writeHeader = true;
        }
    }
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
    const done = makeReplacesForXmlFile(result);
    return done;
}

function makeReplacesForXmlFile(locale) {
    let result = '';
    for (let i = 0; i < locale.length; i++) {
        if(locale[i] === '&'){
            result += '&amp;';
            continue;
        }
        if(locale[i] === '<'){
            result += '&lt;';
            continue;
        }
        if(locale[i] === '>'){
            result += '&gt;';
            continue;
        }
        if(locale[i] === '"'){
            result += '&quot;';
            continue;
        }
        if(locale[i] === "'"){
            result += '&apos;';
            continue;
        }
        if(locale[i] === '\r' && locale[i+1] === '\n'){
            result += '\\n';
            i++;
            continue;
        }
        if(locale[i] === '\r' || locale[i] === '\n'){
            result += '\\n';
            continue
        }
        result += locale[i];
    }
    return result;
}

//android
function parseAndroidStrings() {
    for (let i = 0; i < PLATFORMS.length; i++) {
        if(!NAMESPACES[i] || !KEYS[i] || !LOCALE[i] || !PLATFORMS[i])
            continue;
        let res = 'string name=' + '"' + insertUnderScoresInsteadSpaces(NAMESPACES[i].toLocaleLowerCase()) + '_' + insertUnderScoresInsteadSpaces(KEYS[i].toLocaleLowerCase()) + '">' + makeLocalesGreatAgain(LOCALE[i]) + '</string';
        res = '<' + res + '>';
        STRINGS.push(res);
    }
}


function parsePluralsAndroid() {
    let writeHeader = true;
    for (let i = 0; i < PLURAL_PLAFORMS.length; i++) {
        let res = '';

        if(!PLURAL_NAMESPACES[i] || !PLURAL_PLAFORMS[i] || !PLURAL_QUANTITY[i] || !PLURAL_LOCALE[i] || !PLURAL_KEYS[i])
            continue;
        if(writeHeader) {
            res = '\n    <!-- ' + PLURAL_NAMESPACES[i] + '-->';
            PLURALS.push(res);
            res = '<plurals ';
            res += 'name ='+ "'" + insertUnderScoresInsteadSpaces(PLURAL_NAMESPACES[i].toLocaleLowerCase()) + '_' + insertUnderScoresInsteadSpaces(PLURAL_KEYS[i]).toLocaleLowerCase() + "'>";
            PLURALS.push(res);
            res = '';
            writeHeader = false;
        }
        res = '<item ';
        res += 'quantity=' + "'" + PLURAL_QUANTITY[i] + "'>" + PLURAL_LOCALE[i] + '</';
        res += 'item>';
        PLURALS.push(res);
        if(PLURAL_NAMESPACES[i] !== PLURAL_NAMESPACES[i+1] || PLURAL_KEYS[i] !== PLURAL_KEYS[i+1]){
            res = '</plurals';
            res += '>';
            PLURALS.push(res);
            writeHeader = true;
        }
    }
}

//ios
function parseIosStrings() {
    for (let i = 0; i < PLATFORMS.length; i++) {
        if(!NAMESPACES[i] || !KEYS[i] || !LOCALE[i] || !PLATFORMS[i])
            continue;
        let res = '"' + insertUnderScoresInsteadSpaces(NAMESPACES[i].toLocaleLowerCase()) + '_' + insertUnderScoresInsteadSpaces(KEYS[i].toLocaleLowerCase()) + '" = "' + makeLocalesGreatAgain(LOCALE[i]) + '";';
        STRINGS.push(res);
    }
}

//both
function filterPluralsByPlatform(platforms, namespace, key, quantity, locale) {
    let platform = '';
    let namesp = '';
    let k = '';
    for (let i = 0; i < quantity.length; i++) {
        if(platforms[i] && platforms[i].toString()){
            platform = platforms[i].toString();
            namesp = namespace[i].toString();
            k = key[i].toString();
        }
        if(platform.toUpperCase() === PLATFORM.toUpperCase() || platform.toUpperCase() === 'BOTH'){
            PLURAL_PLAFORMS.push(platform);
            PLURAL_KEYS.push(k);
            PLURAL_LOCALE.push(locale[i].toString());
            PLURAL_NAMESPACES.push(namesp);
            PLURAL_QUANTITY.push(quantity[i].toString());
        }
    }
}

//both
function filterByPlatform(platforms, namespaces, keys, locale) {
    for (let i = 0; i < platforms.length; i++) {
        if (platforms[i].toString().toUpperCase() === PLATFORM.toUpperCase() || platforms[i].toString().toUpperCase() === 'BOTH') {
            PLATFORMS.push(platforms[i].toString());
            NAMESPACES.push(namespaces[i].toString());
            KEYS.push(keys[i].toString());
            LOCALE.push(locale[i].toString());
        }
    }
}