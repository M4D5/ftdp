import {PortProcessSearchResult} from "./port-process-search-result";

export interface PortProcessSearcher {
    findProcessByPort(port: number): Promise<PortProcessSearchResult | null>;
}
