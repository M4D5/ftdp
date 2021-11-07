import {ProcessKiller} from "../process-killer";
import {exec} from "../exec-util";

export class WindowsProcessKiller implements ProcessKiller {
    async kill(pid: number): Promise<Object> {
        await exec(
            `Stop-Process -Id ${pid}`,
            {shell: 'powershell.exe'}
        );

        return {};
    }
}
