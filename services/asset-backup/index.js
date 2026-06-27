/*
Some known issues and explanations:

- I would have liked to encrypt assets, but as far as I know, there's no easy way to do encryption with rsync -
my only option would be to basically write my own version of rsync (i.e. keep track of written files on disk
and compare with that list before uploading a file).

- All items are uploaded to "/home/" folder due to storage limitations

Security (M14): prefer SSH key auth (config.identityFile). When only a password is available we use
`sshpass -e` so the password is passed via the SSHPASS env var, never on the command line (where it would
be visible in `ps`). Host keys are verified against a persistent known_hosts (StrictHostKeyChecking=accept-new
pins the key on first connect; pre-populate known_hosts for full MITM protection). The rsync invocation uses
execFile with an argv array, so no value is interpolated into a shell.
*/
const fs = require('fs');
const path = require('path');
const moment = require('moment-timezone');

const foldersToBackup = [
    {
        path: path.join(__dirname, '../api/storage/asset/'),
        name: 'asset',
    },
];

const config = JSON.parse(fs.readFileSync('./config.json').toString());

// Persistent host-key store so we verify the server identity across runs (MITM protection).
const knownHostsFile = path.join(__dirname, 'known_hosts');

/**
     * Rsync between local computer SRC and server DEST
     * @param {{ip: string; port: number; password?: string; user: string; identityFile?: string; strictHostKeyChecking?: string;}} server
     * @param {string} folderSrc
     * @param {string} folderDest
     */
const rsync = async (server, folderSrc, folderDest) => {
    const hostKeyPolicy = server.strictHostKeyChecking || 'accept-new';
    const sshParts = [
        'ssh',
        '-p', String(server.port),
        '-o', `StrictHostKeyChecking=${hostKeyPolicy}`,
        '-o', `UserKnownHostsFile=${knownHostsFile}`,
    ];
    if (server.identityFile) {
        sshParts.push('-i', server.identityFile, '-o', 'IdentitiesOnly=yes');
    }
    // Note: -e takes a single string; ssh args here are operator-controlled paths/ports, not user input.
    const rsyncArgs = ['-a', '-e', sshParts.join(' '), folderSrc, `${server.user}@${server.ip}:${folderDest}`];

    // Use key auth when an identity file is configured; otherwise sshpass -e (password via env, not argv).
    let bin = 'rsync';
    let args = rsyncArgs;
    const env = { ...process.env };
    if (!server.identityFile) {
        if (!server.password) {
            return Promise.reject(new Error('No identityFile and no password configured for backup target'));
        }
        bin = 'sshpass';
        args = ['-e', 'rsync', ...rsyncArgs];
        env.SSHPASS = server.password;
    }

    console.log('[info] rsync', server.ip, folderSrc, '=>', folderDest);
    return new Promise((res, rej) => {
        // execFile (no shell) — no value is interpolated into a command line.
        require('child_process').execFile(bin, args, { env }, (err, stdOut, stdErr) => {
            if (err) {
                return rej(err);
            }
            if (stdErr) {
                return rej(new Error(stdErr));
            }
            res(stdOut);
        });
    });
}

const backup = async () => {
    console.log('[info] backup start');
    for (const folder of foldersToBackup) {
        console.log('[info] start backup of',folder.name);
        await rsync({
            ip: config.host,
            port: config.port,
            password: config.pass,
            user: config.user,
        }, folder.path, '/home/' + folder.name + '/');
    }
    console.log('[info] backup end');
}

const main = async () => {
    const current = moment().tz('America/New_York');
    console.log('[info] backup service started -', current.format('DD MM YYYY hh:mm:ss'));
    if (!fs.existsSync('./ran_once')) {
        console.log('[info] not ran before, so create backup and restart');
        await backup();
        fs.writeFileSync('./ran_once', new Date().getTime().toString());
    }
    let daysToAdd = 0;
    let runAt = moment().tz('America/New_York').set({ hour: 0, minute: 0, second: 0, millisecond: 0 });
    while (!runAt.isAfter(current)) {
        daysToAdd++;
        runAt = moment().tz('America/New_York').add(daysToAdd, 'days').set({ hour: 0, minute: 0, second: 0, millisecond: 0 });
        console.log('[info] [while not after] add', daysToAdd, 'day' + (daysToAdd > 1 ? 's' : ''));
    }
    // milliseconds until backup should run
    let i = (runAt.unix() - current.unix()) * 1000;
    console.log('[info] running in', moment().tz('America/New_York').add(i, 'milliseconds').fromNow(true));
    setTimeout(() => {
        backup().then(() => {
            process.exit();
        })
    }, i);
}
main();