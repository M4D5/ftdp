import {exec, ExecResult} from "../exec-util";

export async function isPortReserved(port: number): Promise<ReservedPortRange | null> {
    const searchRegex = /(\d+)\s+(\d+)/g;
    let execResult: ExecResult;

    try {
        execResult = await exec('netsh int ip show excludedportrange protocol=tcp', {});
    } catch (e) {
        return null;
    }

    const matches = execResult.stdOut.matchAll(searchRegex);
    const portRanges: ReservedPortRange[] = [];

    for (const match of matches) {
        portRanges.push({
            start: parseInt(match[1]),
            end: parseInt(match[2])
        });
    }

    return portRanges.find(pr => pr.start <= port && port <= pr.end) ?? null;
}

export async function reservePort(port: number): Promise<any> {
    await exec(`netsh int ipv4 add excludedportrange protocol=tcp startport=${port} numberofports=1`, {});
}

export interface ReservedPortRange {
    start: number;
    end: number;
}
