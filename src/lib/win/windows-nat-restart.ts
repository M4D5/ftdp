import {exec} from "../exec-util";

export async function stopWindowsNat(): Promise<any> {
    await exec('net stop winnat', {});
}

export async function startWindowsNat(): Promise<any> {
    await exec('net start winnat', {});
}
