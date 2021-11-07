import {PortProcessSearcher} from "../port-process-searcher";
import {PortProcessSearchResult} from "../port-process-search-result";
import {exec, ExecResult} from "../exec-util";

type PowerShellResult = {
    Id: number,
    ProcessName: string
}

export class WindowsPortProcessSearcher implements PortProcessSearcher {
    async findProcessByPort(port: number): Promise<PortProcessSearchResult | null> {
        let execResult: ExecResult;

        try {
            execResult = await exec(
                WindowsPortProcessSearcher.getPowershellCommand(port),
                {shell: 'powershell.exe'}
            );
        } catch (e) {
            return null;
        }

        const powershellResult = JSON.parse(execResult.stdOut) as PowerShellResult;

        return {
            pid: powershellResult.Id,
            processName: powershellResult.ProcessName,
            port: port
        };
    }

    private static getPowershellCommand(port: number) {
        return `
            (Get-Process -Id (Get-NetTCPConnection -LocalPort ${port}).OwningProcess) | 
            Select-Object -Property Id,ProcessName | 
            ConvertTo-Json
        `;
    }
}
