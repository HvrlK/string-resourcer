const fs = require('fs');
const readline = require('readline');
const {google} = require('googleapis');
const axios = require('axios');

console.log('start ' + Date.now() / 1000);

const ALL_KEYS = ['ALL', 'BOTH'];

PLATFORM_KEYS = {
    WEB: ['WEB', 'ALL'],
    ANDROID: ['ANDROID', 'ALL', 'BOTH', 'MOBILE'],
    IOS: ['IOS', 'ALL', 'BOTH', 'MOBILE'],
    REACT: ['REACT']
};

// If modifying these scopes, delete token.json.
/*const SCOPES = ['https://www.googleapis.com/auth/spreadsheets.readonly'];
const TOKEN_PATH = 'token.json';

// Load client secrets from a local file.
console.log('Reading credentials');
fs.readFile('credentials.json', (err, content) => {
    if (err) return console.log('Error loading client secret file:', err);
    // Authorize a client with credentials, then call the Google Sheets API.
    authorize(JSON.parse(content), getNeededData);
});
*/
getNeededData();

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
        if (JSON.parse(token).expiry_date - 10000 <= Date.now()) {
            oAuth2Client.refreshToken(JSON.parse(token).refresh_token).then((accessToken) => {
                const updatedToken = JSON.parse(token);
                updatedToken.access_token = accessToken.tokens.access_token;
                updatedToken.expiry_date = accessToken.tokens.expiry_date;
                oAuth2Client.setCredentials(updatedToken);
                fs.writeFile(TOKEN_PATH, JSON.stringify(updatedToken), (err) => {
                    if (err) {console.error(err); process.exit(1);}
                    console.log('updated access token');
                    callback(oAuth2Client);
                });
            });
        }
        else {
            oAuth2Client.setCredentials(JSON.parse(token));
            callback(oAuth2Client);
        }


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
                process.exit(1);
            });
            callback(oAuth2Client);
        });
    });
}




const START_POINT_STRINGS = 3;
const START_POINT_PLURALS = 3;
const START_POINT_PERMISSIONS = 3;

let API_KEY = '';
let DOCUMENT_ID = '';
let PLATFORM = '';
let LOCALE_COLUMN = '';
let LOCALE_NAME = '';
let COLUMN_LENGTH = '';
let PLURALS_LOCALE_COLUMN = '';
let PLURALS_COLUMN_LENGTH = '';
let PERMISSIONS_COLUMN = '';
let PERMISSIONS_COLUMN_LENGTH = '';

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

let PERMISSIONS_PLATFORMS = [];
let PERMISSIONS_KEYS = [];
let PERMISSIONS_LOCALE = [];
let PERMISSIONS_IOS = [];

//both
function askingInputData() {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });
    return new Promise(resolve => {
        rl.question('Enter API key, platform(IOS/ANDROID), document id, locale column name in STRINGS (A/B/C), locale name (de/ru/base), locale column name in PLURALS (A/B/C), locale column name in iOS Permissions (A/B/C) OPTIONAL!!!: ', (code) => {
            rl.close();
            const data = code.split(',');
            API_KEY = data[0];
            PLATFORM = data[1].toUpperCase();
            DOCUMENT_ID = data[2];
            LOCALE_COLUMN = data[3];
            LOCALE_NAME = data[4];
            PLURALS_LOCALE_COLUMN = data[5];
            try {
                PERMISSIONS_COLUMN = data[6];
            }catch (e) {
                PERMISSIONS_COLUMN = '';
            }
            resolve();
        })
    });
}



//android
function makeStringsReadyToBeWrittenAndroid() {
    let result = '<?xml version="1.0" encoding="utf-8"?>\n<resources>\n\n';
    for (let i = 0; i< STRINGS.length; i++) {
        // if ((i===0) || (i!==0 && NAMESPACES[i-1].toString() !== NAMESPACES[i].toString())){
        //     result += '\n';
        //     result += '     <!--' +NAMESPACES[i]+'-->\n';
        // }

        result += '    ' + STRINGS[i] + '\n';
    }
    for (let i = 0;  i< PLURALS.length; i++) {
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
async function getStringsData(tableName, sheets, symbol, length, start) {

    let result;

    for (let i = 0; i < 5; i++) {
        if (i != 0) {
            const seconds = 2 ** i;
            console.log(`Network problem, retrying in ${seconds} seconds...`);
            await new Promise(resolve => setTimeout(resolve, seconds * 1000));
        }
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${DOCUMENT_ID}/values/${tableName}!${symbol}${start}:${symbol}?key=${API_KEY}`;
        console.log(url);
        try {
            result = await axios.get(url);
        } catch (error) {
        }

        if (result) break;
    }

    if (!result) {
        console.log('CANNOT GET DATA FROM GOOGLE');
        process.exit(1);
    }

    return result.data.values;
    /*
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
        */
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
    try {


        await askingInputData();
        const sheets = google.sheets({version: 'v4', auth});
        let checkForDataPresence = [];
        console.log('Received google sheet info');
        /*for (let i = 1; i < 100; i++) {
            checkForDataPresence = await getStringsData('Strings', sheets, 'A', i * 100 + START_POINT_STRINGS, (i - 1) * 100 + START_POINT_STRINGS);
            if (!validateData(checkForDataPresence)) {
                COLUMN_LENGTH = (i - 1) * 100 + START_POINT_STRINGS;
                break;
            }
        }*/
        console.log('Successfully calculated strings sheet length');
        /*for (let i = 1; i < 100; i++) {
            checkForDataPresence = await getStringsData('Plurals', sheets, 'D', i * 5 + START_POINT_PLURALS, (i - 1) * 5 + START_POINT_PLURALS);
            if (!validateData(checkForDataPresence)) {
                PLURALS_COLUMN_LENGTH = (i - 1) * 5 + START_POINT_PLURALS;
                break;
            }
        }*/
        console.log('Successfully calculated plurals sheet length');
        if (PLATFORM.toUpperCase() === 'IOS' && PERMISSIONS_COLUMN) {
            /*for (let i = 1; i < 100; i++) {
                checkForDataPresence = await getStringsData('iOS Permissions', sheets, 'D', i * 5 + START_POINT_PERMISSIONS, (i - 1) * 5 + START_POINT_PERMISSIONS);
                if (!validateData(checkForDataPresence)) {
                    PERMISSIONS_COLUMN_LENGTH = (i - 1) * 5 + START_POINT_PERMISSIONS;
                    break;
                }
            }*/
            console.log('Successfully calculated permissions sheet length');
        }
        const platforms = await getStringsData('Strings', sheets, 'A', COLUMN_LENGTH, START_POINT_STRINGS);
        const namespaces = await getStringsData('Strings', sheets, 'B', COLUMN_LENGTH, START_POINT_STRINGS);
        const keys = await getStringsData('Strings', sheets, 'C', COLUMN_LENGTH, START_POINT_STRINGS);
        const locale = await getStringsData('Strings', sheets, LOCALE_COLUMN, COLUMN_LENGTH, START_POINT_STRINGS);
        console.log('Received data from strings sheet');
        const pluralsPlatform = await getStringsData('Plurals', sheets, 'A', PLURALS_COLUMN_LENGTH, START_POINT_PLURALS);
        const pluralsNamespace = await getStringsData('Plurals', sheets, 'B', PLURALS_COLUMN_LENGTH, START_POINT_PLURALS);
        const pluralsKeys = await getStringsData('Plurals', sheets, 'C', PLURALS_COLUMN_LENGTH, START_POINT_PLURALS);
        const pluralsQuantity = await getStringsData('Plurals', sheets, 'D', PLURALS_COLUMN_LENGTH, START_POINT_PLURALS);
        const pluralsLocale = await getStringsData('Plurals', sheets, PLURALS_LOCALE_COLUMN, PLURALS_COLUMN_LENGTH, START_POINT_PLURALS);
        console.log('Received data from plurals sheet');
        let permissionsPlatform;
        let permissionsKey;
        let permissionsLocale;
        if (PLATFORM.toUpperCase() === 'IOS' && PERMISSIONS_COLUMN) {
            permissionsPlatform = await getStringsData('iOS Permissions', sheets, 'A', PERMISSIONS_COLUMN_LENGTH, START_POINT_PERMISSIONS);
            permissionsKey = await getStringsData('iOS Permissions', sheets, 'C', PERMISSIONS_COLUMN_LENGTH, START_POINT_PERMISSIONS);
            permissionsLocale = await getStringsData('iOS Permissions', sheets, PERMISSIONS_COLUMN, PERMISSIONS_COLUMN_LENGTH, START_POINT_PERMISSIONS);
        }

        filterByPlatform(platforms, namespaces, keys, locale);
        try {
            filterPluralsByPlatform(pluralsPlatform, pluralsNamespace, pluralsKeys, pluralsQuantity, pluralsLocale);
        }catch (e) {
            console.log('NO plurals');
        }
        try {
            filterIosPermissionsByPlatform(permissionsPlatform, permissionsKey, permissionsLocale);
        }catch (e) {
            console.log('NO Permissions');
        }

        if (PLATFORM.toUpperCase() === 'ANDROID') {
            parseAndroidStrings();
            try {
                parsePluralsAndroid();
            }catch (e) {
                console.log('No plurals');
            }

            writeFilesAndroid();
        }
        else if (PLATFORM.toUpperCase() === 'IOS') {
            parseIosStrings();
            try{
                parsePluralsIos();
            }catch (e) {
                console.log('No plurals');
            }
            try {
                parsePermissionsIos();
            }catch (e) {
                console.log('No permissions');
            }

            writeFilesIos();
            console.log('finish ' + Date.now() / 1000);
        }
        else if (PLATFORM.toUpperCase() === 'WEB' || PLATFORM.toUpperCase() === 'REACT') {
            parseWebStrings();
            try{
                parsePluralsWeb();
            }catch (e) {
                console.log('No plurals');
            }
            writeFilesWeb();
        }
        else {
            console.log('Invalid platform');
        }
    }catch (e) {
        console.log('SCRIPT EXECUTION FAILED');
        console.log(e);
        process.exit(1);
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
        console.log('Strings saved');
    });
    if(PLURAL_NAMESPACES.length !== 0) {
        fs.writeFile('./' + name + '.lproj' + '/Localizable' + '.stringsdict', makePluralsReadyToBeWrittenIos(), function (err) {
            if (err) throw err;
            console.log('Plurals saved');
        });
    }
    if (PERMISSIONS_IOS.length !== 0) {
        fs.writeFile('./' + name + '.lproj' + '/InfoPlist.strings', makePermissionsReadyToBeWritten(), function (err) {
            if (err) throw err;
            console.log('Permissions saved');
        })
    }
}

function writeFilesWeb() {
    const name = LOCALE_NAME.toLowerCase();
    if (PLATFORM.toUpperCase() === 'REACT') {
        if (!fs.existsSync('./react'))
            fs.mkdirSync('./react');
        fs.writeFile(`./react/${name}.json`, makeStringsReadyToBeWrittenWeb(), function (err) {
            if (err) throw err;
            console.log('Strings saved');
        });
    } else {
        if (!fs.existsSync('./web'))
            fs.mkdirSync('./web');
        let prevData;
        try {
            prevData = fs.readFileSync('./web/localization.json', 'utf8');
        } catch (e) {
            console.log('No localization file');
        }
        {
            fs.writeFile('./web/localization.json', makeStringsReadyToBeWrittenWeb(name, prevData), function (err) {
                if (err) throw err;
                console.log('Strings saved');
            });
        }
    }
}

function makePermissionsReadyToBeWritten() {
    let res = '';
    for (let i = 0; i < PERMISSIONS_IOS.length; i++) {
        res += PERMISSIONS_IOS[i] + '\n';
    }
    return res;
}

function makeStringsReadyToBeWrittenIos() {
    let result = '';

    for (let i = 0; i< STRINGS.length; i++) {
        // if ((i===0) || (i!==0 && NAMESPACES[i-1].toString() !== NAMESPACES[i].toString())){
        //     if(NAMESPACES[i] !== '' && NAMESPACES[i] !== undefined){
        //         result += '\n';
        //         result += '//MARK: ' +NAMESPACES[i]+'\n';
        //     }
        // }
        result += STRINGS[i].replace('\n', '\\n') + '\n';
    }

    return result;
}

function makeStringsReadyToBeWrittenWeb(locale, prevData = "{}") {
    const data = {};
    for (let i = 0; i< STRINGS.length; i++) {
        Object.assign(data, JSON.parse(STRINGS[i]))
    }
    for (let i = 0; i< PLURALS.length; i++) {
        Object.assign(data, JSON.parse(PLURALS[i]))
    }
    let result = JSON.parse(prevData);
    if (locale) {
        result[locale] = data;
    } else {
        result = data;
    }

    return JSON.stringify(result, null, '\t');
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
            res = '\n    <key>' + makeLocalesGreatAgain(insertUnderScoresInsteadSpaces(PLURAL_NAMESPACES[i].toLocaleLowerCase()) + '_' + insertUnderScoresInsteadSpaces(makeReplacesForXmlFile(PLURAL_KEYS[i])).toLocaleLowerCase(), true) + '</key>\n';
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
        res += '            <string>' + makeLocalesGreatAgain(PLURAL_LOCALE[i], true) + '</string>\n';
        PLURALS.push(res);
        if(PLURAL_NAMESPACES[i] !== PLURAL_NAMESPACES[i+1] || PLURAL_KEYS[i] !== PLURAL_KEYS[i+1]){
            res = '        </dict>\n';
            res += '    </dict>\n';
            PLURALS.push(res);
            writeHeader = true;
        }
    }
}

//ios
function parseIosStrings() {
    for (let i = 0; i < PLATFORMS.length; i++) {
        if (KEYS[i] && !LOCALE[i] && !PLATFORMS[i] && !NAMESPACES[i] && KEYS[i+1] && LOCALE[i+1] && PLATFORMS[i+1] && NAMESPACES[i+1]){
            STRINGS.push('');
            let res = '// MARK: ' + KEYS[i].toString().substring(2, KEYS[i].length - 2);
            STRINGS.push(res);
            continue;
        }
        if(!NAMESPACES[i] || !KEYS[i] || !LOCALE[i] || !PLATFORMS[i])
            continue;
        let res = '"' + insertUnderScoresInsteadSpaces(NAMESPACES[i].toLocaleLowerCase()) + '_' + insertUnderScoresInsteadSpaces(KEYS[i].toLocaleLowerCase()) + '" = "' + makeLocalesGreatAgain(LOCALE[i], false) + '";';
        STRINGS.push(res);
    }
}

//ios
function parsePermissionsIos() {
    let res = '';
    for (let i = 0; i < PERMISSIONS_PLATFORMS.length; i++) {
        res = '';
        if (!PERMISSIONS_PLATFORMS[i] || !PERMISSIONS_LOCALE[i] || !PERMISSIONS_KEYS[i])
            continue;
        res = '"' + PERMISSIONS_KEYS[i] + '" = "' + PERMISSIONS_LOCALE[i] + '";';
        PERMISSIONS_IOS.push(res);
    }
}

//both
function makeLocalesGreatAgain(locale, replaces){
    let result = '';
    let howManyInsertions = 1;
    for (let i = 0; i<locale.length; i++) {
        if(locale[i] === '%' && locale[i+1] === 's') {
            if (PLATFORM.toUpperCase() === 'ANDROID') {
                result += '%' + howManyInsertions + '$s';
            } else if (PLATFORM.toUpperCase() === 'IOS') {
                result += '%@';
            } else if (PLATFORM.toUpperCase() === 'WEB' || PLATFORM.toUpperCase() === 'REACT') {
                result += `{{v${howManyInsertions}}}`;
            }
            i++;
            howManyInsertions++;
            continue;
        }
        result += locale[i];
    }
    if (PLATFORM.toUpperCase() === 'WEB' || PLATFORM.toUpperCase() === 'REACT') {
        result = result.replace(/%%/g, '%');
    };
    if(replaces){
        const done = makeReplacesForXmlFile(result);
        return done;
    }
    return result;
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
            result += '\\"';
            continue;
        }
        if(locale[i] === "'" || locale[i] === "’"){
            result += "\\'";
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
        if (KEYS[i] && !LOCALE[i] && !PLATFORMS[i] && !NAMESPACES[i] && KEYS[i+1] && LOCALE[i+1] && PLATFORMS[i+1] && NAMESPACES[i+1]){
            let res = '\n<!--' + KEYS[i].toString().substring(2, KEYS[i].length - 2) + ' -->';
            STRINGS.push(res);
            continue;
        }
        if(!NAMESPACES[i] || !KEYS[i] || !LOCALE[i] || !PLATFORMS[i])
            continue;
        let res = 'string name=' + '"' + insertUnderScoresInsteadSpaces(NAMESPACES[i].toLocaleLowerCase()) + '_' + insertUnderScoresInsteadSpaces(KEYS[i].toLocaleLowerCase()) + '">' + makeLocalesGreatAgain(LOCALE[i], true) + '</string';
        res = '<' + res + '>';
        STRINGS.push(res);
    }
}

function parseWebStrings() {
    const res = {};
    for (let i = 0; i < PLATFORMS.length; i++) {
        if(!NAMESPACES[i] || !KEYS[i] || !LOCALE[i] || !PLATFORMS[i])
            continue;
        let data = makeLocalesGreatAgain(LOCALE[i], false);
        data = data.replace(/\\n/g, '\n').replace(/\\r/g, '\r');
        res[insertUnderScoresInsteadSpaces(NAMESPACES[i].toLocaleLowerCase()) + '_' + insertUnderScoresInsteadSpaces(KEYS[i].toLocaleLowerCase())] = data;
    }
    STRINGS.push(JSON.stringify(res, null, '\t'));
}


function parsePluralsAndroid() {
    let writeHeader = true;
    for (let i = 0; i < PLURAL_PLAFORMS.length; i++) {
        let res = '';

        if(!PLURAL_NAMESPACES[i] || !PLURAL_PLAFORMS[i] || !PLURAL_QUANTITY[i] || !PLURAL_LOCALE[i] || !PLURAL_KEYS[i])
            continue;
        if(writeHeader) {
            // res = '\n    <!-- ' + PLURAL_NAMESPACES[i] + '-->';
            // PLURALS.push(res);
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

function parsePluralsWeb() {
    const quantityMap = {
        zero: '0',
        one: 'one',
        other: 'other'
    };
    const result = {};
    let plurals = [];
    for (let i = 0; i < PLURAL_PLAFORMS.length; i++) {
        if(!PLURAL_NAMESPACES[i] || !PLURAL_PLAFORMS[i] || !PLURAL_QUANTITY[i] || !PLURAL_LOCALE[i] || !PLURAL_KEYS[i])
            continue;

        const key = insertUnderScoresInsteadSpaces(PLURAL_NAMESPACES[i].toLocaleLowerCase()) + '_' + insertUnderScoresInsteadSpaces(PLURAL_KEYS[i]).toLocaleLowerCase();
        if (PLURAL_LOCALE[i] && quantityMap[PLURAL_QUANTITY[i]]) {
            plurals.push({key: PLURAL_QUANTITY[i], value: PLURAL_LOCALE[i]});
        }
        if(PLURAL_NAMESPACES[i] !== PLURAL_NAMESPACES[i+1] || PLURAL_KEYS[i] !== PLURAL_KEYS[i+1]){
            if (PLATFORM.toUpperCase() === 'REACT') {
                let val = {};
                for (const plural of plurals) {
                    val[plural.key] = plural.value.replace(/\%[ds]/g, '{{count}}');
                }
                result[key] = val;
            } else {
                let val = "{count, plural, =";
                for (const plural of plurals) {
                    val += `${quantityMap[plural.key]}{${plural.value.replace(/\%[ds]/g, '{count}')}} `
                }
                val += '}';
                result[key] = val;
            }
            plurals = [];
        }
    }
    PLURALS.push(JSON.stringify(result, null, '\t'));
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
        if(PLATFORM_KEYS[PLATFORM.toUpperCase()].indexOf(platform.toUpperCase()) >= 0){
            PLURAL_PLAFORMS.push(platform);
            PLURAL_KEYS.push(k);
            PLURAL_LOCALE.push(locale[i].toString());
            PLURAL_NAMESPACES.push(namesp);
            PLURAL_QUANTITY.push(quantity[i].toString());
        }
    }
}

function filterIosPermissionsByPlatform(platforms, keys, locale) {
    for (let i = 0; i < platforms.length; i++) {
        if (PLATFORM_KEYS[PLATFORM.toUpperCase()].indexOf(platforms[i].toString().toUpperCase()) >= 0) {
            PERMISSIONS_PLATFORMS.push(platforms[i].toString());
            if (PLATFORM.toUpperCase() === 'IOS') {
                PERMISSIONS_KEYS.push(keys[i].toString().replace(/\"/g, '\\"').replace(/\n/g, '\\n').replace(/\'/g, "\\'"));
                PERMISSIONS_LOCALE.push(locale[i].toString().replace(/\"/g, '\\"').replace(/\n/g, '\\n').replace(/\'/g, "\\'"));
            }else {
                PERMISSIONS_KEYS.push(keys[i].toString());
                PERMISSIONS_LOCALE.push(locale[i].toString());
            }
        }
    }
}

//both
function filterByPlatform(platforms, namespaces, keys, locale) {
    for (let i = 0; i < platforms.length; i++) {
        if (PLATFORM_KEYS[PLATFORM.toUpperCase()].indexOf(platforms[i].toString().toUpperCase()) >= 0) {
            PLATFORMS.push(platforms[i].toString());
            if (PLATFORM.toUpperCase() === 'IOS') {
                NAMESPACES.push(namespaces[i].toString().replace(/\"/g, '\\"').replace(/\n/g, '\\n').replace(/\'/g, "\\'"));
                KEYS.push(keys[i].toString().replace(/\"/g, '\\"').replace(/\n/g, '\\n').replace(/\'/g, "\\'"));
                LOCALE.push(locale[i].toString().replace(/\"/g, '\\"').replace(/\n/g, '\\n').replace(/\'/g, "\\'"));
            }else {
                NAMESPACES.push(namespaces[i].toString());
                KEYS.push(keys[i].toString());
                LOCALE.push(locale[i].toString());
            }
        }
        if(!platforms[i].toString() && !!namespaces[i] && keys[i]){
            PLATFORMS.push(null);
            NAMESPACES.push(null);
            KEYS.push(keys[i].toString().replace(/\"/g, '\\"').replace(/\n/g, '\\n').replace(/\'/g, "\\'"));
            LOCALE.push(null);
        }
    }//IOS,1iGmKHDSYiIzuw5M4h88boy-UTsT_2IPT08AiCAAtdj4,D,base,E
}
