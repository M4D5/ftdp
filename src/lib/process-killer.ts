export interface ProcessKiller {
    kill(pid: number): Promise<Object>;
}
