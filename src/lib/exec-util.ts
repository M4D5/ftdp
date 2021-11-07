import childProcess, {ExecException, ExecOptions} from "child_process";

export async function exec(commandStr: string, options: ExecOptions): Promise<ExecResult> {
    return new Promise((resolve, reject) => {
        childProcess.exec(commandStr, options, (error: ExecException | null, stdOut: string, stdError: string) => {
            if (commandFailed(error, stdError)) {
                reject(getCommandFailedStr(error, stdError))
            } else {
                resolve({
                    stdOut,
                    stdError,
                    error
                });
            }
        });
    });
}

function commandFailed(error: ExecException | null, stdError: string): boolean {
    return error !== null || stdError !== '';
}

function getCommandFailedStr(error: ExecException | null, stdError: string): string {
    if (!commandFailed(error, stdError)) {
        throw Error('Command did not fail, invalid call to getCommandFailedStr');
    }

    let result = `Command 'netstat' failed:\r\n`;

    if (error !== null) {
        result += `${error}`;
    }

    if (stdError !== '') {
        result += '\r\n';
        result += `StdError: ${stdError}`;
    }

    return result;
}


export type ExecResult = {
    stdOut: string;
    stdError: string;
    error: ExecException | null;
}
