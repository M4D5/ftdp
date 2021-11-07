import {WindowsPortProcessSearcher} from "./lib/win/windows-port-process-searcher.js";
import {PortProcessSearcher} from "./lib/port-process-searcher.js";
import readline, {Interface} from "readline";
import {ProcessKiller} from "./lib/process-killer.js";
import {WindowsProcessKiller} from "./lib/win/windows-process-killer.js";
import meow from "meow";
import {isPortReserved, reservePort} from "./lib/win/windows-port-reservation";
import {startWindowsNat, stopWindowsNat} from "./lib/win/windows-nat-restart";

const cli = meow(`
	Usage
	  $ ftdp <port-number>

	Options
	  --no-prompt, -n

	Examples
	  $ ftdp 8080
	  $ ftdp 8080 -n
`, {
    flags: {
        noPrompt: {
            type: 'boolean',
            alias: 'n',
            default: false
        }
    }
});

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

(async () => {
    const portStr = cli.input[0];

    if (!portStr) {
        process.stdout.write(`Please specify a port to search`);
        return;
    }

    const port = parseInt(portStr);

    if (isNaN(port)) {
        process.stdout.write(`Unable to specified port value '${portStr}' as an integer.`);
        return;
    }

    const {portProcessSearcher, processKiller} = getServicesByPlatform();
    const foundProcess = await portProcessSearcher.findProcessByPort(port);

    if (foundProcess === null) {
        process.stdout.write(`No process using the port ${port} could be found.\r\n`);

        if (process.platform === 'win32') {
            await windowsTroubleshooting(port);
        }

        return;
    }

    let shouldKill: boolean;

    if (!cli.flags.noPrompt) {
        shouldKill = await prompt(
            rl,
            `Process '${foundProcess.processName}' is using port ${port}. Would you like to stop it? (y|n): `
        );
    } else {
        shouldKill = true;
    }

    if (shouldKill) {
        await processKiller.kill(foundProcess.pid);
        process.stdout.write(`Killed process '${foundProcess.processName}' successfully.`);
    }
})().then(() => {
    rl.close();
}).catch(e => {
    process.stderr.write('An error occurred:\r\n');
    process.stderr.write(e.message + '\r\n');
    process.stderr.write(e.stack);
    rl.close();
});

function getServicesByPlatform(): { portProcessSearcher: PortProcessSearcher, processKiller: ProcessKiller } {
    const userPlatform = process.platform;

    switch (userPlatform) {
        case 'win32':
            return {
                portProcessSearcher: new WindowsPortProcessSearcher(),
                processKiller: new WindowsProcessKiller()
            };
        default:
            throw Error(`Platform '${userPlatform}' is not supported.`);
    }
}

function prompt(rl: Interface, prompt: string): Promise<boolean> {
    return new Promise((resolve) => {
        rl.question(prompt, answer => {
            resolve(determineBooleanAnswer(answer));
        });
    });
}

function determineBooleanAnswer(answer: string): boolean {
    return answer.toLowerCase() === 'y';
}

async function windowsTroubleshooting(port: number) {
    const reservedPortRange = await isPortReserved(port);

    if (reservedPortRange) {
        process.stdout.write('\r\nIt looks like the specified port is within a reserved range of ports: ');
        process.stdout.write(`(${reservedPortRange.start} to ${reservedPortRange.end}).\r\n`);

        const shouldTryWinNatRestart = await prompt(
            rl,
            '\r\nWould you like to temporarily stop the Windows NAT Driver?\r\n' +
            'This might free the port in question by removing the dynamic port reservation (often caused by Hyper-V). ' +
            '(y|n): '
        );

        if (shouldTryWinNatRestart) {
            await stopWindowsNat();

            try {
                const windowsNatStoppedBindSuccess = await prompt(
                    rl,
                    '\r\nThe Windows NAT Driver has been stopped. Try binding to the port - was it successful? (y|n): '
                );

                if (windowsNatStoppedBindSuccess) {
                    const shouldAttemptPortReservation = await prompt(
                        rl,
                        '\r\nDo you want to reserve the port to prohibit future dynamic reservations? (y|n): '
                    );

                    if (shouldAttemptPortReservation) {
                        await reservePort(port);
                        process.stdout.write(`Port ${port} was reserved successfully.\r\n`);
                    }
                }
            } finally {
                await startWindowsNat();
                process.stdout.write('\r\nThe Windows NAT Driver has been restarted.\r\n');
            }
        }
    }
}
